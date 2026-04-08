"""Compatibility shim for legacy `bracc.*` imports during EGOS Inteligência merge.

This package temporarily aliases the old BR-ACC module path to the new
`egos_inteligencia` package so the copied backend can run before the full
import migration is completed.
"""

from pathlib import Path

_target_package = Path(__file__).resolve().parents[1] / "egos_inteligencia"
__path__ = [str(_target_package)]
