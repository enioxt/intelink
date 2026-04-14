#!/usr/bin/env python3
"""
sync_check.py — Backend ↔ Frontend drift checker for Intelink.

Reports synchronization % between FastAPI backend routes and frontend API calls.
Alerts when drift exceeds DRIFT_THRESHOLD (default 20%).

Usage:
    python scripts/sync_check.py           # full report
    python scripts/sync_check.py --json    # machine-readable
    python scripts/sync_check.py --ci      # exit 1 if drift > threshold
    python scripts/sync_check.py --threshold 30  # custom threshold
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

DRIFT_THRESHOLD = 0.20  # 20% — max allowed backend routes without frontend coverage

ROOT = Path(__file__).parent.parent
BACKEND_ROUTERS = ROOT / "api" / "src" / "egos_inteligencia" / "routers"
FRONTEND_SRC = ROOT / "frontend" / "src"

# ─── Backend: extract all routes ───────────────────────────────────────────────

_ROUTE_DECORATOR = re.compile(
    r'@router\.(get|post|put|patch|delete|head|options)\s*\(\s*["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_ROUTER_PREFIX = re.compile(r'APIRouter\s*\(\s*prefix\s*=\s*["\']([^"\']+)["\']')


def extract_backend_routes() -> list[dict]:
    routes = []
    for py_file in sorted(BACKEND_ROUTERS.glob("*.py")):
        content = py_file.read_text(encoding="utf-8", errors="replace")
        prefix_match = _ROUTER_PREFIX.search(content)
        prefix = prefix_match.group(1) if prefix_match else "/api/v1"

        for m in _ROUTE_DECORATOR.finditer(content):
            method = m.group(1).upper()
            path = m.group(2)
            full = (prefix.rstrip("/") + "/" + path.lstrip("/")).replace("//", "/")
            full = full.rstrip("/") or "/"
            routes.append({"method": method, "path": full, "router": py_file.stem})
    return routes


# ─── Frontend: extract all API surface ─────────────────────────────────────────

def extract_frontend_surface(src: Path) -> tuple[set[str], set[str]]:
    """
    Returns (path_fragments, keyword_tokens):
    - path_fragments: URL path strings found in frontend code
    - keyword_tokens: individual path segments (for fuzzy matching)
    """
    path_fragments: set[str] = set()
    keyword_tokens: set[str] = set()

    patterns = [
        re.compile(r"""[`'"](/api/v1[^`'"?\s\\{}]+)"""),
        re.compile(r"""\$\{(?:BASE_URL|API_URL|API_BASE)[^}]*\}([^`'"?\s{]+)"""),
        re.compile(r"""(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(\s*[`'"]([^`'"?\s]+)"""),
    ]

    for ext in ("*.ts", "*.tsx"):
        for ts_file in src.rglob(ext):
            content = ts_file.read_text(encoding="utf-8", errors="replace")
            for pat in patterns:
                for m in pat.finditer(content):
                    raw = m.group(1).split("?")[0]
                    # Remove template literal variable parts
                    raw = re.sub(r"\$\{[^}]+\}", "{id}", raw)
                    raw = raw.rstrip("/") or "/"
                    if raw:
                        path_fragments.add(raw)
                        # Also index each path segment
                        for seg in raw.split("/"):
                            if seg and not seg.startswith("{"):
                                keyword_tokens.add(seg.lower())

    return path_fragments, keyword_tokens


def _path_matches(route: dict, path_fragments: set[str], keyword_tokens: set[str]) -> bool:
    path = route["path"]

    # 1. Direct match
    if path in path_fragments:
        return True

    # 2. Normalized match: replace {param} with {id}
    normalized = re.sub(r"\{[^}]+\}", "{id}", path)
    if normalized in path_fragments:
        return True

    # 3. Prefix match: /api/v1/investigations/{id} → any fragment starting with /api/v1/investigations
    base = re.sub(r"\{[^}]+\}", "", path).replace("//", "/").rstrip("/")
    if base and any(f.startswith(base) for f in path_fragments):
        return True

    # 4. Segment keyword match: check if the most specific path segment appears in frontend
    segments = [s for s in path.split("/") if s and not s.startswith("{") and s not in ("api", "v1")]
    if segments:
        last_segment = segments[-1]
        # High-confidence keywords that unambiguously identify a route
        if last_segment.lower() in keyword_tokens:
            return True
        # Also check the parent + child (e.g., "auth" + "login")
        if len(segments) >= 2:
            parent = segments[-2].lower()
            child = last_segment.lower()
            if parent in keyword_tokens and child in keyword_tokens:
                return True

    return False


# ─── CI integration ─────────────────────────────────────────────────────────────

def run(args: argparse.Namespace) -> int:
    threshold = getattr(args, "threshold", 20) / 100.0

    backend_routes = extract_backend_routes()
    path_fragments, keyword_tokens = extract_frontend_surface(FRONTEND_SRC)

    covered = []
    uncovered = []

    for route in backend_routes:
        if _path_matches(route, path_fragments, keyword_tokens):
            covered.append(route)
        else:
            uncovered.append(route)

    total = len(backend_routes)
    n_covered = len(covered)
    n_uncovered = len(uncovered)
    coverage_pct = (n_covered / total * 100) if total else 0.0
    drift_pct = (n_uncovered / total) if total else 0.0
    threshold_pct = int(threshold * 100)

    status = "OK" if drift_pct <= threshold else "DRIFT"

    if args.json:
        print(json.dumps({
            "status": status,
            "total_backend_routes": total,
            "covered": n_covered,
            "uncovered": n_uncovered,
            "coverage_pct": round(coverage_pct, 1),
            "drift_pct": round(drift_pct * 100, 1),
            "threshold_pct": threshold_pct,
            "uncovered_routes": uncovered,
        }, indent=2, ensure_ascii=False))
    else:
        bar_filled = int(coverage_pct / 5)
        bar = "█" * bar_filled + "░" * (20 - bar_filled)
        print(f"\n{'='*62}")
        print(f"  Intelink — Backend ↔ Frontend Sync Check")
        print(f"{'='*62}")
        print(f"  [{bar}] {coverage_pct:.1f}% synced")
        print(f"  Backend routes total : {total}")
        print(f"  Covered by frontend  : {n_covered}")
        print(f"  NOT covered (drift)  : {n_uncovered}  ({drift_pct*100:.1f}%)")
        print(f"  Drift threshold      : {threshold_pct}%")
        print(f"  Status               : {'✅ OK' if status == 'OK' else '⚠️  DRIFT DETECTED'}")
        print(f"{'='*62}")

        if uncovered:
            print(f"\n  Rotas sem cobertura no frontend ({n_uncovered}):")
            by_router: dict[str, list] = {}
            for r in uncovered:
                by_router.setdefault(r["router"], []).append(r)
            for router_name, routes in sorted(by_router.items()):
                print(f"\n  [{router_name}]")
                for r in routes:
                    print(f"    {r['method']:7} {r['path']}")

        print(f"\n  Tip: run with --json for machine-readable output")
        print(f"       run with --ci to fail builds when drift > {threshold_pct}%")
        print()

    if args.ci and drift_pct > threshold:
        print(
            f"CI FAIL: drift {drift_pct*100:.1f}% exceeds threshold {threshold_pct}%.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backend ↔ Frontend sync checker")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--ci", action="store_true", help="Exit 1 if drift > threshold")
    parser.add_argument("--threshold", type=int, default=20, help="Drift threshold %% (default 20)")
    sys.exit(run(parser.parse_args()))
