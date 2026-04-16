"""
ETL CLI Runner — EGOS Inteligência
Executes ETL pipelines against the production Neo4j instance.

Usage:
    python -m egos_inteligencia.etl.runner list
    python -m egos_inteligencia.etl.runner run <pipeline_name> [--limit N] [--dry]
    python -m egos_inteligencia.etl.runner run-group <group_index> [--workers N]
"""
from __future__ import annotations

import logging
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Any

import click
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)

# ── Lazy pipeline registry ────────────────────────────────────────────────────

_PIPELINE_MAP: dict[str, str] = {
    # --- Sanctions & compliance (TIER 1 Group 0) ---
    "leniency":      "egos_inteligencia.etl.pipelines.leniency:LeniencyPipeline",
    "ofac":          "egos_inteligencia.etl.pipelines.ofac:OfacPipeline",
    "eu_sanctions":  "egos_inteligencia.etl.pipelines.eu_sanctions:EuSanctionsPipeline",
    "un_sanctions":  "egos_inteligencia.etl.pipelines.un_sanctions:UnSanctionsPipeline",
    "opensanctions": "egos_inteligencia.etl.pipelines.opensanctions:OpenSanctionsPipeline",
    "world_bank":    "egos_inteligencia.etl.pipelines.world_bank:WorldBankPipeline",
    "sanctions":     "egos_inteligencia.etl.pipelines.sanctions:SanctionsPipeline",
    "ceaf":          "egos_inteligencia.etl.pipelines.ceaf:CeafPipeline",
    "pep_cgu":       "egos_inteligencia.etl.pipelines.pep_cgu:PepCguPipeline",
    "cepim":         "egos_inteligencia.etl.pipelines.cepim:CepimPipeline",
    # --- Electoral & offshore (TIER 1 Group 1) ---
    "tse":           "egos_inteligencia.etl.pipelines.tse:TSEPipeline",
    "tse_bens":      "egos_inteligencia.etl.pipelines.tse_bens:TseBensPipeline",
    "icij":          "egos_inteligencia.etl.pipelines.icij:ICIJPipeline",
    # --- Legislative investigations (TIER 1 Group 2) ---
    "senado_cpis":       "egos_inteligencia.etl.pipelines.senado_cpis:SenadoCpisPipeline",
    "camara_inquiries":  "egos_inteligencia.etl.pipelines.camara_inquiries:CamaraInquiriesPipeline",
    # --- Government finance & procurement (TIER 2 Group 3) ---
    "pgfn":          "egos_inteligencia.etl.pipelines.pgfn:PgfnPipeline",
    "tcu":           "egos_inteligencia.etl.pipelines.tcu:TcuPipeline",
    "comprasnet":    "egos_inteligencia.etl.pipelines.comprasnet:ComprasnetPipeline",
    "transferegov":  "egos_inteligencia.etl.pipelines.transferegov:TransferegovPipeline",
    "bndes":         "egos_inteligencia.etl.pipelines.bndes:BndesPipeline",
    "transparencia": "egos_inteligencia.etl.pipelines.transparencia:TransparenciaPipeline",
    "siop":          "egos_inteligencia.etl.pipelines.siop:SiopPipeline",
    "renuncias":     "egos_inteligencia.etl.pipelines.renuncias:RenunciasPipeline",
    "camara":        "egos_inteligencia.etl.pipelines.camara:CamaraPipeline",
    "senado":        "egos_inteligencia.etl.pipelines.senado:SenadoPipeline",
    "cvm":           "egos_inteligencia.etl.pipelines.cvm:CvmPipeline",
    "cvm_funds":     "egos_inteligencia.etl.pipelines.cvm_funds:CvmFundsPipeline",
    "siconfi":       "egos_inteligencia.etl.pipelines.siconfi:SiconfiPipeline",
    # --- DHPP REDS — Patos de Minas (homicídios + arma de fogo 2010-2025) ---
    "dhpp_reds":     "egos_inteligencia.etl.pipelines.dhpp_reds:DHPPRedsPipeline",
}

# Dependency groups for parallel execution.
# Group N must finish before group N+1 starts; within a group all run in parallel.
PIPELINE_GROUPS: list[list[str]] = [
    # Group 0: Sanctions & compliance — fastest, no cross-deps
    ["leniency", "ofac", "eu_sanctions", "un_sanctions", "opensanctions",
     "world_bank", "sanctions", "ceaf", "pep_cgu", "cepim"],
    # Group 1: Electoral & offshore — independent of group 0
    ["tse", "tse_bens", "icij"],
    # Group 2: Legislative investigations
    ["senado_cpis", "camara_inquiries"],
    # Group 3: Government finance & procurement
    ["pgfn", "tcu", "comprasnet", "transferegov", "bndes",
     "transparencia", "siop", "renuncias", "camara", "senado",
     "cvm", "cvm_funds", "siconfi"],
]


