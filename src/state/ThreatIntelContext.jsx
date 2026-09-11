/**
 * In-memory threat-intelligence session store. No database, no localStorage,
 * no IndexedDB — refreshing the page intentionally resets the session.
 *
 * Behavior:
 * - Initial fetch of all enabled providers on mount.
 * - Provider-aware refresh: each source re-fetches on its own cadence
 *   (checked every minute), never generating events. Unchanged data merges
 *   silently; genuinely new/removed ids are diffed per provider snapshot.
 * - Lifecycle: added ids seed NEW badges; updated ids seed CHANGED visuals;
 *   removed records enter a short grace window (fade-out) before leaving
 *   state. Lifecycle flags live in SEPARATE maps — threat records are never
 *   mutated with presentation state.
 * - Removed indicators leave the in-memory window after the grace period
 *   (current-session view); removals are counted, never hidden.
 * - Per-provider health: ok / loading / error / stale, plus source-update
 *   time (SOURCE UPDATED) kept distinct from client fetch time.
 * - Geolocation enrichment runs on fresh source-only events within a
 *   per-cycle lookup budget (free-tier protection).
 * - Refreshes pause while the tab is hidden; returning refetches due sources.
 * - Refresh progress (done/total) reflects real settled providers only.
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
import { enrichEvents, getGeoDiagnostics } from "../lib/providers/geoEnrichment.js";
import { diffIdSets, mergeEvents } from "../lib/threat/dedup.js";
import { sortByTimeDesc } from "../lib/threat/filter.js";

const TICK_MS = 60 * 1000;
const NEW_BADGE_MS = 10 * 60 * 1000;
const CHANGED_WINDOW_MS = 2 * 60 * 1000;
/** Idle enrichment: small bounded top-ups between provider cycles. */
const IDLE_TICK_MS = 45 * 1000;
const IDLE_BUDGET = 10;
/** Removed records linger this long so the UI can fade them out honestly. */
export const REMOVAL_GRACE_MS = 900;

const ThreatIntelContext = createContext(null);

