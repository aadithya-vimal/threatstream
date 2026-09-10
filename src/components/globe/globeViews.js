/**
 * Pure view-model builders for the Globe.GL visualization.
 * ONE dataset in, per-view projections out — no synthetic records, ever.
 * Every builder filters the same normalized ThreatEvents; caps only truncate.
 */
import { hasArc, hasSourceCoordinates } from "../../lib/threat/model.js";

export const MAX_MARKERS = 600;
export const MAX_ARCS = 40;
export const MAX_LABELS = 8;
/** Rings mark records first seen in-session within this window only. */
export const RING_WINDOW_MS = 3 * 60 * 1000;

export const VIEWS = [
  { id: "operations", label: "Operations" },
  { id: "heatmap", label: "Threat heatmap" },
  { id: "paths", label: "Verified Flows" },
  { id: "rings", label: "Threat rings" },
  { id: "hex", label: "Hex density" },
  { id: "imagery", label: "Satellite" },
  { id: "minimal", label: "Minimal" },
];

export function isValidView(id) {
  return VIEWS.some((v) => v.id === id);
}

/** Geolocated subset, capped. Shared input for points/heatmap/hex. */
export function buildPoints(events, cap = MAX_MARKERS) {
  if (!Array.isArray(events)) return [];
  return events.filter(hasSourceCoordinates).slice(0, cap);
}

/** Genuine both-endpoint observations only. Empty when none exist. */
export function buildArcs(events, cap = MAX_ARCS) {
  if (!Array.isArray(events)) return [];
  return events.filter(hasArc).slice(0, cap);
}

/**
 * Heatmap input: one entry per real geolocated observation.
 * Constant weight 1 — severity "unknown" is never converted to a risk score.
 */
export function buildHeatPoints(events, cap = MAX_MARKERS) {
  return buildPoints(events, cap).map((e) => ({ e, w: 1 }));
}

/** Hex-bin input: raw geolocated events; bin counts come from the data. */
export function buildHexPoints(events, cap = MAX_MARKERS) {
  return buildPoints(events, cap);
}

/**
 * Ring input: genuinely new in-session arrivals inside a bounded window.
 * sessionFirstSeen is client-observed; old records never re-ring.
 */
export function buildRings(events, newIds, { windowMs = RING_WINDOW_MS, now = Date.now(), cap = MAX_MARKERS } = {}) {
  if (!Array.isArray(events)) return [];
  const fresh = newIds instanceof Set ? newIds : new Set(newIds ?? []);
  return events
    .filter((e) => hasSourceCoordinates(e) && fresh.has(e.id))
    .filter((e) => {
      const t = e.sessionFirstSeen ? Date.parse(e.sessionFirstSeen) : NaN;
      return !Number.isNaN(t) && now - t <= windowMs;
    })
    .slice(0, cap);
}

/** Labels: selected event first, then a small bounded set. Never hundreds. */
export function buildLabels(events, selectedId, cap = MAX_LABELS) {
  const geo = buildPoints(events, MAX_MARKERS);
  const sel = selectedId ? geo.find((e) => e.id === selectedId) : null;
  const rest = geo.filter((e) => e.id !== selectedId).slice(0, Math.max(0, cap - (sel ? 1 : 0)));
  return sel ? [sel, ...rest] : rest;
}

export function isEnriched(event) {
  return (event?.inferred ?? []).length > 0;
}

const DARK_COLORS = {
  base: "#ff4d5e",
  enriched: "#ff9f43",
  selected: "#ffffff",
  arc: "#ff6b81",
  ring: "#ff9f43",
  hex: "#ff6b81",
};

const LIGHT_COLORS = {
  base: "#c81e3a",
  enriched: "#9a6200",
  selected: "#0b5fff",
  arc: "#c81e3a",
  ring: "#9a6200",
  hex: "#c81e3a",
};

export function paletteFor(theme) {
  return theme === "light" ? LIGHT_COLORS : DARK_COLORS;
}

export function pointColorFor(event, theme = "dark", selectedId = null) {
  const pal = paletteFor(theme);
  if (event?.id === selectedId) return pal.selected;
  return isEnriched(event) ? pal.enriched : pal.base;
}

export function tooltipHtml(event) {
  if (!event) return "";
  const ip = event.source?.ip ?? event.raw?.cveID ?? event.raw?.domain ?? event.id;
  const place = event.source?.country ?? "Country pending";
  const asn = event.source?.asn != null ? ` · AS${event.source.asn}` : "";
  return `<strong>${ip}</strong><br/>${place}${asn} · ${event.category}<br/><span>Approximate infrastructure location</span>`;
}

export function labelText(event) {
  if (!event) return "";
  const ip = event.source?.ip ?? event.raw?.cveID ?? event.raw?.domain ?? event.id;
  const place = event.source?.countryCode ?? event.source?.country ?? "";
  return place ? `${ip} · ${place}` : ip;
}
