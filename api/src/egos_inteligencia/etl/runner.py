"""
ETL CLI Runner — EGOS Inteligência
Executes ETL pipelines against the production Neo4j instance.

Usage:
    python -m egos_inteligencia.etl.runner run <pipeline_name> [--limit N] [--dry]
    python -m egos_inteligencia.etl.runner list
    python -m egos_inteligencia.etl.runner run-group <group_index>
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

# ── Pipeline registry ─────────────────────────────────────────────────────────
# Lazy imports to avoid loading all pipeline deps on startup.
# Pipelines are added here as they are ported from br-acc.

def _get_pipelines() -> dict[str, Any]:
    """Return registry of available pipeline classes."""
    registry: dict[str, Any] = {}

    try:
        from egos_inteligencia.etl.pipelines.leniency import LeniencyPipeline
        registry["leniency"] = LeniencyPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.ofac import OfacPipeline
        registry["ofac"] = OfacPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.eu_sanctions import EuSanctionsPipeline
        registry["eu_sanctions"] = EuSanctionsPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.un_sanctions import UnSanctionsPipeline
        registry["un_sanctions"] = UnSanctionsPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.opensanctions import OpenSanctionsPipeline
        registry["opensanctions"] = OpenSanctionsPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.world_bank import WorldBankPipeline
        registry["world_bank"] = WorldBankPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.ceaf import CeafPipeline
        registry["ceaf"] = CeafPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.sanctions import SanctionsPipeline
        registry["sanctions"] = SanctionsPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.pep_cgu import PepCguPipeline
        registry["pep_cgu"] = PepCguPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.icij import ICIJPipeline
        registry["icij"] = ICIJPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.tse import TSEPipeline
        registry["tse"] = TSEPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.tse_bens import TseBensPipeline
        registry["tse_bens"] = TseBensPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.senado_cpis import SenadoCpisPipeline
        registry["senado_cpis"] = SenadoCpisPipeline
    except ImportError:
        pass

    try:
        from egos_inteligencia.etl.pipelines.camara_inquiries import CamaraInquiriesPipeline
        registry["camara_inquiries"] = CamaraInquiriesPipeline
    except ImportError:
        pass

    return registry


# Pipeline dependency groups for parallel execution.
# Group 0 runs first (foundation). Groups 1+ are independent.
PIPELINE_GROUPS: list[list[str]] = [
    # Group 0: Sanctions & compliance (quick, no dependencies)
    ["leniency", "ofac", "eu_sanctions", "un_sanctions", "opensanctions", "world_bank",
     "sanctions", "ceaf", "pep_cgu"],
    # Group 1: Electoral & offshore
    ["tse", "tse_bens", "icij"],
    # Group 2: Legislative investigations
    ["senado_cpis", "camara_inquiries"],
]


# ── Neo4j driver factory ──────────────────────────────────────────────────────

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
@click.option("--log-level", default="INFO", help="Logging level")
def cli(log_level: str) -> None:
    """EGOS Inteligência ETL Runner."""
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


@cli.command("list")
def list_pipelines() -> None:
    """List all available pipeline names."""
    pipelines = _get_pipelines()
    if not pipelines:
        click.echo("No pipelines available.")
        return
    click.echo(f"Available pipelines ({len(pipelines)}):")
    for name in sorted(pipelines):
        click.echo(f"  - {name}")


@cli.command("run")
@click.argument("pipeline_name")
@click.option("--data-dir", default="./data", help="Root directory for source data files")
@click.option("--limit", default=None, type=int, help="Max records to process (for testing)")
@click.option("--dry", is_flag=True, help="Dry run: extract+transform but skip Neo4j load")
def run_pipeline(pipeline_name: str, data_dir: str, limit: int | None, dry: bool) -> None:
    """Run a single pipeline by name."""
    pipelines = _get_pipelines()
    if pipeline_name not in pipelines:
        available = ", ".join(sorted(pipelines)) or "none"
        click.echo(f"Unknown pipeline: {pipeline_name!r}. Available: {available}", err=True)
        sys.exit(1)

    click.echo(f"{'[DRY RUN] ' if dry else ''}Running pipeline: {pipeline_name}")

    driver = _make_driver()
    try:
        pipeline_cls = pipelines[pipeline_name]
        pipeline = pipeline_cls(driver=driver, data_dir=data_dir, limit=limit)
        if dry:
            pipeline.extract()
            pipeline.transform()
            # Report what would be loaded
            for attr in ("agreements", "sanctions", "expulsions", "entities", "records"):
                data = getattr(pipeline, attr, None)
                if data is not None:
                    click.echo(f"  [dry] Would load {len(data)} records via '{attr}'")
            click.echo("[dry] Load skipped.")
        else:
            pipeline.run()
            click.echo(f"Pipeline {pipeline_name!r} complete.")
    finally:
        driver.close()


@cli.command("run-group")
@click.argument("group_index", type=int)
@click.option("--data-dir", default="./data")
@click.option("--workers", default=4, type=int, help="Parallel workers for pipelines in group")
def run_group(group_index: int, data_dir: str, workers: int) -> None:
    """Run all pipelines in a dependency group in parallel."""
    if group_index < 0 or group_index >= len(PIPELINE_GROUPS):
        click.echo(f"Invalid group index. Available: 0-{len(PIPELINE_GROUPS) - 1}", err=True)
        sys.exit(1)

    group = PIPELINE_GROUPS[group_index]
    pipelines = _get_pipelines()
    available = [p for p in group if p in pipelines]
    skipped = [p for p in group if p not in pipelines]

    if skipped:
        click.echo(f"Skipping (not yet ported): {', '.join(skipped)}")
    if not available:
        click.echo("No pipelines available in this group.")
        return

    click.echo(f"Running group {group_index} in parallel ({len(available)} pipelines, {workers} workers):")
    for p in available:
        click.echo(f"  - {p}")

    def _run_one(name: str) -> tuple[str, str]:
        drv = _make_driver()
        try:
            cls = _get_pipelines()[name]
            cls(driver=drv, data_dir=data_dir).run()
            return name, "ok"
        except Exception as exc:
            return name, f"ERROR: {exc}"
        finally:
            drv.close()

    results: dict[str, str] = {}
    with ProcessPoolExecutor(max_workers=min(workers, len(available))) as pool:
        futures = {pool.submit(_run_one, name): name for name in available}
        for future in as_completed(futures):
            name, status = future.result()
            results[name] = status
            icon = "✅" if status == "ok" else "❌"
            click.echo(f"  {icon} {name}: {status}")

    failed = [n for n, s in results.items() if s != "ok"]
    if failed:
        click.echo(f"\n{len(failed)} pipeline(s) failed: {', '.join(failed)}", err=True)
        sys.exit(1)
    else:
        click.echo(f"\nAll {len(available)} pipelines complete.")


if __name__ == "__main__":
    cli()
