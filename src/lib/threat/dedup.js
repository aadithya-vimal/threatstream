/**
 * Deduplication over stable source identifiers.
 * Same provider + record + timestamp → same event. Refresh cycles that
 * return unchanged data therefore never appear as "new attacks".
 */

/**
 * Compare two live snapshots by stable event id.
 * Ordering changes are ignored — only membership matters.
 * Returns { added, removed, unchanged } as arrays of ids.
 */
export function diffIdSets(prevIds, nextIds) {
  const prev = new Set(prevIds ?? []);
  const next = new Set(nextIds ?? []);
  const added = [];
  const unchanged = [];
  for (const id of next) {
    if (prev.has(id)) unchanged.push(id);
    else added.push(id);
  }
  const removed = [];
  for (const id of prev) {
    if (!next.has(id)) removed.push(id);
  }
  return { added, removed, unchanged };
}

/** djb2 — small deterministic non-crypto hash for dedup keys. */
export function stableHash(input) {
  const str = String(input);
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export function dedupKey(event) {
  return `${event.sourceProvider}|${event.sourceRecordId}|${event.timestamp ?? "no-ts"}`;
}

/**
 * Merge incoming events into the existing map.
 * Returns { map, added, updated, addedIds, updatedIds } — counts and ids are
 * real, derived from keys. Geolocation enrichment counts as an update
 * (same key, richer source). addedIds/updatedIds drive honest new/changed
 * lifecycle visuals; they never alter the records themselves.
 */
export function mergeEvents(existingMap, incoming) {
  const map = new Map(existingMap);
  let added = 0;
  let updated = 0;
  const addedIds = [];
  const updatedIds = [];
  for (const event of incoming) {
    if (!event?.id) continue;
    const prev = map.get(event.id);
    if (!prev) {
      map.set(event.id, event);
      added += 1;
      addedIds.push(event.id);
    } else {
      const prevKey = dedupKey(prev);
      const nextKey = dedupKey(event);
      const prevGeo = `${prev.source?.latitude ?? ""},${prev.source?.longitude ?? ""}`;
      const nextGeo = `${event.source?.latitude ?? ""},${event.source?.longitude ?? ""}`;
      if (prevKey !== nextKey || prevGeo !== nextGeo) {
        // Preserve previously enriched geolocation when the refresh
        // payload has none (feeds don't repeat geo on every poll).
        const merged =
          (prevGeo.includes(",") && prevGeo !== "," && nextGeo === ",") ||
          nextGeo === ","
            ? {
                ...event,
                source: { ...event.source, ...pickGeo(prev.source) },
                inferred: Array.from(
                  new Set([...(event.inferred ?? []), ...(prev.inferred ?? [])])
                ),
              }
            : event;
        // A refresh that changes nothing observable is not a change:
        // skip the write so steady-state cycles report zero changes.
        if (!sameObservable(prev, merged)) {
          map.set(event.id, merged);
          updated += 1;
          updatedIds.push(event.id);
        }
      }
    }
  }
  return { map, added, updated, addedIds, updatedIds };
}

/**
 * True when two records are observably identical: same identity, same
 * coordinates, same enrichment markers, same assessment fields.
 */
export function sameObservable(a, b) {
  if (!a || !b) return false;
  if (dedupKey(a) !== dedupKey(b)) return false;
  const geo = (e) => `${e.source?.latitude ?? ""},${e.source?.longitude ?? ""},${e.source?.country ?? ""},${e.source?.city ?? ""},${e.source?.asn ?? ""},${e.source?.organization ?? ""}`;
  if (geo(a) !== geo(b)) return false;
  const inf = (e) => [...(e.inferred ?? [])].sort().join(",");
  if (inf(a) !== inf(b)) return false;
  return (
    a.classification === b.classification &&
    a.category === b.category &&
    a.severity === b.severity &&
    a.confidence === b.confidence
  );
}

function pickGeo(source) {  if (!source) return {};
  const out = {};
  for (const k of [
    "latitude",
    "longitude",
    "country",
    "countryCode",
    "city",
    "asn",
    "organization",
  ]) {
    if (source[k] != null) out[k] = source[k];
  }
  return out;
}