function healthFor(results, prev, attempts) {
  const next = { ...(prev ?? {}) };
  for (const r of results) {
    const prior = next[r.id];
    const lastAttempt = attempts?.get(r.id) ?? prior?.lastAttempt ?? null;
    if (r.ok) {
      next[r.id] = {
        status: "ok",
        lastSuccess: r.fetchedAt,
        lastAttempt,
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
        lastAttempt,
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

export function ThreatIntelProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState({});
  const [diffs, setDiffs] = useState({});
  const [geoStats, setGeoStats] = useState(() => getGeoDiagnostics());
  const [newIds, setNewIds] = useState([]);
  const [changedIds, setChangedIds] = useState([]);
  const [leaving, setLeaving] = useState([]);
  const [refreshProgress, setRefreshProgress] = useState({ active: false, done: 0, total: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cycle, setCycle] = useState(0);
  const mapRef = useRef(new Map());
  const lastFetchRef = useRef(new Map());
  const prevIdsRef = useRef(new Map());
  const newAtRef = useRef(new Map());
  const changedAtRef = useRef(new Map());
  const leavingRef = useRef(new Map());
  const purgeTimerRef = useRef(null);
  const runningRef = useRef(false);
  const idleTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const publishLeaving = useCallback(() => {
    if (!mountedRef.current) return;
    setLeaving([...leavingRef.current.values()].map((l) => l.event));
  }, []);

  const runProviders = useCallback(async (ids) => {
    if (document.hidden) return;
    if (runningRef.current) return; // never overlap two refresh cycles
    runningRef.current = true;
    setRefreshing(true);
    const attemptTimes = new Map();
    try {
      const metas = getProviderMetadata();
      const targets = ids ?? metas.map((m) => m.id);
      if (!targets.length) return;
      setRefreshProgress({ active: true, done: 0, total: targets.length });
      const results = await fetchProviders(targets, {
        onSettled: () => {
          if (mountedRef.current) {
            setRefreshProgress((p) => ({ ...p, done: Math.min(p.total, p.done + 1) }));
          }
        },
      });
      if (!mountedRef.current) return;
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      let map = new Map(mapRef.current);
      const nextDiffs = {};
      const changedNow = [];

      for (const r of results) {
        lastFetchRef.current.set(r.id, nowMs);
        attemptTimes.set(r.id, nowMs);
        if (!r.ok) continue;
        const currentIds = r.events.map((e) => e.id);
        const prevIds = prevIdsRef.current.get(r.id) ?? [];
        const { added, removed, unchanged } = diffIdSets(prevIds, currentIds);
        prevIdsRef.current.set(r.id, currentIds);

        const merged = mergeEvents(map, r.events);
        map = merged.map;
        for (const id of merged.updatedIds) {
          changedAtRef.current.set(id, nowMs);
          changedNow.push(id);
        }

        // Removed records enter the grace window (fade-out) instead of
        // vanishing instantly; they leave state when the window expires.
        for (const id of removed) {
          const e = map.get(id);
          if (e) {
            leavingRef.current.set(id, { event: e, deadline: nowMs + REMOVAL_GRACE_MS });
            map.delete(id);
          }
          newAtRef.current.delete(id);
          changedAtRef.current.delete(id);
        }
        // Genuinely new arrivals get session first-seen time.
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

      // Prune lifecycle windows (pruning itself is a visible change).
      let pruned = 0;
      for (const [id, at] of newAtRef.current) {
        if (nowMs - at > NEW_BADGE_MS) { newAtRef.current.delete(id); pruned += 1; }
      }
      for (const [id, at] of changedAtRef.current) {
        if (nowMs - at > CHANGED_WINDOW_MS) { changedAtRef.current.delete(id); pruned += 1; }
      }

      // Enrich only events still missing coordinates.
      const missing = [...map.values()].filter(
        (e) => e.source?.ip && (e.source.latitude == null || e.source.longitude == null)
      );
      let enrichChanged = 0;
      if (missing.length) {
        const { events: enriched } = await enrichEvents(missing);
        const remerged = mergeEvents(map, enriched);
        map = remerged.map;
        enrichChanged = remerged.updated;
        for (const id of remerged.updatedIds) {
          if (!changedAtRef.current.has(id)) changedAtRef.current.set(id, nowMs);
        }
      }
      if (!mountedRef.current) return;
      mapRef.current = map;
      // Zero-change cycles leave rendered state untouched (health, diffs,
      // and fetch times still advance so freshness stays truthful).
      const touched =
        pruned > 0 ||
        enrichChanged > 0 ||
        Object.values(nextDiffs).some((d) => d.added > 0 || d.removed > 0 || d.changed > 0);
      if (touched) {
        setEvents(sortByTimeDesc([...map.values()]));
        publishLeaving();
        setNewIds([...newAtRef.current.keys()]);
        setChangedIds([...changedAtRef.current.keys()]);
      }
      setLastUpdated(nowIso);
      setCycle((c) => c + 1);

      // Purge the grace window after transitions complete.
      if (purgeTimerRef.current) clearTimeout(purgeTimerRef.current);
      if (leavingRef.current.size) {
        purgeTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          const t = Date.now();
          for (const [id, l] of leavingRef.current) {
            if (t >= l.deadline) leavingRef.current.delete(id);
          }
          publishLeaving();
        }, REMOVAL_GRACE_MS + 150);
      }
    } finally {
      runningRef.current = false;
      if (mountedRef.current) {
        setRefreshing(false);
        setInitialLoading(false);
        setRefreshProgress({ active: false, done: 0, total: 0 });
      }
    }
  }, [publishLeaving]);

  // Idle enrichment: progressively resolve the pending backlog in small
  // bounded top-ups (cache makes repeats free; failures respect TTL).
  // Real acquisition, never fabrication — skipped while hidden/refreshing.
  const runIdleEnrichment = useCallback(async () => {
    if (document.hidden || runningRef.current || !mountedRef.current) return;
    if (mapRef.current.size === 0) return;
    const missing = [...mapRef.current.values()].filter(
      (e) => e.source?.ip && (e.source.latitude == null || e.source.longitude == null)
    );
    if (!missing.length) return;
    runningRef.current = true;
    try {
      const { events: enriched } = await enrichEvents(missing.slice(0, IDLE_BUDGET));
      if (!mountedRef.current) return;
      const remerged = mergeEvents(mapRef.current, enriched);
      if (remerged.updated > 0 || remerged.added > 0) {
        mapRef.current = remerged.map;
        setEvents(sortByTimeDesc([...mapRef.current.values()]));
        setGeoStats(getGeoDiagnostics());
      }
    } finally {
      runningRef.current = false;
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
    const dueIds = () => {
      const now = Date.now();
      return getProviderMetadata()
        .filter((m) => {
          const last = lastFetchRef.current.get(m.id);
          return last == null || now - last >= m.refreshIntervalMs;
        })
        .map((m) => m.id);
    };
    const tick = () => {
      if (document.hidden) return;
      const due = dueIds();
      if (due.length) runProviders(due);
    };
    const id = setInterval(tick, TICK_MS);
    const idleId = setInterval(() => {
      if (!document.hidden) runIdleEnrichment();
    }, IDLE_TICK_MS);
    idleTimerRef.current = idleId;
    const onVis = () => {
      if (document.hidden) return;
      const due = dueIds();
      if (due.length) runProviders(due);
      else runIdleEnrichment();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
      clearInterval(idleId);
      if (purgeTimerRef.current) clearTimeout(purgeTimerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [runProviders, runIdleEnrichment]);

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
      geoStats,
      newIds,
      changedIds,
      leaving,
      refreshProgress,
      providers: getProviderMetadata(),
      lastUpdated,
      initialLoading,
      refreshing,
      cycle,
      refresh,
      getEvent: (id) => mapRef.current.get(id) ?? leavingRef.current.get(id)?.event ?? null,
    }),
    [events, health, diffs, totals, geoStats, newIds, changedIds, leaving, refreshProgress, lastUpdated, initialLoading, refreshing, cycle, refresh]
  );

  return <ThreatIntelContext.Provider value={value}>{children}</ThreatIntelContext.Provider>;
}

export function useThreatIntel() {
  const ctx = useContext(ThreatIntelContext);
  if (!ctx) throw new Error("useThreatIntel must be used within ThreatIntelProvider");
  return ctx;
}
