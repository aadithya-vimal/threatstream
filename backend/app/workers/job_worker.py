import asyncio
import logging
from datetime import datetime
from typing import Dict, Set
from app.database.supabase_client import supabase_client
from app.plugins.manager import PluginManager
from app.core.config import settings

logger = logging.getLogger("threatstream.worker")

class JobWorkerManager:
    """
    Coordinates queued job execution, concurrency controls, and task cancellations.
    """
    def __init__(self):
        self.active_jobs: Set[str] = set() # Set of currently running job UUIDs in this worker instance
        self.paused_jobs: Set[str] = set() # Set of paused job UUIDs
        self.is_running = False

    async def start(self):
        self.is_running = True
        logger.info("Starting ThreatStream Job Worker Loop")
        asyncio.create_task(self._poll_loop())

    def stop(self):
        self.is_running = False
        logger.info("Stopping ThreatStream Job Worker Loop")

    async def _poll_loop(self):
        while self.is_running:
            try:
                # Check concurrency limits
                if len(self.active_jobs) >= settings.MAX_CONCURRENT_JOBS:
                    await asyncio.sleep(settings.JOB_POLL_INTERVAL_SECONDS)
                    continue

                # Poll Supabase jobs for 'queued' status
                # Bypasses RLS since supabase_client is initialized using service role key
                response = supabase_client.table("jobs") \
                    .select("*") \
                    .eq("status", "queued") \
                    .order("priority", desc=False) \
                    .order("created_at", desc=False) \
                    .limit(1) \
                    .execute()

                if response.data and len(response.data) > 0:
                    job = response.data[0]
                    job_id = job["id"]
                    
                    # Claim the job immediately by updating its status to 'running'
                    claim_response = supabase_client.table("jobs") \
                        .update({
                            "status": "running",
                            "started_at": datetime.utcnow().isoformat(),
                            "progress": 0
                        }) \
                        .eq("id", job_id) \
                        .eq("status", "queued") \
                        .execute()

                    if claim_response.data and len(claim_response.data) > 0:
                        claimed_job = claim_response.data[0]
                        logger.info(f"Worker claimed job: {job_id} ({claimed_job['name']})")
                        self.active_jobs.add(job_id)
                        # Spawn job execution in background
                        asyncio.create_task(self._execute_job(claimed_job))
            except Exception as e:
                logger.error(f"Error in job worker polling loop: {str(e)}")
            
            await asyncio.sleep(settings.JOB_POLL_INTERVAL_SECONDS)

    async def _execute_job(self, job: dict):
        job_id = job["id"]
        job_name = job["name"]
        job_type = job["type"]
        connector_name = job.get("connector_id") or "default"

        # Determine plugin executor name
        # If connector_id is not null we map it to nmap, virustotal, nuclei, etc.
        plugin_name = "default"
        if "nmap" in job_name.lower() or job_type == "scan":
            plugin_name = "nmap"
        if "virustotal" in job_name.lower() or job_type == "enrich":
            plugin_name = "virustotal"
        if "nuclei" in job_name.lower():
            plugin_name = "nuclei"

        logger.info(f"Running job {job_id} [{job_name}] using plugin {plugin_name}")

        def progress_callback(progress_int: int):
            # Check for cancel or pause checks during callback
            try:
                # Poll database status of this job to see if analyst cancelled or paused it
                res = supabase_client.table("jobs").select("status").eq("id", job_id).execute()
                if res.data and len(res.data) > 0:
                    status = res.data[0]["status"]
                    if status == "cancelled":
                        raise InterruptedError("Job cancelled by operator")
                    if status == "paused":
                        self.paused_jobs.add(job_id)
            except Exception as e:
                if isinstance(e, InterruptedError):
                    raise e
                logger.warn(f"Failed to fetch job cancel status: {str(e)}")

            # Wait if job is paused
            while job_id in self.paused_jobs:
                logger.info(f"Job {job_id} is paused. Waiting...")
                time.sleep(1)
                # Check if unpaused
                res = supabase_client.table("jobs").select("status").eq("id", job_id).execute()
                if res.data and len(res.data) > 0:
                    status = res.data[0]["status"]
                    if status == "running":
                        self.paused_jobs.discard(job_id)
                    elif status == "cancelled":
                        raise InterruptedError("Job cancelled during pause")

            # Update progress inside Supabase
            supabase_client.table("jobs") \
                .update({"progress": progress_int, "updated_at": datetime.utcnow().isoformat()}) \
                .eq("id", job_id) \
                .execute()

        try:
            # Instantiate and run plugin
            plugin = PluginManager.get_plugin(plugin_name, config=job.get("payload", {}))
            
            # Use run_in_executor to avoid blocking the asyncio event loop for blocking CPU/IO plugins
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: plugin.execute(job.get("payload", {}), progress_callback)
            )

            # Cleanup
            plugin.cleanup()

            # Record success in Supabase
            supabase_client.table("jobs") \
                .update({
                    "status": "completed",
                    "progress": 100,
                    "result": result,
                    "completed_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("id", job_id) \
                .execute()
            logger.info(f"Job {job_id} completed successfully")

        except InterruptedError as ie:
            logger.warning(f"Job {job_id} execution was cancelled: {str(ie)}")
            supabase_client.table("jobs") \
                .update({
                    "status": "cancelled",
                    "error": str(ie),
                    "completed_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("id", job_id) \
                .execute()

        except Exception as e:
            logger.error(f"Job {job_id} execution failed: {str(e)}")
            supabase_client.table("jobs") \
                .update({
                    "status": "failed",
                    "error": str(e),
                    "completed_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("id", job_id) \
                .execute()

        finally:
            self.active_jobs.discard(job_id)
            self.paused_jobs.discard(job_id)

    def pause_job(self, job_id: str):
        self.paused_jobs.add(job_id)
        supabase_client.table("jobs").update({"status": "paused"}).eq("id", job_id).execute()

    def resume_job(self, job_id: str):
        self.paused_jobs.discard(job_id)
        supabase_client.table("jobs").update({"status": "running"}).eq("id", job_id).execute()

    def cancel_job(self, job_id: str):
        # The progress callback will raise an exception to stop thread execution
        supabase_client.table("jobs").update({"status": "cancelled"}).eq("id", job_id).execute()

# Global worker manager instance
worker_manager = JobWorkerManager()
import time
