import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.database.supabase_client import supabase_client

logger = logging.getLogger("threatstream.scheduler")

class ThreatStreamScheduler:
    """
    Coordinates timed triggers, recurring syncs, and custom cron sweeps.
    """
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_started = False

    async def start(self):
        if self.is_started:
            return
        self.is_started = True
        logger.info("Starting ThreatStream APScheduler Engine")
        self.scheduler.start()
        # Initial synchronization of tasks from database
        await self.sync_database_tasks()

    async def shutdown(self):
        if not self.is_started:
            return
        self.is_started = False
        logger.info("Shutting down ThreatStream APScheduler Engine")
        self.scheduler.shutdown()

    async def sync_database_tasks(self):
        """
        Queries scheduled_tasks from Supabase and registers them in APScheduler.
        """
        # Clear existing jobs in scheduler to prevent duplicates
        self.scheduler.remove_all_jobs()
        
        try:
            response = supabase_client.table("scheduled_tasks") \
                .select("*") \
                .eq("enabled", True) \
                .execute()

            if response.data:
                for task in response.data:
                    task_id = task["id"]
                    cron_expr = task.get("cron_expression")
                    
                    if cron_expr:
                        try:
                            # Register trigger handler
                            self.scheduler.add_job(
                                func=self._trigger_scheduled_task,
                                trigger=CronTrigger.from_crontab(cron_expr),
                                args=[task],
                                id=task_id,
                                replace_existing=True
                            )
                            logger.info(f"Registered scheduled task: {task['name']} (Cron: {cron_expr})")
                        except Exception as ce:
                            logger.error(f"Failed to parse cron for task {task_id}: {str(ce)}")
        except Exception as e:
            logger.error(f"Failed to synchronize scheduled tasks from database: {str(e)}")

    async def _trigger_scheduled_task(self, task: dict):
        """
        Action triggered by APScheduler.
        Queues a new job in the jobs table for workers to pick up.
        """
        task_id = task["id"]
        task_name = task["name"]
        job_type = task["job_type"]
        payload = task.get("payload") or {}
        connector_id = task.get("connector_id")

        logger.info(f"Triggering scheduled task execution: {task_name}")

        try:
            # 1. Insert a new job in queued state
            new_job = {
                "name": f"Scheduled Run: {task_name}",
                "type": job_type,
                "status": "queued",
                "priority": 5,
                "payload": payload,
                "connector_id": connector_id,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            job_response = supabase_client.table("jobs").insert(new_job).execute()
            
            # 2. Update task execution statistics
            run_count = task.get("run_count", 0) + 1
            next_run_time = None
            
            # Calculate next run timestamp if active
            scheduler_job = self.scheduler.get_job(task_id)
            if scheduler_job and scheduler_job.next_run_time:
                next_run_time = scheduler_job.next_run_time.isoformat()

            supabase_client.table("scheduled_tasks") \
                .update({
                    "last_run": datetime.utcnow().isoformat(),
                    "next_run": next_run_time,
                    "run_count": run_count
                }) \
                .eq("id", task_id) \
                .execute()

            logger.info(f"Successfully queued job for scheduled task: {task_name}")

        except Exception as e:
            logger.error(f"Failed to trigger scheduled run for task {task_id}: {str(e)}")
            # Log failure stats
            try:
                fail_count = task.get("fail_count", 0) + 1
                supabase_client.table("scheduled_tasks") \
                    .update({"fail_count": fail_count}) \
                    .eq("id", task_id) \
                    .execute()
            except Exception:
                pass

    def get_jobs_list(self):
        """
        Returns a list of scheduled jobs.
        """
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
            })
        return jobs

# Global scheduler instance
task_scheduler = ThreatStreamScheduler()
