import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import settings
from app.database.base import Base
from app.database.engine import normalize_async_database_url
from app.database.models import tenancy  # noqa: F401


config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

database = normalize_async_database_url(settings.DATABASE_URL_DIRECT or settings.DATABASE_URL)
config.set_main_option("sqlalchemy.url", database.url.render_as_string(hide_password=False).replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=database.url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    connectable = async_engine_from_config(configuration, prefix="sqlalchemy.", connect_args=database.connect_args, pool_pre_ping=True)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_async_migrations())
