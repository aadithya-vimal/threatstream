from app.database.migration_scope import include_threatstream_name


def test_alembic_includes_only_threatstream_owned_schema():
    assert include_threatstream_name("public", "schema", {})
    assert include_threatstream_name(None, "schema", {})
    assert not include_threatstream_name("neon_auth", "schema", {})
    assert not include_threatstream_name("session", "table", {"schema_name": "neon_auth"})
    assert include_threatstream_name("users", "table", {"schema_name": "public"})
