import logging
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api.endpoints import jobs, malware, plugins, scheduler, telemetry
from .workers.job_worker import worker_manager
from .scheduler.task_scheduler import task_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("threatstream.api")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints
app.include_router(jobs.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["Jobs Queue"])
app.include_router(malware.router, prefix=f"{settings.API_V1_STR}/malware", tags=["Malware Analysis"])
app.include_router(plugins.router, prefix=f"{settings.API_V1_STR}/plugins", tags=["Plugins Marketplace"])
app.include_router(scheduler.router, prefix=f"{settings.API_V1_STR}/scheduler", tags=["Scheduler Task List"])
app.include_router(telemetry.router, prefix=f"{settings.API_V1_STR}/telemetry", tags=["Endpoint Telemetry"])

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing ThreatStream backend server...")

    if settings.ENABLE_BACKGROUND_TASKS:
        # Background workers belong in a dedicated process in production.
        await worker_manager.start()
        await task_scheduler.start()
    else:
        logger.info("Background task loops are disabled for this API process.")
    
    logger.info("All platform backend engines started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down ThreatStream backend server...")

    if settings.ENABLE_BACKGROUND_TASKS:
        worker_manager.stop()
        await task_scheduler.shutdown()
    
    logger.info("All platform backend engines shut down cleanly")

@app.get("/health", tags=["Health Checker"])
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "active_jobs": len(worker_manager.active_jobs)
    }
