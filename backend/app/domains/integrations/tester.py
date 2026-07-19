from dataclasses import dataclass

import httpx


@dataclass(frozen=True)
class ProviderTestResult:
    status: str
    message: str


class ProviderConnectionTester:
    VIRUSTOTAL_TEST_URL = "https://www.virustotal.com/api/v3/files/44d88612fea8a8f36de82e1278abb02f"

    async def test(self, provider_id: str, credentials: dict[str, str]) -> ProviderTestResult:
        if provider_id != "virustotal":
            return ProviderTestResult("configuration_error", "Connection testing is not supported for this integration.")
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0), follow_redirects=False) as client:
                response = await client.get(self.VIRUSTOTAL_TEST_URL, headers={"x-apikey": credentials["api_key"]})
        except (httpx.TimeoutException, httpx.NetworkError):
            return ProviderTestResult("unreachable", "The provider could not be reached.")
        if response.status_code == 200:
            return ProviderTestResult("connected", "The credential was accepted by the provider.")
        if response.status_code in {401, 403}:
            return ProviderTestResult("invalid_credentials", "The submitted credential was rejected by the provider.")
        if response.status_code == 429:
            return ProviderTestResult("rate_limited", "The provider rate limit prevented this test.")
        return ProviderTestResult("provider_error", "The provider could not complete the connection test.")
