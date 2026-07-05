import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.plugins.base import BasePlugin
import importlib
from app.database.supabase_client import supabase_client

logger = logging.getLogger("threatstream.plugins.orchestrator")

class EnrichmentOrchestrator(BasePlugin):
    """
    Threat Intelligence Orchestrator.
    Manages concurrent multi-provider enrichment, result normalization, 
    merge engine conflict resolution, and provider scoring health tracking.
    """

    def initialize(self) -> bool:
        logger.info("Initializing Threat Intelligence Enrichment Orchestrator")
        return True

    def authenticate(self) -> bool:
        return True

    def validate(self, payload: Dict[str, Any]) -> bool:
        ioc_value = payload.get("ioc_value")
        ioc_type = payload.get("ioc_type")
        return bool(ioc_value and ioc_type)

    async def _fetch_active_enrichers(self) -> List[Dict[str, Any]]:
        """
        Retrieves all enabled enrichment connectors from Supabase.
        """
        try:
            res = supabase_client.table("connectors") \
                .select("*") \
                .eq("category", "enrichment") \
                .eq("status", "active") \
                .execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Failed to fetch active enrichers from DB: {str(e)}")
            return []

    async def _execute_provider_async(
        self, 
        conn: Dict[str, Any], 
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Wrapper running a single provider plugin execute method inside a thread pool,
        while tracking latency, health metrics, and updating the database.
        """
        plugin_name = conn["name"]
        display_name = conn["display_name"]
        conn_id = conn["id"]
        config = conn.get("config") or {}
        health = conn.get("health") or {}

        # Default health structure if blank
        success_rate = health.get("success_rate", 100.0)
        total_runs = health.get("total_runs", 0) + 1
        success_count = health.get("success_count", 0)
        fail_count = health.get("fail_count", 0)
        avg_latency = health.get("avg_latency", 0.0)

        start_time = time.perf_counter()
        
        try:
            # Lazy import PluginManager to avoid circular dependency
            manager_module = importlib.import_module('app.plugins.manager')
            PluginManager = getattr(manager_module, 'PluginManager')
            plugin = PluginManager.get_plugin(plugin_name, config=config)
            
            # Execute inside executor thread
            loop = asyncio.get_running_loop()
            raw_result = await loop.run_in_executor(
                None,
                lambda: plugin.execute(payload)
            )

            latency = (time.perf_counter() - start_time) * 1000  # ms
            success_count += 1
            
            # Compute rolling average latency
            if avg_latency == 0:
                avg_latency = latency
            else:
                avg_latency = (avg_latency * 0.8) + (latency * 0.2)

            success_rate = (success_count / total_runs) * 100.0
            
            # Compute dynamic health score
            # Score starts at 100, drops on failure rates, and takes minor deductions for high latency
            health_score = max(0, int(success_rate - (fail_count * 5.0) - (5.0 if avg_latency > 2500 else 0)))

            new_health = {
                "status": "connected",
                "last_successful_sync": datetime.utcnow().isoformat(),
                "total_runs": total_runs,
                "success_count": success_count,
                "fail_count": fail_count,
                "avg_latency": int(avg_latency),
                "success_rate": int(success_rate),
                "health_score": health_score,
                "latency_ms": int(latency)
            }

            # Update connector metadata in DB
            try:
                supabase_client.table("connectors") \
                    .update({"health": new_health, "updated_at": datetime.utcnow().isoformat()}) \
                    .eq("id", conn_id) \
                    .execute()
            except Exception as dbe:
                logger.error(f"Failed to update connector health: {str(dbe)}")

            return {
                "provider": display_name,
                "status": "success",
                "result": raw_result,
                "latency_ms": int(latency),
                "health_score": health_score
            }

        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            fail_count += 1
            success_rate = (success_count / total_runs) * 100.0
            health_score = max(0, int(success_rate - (fail_count * 5.0)))

            new_health = {
                "status": "disconnected",
                "last_successful_sync": health.get("last_successful_sync"),
                "total_runs": total_runs,
                "success_count": success_count,
                "fail_count": fail_count,
                "avg_latency": int(avg_latency),
                "success_rate": int(success_rate),
                "health_score": health_score,
                "latency_ms": int(latency),
                "error": str(e)
            }

            try:
                supabase_client.table("connectors") \
                    .update({"health": new_health, "updated_at": datetime.utcnow().isoformat()}) \
                    .eq("id", conn_id) \
                    .execute()
            except Exception as dbe:
                logger.error(f"Failed to update connector health on failure: {str(dbe)}")

            return {
                "provider": display_name,
                "status": "failed",
                "error": str(e),
                "latency_ms": int(latency),
                "health_score": health_score
            }

    def _normalize_response(self, provider: str, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transforms custom provider response dictionaries into a single standardized schema.
        """
        normalized = {
            "risk_score": 0,
            "confidence": 0,
            "verdict": "unknown",
            "country": None,
            "asn": None,
            "tags": [],
            "malware_families": [],
            "threat_actors": [],
            "campaigns": [],
            "relationships": [],
            "first_seen": None,
            "last_seen": None,
            "references": [],
            "attribution": {}
        }

        # Setup attribution tracks
        for key in normalized.keys():
            if key != "attribution":
                normalized["attribution"][key] = [provider]

        if provider == "VirusTotal":
            # VT parse formats
            normalized["risk_score"] = raw.get("risk_score") or raw.get("stats", {}).get("malicious", 0) * 10
            # Normalize risk_score to 100 limit
            normalized["risk_score"] = min(100, normalized["risk_score"])
            normalized["confidence"] = 100 if raw.get("total_engines") else 80
            normalized["verdict"] = raw.get("verdict", "unknown").lower()
            
            # Parse names & classification tag
            tags = []
            if raw.get("popular_threat_label") and raw.get("popular_threat_label") != "Unknown":
                tags.append(raw["popular_threat_label"])
                normalized["malware_families"].append(raw["popular_threat_label"])
            
            if raw.get("file_type") and raw.get("file_type") != "N/A":
                tags.append(raw["file_type"])
            
            normalized["tags"] = tags
            normalized["first_seen"] = raw.get("first_seen")
            normalized["last_seen"] = raw.get("last_analysis")

            # Extract names as relationships/metadata
            if raw.get("names"):
                normalized["relationships"] = [{"type": "filename", "value": name} for name in raw["names"]]

        elif provider == "AbuseIPDB":
            # Mock or Future real AbuseIPDB parse format
            data = raw.get("data", raw)
            normalized["risk_score"] = data.get("abuseConfidenceScore", 0)
            normalized["confidence"] = 90
            normalized["verdict"] = "malicious" if normalized["risk_score"] > 50 else "clean"
            normalized["country"] = data.get("countryCode")
            normalized["asn"] = str(data.get("asn")) if data.get("asn") else None
            normalized["tags"] = ["abuse_reports"] if data.get("totalReports", 0) > 0 else []
            
        elif provider == "GreyNoise":
            # Mock or Future real GreyNoise parse format
            normalized["risk_score"] = 100 if raw.get("classification") == "malicious" else 0
            normalized["confidence"] = 95
            normalized["verdict"] = raw.get("classification", "unknown").lower()
            normalized["tags"] = raw.get("tags", [])
            normalized["asn"] = raw.get("asn")
            
        return normalized

    def _merge_normalized_results(self, normalized_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Merge Engine: resolves conflicts, combines arrays, and aggregates risk & confidence 
        based on provider reliability health weights.
        """
        if not normalized_list:
            return {
                "risk_score": 0,
                "confidence": 0,
                "verdict": "unknown",
                "tags": [],
                "malware_families": [],
                "threat_actors": [],
                "campaigns": [],
                "relationships": [],
                "attribution": {}
            }

        merged = {
            "risk_score": 0,
            "confidence": 0,
            "verdict": "unknown",
            "country": None,
            "asn": None,
            "tags": [],
            "malware_families": [],
            "threat_actors": [],
            "campaigns": [],
            "relationships": [],
            "first_seen": None,
            "last_seen": None,
            "references": [],
            "attribution": {}
        }

        # Weighted calculation helpers
        total_weight = 0
        weighted_risk = 0
        weighted_confidence = 0
        verdict_counts = {"malicious": 0, "suspicious": 0, "clean": 0, "unknown": 0}

        for norm in normalized_list:
            provider = norm["attribution"]["verdict"][0]
            # Fetch weight from provider reliability or default
            weight = 90  # Default weight
            if provider == "VirusTotal":
                weight = 100
            elif provider == "AbuseIPDB":
                weight = 80
            elif provider == "GreyNoise":
                weight = 85

            total_weight += weight
            weighted_risk += norm["risk_score"] * weight
            weighted_confidence += norm["confidence"] * weight
            
            v = norm["verdict"].lower()
            if v in verdict_counts:
                verdict_counts[v] += weight

            # Merge flat fields with source attribution tracking
            if norm.get("country") and not merged["country"]:
                merged["country"] = norm["country"]
                merged["attribution"]["country"] = [provider]
            if norm.get("asn") and not merged["asn"]:
                merged["asn"] = norm["asn"]
                merged["attribution"]["asn"] = [provider]
            
            # Combine arrays, deduplicate, and merge attribution lists
            for list_key in ["tags", "malware_families", "threat_actors", "campaigns", "relationships", "references"]:
                for item in norm[list_key]:
                    # Handle dict comparison for relationships
                    if list_key == "relationships":
                        if item not in merged[list_key]:
                            merged[list_key].append(item)
                            if list_key not in merged["attribution"]:
                                merged["attribution"][list_key] = []
                            merged["attribution"][list_key].append(provider)
                    else:
                        if item not in merged[list_key]:
                            merged[list_key].append(item)
                            if list_key not in merged["attribution"]:
                                merged["attribution"][list_key] = []
                            merged["attribution"][list_key].append(provider)

            # Update dates
            if norm.get("first_seen"):
                if not merged["first_seen"] or norm["first_seen"] < merged["first_seen"]:
                    merged["first_seen"] = norm["first_seen"]
                    merged["attribution"]["first_seen"] = [provider]
            if norm.get("last_seen"):
                if not merged["last_seen"] or norm["last_seen"] > merged["last_seen"]:
                    merged["last_seen"] = norm["last_seen"]
                    merged["attribution"]["last_seen"] = [provider]

        # Calculate final aggregated stats
        if total_weight > 0:
            merged["risk_score"] = int(weighted_risk / total_weight)
            merged["confidence"] = int(weighted_confidence / total_weight)
            
            # Pick verdict with highest total weight
            winner_verdict = max(verdict_counts, key=verdict_counts.get)
            merged["verdict"] = winner_verdict
            merged["attribution"]["verdict"] = [max(verdict_counts, key=verdict_counts.get)]
            merged["attribution"]["risk_score"] = ["Aggregated (Weighted Weight)"]
            merged["attribution"]["confidence"] = ["Aggregated (Weighted Weight)"]

        return merged

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        """
        Orchestrates concurrent provider lookups and merges them.
        """
        ioc_value = payload.get("ioc_value")
        ioc_type = payload.get("ioc_type")
        bypass_cache = payload.get("bypass_cache", False)

        if progress_callback:
            progress_callback(10)

        # 1. Check for cached merged result
        if not bypass_cache:
            try:
                cache_threshold = (datetime.utcnow() - timedelta(hours=24)).isoformat()
                cache_res = supabase_client.table("enrichment_results") \
                    .select("*") \
                    .eq("ioc_value", ioc_value) \
                    .eq("provider", "merged_orchestrator") \
                    .gte("enriched_at", cache_threshold) \
                    .execute()
                
                if cache_res.data and len(cache_res.data) > 0:
                    logger.info(f"Cache hit for Merged Orchestrated IOC: {ioc_value}")
                    if progress_callback:
                        progress_callback(100)
                    return cache_res.data[0]["raw_result"]
            except Exception as ce:
                logger.warn(f"Orchestrator failed to check cached merged result: {str(ce)}")

        # 2. Get active enricher connectors
        # We run this synchronously inside the execute loop using asyncio.run_coroutine_threadsafe
        # or asyncio.run since execute runs in an executor thread.
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            active_conns = loop.run_until_complete(self._fetch_active_enrichers())
        except Exception as e:
            logger.error(f"Failed to fetch enrichers: {str(e)}")
            active_conns = []

        if not active_conns:
            # Fallback if no enrichment connectors are configured active
            logger.warning("No active enrichment connectors configured. Returning empty schema.")
            empty_record = {
                "risk_score": 0,
                "confidence": 0,
                "verdict": "unknown",
                "tags": ["no_active_connectors"],
                "attribution": {"verdict": ["Orchestrator Fallback"]}
            }
            if progress_callback:
                progress_callback(100)
            return empty_record

        if progress_callback:
            progress_callback(20)

        # 3. Spin up provider jobs concurrently
        tasks = []
        for conn in active_conns:
            tasks.append(self._execute_provider_async(conn, payload))

        logger.info(f"Orchestrating {len(tasks)} concurrent enrichment lookups for {ioc_value}")
        
        provider_runs = []
        if tasks:
            try:
                provider_runs = loop.run_until_complete(asyncio.gather(*tasks))
            except Exception as ge:
                logger.error(f"Gather failed: {str(ge)}")
            finally:
                loop.close()

        if progress_callback:
            progress_callback(70)

        # 4. Normalize and merge responses
        normalized_results = []
        completed_providers = []
        failed_providers = []

        for run in provider_runs:
            provider_name = run["provider"]
            if run["status"] == "success":
                completed_providers.append({
                    "name": provider_name,
                    "latency_ms": run["latency_ms"],
                    "health_score": run["health_score"]
                })
                norm = self._normalize_response(provider_name, run["result"])
                normalized_results.append(norm)
            else:
                failed_providers.append({
                    "name": provider_name,
                    "error": run.get("error", "Unknown error"),
                    "latency_ms": run["latency_ms"],
                    "health_score": run["health_score"]
                })

        if progress_callback:
            progress_callback(85)

        merged_result = self._merge_normalized_results(normalized_results)
        
        # Save provider status details into the merged payload for frontend UI visibility
        merged_result["providers_status"] = {
            "completed": completed_providers,
            "failed": failed_providers
        }

        # 5. Save the unified orchestration cache in DB
        cache_record = {
            "ioc_value": ioc_value,
            "ioc_type": ioc_type,
            "provider": "merged_orchestrator",
            "reputation": merged_result["verdict"],
            "confidence": merged_result["confidence"],
            "risk_score": merged_result["risk_score"],
            "raw_result": merged_result,
            "enriched_at": datetime.utcnow().isoformat()
        }

        try:
            # Clear old merged cache records
            supabase_client.table("enrichment_results") \
                .delete() \
                .eq("ioc_value", ioc_value) \
                .eq("provider", "merged_orchestrator") \
                .execute()
            
            supabase_client.table("enrichment_results").insert(cache_record).execute()

            # Update primary IOC status in indicators table
            supabase_client.table("indicators") \
                .update({
                    "risk_score": merged_result["risk_score"],
                    "verdict": merged_result["verdict"],
                    "last_seen": datetime.utcnow().isoformat()
                }) \
                .eq("value", ioc_value) \
                .execute()
        except Exception as dbe:
            logger.error(f"Orchestrator failed to update DB caches: {str(dbe)}")

        if progress_callback:
            progress_callback(100)

        return merged_result

    def health(self) -> Dict[str, Any]:
        return {"status": "connected"}

    def cleanup(self) -> bool:
        return True
