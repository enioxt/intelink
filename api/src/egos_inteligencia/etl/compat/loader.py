"""
Neo4jBatchLoader — ported from bracc_etl.loader.
Uses sync neo4j Driver for CLI pipeline runs (not async).
"""
from __future__ import annotations

import logging
import os
import re
import time
from typing import Any

from neo4j import Driver
from neo4j.exceptions import TransientError

logger = logging.getLogger(__name__)

_SAFE_KEY = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")
_MAX_RETRIES = 5


class Neo4jBatchLoader:
    """Bulk UNWIND loader for efficient Neo4j writes via sync Driver."""

    def __init__(
        self,
        driver: Driver,
        batch_size: int = 10_000,
        neo4j_database: str | None = None,
    ) -> None:
        self.driver = driver
        self.batch_size = batch_size
        self.neo4j_database = neo4j_database or os.getenv("NEO4J_DATABASE", "neo4j")
        self._total_written = 0

    def _run_batch_once(self, query: str, batch: list[dict[str, Any]]) -> None:
        with self.driver.session(database=self.neo4j_database) as session:
            session.run(query, {"rows": batch})

    def _run_batches(self, query: str, rows: list[dict[str, Any]]) -> int:
        total = 0
        for i in range(0, len(rows), self.batch_size):
            batch = rows[i: i + self.batch_size]
            self._run_batch_once(query, batch)
            total += len(batch)
            self._total_written += len(batch)
        if total >= 10_000:
            logger.info("  Batch: %d rows (cumulative: %d)", total, self._total_written)
        return total

    def run_query_with_retry(
        self,
        query: str,
        rows: list[dict[str, Any]],
        batch_size: int = 500,
    ) -> int:
        """Run query in batches with exponential-backoff retry on deadlocks."""
        total = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i: i + batch_size]
            for attempt in range(_MAX_RETRIES):
                try:
                    self._run_batch_once(query, batch)
                    total += len(batch)
                    self._total_written += len(batch)
                    break
                except TransientError as e:
                    if attempt == _MAX_RETRIES - 1:
                        raise
                    wait = 2 ** attempt
                    logger.warning("Deadlock attempt %d — retrying in %ds: %s", attempt + 1, wait, e)
                    time.sleep(wait)
        return total

    def run_query(self, query: str, rows: list[dict[str, Any]]) -> int:
        """Run query in batches. Alias for _run_batches (no retry)."""
        return self._run_batches(query, rows)

    def load_nodes(
        self,
        label: str,
        rows: list[dict[str, Any]],
        key_field: str,
    ) -> int:
        """MERGE nodes of `label` using `key_field` as unique key."""
        if not rows:
            return 0
        if not _SAFE_KEY.match(label):
            raise ValueError(f"Unsafe Neo4j label: {label!r}")
        if not _SAFE_KEY.match(key_field):
            raise ValueError(f"Unsafe key field: {key_field!r}")
        query = (
            f"UNWIND $rows AS row "
            f"MERGE (n:{label} {{{key_field}: row.{key_field}}}) "
            f"SET n += row"
        )
        return self._run_batches(query, rows)
