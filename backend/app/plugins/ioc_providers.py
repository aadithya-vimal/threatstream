import base64
import logging
from datetime import datetime
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.core.runtime_secrets import get_runtime_config, get_secret_value
from app.plugins.base import BasePlugin
from app.database.supabase_client import supabase_client

logger = logging.getLogger("threatstream.plugins.ioc_providers")


class IOCProviderPlugin(BasePlugin):
    provider_name = "provider"
    api_key_env = ""
    base_url = ""
    headers_name = "Authorization"

    def initialize(self) -> bool:
        return True

    def authenticate(self) -> bool:
        return True

    def validate(self, payload: Dict[str, Any]) -> bool:
        return bool(payload.get("ioc_value") and payload.get("ioc_type"))

    def cleanup(self) -> bool:
        return True

    def _api_key(self) -> str:
        runtime_config = get_runtime_config(f"integrations.{self.provider_name.lower().replace(' ', '_')}")
        return (
            self.config.get("api_key")
            or self.config.get("API_KEY")
            or runtime_config.get("api_key")
            or get_secret_value(f"integrations.{self.provider_name.lower().replace(' ', '_')}.api_key", getattr(settings, self.api_key_env, ""))
            or ""
        ).strip()

    def _headers(self) -> Dict[str, str]:
        return {"accept": "application/json"}

    def _cache_get(self, ioc_value: str) -> Optional[Dict[str, Any]]:
        try:
            cache = supabase_client.table("enrichment_results").select("*").eq("ioc_value", ioc_value).eq("provider", self.provider_name).order("enriched_at", desc=True).limit(1).execute()
            if cache.data:
                return cache.data[0]
        except Exception as exc:
            logger.warning("%s cache lookup failed: %s", self.provider_name, exc)
        return None

    def _cache_set(self, ioc_value: str, ioc_type: str, result: Dict[str, Any]) -> None:
        try:
            supabase_client.table("enrichment_results").insert({
                "ioc_value": ioc_value,
                "ioc_type": ioc_type,
                "provider": self.provider_name,
                "reputation": result.get("reputation") or result.get("verdict") or "unknown",
                "confidence": result.get("confidence", 0),
                "risk_score": result.get("risk_score", 0),
                "raw_result": result,
                "enriched_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as exc:
            logger.warning("%s cache write failed: %s", self.provider_name, exc)

    def _request(self, method: str, url: str, headers: Dict[str, str] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
        with httpx.Client(timeout=15.0) as client:
            response = client.request(method, url, headers=headers or self._headers(), params=params)
            response.raise_for_status()
            return response.json()


class VirusTotalIOCPlugin(IOCProviderPlugin):
    provider_name = "VirusTotal"
    api_key_env = "VIRUSTOTAL_API_KEY"
    base_url = "https://www.virustotal.com/api/v3"

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        from app.plugins.virustotal import VirusTotalPlugin

        return VirusTotalPlugin(self.config).execute(payload, progress_callback)

    def health(self) -> Dict[str, Any]:
        from app.plugins.virustotal import VirusTotalPlugin

        return VirusTotalPlugin(self.config).health()


class AbuseIPDBPlugin(IOCProviderPlugin):
    provider_name = "AbuseIPDB"
    api_key_env = "ABUSEIPDB_API_KEY"
    base_url = "https://api.abuseipdb.com/api/v2/check"

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        ip = payload["ioc_value"]
        api_key = self._api_key()
        if not api_key:
            raise ValueError("AbuseIPDB API key missing")
        cached = self._cache_get(ip)
        if cached:
            return cached["raw_result"]
        raw = self._request("GET", self.base_url, headers={"Key": api_key, "Accept": "application/json"}, params={"ipAddress": ip, "maxAgeInDays": 90, "verbose": "true"})
        data = raw.get("data", {})
        result = {
            "ioc_value": ip,
            "ioc_type": "ip",
            "provider": self.provider_name,
            "confidence": data.get("abuseConfidenceScore", 0),
            "risk_score": data.get("abuseConfidenceScore", 0),
            "verdict": "malicious" if data.get("abuseConfidenceScore", 0) >= 50 else "suspicious",
            "reputation": "malicious" if data.get("abuseConfidenceScore", 0) >= 50 else "clean",
            "raw": data,
        }
        self._cache_set(ip, "ip", result)
        return result

    def health(self) -> Dict[str, Any]:
        return {"status": "connected" if self._api_key() else "not_configured", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}


class GreyNoisePlugin(IOCProviderPlugin):
    provider_name = "GreyNoise"
    api_key_env = "GREYNOISE_API_KEY"
    base_url = "https://api.greynoise.io/v3/community"

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        ip = payload["ioc_value"]
        api_key = self._api_key()
        if not api_key:
            raise ValueError("GreyNoise API key missing")
        cached = self._cache_get(ip)
        if cached:
            return cached["raw_result"]
        raw = self._request("GET", f"{self.base_url}/{ip}", headers={"key": api_key, "accept": "application/json"})
        result = {
            "ioc_value": ip,
            "ioc_type": "ip",
            "provider": self.provider_name,
            "confidence": 90 if raw.get("noise") else 70,
            "risk_score": 80 if raw.get("noise") else 20,
            "verdict": "malicious" if raw.get("noise") else "clean",
            "reputation": raw.get("classification", "unknown"),
            "raw": raw,
        }
        self._cache_set(ip, "ip", result)
        return result

    def health(self) -> Dict[str, Any]:
        return {"status": "connected" if self._api_key() else "not_configured", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}


class ShodanPlugin(IOCProviderPlugin):
    provider_name = "Shodan"
    api_key_env = "SHODAN_API_KEY"
    base_url = "https://api.shodan.io/shodan"

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        target = payload["ioc_value"]
        api_key = self._api_key()
        if not api_key:
            raise ValueError("Shodan API key missing")
        endpoint = f"{self.base_url}/host/{target}"
        raw = self._request("GET", endpoint, params={"key": api_key})
        result = {"ioc_value": target, "ioc_type": payload.get("ioc_type"), "provider": self.provider_name, "confidence": 80, "risk_score": 50, "verdict": "suspicious", "reputation": "unknown", "raw": raw}
        self._cache_set(target, payload.get("ioc_type"), result)
        return result

    def health(self) -> Dict[str, Any]:
        return {"status": "connected" if self._api_key() else "not_configured", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}


class CensysPlugin(IOCProviderPlugin):
    provider_name = "Censys"
    api_key_env = "CENSYS_API_ID"
    base_url = "https://search.censys.io/api/v2"

    def _headers(self) -> Dict[str, str]:
        config = get_runtime_config("integrations.censys")
        api_id = self.config.get("api_id") or self.config.get("API_ID") or config.get("api_id") or getattr(settings, 'CENSYS_API_ID', '')
        api_secret = self.config.get("api_secret") or self.config.get("API_SECRET") or config.get("api_secret") or getattr(settings, 'CENSYS_API_SECRET', '')
        creds = f"{api_id}:{api_secret}"
        encoded = base64.b64encode(creds.encode()).decode()
        return {"accept": "application/json", "authorization": f"Basic {encoded}"}

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        target = payload["ioc_value"]
        config = get_runtime_config("integrations.censys")
        if not (self.config.get("api_id") or config.get("api_id") or getattr(settings, "CENSYS_API_ID", "")) or not (self.config.get("api_secret") or config.get("api_secret") or getattr(settings, "CENSYS_API_SECRET", "")):
            raise ValueError("Censys API credentials missing")
        raw = self._request("GET", f"{self.base_url}/hosts/{target}", headers=self._headers())
        result = {"ioc_value": target, "ioc_type": payload.get("ioc_type"), "provider": self.provider_name, "confidence": 75, "risk_score": 45, "verdict": "suspicious", "reputation": "unknown", "raw": raw}
        self._cache_set(target, payload.get("ioc_type"), result)
        return result

    def health(self) -> Dict[str, Any]:
        config = get_runtime_config("integrations.censys")
        ready = (self.config.get("api_id") or config.get("api_id") or getattr(settings, "CENSYS_API_ID", "")) and (self.config.get("api_secret") or config.get("api_secret") or getattr(settings, "CENSYS_API_SECRET", ""))
        return {"status": "connected" if ready else "not_configured", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}


class URLHausPlugin(IOCProviderPlugin):
    provider_name = "URLHaus"
    api_key_env = ""
    base_url = "https://urlhaus-api.abuse.ch/v1"

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        value = payload["ioc_value"]
        endpoint = "host/" if payload.get("ioc_type") == "ip" else "url/"
        raw = self._request("POST", f"{self.base_url}/{endpoint}", params=None, headers={"Content-Type": "application/x-www-form-urlencoded"},)
        return {"ioc_value": value, "ioc_type": payload.get("ioc_type"), "provider": self.provider_name, "confidence": 50, "risk_score": 50, "verdict": "unknown", "reputation": "unknown", "raw": raw}

    def health(self) -> Dict[str, Any]:
        return {"status": "connected", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}


class OTXPlugin(IOCProviderPlugin):
    provider_name = "OTX"
    api_key_env = "OTX_API_KEY"
    base_url = "https://otx.alienvault.com/api/v1"

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        value = payload["ioc_value"]
        api_key = self._api_key()
        if not api_key:
            raise ValueError("OTX API key missing")
        path = {
            "ip": f"indicators/IPv4/{value}/general",
            "domain": f"indicators/domain/{value}/general",
            "hash": f"indicators/file/{value}/general",
            "url": f"indicators/url/{value}/general",
        }.get(payload.get("ioc_type"), f"indicators/domain/{value}/general")
        raw = self._request("GET", f"{self.base_url}/{path}", headers={"X-OTX-API-KEY": api_key})
        return {"ioc_value": value, "ioc_type": payload.get("ioc_type"), "provider": self.provider_name, "confidence": 70, "risk_score": 60, "verdict": "suspicious", "reputation": "unknown", "raw": raw}

    def health(self) -> Dict[str, Any]:
        return {"status": "connected" if self._api_key() else "not_configured", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}


class HybridAnalysisPlugin(IOCProviderPlugin):
    provider_name = "Hybrid Analysis"
    api_key_env = "HYBRIDANALYSIS_API_KEY"
    base_url = "https://www.hybrid-analysis.com/api/v2"

    def _headers(self) -> Dict[str, str]:
        return {"api-key": self._api_key(), "user-agent": "ThreatStream/1.0"}

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        value = payload["ioc_value"]
        if not self._api_key():
            raise ValueError("Hybrid Analysis API key missing")
        raw = self._request("GET", f"{self.base_url}/search/hash/{value}", headers=self._headers())
        return {"ioc_value": value, "ioc_type": payload.get("ioc_type"), "provider": self.provider_name, "confidence": 70, "risk_score": 70, "verdict": "suspicious", "reputation": "unknown", "raw": raw}

    def health(self) -> Dict[str, Any]:
        return {"status": "connected" if self._api_key() else "not_configured", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}


class AnyRunPlugin(IOCProviderPlugin):
    provider_name = "Any.Run"
    api_key_env = "ANYRUN_API_KEY"
    base_url = "https://api.any.run/v1"

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key()}", "accept": "application/json"}

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        value = payload["ioc_value"]
        if not self._api_key():
            raise ValueError("Any.Run API key missing")
        raw = self._request("GET", f"{self.base_url}/search", headers=self._headers(), params={"q": value})
        return {"ioc_value": value, "ioc_type": payload.get("ioc_type"), "provider": self.provider_name, "confidence": 65, "risk_score": 65, "verdict": "suspicious", "reputation": "unknown", "raw": raw}

    def health(self) -> Dict[str, Any]:
        return {"status": "connected" if self._api_key() else "not_configured", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}


class MISPPlugin(IOCProviderPlugin):
    provider_name = "MISP"
    api_key_env = "MISP_API_KEY"

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        config = get_runtime_config("integrations.misp")
        if not (self.config.get("url") or config.get("url") or getattr(settings, "MISP_URL", "")) or not self._api_key():
            raise ValueError("MISP URL/API key missing")
        value = payload["ioc_value"]
        base_url = (self.config.get("url") or config.get("url") or getattr(settings, "MISP_URL", "")).rstrip("/")
        raw = self._request("POST", f"{base_url}/attributes/restSearch", headers={"Authorization": self._api_key(), "Accept": "application/json"}, params={"value": value})
        return {"ioc_value": value, "ioc_type": payload.get("ioc_type"), "provider": self.provider_name, "confidence": 75, "risk_score": 70, "verdict": "suspicious", "reputation": "unknown", "raw": raw}

    def health(self) -> Dict[str, Any]:
        config = get_runtime_config("integrations.misp")
        ready = (self.config.get("url") or config.get("url") or getattr(settings, "MISP_URL", "")) and self._api_key()
        return {"status": "connected" if ready else "not_configured", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}


class OpenCTIPlugin(IOCProviderPlugin):
    provider_name = "OpenCTI"
    api_key_env = "OPENCTI_API_KEY"

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        config = get_runtime_config("integrations.opencti")
        if not (self.config.get("url") or config.get("url") or getattr(settings, "OPENCTI_URL", "")) or not self._api_key():
            raise ValueError("OpenCTI URL/API key missing")
        value = payload["ioc_value"]
        base_url = (self.config.get("url") or config.get("url") or getattr(settings, "OPENCTI_URL", "")).rstrip("/")
        raw = self._request("POST", f"{base_url}/graphql", headers={"Authorization": f"Bearer {self._api_key()}", "Content-Type": "application/json"}, params=None)
        return {"ioc_value": value, "ioc_type": payload.get("ioc_type"), "provider": self.provider_name, "confidence": 60, "risk_score": 55, "verdict": "suspicious", "reputation": "unknown", "raw": raw}

    def health(self) -> Dict[str, Any]:
        config = get_runtime_config("integrations.opencti")
        ready = (self.config.get("url") or config.get("url") or getattr(settings, "OPENCTI_URL", "")) and self._api_key()
        return {"status": "connected" if ready else "not_configured", "last_successful_sync": None, "quota_remaining": None, "error_count": 0}
