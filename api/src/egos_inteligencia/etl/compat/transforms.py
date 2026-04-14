"""
Transform utilities — ported from bracc_etl.transforms.
Pure functions, no IO. Safe to import anywhere.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any

import pandas as pd


# ── Document formatting ───────────────────────────────────────────────────────

def strip_document(doc: str | None) -> str:
    if not doc:
        return ""
    return re.sub(r"[^0-9]", "", doc)


def format_cpf(cpf: str | None) -> str:
    digits = strip_document(cpf)
    if len(digits) != 11:
        return digits
    return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"


def format_cnpj(cnpj: str | None) -> str:
    digits = strip_document(cnpj)
    if len(digits) != 14:
        return digits
    return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"


def validate_cpf(cpf: str | None) -> bool:
    digits = strip_document(cpf)
    if len(digits) != 11 or len(set(digits)) == 1:
        return False
    total = sum(int(digits[i]) * (10 - i) for i in range(9))
    d1 = 11 - (total % 11)
    d1 = 0 if d1 >= 10 else d1
    if int(digits[9]) != d1:
        return False
    total = sum(int(digits[i]) * (11 - i) for i in range(10))
    d2 = 11 - (total % 11)
    d2 = 0 if d2 >= 10 else d2
    return int(digits[10]) == d2


def validate_cnpj(cnpj: str | None) -> bool:
    digits = strip_document(cnpj)
    if len(digits) != 14 or len(set(digits)) == 1:
        return False
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    total = sum(int(digits[i]) * weights1[i] for i in range(12))
    d1 = 11 - (total % 11)
    d1 = 0 if d1 >= 10 else d1
    if int(digits[12]) != d1:
        return False
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    total = sum(int(digits[i]) * weights2[i] for i in range(13))
    d2 = 11 - (total % 11)
    d2 = 0 if d2 >= 10 else d2
    return int(digits[13]) == d2


def classify_document(doc: str | None) -> str:
    raw = (doc or "").strip()
    digits = strip_document(raw)
    has_mask = "*" in raw
    if has_mask and len(digits) == 6:
        return "cpf_partial"
    if len(digits) == 11:
        return "cpf_valid"
    if len(digits) == 14:
        return "cnpj_valid"
    return "invalid"


# ── Name normalization ────────────────────────────────────────────────────────

def normalize_name(name: str | None) -> str:
    if not name:
        return ""
    result = name.strip().upper()
    nfkd = unicodedata.normalize("NFKD", result)
    result = "".join(c for c in nfkd if not unicodedata.combining(c))
    result = re.sub(r"\s+", " ", result)
    return result


# ── Date formatting ───────────────────────────────────────────────────────────

def parse_date(value: str) -> str:
    """Parse date string to ISO (YYYY-MM-DD). Handles DD/MM/YYYY, YYYY-MM-DD, YYYYMMDD."""
    value = value.strip()
    if not value:
        return ""
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y", "%Y-%m-%d", "%Y%m%d"):
        try:
            return str(pd.to_datetime(value, format=fmt).strftime("%Y-%m-%d"))
        except ValueError:
            continue
    return value


# ── Deduplication ─────────────────────────────────────────────────────────────

def deduplicate_rows(
    rows: list[dict[str, Any]],
    key_fields: list[str],
) -> list[dict[str, Any]]:
    seen: set[tuple[Any, ...]] = set()
    result: list[dict[str, Any]] = []
    for row in rows:
        key = tuple(row.get(f) for f in key_fields)
        if key not in seen:
            seen.add(key)
            result.append(row)
    return result


# ── Value sanitization ────────────────────────────────────────────────────────

MAX_CONTRACT_VALUE = 100_000_000_000  # R$100B cap


def cap_contract_value(value: float | None) -> float | None:
    if value is None:
        return None
    return min(value, MAX_CONTRACT_VALUE)
