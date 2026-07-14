import time
import base64
import logging
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.core.runtime_secrets import get_runtime_setting
from app.plugins.base import BasePlugin
from app.database.supabase_client import supabase_client

logger = logging.getLogger("threatstream.plugins.virustotal")

class VirusTotalPlugin(BasePlugin):
    """
    Production-ready VirusTotal API v3 Connector.
    Supports file hashes (MD5, SHA-1, SHA-256), IP addresses, domains, and URLs.
    """

    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.api_key = (
            self.config.get("api_key")
            or self.config.get("API_KEY")
            or get_runtime_setting("integrations.virustotal.api_key")
        )
        self.base_url = "https://www.virustotal.com/api/v3"
        self.last_sync_time: Optional[str] = None
        self.auth_status = "not_configured"
        self.quota_limit = 500
        self.quota_used = 0

    def initialize(self) -> bool:
        if not self.api_key:
            self.auth_status = "not_configured"
            logger.warning("VirusTotal API Key not configured")
            return False
        return True

    def authenticate(self) -> bool:
        """
        Validates API Key by querying the VirusTotal users endpoint.
        """
        if not self.api_key:
            self.auth_status = "not_configured"
            return False

        headers = {
            "x-apikey": self.api_key,
            "accept": "application/json"
        }
        
        try:
            # Query current API key owner info to validate authenticity
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{self.base_url}/users/me", headers=headers)
                if res.status_code == 200:
                    self.auth_status = "connected"
                    data = res.json().get("data", {})
                    # Try to extract quota info
                    quotas = data.get("attributes", {}).get("quotas", {})
                    api_requests_daily = quotas.get("api_requests_daily", {}).get("user", {})
                    self.quota_limit = api_requests_daily.get("allowed", 500)
                    self.quota_used = api_requests_daily.get("used", 0)
                    return True
                elif res.status_code == 401:
                    self.auth_status = "auth_failed"
                    logger.error("VirusTotal Authentication failed: Invalid API Key")
                    return False
                elif res.status_code == 429:
                    self.auth_status = "rate_limited"
                    logger.error("VirusTotal API Key quota or rate limit exceeded")
                    return False
        except Exception as e:
            logger.error(f"Error authenticating with VirusTotal: {str(e)}")
            self.auth_status = "disconnected"
        
        return False

    def validate(self, payload: Dict[str, Any]) -> bool:
        ioc_value = payload.get("ioc_value")
        ioc_type = payload.get("ioc_type")
        if not ioc_value or not ioc_type:
            return False
        
        ioc_type = ioc_type.lower()
        if ioc_type not in ["hash", "ip", "domain", "url", "md5", "sha1", "sha256"]:
            return False
            
        return True

    def _get_url_id(self, url: str) -> str:
        """
        Generates the base64 URL ID required by VirusTotal API v3.
        """
        return base64.urlsafe_b64encode(url.encode()).decode().strip("=")

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        ioc_value = payload.get("ioc_value")
        ioc_type = payload.get("ioc_type", "").lower()
        bypass_cache = payload.get("bypass_cache", False)

        if not self.api_key:
            raise ValueError("VirusTotal API Key is missing. Configure it in settings first.")

        # Cache check
        if not bypass_cache:
            if progress_callback:
                progress_callback(10)
            
            try:
                # Cache validity window: 24 hours
                cache_threshold = (datetime.utcnow() - timedelta(hours=24)).isoformat()
                cache_res = supabase_client.table("enrichment_results") \
                    .select("*") \
                    .eq("ioc_value", ioc_value) \
                    .eq("provider", "VirusTotal") \
                    .gte("enriched_at", cache_threshold) \
                    .execute()

                if cache_res.data and len(cache_res.data) > 0:
                    logger.info(f"Cache hit for IOC: {ioc_value}")
                    if progress_callback:
                        progress_callback(100)
                    return cache_res.data[0]["raw_result"]
            except Exception as ce:
                logger.warn(f"Failed to query cache: {str(ce)}")

        # Construct endpoint url
        endpoint = ""
        # Handle type normalizations
        if ioc_type in ["hash", "md5", "sha1", "sha256"]:
            endpoint = f"files/{ioc_value}"
        elif ioc_type == "ip":
            endpoint = f"ip_addresses/{ioc_value}"
        elif ioc_type == "domain":
            endpoint = f"domains/{ioc_value}"
        elif ioc_type == "url":
            url_id = self._get_url_id(ioc_value)
            endpoint = f"urls/{url_id}"

        headers = {
            "x-apikey": self.api_key,
            "accept": "application/json"
        }

        if progress_callback:
            progress_callback(30)

        logger.info(f"Querying VirusTotal for {ioc_type}: {ioc_value}")
        
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.base_url}/{endpoint}", headers=headers)
                
                # Check for rate limit exhaustion and implement sleep retry
                if res.status_code == 429:
                    self.auth_status = "rate_limited"
                    logger.warning("Rate limit hit, sleeping for 2 seconds before retrying...")
                    time.sleep(2.0)
                    res = client.get(f"{self.base_url}/{endpoint}", headers=headers)
                
                if res.status_code == 200:
                    self.last_sync_time = datetime.utcnow().isoformat()
                    self.auth_status = "connected"
                    raw_data = res.json().get("data", {})
                    attributes = raw_data.get("attributes", {})
                    
                    # Parse key analytics results
                    stats = attributes.get("last_analysis_stats", {})
                    malicious = stats.get("malicious", 0)
                    total = sum(stats.values()) if stats else 0
                    
                    verdict = "clean"
                    if malicious > 5:
                        verdict = "malicious"
                    elif malicious > 0:
                        verdict = "suspicious"

                    confidence = 100 if total > 0 else 0
                    risk_score = int((malicious / total) * 100) if total > 0 else 0

                    parsed_result = {
                        "detection_ratio": f"{malicious}/{total}",
                        "malicious_count": malicious,
                        "total_engines": total,
                        "verdict": verdict,
                        "reputation": attributes.get("reputation", 0),
                        "popular_threat_label": attributes.get("popular_threat_classification", {}).get("suggested_threat_label", "Unknown"),
                        "first_seen": attributes.get("first_submission_date") or attributes.get("creation_date"),
                        "last_analysis": attributes.get("last_analysis_date"),
                        "file_type": attributes.get("type_description", "N/A"),
                        "names": attributes.get("names", []),
                        "stats": stats,
                        "risk_score": risk_score
                    }

                    # Progress update
                    if progress_callback:
                        progress_callback(80)

                    # Update Supabase cache
                    cache_record = {
                        "ioc_value": ioc_value,
                        "ioc_type": ioc_type,
                        "provider": "VirusTotal",
                        "reputation": verdict,
                        "confidence": confidence,
                        "risk_score": risk_score,
                        "raw_result": parsed_result,
                        "enriched_at": datetime.utcnow().isoformat()
                    }
                    
                    try:
                        # Clear old cache values for this IOC first
                        supabase_client.table("enrichment_results").delete().eq("ioc_value", ioc_value).eq("provider", "VirusTotal").execute()
                        supabase_client.table("enrichment_results").insert(cache_record).execute()
                        
                        # Also update the primary IOC status in indicators table
                        supabase_client.table("indicators") \
                            .update({
                                "risk_score": risk_score,
                                "verdict": verdict,
                                "last_seen": datetime.utcnow().isoformat()
                            }) \
                            .eq("value", ioc_value) \
                            .execute()
                    except Exception as db_e:
                        logger.error(f"Failed to update database enrichment caches: {str(db_e)}")

                    if progress_callback:
                        progress_callback(100)
                    return parsed_result

                elif res.status_code == 401:
                    self.auth_status = "auth_failed"
                    raise PermissionError("VirusTotal invalid API credentials")
                elif res.status_code == 404:
                    # Return custom empty record if hash/ioc is not found in database
                    empty_res = {"status": "not_found", "message": "Indicator not present in VirusTotal index."}
                    if progress_callback:
                        progress_callback(100)
                    return empty_res
                else:
                    raise Exception(f"VirusTotal request failed with status: {res.status_code}")
                    
        except Exception as e:
            self.auth_status = "disconnected"
            raise e

    def health(self) -> Dict[str, Any]:
        """
        Retrieves real-time connectivity status metrics.
        """
        # Trigger validation check
        self.authenticate()
        
        return {
            "status": self.auth_status,
            "quota_remaining": max(0, self.quota_limit - self.quota_used),
            "last_successful_sync": self.last_sync_time,
            "error_count": 0
        }

    def cleanup(self) -> bool:
        return True
