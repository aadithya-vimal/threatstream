from dataclasses import dataclass

from sqlalchemy import URL, make_url, text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import settings


@dataclass(frozen=True)
class AsyncDatabaseConfig:
    url: URL
    connect_args: dict[str, object]


def normalize_async_database_url(raw_url: str) -> AsyncDatabaseConfig:
    if not raw_url:
        raise RuntimeError("DATABASE_URL is not configured")
    normalized = raw_url.replace("postgres://", "postgresql://", 1)
    url = make_url(normalized)
    if url.drivername in {"postgresql", "postgresql+psycopg", "postgresql+psycopg2"}:
        url = url.set(drivername="postgresql+asyncpg")
    query = dict(url.query)
    ssl_mode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    url = url.set(query=query)
    connect_args: dict[str, object] = {}
    if ssl_mode and ssl_mode.lower() not in {"disable", "allow"}:
        connect_args["ssl"] = True
    return AsyncDatabaseConfig(url=url, connect_args=connect_args)


_engine: AsyncEngine | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        database = normalize_async_database_url(settings.DATABASE_URL)
        _engine = create_async_engine(
            database.url,
            connect_args=database.connect_args,
            echo=settings.DATABASE_ECHO,
            pool_pre_ping=True,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
        )
    return _engine


async def database_is_ready() -> bool:
    try:
        async with get_engine().connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def dispose_engine() -> None:
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
