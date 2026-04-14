"""
Compatibility layer for porting br-acc ETL pipelines to egos_inteligencia.

Provides the same API as bracc_etl.base, bracc_etl.loader and bracc_etl.transforms
so pipelines can be migrated by changing one import line.

Usage:
    # Replace:
    from bracc_etl.base import Pipeline
    from bracc_etl.loader import Neo4jBatchLoader
    from bracc_etl.transforms import normalize_name, ...

    # With:
    from egos_inteligencia.etl.compat import Pipeline, Neo4jBatchLoader
    from egos_inteligencia.etl.compat.transforms import normalize_name, ...
"""

from egos_inteligencia.etl.compat.base import Pipeline
from egos_inteligencia.etl.compat.loader import Neo4jBatchLoader

__all__ = ["Pipeline", "Neo4jBatchLoader"]
