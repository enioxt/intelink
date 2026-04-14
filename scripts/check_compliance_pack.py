#!/usr/bin/env python3
"""Compliance pack gate for legal and ethics baseline — Intelink edition.

NOTE: egos-inteligencia currently ships LGPD_COMPLIANCE.md under
infra/compliance/. The full compliance pack (ETHICS, PRIVACY, TERMS,
DISCLAIMER, SECURITY, ABUSE_RESPONSE) is not yet present. This script
validates what exists and reports gaps as warnings so CI does not hard-fail
on missing files that are pending creation.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


# Files that MUST exist for the compliance gate to pass.
REQUIRED_FILES = [
    "infra/compliance/LGPD_COMPLIANCE.md",
]

# Files that SHOULD exist (warnings, not failures).
RECOMMENDED_FILES = [
    "ETHICS.md",
    "PRIVACY.md",
    "TERMS.md",
    "DISCLAIMER.md",
    "SECURITY.md",
    "ABUSE_RESPONSE.md",
    "docs/legal/legal-index.md",
]

REQUIRED_SECTIONS: dict[str, list[str]] = {
    "infra/compliance/LGPD_COMPLIANCE.md": [
        "## Legal basis",
        "## Data categories",
        "## Data subject rights",
        "## Retention",
    ],
}


def _extract_links(markdown_text: str) -> list[str]:
    return re.findall(r"\[[^\]]+\]\(([^)]+)\)", markdown_text)


def _exists(repo_root: Path, rel_path: str) -> bool:
    return (repo_root / rel_path).exists()


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate compliance pack baseline")
    parser.add_argument("--repo-root", default=".", help="Repository root")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    errors: list[str] = []
    warnings: list[str] = []

    # Hard failures — required files
    for rel_path in REQUIRED_FILES:
        if not _exists(repo_root, rel_path):
            errors.append(f"Missing required compliance file: {rel_path}")

    # Section checks on existing required files
    for rel_path, sections in REQUIRED_SECTIONS.items():
        full_path = repo_root / rel_path
        if not full_path.exists():
            continue
        content = full_path.read_text(encoding="utf-8")
        for section in sections:
            if section not in content:
                errors.append(f"{rel_path}: missing section header: {section}")

    # Soft warnings — recommended files not yet created
    for rel_path in RECOMMENDED_FILES:
        if not _exists(repo_root, rel_path):
            warnings.append(f"Recommended compliance file missing (create before public launch): {rel_path}")

    if warnings:
        print("WARNINGS")
        for w in warnings:
            print(f"  [WARN] {w}")

    if errors:
        print("FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
