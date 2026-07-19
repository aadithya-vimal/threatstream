import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import integrations, tenancy
from app.core.config import settings
from app.core.errors import UpstreamServiceError
from app.database.engine import database_is_ready, dispose_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("threatstream.api")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await dispose_engine()


app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Correlation-ID", "X-Workspace-ID"],
)


@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    supplied = request.headers.get("X-Correlation-ID")
    try:
        correlation_id = UUID(supplied) if supplied else uuid4()
    except ValueError:
        correlation_id = uuid4()
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = str(correlation_id)
    return response


def error_response(request: Request, status_code: int, code: str, message: str) -> JSONResponse:
    correlation_id = str(getattr(request.state, "correlation_id", uuid4()))
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "correlation_id": correlation_id}},
        headers={"X-Correlation-ID": correlation_id},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = "permission_denied" if exc.status_code == 403 else "request_failed"
    if exc.status_code == 401:
        code = "authentication_required"
    return error_response(request, exc.status_code, code, str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return error_response(request, 422, "validation_failed", "Request validation failed")


@app.exception_handler(UpstreamServiceError)
async def upstream_exception_handler(request: Request, exc: UpstreamServiceError):
    return error_response(request, exc.status_code, exc.code, exc.message)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled API error", extra={"correlation_id": str(getattr(request.state, "correlation_id", "unknown"))})
    return error_response(request, 500, "internal_error", "An unexpected error occurred")


app.include_router(tenancy.router, prefix=f"{settings.API_V1_STR}/tenancy", tags=["Tenancy"])
app.include_router(integrations.router, prefix=settings.API_V1_STR, tags=["Integrations"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "scope": "liveness", "service": "api", "timestamp": datetime.now(UTC).isoformat()}


@app.get("/ready", tags=["Health"])
async def readiness_check():
    if not settings.DATABASE_URL:
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "not_configured"})
    database_status = "reachable" if await database_is_ready() else "unavailable"
    status_code = 200 if database_status == "reachable" else 503
    return JSONResponse(status_code=status_code, content={"status": "ready" if status_code == 200 else "unavailable", "database": database_status})
