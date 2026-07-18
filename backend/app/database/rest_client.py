from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import PermissionDeniedError, UpstreamServiceError


class SupabaseRestClient:
    def __init__(self, access_token: str):
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            raise UpstreamServiceError("Database API is not configured", status_code=503, code="database_unavailable")
        self.base_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json: Any = None,
        prefer: str | None = None,
    ) -> Any:
        headers = dict(self.headers)
        if prefer:
            headers["Prefer"] = prefer
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.request(
                    method,
                    f"{self.base_url}/{path.lstrip('/')}",
                    params=params,
                    json=json,
                    headers=headers,
                )
        except httpx.RequestError as exc:
            raise UpstreamServiceError("Database API is unavailable", status_code=503, code="database_unavailable") from exc

        if response.status_code in (401, 403):
            raise PermissionDeniedError()
        if response.status_code >= 400:
            raise UpstreamServiceError(
                "Database operation failed",
                status_code=409 if response.status_code == 409 else 502,
                code="persistence_failed",
            )
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    async def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        data = await self.request("GET", table, params=params)
        return data if isinstance(data, list) else []

    async def rpc(self, function_name: str, payload: dict[str, Any]) -> Any:
        return await self.request("POST", f"rpc/{function_name}", json=payload)
