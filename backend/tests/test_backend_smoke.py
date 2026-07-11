import asyncio

from fastapi.security import HTTPAuthorizationCredentials

from app.core import security
from app.workers import job_worker


class _FakeQuery:
    def __init__(self, table_name, client, selected=None):
        self.table_name = table_name
        self.client = client
        self.selected = selected
        self.filters = {}
        self.update_payload = None
        self.insert_payload = None

    def select(self, *args, **kwargs):
        self.selected = args or kwargs.get("columns")
        return self

    def eq(self, field, value):
        self.filters[field] = value
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def update(self, payload):
        self.update_payload = payload
        return self

    def insert(self, payload):
        self.insert_payload = payload
        return self

    def execute(self):
        if self.insert_payload is not None:
            record = {"id": "job-1", **self.insert_payload}
            self.client.tables.setdefault(self.table_name, []).append(record)
            return type("Response", (), {"data": [record]})()

        if self.update_payload is not None:
            rows = self.client.tables.get(self.table_name, [])
            for row in rows:
                if all(str(row.get(field)) == str(value) for field, value in self.filters.items()):
                    row.update(self.update_payload)
                    return type("Response", (), {"data": [row]})()
            return type("Response", (), {"data": []})()

        rows = self.client.tables.get(self.table_name, [])
        filtered = [
            row for row in rows
            if all(str(row.get(field)) == str(value) for field, value in self.filters.items())
        ]
        return type("Response", (), {"data": filtered})()


class _FakeSupabaseClient:
    def __init__(self):
        self.tables = {
            "connectors": [
                {"id": "connector-1", "config": {"api_key": "secret"}}
            ],
            "jobs": [
                {
                    "id": "job-1",
                    "name": "Test Nmap Job",
                    "type": "scan",
                    "status": "queued",
                    "priority": 5,
                    "payload": {"target": "127.0.0.1"},
                    "connector_id": "connector-1",
                }
            ],
        }

    def table(self, table_name):
        return _FakeQuery(table_name, self)


class _FakePlugin:
    def __init__(self):
        self.executed = False
        self.cleaned_up = False

    def execute(self, payload, progress_callback=None):
        self.executed = True
        if progress_callback:
            progress_callback(100)
        return {"ok": True, "payload": payload}

    def cleanup(self):
        self.cleaned_up = True
        return True


def test_invalid_jwt_is_rejected():
    original_secret = security.settings.SUPABASE_JWT_SECRET
    security.settings.SUPABASE_JWT_SECRET = "real-secret"
    try:
        try:
            security.get_current_user(
                HTTPAuthorizationCredentials(scheme="Bearer", credentials="bad-token")
            )
            raise AssertionError("Expected invalid token to be rejected")
        except Exception as exc:
            assert getattr(exc, "status_code", None) == 401
    finally:
        security.settings.SUPABASE_JWT_SECRET = original_secret


def test_job_worker_completes_job_and_updates_state(monkeypatch):
    fake_client = _FakeSupabaseClient()
    fake_plugin = _FakePlugin()

    monkeypatch.setattr(job_worker, "supabase_client", fake_client)
    monkeypatch.setattr(job_worker.PluginManager, "get_plugin", lambda *args, **kwargs: fake_plugin)

    worker = job_worker.JobWorkerManager()

    asyncio.run(worker._execute_job(fake_client.tables["jobs"][0]))

    job = fake_client.tables["jobs"][0]
    assert job["status"] == "completed"
    assert job["progress"] == 100
    assert job["result"]["ok"] is True
    assert fake_plugin.executed is True
    assert fake_plugin.cleaned_up is True
