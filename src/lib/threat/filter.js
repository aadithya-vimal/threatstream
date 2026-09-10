/**
 * Client-side filtering over the loaded in-memory dataset.
 * Filtering only narrows what is rendered — never synthesizes.
 */

export const EMPTY_FILTERS = Object.freeze({
  query: "",
  sourceCountries: [],
  categories: [],
  classifications: [],
  severities: [],
  confidences: [],
  providers: [],
  relationship: "all", // all | source_only | observed_path | intel_only
  hours: 0, // 0 = full loaded scope
});

export function applyFilters(events, filters = {}, nowMs = Date.now()) {
  const f = { ...EMPTY_FILTERS, ...filters };
  const q = f.query.trim().toLowerCase();
  const cutoff =
    f.hours > 0 ? nowMs - f.hours * 3600 * 1000 : 0;

  return events.filter((e) => {
    if (f.providers.length && !f.providers.includes(e.sourceProvider)) return false;
    if (f.classifications.length && !f.classifications.includes(e.classification))
      return false;
    if (f.categories.length && !f.categories.includes(e.category)) return false;
    if (f.severities.length && !f.severities.includes(e.severity)) return false;
    if (f.confidences.length && !f.confidences.includes(e.confidence)) return false;
    if (
      f.sourceCountries.length &&
      !f.sourceCountries.includes(e.source?.countryCode ?? "XX")
    )
      return false;
    if (f.relationship !== "all") {
      const kind = relationshipOf(e);
      if (kind !== f.relationship) return false;
    }
    if (cutoff > 0) {
      const t = e.timestamp ? Date.parse(e.timestamp) : NaN;
      if (Number.isNaN(t) || t < cutoff) return false;
    }
    if (q) {
      const hay = [
        e.source?.ip,
        e.source?.cidr,
        e.source?.country,
        e.source?.countryCode,
        e.source?.city,
        e.source?.organization,
        e.source?.asn != null ? `AS${e.source.asn}` : null,
        e.source?.asn != null ? String(e.source.asn) : null,
        e.raw?.cveID,
        e.raw?.vendorProject,
        e.raw?.product,
        e.raw?.vulnerabilityName,
        e.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function relationshipOf(e) {
  const s = hasCoords(e.source);
  const d = hasCoords(e.destination);
  if (s && d) return "observed_path";
  if (s) return "source_only";
  return "intel_only";
}

function hasCoords(p) {
  return (
    !!p &&
    typeof p.latitude === "number" &&
    Number.isFinite(p.latitude) &&
    typeof p.longitude === "number" &&
    Number.isFinite(p.longitude) &&
    !(p.latitude === 0 && p.longitude === 0)
  );
}

export function sortByTimeDesc(events) {
  return [...events].sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    return tb - ta;
  });
}
