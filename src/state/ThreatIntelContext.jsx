/**
 * In-memory threat-intelligence session store. No database, no localStorage,
 * no IndexedDB — refreshing the page intentionally resets the session.
 *
 * Behavior:
 * - Initial fetch of all enabled providers on mount.
 * - Periodic refresh of REAL provider data (default 10 min). The timer
 *   never generates events; unchanged data merges silently via dedup keys.
 * - Per-provider health: ok / loading / error / stale.
 * - Geolocation enrichment runs on fresh source-only events within a
 *   per-cycle lookup budget (free-tier protection).
 * - Refreshes pause while the tab is hidden.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchAllProviders, getProviderMetadata } from "../lib/providers/index.js";
import { enrichEvents } from "../lib/providers/geoEnrichment.js";
import { mergeEvents } from "../lib/threat/dedup.js";
import { sortByTimeDesc } from "../lib/threat/filter.js";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const ThreatIntelContext = createContext(null);

function healthFor(results, prev) {
  const next = { ...(prev ?? {}) };
  for (const r of results) {
    const prior = next[r.id];
    if (r.ok) {
      next[r.id] = {
        status: "ok",
        lastSuccess: r.fetchedAt,
        lastError: null,
        latencyMs: r.latencyMs,
        eventCount: r.events?.length ?? 0,
        totalInFeed: r.totalInFeed ?? null,
        truncated: !!r.truncated,
      };
    } else {
      next[r.id] = {
        status: "error",
        lastSuccess: prior?.lastSuccess ?? null,
        lastError: r.error ?? "Unknown error",
        latencyMs: r.latencyMs,
        eventCount: 0,
        totalInFeed: null,
        truncated: false,
      };
    }
  }
  // Mark stale providers (no success within 2x their interval).
  const now = Date.now();
  for (const meta of getProviderMetadata()) {
    const h = next[meta.id];
    if (h?.status === "ok" && h.lastSuccess) {
      if (now - Date.parse(h.lastSuccess) > meta.refreshIntervalMs * 2) {
        next[meta.id] = { ...h, status: "stale" };
      }
    }
  }
  return next;
}

export function ThreatIntelProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cycle, setCycle] = useState(0);
  const mapRef = useRef(new Map());
  const mountedRef = useRef(true);

  const runCycle = useCallback(async () => {
    if (document.hidden) return; // save quota + GPU while hidden
    setRefreshing(true);
    try {
      const results = await fetchAllProviders();
      if (!mountedRef.current) return;
      const incoming = results.flatMap((r) => (r.ok ? r.events : []));
      const merged = mergeEvents(mapRef.current, incoming);
      mapRef.current = merged.map;
      // Enrich only events still missing coordinates.
      const missing = [...merged.map.values()].filter(
        (e) => e.source?.ip && (e.source.latitude == null || e.source.longitude == null)
      );
      if (missing.length) {
        const { events: enriched } = await enrichEvents(missing);
        const remerged = mergeEvents(merged.map, enriched);
        mapRef.current = remerged.map;
      }
      if (!mountedRef.current) return;
      setEvents(sortByTimeDesc([...mapRef.current.values()]));
      setHealth((prev) => healthFor(results, prev));
      setLastUpdated(new Date().toISOString());
      setCycle((c) => c + 1);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    runCycle();
    const id = setInterval(runCycle, REFRESH_INTERVAL_MS);
    const onVis = () => {
      if (!document.hidden) runCycle();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [runCycle]);

  const value = useMemo(
    () => ({
      events,
      health,
      providers: getProviderMetadata(),
      lastUpdated,
      initialLoading,
      refreshing,
      cycle,
      refreshIntervalMs: REFRESH_INTERVAL_MS,
      refresh: runCycle,
      getEvent: (id) => mapRef.current.get(id) ?? null,
    }),
    [events, health, lastUpdated, initialLoading, refreshing, cycle, runCycle]
  );

  return <ThreatIntelContext.Provider value={value}>{children}</ThreatIntelContext.Provider>;
}

export function useThreatIntel() {
  const ctx = useContext(ThreatIntelContext);
  if (!ctx) throw new Error("useThreatIntel must be used within ThreatIntelProvider");
  return ctx;
}
