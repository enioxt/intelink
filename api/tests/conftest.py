"""
pytest configuration — EGOS Inteligência
Marks: requires_neo4j, requires_redis, slow
"""

import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "requires_neo4j: test needs live Neo4j")
    config.addinivalue_line("markers", "requires_redis: test needs live Redis")
    config.addinivalue_line("markers", "slow: slow integration tests")


def pytest_collection_modifyitems(config, items):
    """Skip requires_neo4j and requires_redis unless explicitly enabled."""
    skip_neo4j = pytest.mark.skip(reason="Needs --neo4j flag or NEO4J_TEST_URI env var")
    skip_redis = pytest.mark.skip(reason="Needs --redis flag or REDIS_TEST_URL env var")

    import os
    has_neo4j = bool(os.environ.get("NEO4J_TEST_URI"))
    has_redis = bool(os.environ.get("REDIS_TEST_URL"))

    for item in items:
        if "requires_neo4j" in item.keywords and not has_neo4j:
            item.add_marker(skip_neo4j)
        if "requires_redis" in item.keywords and not has_redis:
            item.add_marker(skip_redis)
