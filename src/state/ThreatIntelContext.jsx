/**
 * In-memory threat-intelligence session store. No database, no localStorage,
 * no IndexedDB — refreshing the page intentionally resets the session.
 *
 * Behavior:
 * - Initial fetch of all enabled providers on mount.
 * - Provider-aware refresh: each source re-fetches on its own cadence
 *   (checked every minute), never generating events. Unchanged data merges
 *   silently; genuinely new/removed ids are diffed per provider snapshot.
 * - Removed indicators leave the in-memory window (current-session view);
 *   removals are counted, never hidden.
 * - Per-provider health: ok / loading / error / stale, plus source-update
 *   time (SOURCE UPDATED) kept distinct from client fetch time.
 * - Geolocation enrichment runs on fresh source-only events within a
 *   per-cycle lookup budget (free-tier protection).
 * - Refreshes pause while the tab is hidden; returning refetches due sources.
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
import { fetchProviders, getProviderMetadata } from "../lib/providers/index.js";
import { enrichEvents } from "../lib/providers/geoEnrichment.js";
import { diffIdSets, mergeEvents } from "../lib/threat/dedup.js";
import { sortByTimeDesc } from "../lib/threat/filter.js";

const TICK_MS = 60 * 1000;
const NEW_BADGE_MS = 30 * 60 * 1000;

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
        sourceUpdated: r.fileDateIso ?? r.dateReleased ?? null,
        catalogVersion: r.catalogVersion ?? null,
      };
    } else {
      next[r.id] = {
        status: "error",
        lastSuccess: prior?.lastSuccess ?? null,
        lastError: r.error ?? "Unknown provider error",
        latencyMs: r.latencyMs,
        eventCount: 0,
        totalInFeed: null,
        truncated: false,
        sourceUpdated: prior?.sourceUpdated ?? null,
        catalogVersion: prior?.catalogVersion ?? null,
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

const EMPTY_DIFF = { added: 0, removed: 0, unchanged: 0, changed: 0, at: null };

export function ThreatIntelProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState({});
  const [diffs, setDiffs] = useState({});
  const [newIds, setNewIds] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cycle, setCycle] = useState(0);
  const mapRef = useRef(new Map());
  const lastFetchRef = useRef(new Map());
  const prevIdsRef = useRef(new Map());
  const newAtRef = useRef(new Map());
  const mountedRef = useRef(true);

  const runProviders = useCallback(async (ids) => {
    if (document.hidden) return;
    setRefreshing(true);
    try {
      const metas = getProviderMetadata();
      const targets = ids ?? metas.map((m) => m.id);
      if (!targets.length) return;
      const results = await fetchProviders(targets);
      if (!mountedRef.current) return;
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      let map = new Map(mapRef.current);
      const nextDiffs = {};
      let changedTotal = 0;

      for (const r of results) {
        lastFetchRef.current.set(r.id, nowMs);
        if (!r.ok) continue;
        const currentIds = r.events.map((e) => e.id);
        const prevIds = prevIdsRef.current.get(r.id) ?? [];
        const { added, removed, unchanged } = diffIdSets(prevIds, currentIds);
        prevIdsRef.current.set(r.id, currentIds);

        const incoming = r.events;
        const merged = mergeEvents(map, incoming);
        map = merged.map;
        changedTotal += merged.updated;

        // Drop indicators the source no longer lists (current-window view).
        for (const id of removed) map.delete(id);
        // Stamp genuinely new arrivals with session first-seen time.
        for (const id of added) {
          const e = map.get(id);
          if (e && !e.sessionFirstSeen) map.set(id, { ...e, sessionFirstSeen: nowIso });
          newAtRef.current.set(id, nowMs);
        }
        nextDiffs[r.id] = {
          added: added.length,
          removed: removed.length,
          unchanged: unchanged.length,
          changed: merged.updated,
          at: nowIso,
        };
      }

      // Prune NEW badges older than the display window.
      for (const [id, at] of newAtRef.current) {
        if (nowMs - at > NEW_BADGE_MS) newAtRef.current.delete(id);
      }

      // Enrich only events still missing coordinates.
      const missing = [...map.values()].filter(
        (e) => e.source?.ip && (e.source.latitude == null || e.source.longitude == null)
      );
      if (missing.length) {
        const { events: enriched } = await enrichEvents(missing);
        const remerged = mergeEvents(map, enriched);
        map = remerged.map;
        changedTotal += remerged.updated;
      }
      if (!mountedRef.current) return;
      mapRef.current = map;
      setEvents(sortByTimeDesc([...map.values()]));
      setHealth((prev) => healthFor(results, prev));
      setDiffs((prev) => ({ ...prev, ...nextDiffs }));
      setNewIds([...newAtRef.current.keys()]);
      setLastUpdated(nowIso);
      setCycle((c) => c + 1);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
        setInitialLoading(false);
      }
    }
  }, []);

  /** Manual refresh: fetch every enabled provider regardless of cadence. */
  const refresh = useCallback(() => {
    const metas = getProviderMetadata();
    return runProviders(metas.map((m) => m.id));
  }, [runProviders]);

  useEffect(() => {
    mountedRef.current = true;
    runProviders(null);
    const tick = () => {
      if (document.hidden) return;
      const now = Date.now();
      const due = getProviderMetadata()
        .filter((m) => {
          const last = lastFetchRef.current.get(m.id);
          return last == null || now - last >= m.refreshIntervalMs;
        })
        .map((m) => m.id);
      if (due.length) runProviders(due);
    };
    const id = setInterval(tick, TICK_MS);
    const onVis = () => {
      if (document.hidden) return;
      const now = Date.now();
      const due = getProviderMetadata()
        .filter((m) => {
          const last = lastFetchRef.current.get(m.id);
          return last == null || now - last >= m.refreshIntervalMs;
        })
        .map((m) => m.id);
      if (due.length) runProviders(due);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [runProviders]);

  const totals = useMemo(() => {
    const t = { added: 0, removed: 0, unchanged: 0, changed: 0 };
    for (const d of Object.values(diffs)) {
      t.added += d.added ?? 0;
      t.removed += d.removed ?? 0;
      t.unchanged += d.unchanged ?? 0;
      t.changed += d.changed ?? 0;
    }
    return t;
  }, [diffs]);

  const value = useMemo(
    () => ({
      events,
      health,
      diffs,
      diffTotals: totals,
      newIds,
      providers: getProviderMetadata(),
      lastUpdated,
      initialLoading,
      refreshing,
      cycle,
      refresh,
      getEvent: (id) => mapRef.current.get(id) ?? null,
    }),
    [events, health, diffs, totals, newIds, lastUpdated, initialLoading, refreshing, cycle, refresh]
  );

  return <ThreatIntelContext.Provider value={value}>{children}</ThreatIntelContext.Provider>;
}

export function useThreatIntel() {
  const ctx = useContext(ThreatIntelContext);
  if (!ctx) throw new Error("useThreatIntel must be used within ThreatIntelProvider");
  return ctx;
}

export { EMPTY_DIFF };
