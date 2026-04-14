"""
EGOS Inteligência — Background Jobs Worker Entry Point

Initializes and runs the async jobs processing loop.
Run as a separate Docker service alongside the API.

Usage:
    python -m egos_inteligencia.worker_main

Environment:
    DATABASE_URL — PostgreSQL connection string
    REDIS_URL    — Redis connection string (for heartbeat)
    WORKER_POLL_INTERVAL — seconds between queue polls (default: 10)
"""
from __future__ import annotations

import asyncio
import logging
import os
import signal
import sys

logger = logging.getLogger(__name__)


async def _heartbeat_loop(redis_url: str, interval: int = 30) -> None:
    """Write a heartbeat key to Redis every `interval` seconds so health checks work."""
    try:
        import redis.asyncio as aioredis
        client = aioredis.from_url(redis_url)
        while True:
            await client.set("worker:heartbeat", "1", ex=interval * 3)
            await asyncio.sleep(interval)
    except Exception as exc:
        logger.warning("Heartbeat loop error (non-fatal): %s", exc)


async def main() -> None:
    poll_interval = int(os.getenv("WORKER_POLL_INTERVAL", "10"))
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logger.info("EGOS Inteligência worker starting (poll_interval=%ds)", poll_interval)

    # Import here to ensure env vars are set before DB init
    from egos_inteligencia.services.jobs_worker import _jobs_worker_loop

    # Run heartbeat and worker loop concurrently
    shutdown_event = asyncio.Event()

    def _handle_signal(sig: int, _frame: object) -> None:
        logger.info("Signal %d received — shutting down gracefully", sig)
        shutdown_event.set()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    tasks = [
        asyncio.create_task(_heartbeat_loop(redis_url)),
        asyncio.create_task(_jobs_worker_loop(poll_interval=poll_interval)),
    ]

    # Wait until shutdown signal
    await shutdown_event.wait()
    logger.info("Cancelling worker tasks...")
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    logger.info("Worker stopped.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
