import React from "react";
import { EMPTY_FILTERS } from "../../lib/threat/filter.js";
import { prettyLabel } from "../../lib/format.js";

function CheckRow({ label, checked, onChange, hint }) {
  return (
    <label className="check-row" title={hint}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function chipsFor(filters) {
  const chips = [];
  const push = (key, value, label) => chips.push({ key: `${key}:${value}`, label, clear: () => ({ [key]: (filters[key] ?? []).filter((v) => v !== value) }) });
  for (const v of filters.providers ?? []) push("providers", v, v);
  for (const v of filters.categories ?? []) push("categories", v, prettyLabel(v));
  for (const v of filters.classifications ?? []) push("classifications", v, prettyLabel(v));
  for (const v of filters.severities ?? []) push("severities", v, v);
  for (const v of filters.confidences ?? []) push("confidences", v, v);
  for (const v of filters.sourceCountries ?? []) push("sourceCountries", v, v);
  if (filters.relationship && filters.relationship !== "all") {
    chips.push({ key: "relationship", label: prettyLabel(filters.relationship), clear: () => ({ relationship: "all" }) });
  }
  if (filters.hours > 0) {
    chips.push({ key: "hours", label: `last ${filters.hours}h`, clear: () => ({ hours: 0 }) });
  }
  if (filters.query?.trim()) {
    chips.push({ key: "query", label: `“${filters.query.trim()}”`, clear: () => ({ query: "" }) });
  }
  return chips;
}

export default function FilterPanel({ filters, onChange, facets, resultCount, totalCount }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const toggleList = (key, value) => {
    const list = filters[key] ?? [];
    set({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  };
  const chips = chipsFor(filters);

  return (
    <div className="filters">
      <div className="filter-bar">
        <input
          className="filter-search mono"
          type="search"
          placeholder="Search IP, ASN, org, CVE, country…"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          aria-label="Search observations"
        />
        <select
          value={filters.relationship}
          onChange={(e) => set({ relationship: e.target.value })}
          aria-label="Relationship filter"
        >
          <option value="all">All relationships</option>
          <option value="source_only">Source-only intel</option>
          <option value="observed_path">Confirmed paths</option>
          <option value="intel_only">Non-geographic records</option>
        </select>
        <select
          value={filters.hours}
          onChange={(e) => set({ hours: Number(e.target.value) })}
          aria-label="Time window"
        >
          <option value={0}>Full loaded scope</option>
          <option value={1}>Last hour</option>
          <option value={6}>Last 6 hours</option>
          <option value={24}>Last 24 hours</option>
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({ ...EMPTY_FILTERS })}
          disabled={chips.length === 0}
        >
          Clear all
        </button>
      </div>

      {chips.length > 0 && (
        <div className="active-chips" aria-live="polite" aria-label="Active filters">
          {chips.map((c) => (
            <span key={c.key} className="chip">
              {c.label}
              <button type="button" onClick={() => set(c.clear())} aria-label={`Remove filter ${c.label}`}>✕</button>
            </span>
          ))}
        </div>
      )}

      <div className="filter-groups">
        <div className="filter-group">
          <h4>Provider</h4>
          {facets.providers.map((p) => (
            <CheckRow key={p} label={p} checked={filters.providers.includes(p)} onChange={() => toggleList("providers", p)} />
          ))}
        </div>
        <div className="filter-group">
          <h4>Category</h4>
          {facets.categories.map((c) => (
            <CheckRow key={c} label={prettyLabel(c)} checked={filters.categories.includes(c)} onChange={() => toggleList("categories", c)} />
          ))}
        </div>
        <div className="filter-group">
          <h4>Severity</h4>
          {facets.severities.map((s) => (
            <CheckRow key={s} label={s} checked={filters.severities.includes(s)} onChange={() => toggleList("severities", s)} />
          ))}
        </div>
        <div className="filter-group">
          <h4>Confidence</h4>
          {facets.confidences.map((c) => (
            <CheckRow key={c} label={c} checked={filters.confidences.includes(c)} onChange={() => toggleList("confidences", c)} />
          ))}
        </div>
        <div className="filter-group">
          <h4>Classification</h4>
          {facets.classifications.map((c) => (
            <CheckRow key={c} label={prettyLabel(c)} checked={filters.classifications.includes(c)} onChange={() => toggleList("classifications", c)} />
          ))}
        </div>
        <div className="filter-group">
          <h4>Source country</h4>
          <div className="country-checks">
            {facets.sourceCountries.slice(0, 14).map((c) => (
              <CheckRow key={c} label={c} checked={filters.sourceCountries.includes(c)} onChange={() => toggleList("sourceCountries", c)} />
            ))}
          </div>
        </div>
      </div>

      <div className="filter-count mono" aria-live="polite">
        Showing {resultCount} of {totalCount} loaded observations
      </div>
    </div>
  );
}