def _load_pipeline_class(name: str) -> Any:
    """Dynamically import a pipeline class by name."""
    if name not in _PIPELINE_MAP:
        return None
    module_path, class_name = _PIPELINE_MAP[name].rsplit(":", 1)
    import importlib
    mod = importlib.import_module(module_path)
    return getattr(mod, class_name)


def _make_driver() -> Any:
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "")
    if not password:
        click.echo("ERROR: NEO4J_PASSWORD env var is required", err=True)
        sys.exit(1)
    return GraphDatabase.driver(uri, auth=(user, password))


# ── CLI ───────────────────────────────────────────────────────────────────────

@click.group()
@click.option("--log-level", default="INFO")
def cli(log_level: str) -> None:
    """EGOS Inteligência ETL Runner — 28 pipelines from Brazilian public data."""
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


@cli.command("list")
def list_pipelines() -> None:
    """List all registered pipelines and their groups."""
    click.echo(f"Registered pipelines: {len(_PIPELINE_MAP)}\n")
    for i, group in enumerate(PIPELINE_GROUPS):
        click.echo(f"Group {i}:")
        for name in group:
            click.echo(f"  - {name}")
    click.echo()
    ungrouped = set(_PIPELINE_MAP) - {n for g in PIPELINE_GROUPS for n in g}
    if ungrouped:
        click.echo(f"Ungrouped: {', '.join(sorted(ungrouped))}")


@cli.command("run")
@click.argument("pipeline_name")
@click.option("--data-dir", default="./data", envvar="ETL_DATA_DIR")
@click.option("--limit", default=None, type=int)
@click.option("--dry", is_flag=True, help="Extract+transform but skip Neo4j load")
def run_pipeline(pipeline_name: str, data_dir: str, limit: int | None, dry: bool) -> None:
    """Run a single pipeline by name."""
    cls = _load_pipeline_class(pipeline_name)
    if cls is None:
        available = ", ".join(sorted(_PIPELINE_MAP))
        click.echo(f"Unknown: {pipeline_name!r}\nAvailable: {available}", err=True)
        sys.exit(1)

    prefix = "[DRY RUN] " if dry else ""
    click.echo(f"{prefix}Running: {pipeline_name}")
    driver = _make_driver()
    try:
        pipeline = cls(driver=driver, data_dir=data_dir, limit=limit)
        if dry:
            pipeline.extract()
            pipeline.transform()
            for attr in ("agreements", "sanctions", "expulsions", "entities",
                         "records", "nodes", "rows"):
                data = getattr(pipeline, attr, None)
                if isinstance(data, list):
                    click.echo(f"  [dry] {attr}: {len(data)} records")
            click.echo("[dry] Load skipped.")
        else:
            pipeline.run()
            click.echo(f"✅ {pipeline_name} complete.")
    finally:
        driver.close()


def _run_one_pipeline(args: tuple[str, str]) -> tuple[str, str]:
    """Top-level worker function (must be picklable for ProcessPoolExecutor)."""
    name, data_dir = args
    drv = _make_driver()
    try:
        _load_pipeline_class(name)(driver=drv, data_dir=data_dir).run()
        return name, "ok"
    except Exception as exc:
        return name, f"ERROR: {exc}"
    finally:
        drv.close()


@cli.command("run-group")
@click.argument("group_index", type=int)
@click.option("--data-dir", default="./data", envvar="ETL_DATA_DIR")
@click.option("--workers", default=4, type=int)
def run_group(group_index: int, data_dir: str, workers: int) -> None:
    """Run all pipelines in a dependency group in parallel."""
    if group_index < 0 or group_index >= len(PIPELINE_GROUPS):
        click.echo(f"Invalid group. Range: 0-{len(PIPELINE_GROUPS) - 1}", err=True)
        sys.exit(1)

    group = PIPELINE_GROUPS[group_index]
    available = [p for p in group if _PIPELINE_MAP.get(p)]
    click.echo(f"Group {group_index}: {len(available)} pipelines, {workers} workers")

    results: dict[str, str] = {}
    with ProcessPoolExecutor(max_workers=min(workers, len(available))) as pool:
        job_args = [(name, data_dir) for name in available]
        futures = {pool.submit(_run_one_pipeline, arg): arg[0] for arg in job_args}
        for future in as_completed(futures):
            name, status = future.result()
            results[name] = status
            click.echo(f"  {'✅' if status == 'ok' else '❌'} {name}: {status}")

    failed = [n for n, s in results.items() if s != "ok"]
    if failed:
        click.echo(f"\n{len(failed)} failed: {', '.join(failed)}", err=True)
        sys.exit(1)
    click.echo(f"\n✅ All {len(available)} complete.")


if __name__ == "__main__":
    cli()
