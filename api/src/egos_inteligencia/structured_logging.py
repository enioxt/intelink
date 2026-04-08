"""
Structured logging utilities for Intelink jobs worker observability.

Provides consistent, structured logging for job processing pipeline with:
- Correlation IDs for request tracing
- Performance metrics tracking
- Error context capture
- WebSocket event logging
- JSON-formatted logs for log aggregation
"""

import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, Union
from uuid import uuid4
from contextlib import contextmanager
import os

from .models import AsyncJob


class StructuredLogger:
    """Structured logger for Intelink jobs worker with correlation tracking."""
    
    def __init__(self, name: str = "intelink.jobs_worker"):
        self.logger = logging.getLogger(name)
        self.correlation_id = str(uuid4())
    
    def _log_structured(self, level: int, event: str, **kwargs):
        """Log structured message with consistent format."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "correlation_id": self.correlation_id,
            "event": event,
            "level": logging.getLevelName(level),
            **kwargs
        }
        
        # Log as JSON for structured logging systems
        self.logger.log(level, json.dumps(log_entry, default=str))
        
        # Best-effort emit to Mycelium telemetry (non-blocking, ignore failures)
        try:
            self._emit_mycelium(log_entry, level)
        except Exception:
            pass
    
    def _emit_mycelium(self, log_entry: Dict[str, Any], level: int):
        """Emit minimal telemetry event to Mycelium ingestion API.
        Uses MYCELIUM_INGEST_URL env (default http://127.0.0.1:3000/api/mycelium/events).
        Silently ignores all errors and returns quickly.
        """
        # Map level
        lvl = logging.getLevelName(level).lower()
        if lvl == 'warning':
            lvl = 'warn'
        if lvl not in ('info', 'warn', 'error', 'critical'):
            return
        url = os.environ.get("MYCELIUM_INGEST_URL", "http://127.0.0.1:3000/api/mycelium/events")
        # Build telemetry payload
        metadata = {k: v for k, v in log_entry.items() if k not in ("timestamp", "correlation_id", "event", "level")}
        payload = [{
            "source": "agent_service",
            "level": lvl,
            "event_type": log_entry.get("event"),
            "message": log_entry.get("event"),
            "metadata": metadata
        }]
        try:
            # Use stdlib urllib to avoid external deps
            import urllib.request
            import json as _json
            req = urllib.request.Request(url, data=_json.dumps(payload).encode('utf-8'), method='POST')
            req.add_header('Content-Type', 'application/json')
            with urllib.request.urlopen(req, timeout=0.75):
                pass
        except Exception:
            # Swallow any network or import errors
            pass

    def job_claimed(self, job: AsyncJob, **extra):
        """Log job claim event."""
        self._log_structured(
            logging.INFO,
            "job_claimed",
            job_id=job.id,
            job_type=job.job_type,
            created_at=job.created_at,
            retry_count=getattr(job, 'retry_count', 0),
            **extra
        )
    
    def job_started(self, job: AsyncJob, **extra):
        """Log job start event."""
        self._log_structured(
            logging.INFO,
            "job_started",
            job_id=job.id,
            job_type=job.job_type,
            started_at=job.started_at,
            queue_time_ms=self._calculate_queue_time(job),
            **extra
        )
    
    def job_completed(self, job: AsyncJob, processing_time_ms: float, **extra):
        """Log job completion event."""
        self._log_structured(
            logging.INFO,
            "job_completed",
            job_id=job.id,
            job_type=job.job_type,
            completed_at=job.completed_at,
            processing_time_ms=processing_time_ms,
            total_time_ms=self._calculate_total_time(job),
            output_summary=self._summarize_output(job.output_data),
            **extra
        )
    
    def job_failed(self, job: AsyncJob, error: Exception, will_retry: bool = False, **extra):
        """Log job failure event."""
        self._log_structured(
            logging.ERROR,
            "job_failed",
            job_id=job.id,
            job_type=job.job_type,
            error_type=type(error).__name__,
            error_message=str(error),
            retry_count=getattr(job, 'retry_count', 0),
            will_retry=will_retry,
            processing_time_ms=self._calculate_processing_time(job),
            **extra
        )
    
    def worker_loop_started(self, poll_interval: int, max_iterations: Optional[int] = None, **extra):
        """Log worker loop start event."""
        self._log_structured(
            logging.INFO,
            "worker_loop_started",
            poll_interval=poll_interval,
            max_iterations=max_iterations,
            **extra
        )
    
    def worker_loop_iteration(self, iteration: int, processed_count: int, cycle_time_ms: float, **extra):
        """Log worker loop iteration event."""
        self._log_structured(
            logging.DEBUG,
            "worker_loop_iteration",
            iteration=iteration,
            processed_count=processed_count,
            cycle_time_ms=cycle_time_ms,
            **extra
        )
    
    def worker_loop_error(self, iteration: int, error: Exception, consecutive_errors: int, sleep_time: float, **extra):
        """Log worker loop error event."""
        self._log_structured(
            logging.ERROR,
            "worker_loop_error",
            iteration=iteration,
            error_type=type(error).__name__,
            error_message=str(error),
            consecutive_errors=consecutive_errors,
            sleep_time=sleep_time,
            **extra
        )
    
    def worker_loop_stopped(self, total_iterations: int, reason: str, **extra):
        """Log worker loop stop event."""
        self._log_structured(
            logging.INFO,
            "worker_loop_stopped",
            total_iterations=total_iterations,
            reason=reason,
            **extra
        )
    
    def websocket_notification(self, job_id: str, from_status: str, to_status: str, success: bool = True, **extra):
        """Log WebSocket notification event."""
        self._log_structured(
            logging.DEBUG,
            "websocket_notification",
            job_id=job_id,
            from_status=from_status,
            to_status=to_status,
            success=success,
            **extra
        )
    
    def database_operation(self, operation: str, table: str, duration_ms: float, success: bool = True, **extra):
        """Log database operation event."""
        level = logging.DEBUG if success else logging.ERROR
        self._log_structured(
            level,
            "database_operation",
            operation=operation,
            table=table,
            duration_ms=duration_ms,
            success=success,
            **extra
        )
    
    def retry_logic_applied(self, job: AsyncJob, attempt: int, max_attempts: int, delay_ms: float, **extra):
        """Log retry logic application event."""
        self._log_structured(
            logging.WARNING,
            "retry_logic_applied",
            job_id=job.id,
            job_type=job.job_type,
            attempt=attempt,
            max_attempts=max_attempts,
            delay_ms=delay_ms,
            **extra
        )
    
    def performance_metrics(self, metric_type: str, value: Union[int, float], unit: str, **extra):
        """Log performance metrics."""
        self._log_structured(
            logging.INFO,
            "performance_metrics",
            metric_type=metric_type,
            value=value,
            unit=unit,
            **extra
        )
    
    def _calculate_queue_time(self, job: AsyncJob) -> Optional[float]:
        """Calculate time job spent in queue (created to started)."""
        if job.started_at and job.created_at:
            return (job.started_at - job.created_at).total_seconds() * 1000
        return None
    
    def _calculate_processing_time(self, job: AsyncJob) -> Optional[float]:
        """Calculate job processing time (started to completed)."""
        if job.completed_at and job.started_at:
            return (job.completed_at - job.started_at).total_seconds() * 1000
        elif job.started_at:
            return (datetime.now() - job.started_at).total_seconds() * 1000
        return None
    
    def _calculate_total_time(self, job: AsyncJob) -> Optional[float]:
        """Calculate total job time (created to completed)."""
        if job.completed_at and job.created_at:
            return (job.completed_at - job.created_at).total_seconds() * 1000
        return None
    
    def _summarize_output(self, output_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create summary of job output for logging."""
        if not output_data:
            return {}
        
        summary = {
            "job_type": output_data.get("job_type"),
            "status": output_data.get("status", "completed")
        }
        
        # Add type-specific metrics
        if "chunks_created" in output_data:
            summary["chunks_created"] = output_data["chunks_created"]
        if "documents_processed" in output_data:
            summary["documents_processed"] = output_data["documents_processed"]
        if "embeddings_generated" in output_data:
            summary["embeddings_generated"] = output_data["embeddings_generated"]
        if "processing_time_ms" in output_data:
            summary["processing_time_ms"] = output_data["processing_time_ms"]
        
        return summary


class JobProcessingContext:
    """Context manager for job processing with automatic structured logging."""
    
    def __init__(self, job: AsyncJob, logger: StructuredLogger):
        self.job = job
        self.logger = logger
        self.start_time = None
        self.processing_error = None
    
    def __enter__(self):
        self.start_time = time.time()
        self.logger.job_started(self.job)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        processing_time_ms = (time.time() - self.start_time) * 1000
        
        if exc_type is None:
            # Success
            self.logger.job_completed(self.job, processing_time_ms)
        else:
            # Failure
            self.logger.job_failed(self.job, exc_val, will_retry=False)
        
        return False  # Don't suppress exceptions


@contextmanager
def job_processing_context(job: AsyncJob, logger: StructuredLogger):
    """Context manager for job processing with structured logging."""
    start_time = time.time()
    logger.job_started(job)
    
    try:
        yield
        processing_time_ms = (time.time() - start_time) * 1000
        logger.job_completed(job, processing_time_ms)
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.job_failed(job, e, will_retry=False)
        raise


@contextmanager
def database_operation_context(operation: str, table: str, logger: StructuredLogger):
    """Context manager for database operations with performance logging."""
    start_time = time.time()
    
    try:
        yield
        duration_ms = (time.time() - start_time) * 1000
        logger.database_operation(operation, table, duration_ms, success=True)
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.database_operation(operation, table, duration_ms, success=False, error=str(e))
        raise


class WorkerLoopMetrics:
    """Metrics collector for worker loop performance monitoring."""
    
    def __init__(self, logger: StructuredLogger):
        self.logger = logger
        self.start_time = time.time()
        self.total_jobs_processed = 0
        self.total_iterations = 0
        self.consecutive_empty_cycles = 0
        self.error_count = 0
        self.performance_samples = []
    
    def record_iteration(self, processed_count: int, cycle_time_ms: float):
        """Record worker loop iteration metrics."""
        self.total_iterations += 1
        self.total_jobs_processed += processed_count
        
        if processed_count == 0:
            self.consecutive_empty_cycles += 1
        else:
            self.consecutive_empty_cycles = 0
        
        self.performance_samples.append({
            "iteration": self.total_iterations,
            "processed_count": processed_count,
            "cycle_time_ms": cycle_time_ms,
            "timestamp": time.time()
        })
        
        self.logger.worker_loop_iteration(
            self.total_iterations, 
            processed_count, 
            cycle_time_ms
        )
    
    def record_error(self, error: Exception):
        """Record worker loop error."""
        self.error_count += 1
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for the worker loop."""
        uptime_seconds = time.time() - self.start_time
        
        if self.performance_samples:
            avg_cycle_time = sum(s["cycle_time_ms"] for s in self.performance_samples) / len(self.performance_samples)
            jobs_per_minute = (self.total_jobs_processed / uptime_seconds) * 60 if uptime_seconds > 0 else 0
        else:
            avg_cycle_time = 0
            jobs_per_minute = 0
        
        return {
            "uptime_seconds": uptime_seconds,
            "total_iterations": self.total_iterations,
            "total_jobs_processed": self.total_jobs_processed,
            "consecutive_empty_cycles": self.consecutive_empty_cycles,
            "error_count": self.error_count,
            "average_cycle_time_ms": avg_cycle_time,
            "jobs_per_minute": jobs_per_minute,
            "error_rate": self.error_count / max(self.total_iterations, 1)
        }


def setup_structured_logging():
    """Setup structured logging configuration for Intelink jobs worker."""
    import logging.config
    
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'structured': {
                'format': '%(message)s'  # Message already contains JSON structure
            },
            'simple': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': 'INFO',
                'formatter': 'simple',
                'stream': 'ext://sys.stdout'
            },
            'file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'DEBUG',
                'formatter': 'structured',
                'filename': 'agent_service/logs/jobs_worker.jsonl',
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            }
        },
        'loggers': {
            'intelink.jobs_worker': {
                'level': 'DEBUG',
                'handlers': ['console', 'file'],
                'propagate': False
            }
        }
    }
    
    # Ensure log directory exists
    import os
    log_dir = 'agent_service/logs'
    os.makedirs(log_dir, exist_ok=True)
    
    logging.config.dictConfig(config)


# Global logger instance
_global_logger = None

def get_structured_logger() -> StructuredLogger:
    """Get global structured logger instance."""
    global _global_logger
    if _global_logger is None:
        setup_structured_logging()
        _global_logger = StructuredLogger()
    return _global_logger