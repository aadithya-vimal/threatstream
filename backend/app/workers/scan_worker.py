import asyncio
import logging
import os
import signal
import socket
from datetime import UTC, datetime
from uuid import uuid4

from app.core.config import settings
from app.database.repositories import ScansRepository
from app.database.session import get_session_factory
from app.domains.scans.adapters import scanner_registry
from app.domains.scans.orchestrator import execute_claimed_scan_job, retry_delay
from app.domains.scans.scheduler import Scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("threatstream.scan-worker")


class ScanWorker:
    def __init__(self, session_factory=None):
        self.factory = session_factory or get_session_factory(); self.stop_event = asyncio.Event(); self.active_task = None
        self.worker_id = f"{socket.gethostname()[:60]}:{os.getpid()}:{uuid4().hex[:12]}"
        self.lease = settings.SCAN_WORKER_LEASE_SECONDS; self.heartbeat_interval = settings.SCAN_WORKER_HEARTBEAT_SECONDS
        if self.heartbeat_interval <= 0 or self.heartbeat_interval >= self.lease / 2: raise RuntimeError("SCAN_WORKER_HEARTBEAT_SECONDS must be positive and less than half the lease duration")
        if not 1 <= settings.SCAN_WORKER_CONCURRENCY <= 8: raise RuntimeError("SCAN_WORKER_CONCURRENCY must be between 1 and 8")
        self.scheduler = Scheduler(self.factory); self.last_recovery = datetime.min.replace(tzinfo=UTC)

    async def claim(self):
        async with self.factory() as session:
            repo=ScansRepository(session)
            async with session.begin():
                job=await repo.claim_next(self.worker_id,self.lease)
                if job:await repo.add_audit(job,job.requested_by,"scan_job.claimed","scan_job",{"lease_seconds":self.lease})
                return (job.id,job.claim_token) if job else None

    async def heartbeat(self, job_id, token):
        while not self.stop_event.is_set():
            await asyncio.sleep(self.heartbeat_interval)
            try:
                async with self.factory() as session:
                    repo=ScansRepository(session)
                    async with session.begin():job=await repo.heartbeat(job_id,self.worker_id,token,self.lease)
                if not job:return
                if job.cancellation_requested_at:
                    await scanner_registry.resolve(job.scanner_type).cancel(job.id)
            except Exception as exc:
                logger.error("Heartbeat renewal failed job_id=%s error_type=%s",str(job_id),type(exc).__name__);return

    async def execute(self, job_id, token):
        heartbeat=asyncio.create_task(self.heartbeat(job_id,token))
        try:await execute_claimed_scan_job(job_id,self.worker_id,token,self.factory)
        finally:heartbeat.cancel();await asyncio.gather(heartbeat,return_exceptions=True)

    async def recover(self):
        recovered=0
        async with self.factory() as session:
            repo=ScansRepository(session)
            async with session.begin():
                for job in await repo.expired_jobs():
                    if job.cancellation_requested_at:
                        job.status="cancelled";job.cancelled_at=datetime.now(UTC);action="scan_job.worker_cancelled"
                    elif job.attempt_count < job.max_attempts:
                        job.status="queued";job.next_retry_at=datetime.now(UTC)+retry_delay(max(job.attempt_count,1));job.available_at=job.next_retry_at;job.last_failure_code="lease_expired";job.last_failure_summary="Worker lease expired";action="scan_job.lease_recovered"
                    else:
                        job.status="failed";job.completed_at=datetime.now(UTC);job.failure_code="lease_expired";job.failure_message="Worker lease expired";action="scan_job.attempts_exhausted"
                    await repo.release_claim(job);job.version+=1;recovered+=1;await repo.add_audit(job,job.requested_by,action,"scan_job",{"attempt":job.attempt_count,"max_attempts":job.max_attempts})
        return recovered

    async def run_once(self):
        now=datetime.now(UTC)
        if (now-self.last_recovery).total_seconds()>=settings.SCAN_WORKER_RECOVERY_SECONDS:
            await self.recover();await self.scheduler.tick();self.last_recovery=now
        claimed=await self.claim()
        if not claimed:return False
        self.active_task=asyncio.create_task(self.execute(*claimed))
        try:await self.active_task
        finally:self.active_task=None
        return True

    async def run(self):
        logger.info("Scan worker started",extra={"lease_seconds":self.lease,"concurrency":1})
        while not self.stop_event.is_set():
            try:
                worked=await self.run_once()
                if not worked:
                    try:await asyncio.wait_for(self.stop_event.wait(),timeout=settings.SCAN_WORKER_POLL_SECONDS)
                    except asyncio.TimeoutError:pass
            except Exception as exc:logger.error("Worker loop iteration failed error_type=%s",type(exc).__name__);await asyncio.sleep(min(5,settings.SCAN_WORKER_POLL_SECONDS))
        logger.info("Scan worker stopped accepting work")

    async def shutdown(self):
        self.stop_event.set()
        if self.active_task:
            try:await asyncio.wait_for(asyncio.shield(self.active_task),settings.SCAN_WORKER_SHUTDOWN_GRACE_SECONDS)
            except asyncio.TimeoutError:self.active_task.cancel();await asyncio.gather(self.active_task,return_exceptions=True)


async def main():
    worker=ScanWorker();loop=asyncio.get_running_loop()
    for sig in (signal.SIGINT,signal.SIGTERM):
        try:loop.add_signal_handler(sig,worker.stop_event.set)
        except (NotImplementedError,RuntimeError):pass
    run_task=asyncio.create_task(worker.run())
    await worker.stop_event.wait()
    await worker.shutdown()
    await asyncio.gather(run_task,return_exceptions=True)


if __name__=="__main__":
    try:asyncio.run(main())
    except KeyboardInterrupt:pass
