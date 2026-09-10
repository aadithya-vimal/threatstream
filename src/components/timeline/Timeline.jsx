import React, { useEffect, useMemo, useState } from "react";
import { formatClock } from "../../lib/format.js";

/**
 * Timeline over observations CURRENTLY in memory.
 * Play steps through loaded events in time order; scrubbing selects an
 * event. The scope label always states what is actually loaded.
 */
export default function Timeline({ events, selectedId, onPick }) {
  const ordered = useMemo(
    () =>
      [...events]
        .filter((e) => e.timestamp && !Number.isNaN(Date.parse(e.timestamp)))
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
    [events]
  );
  const [index, setIndex] = useState(ordered.length ? ordered.length - 1 : 0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setIndex(ordered.length ? ordered.length - 1 : 0);
  }, [ordered.length]);

  useEffect(() => {
    if (!playing || !ordered.length) return;
    const id = setInterval(() => {
      setIndex((i) => {
        if (i >= ordered.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 700);
    return () => clearInterval(id);
  }, [playing, ordered.length]);

  useEffect(() => {
    const current = ordered[index];
    if (current && playing) onPick?.(current.id, { suppressFocus: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!ordered.length) {
    return (
      <div className="timeline" aria-label="Observation timeline">
        <p className="muted">Timeline unavailable — no timestamped observations loaded.</p>
      </div>
    );
  }
  const current = ordered[Math.min(index, ordered.length - 1)];
  const spanStart = formatClock(ordered[0].timestamp);
  const spanEnd = formatClock(ordered[ordered.length - 1].timestamp);

  return (
    <div className="timeline" aria-label="Observation timeline">
      <div className="timeline-controls">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <input
          type="range"
          min={0}
          max={ordered.length - 1}
          value={Math.min(index, ordered.length - 1)}
          onChange={(e) => {
            setPlaying(false);
            const i = Number(e.target.value);
            setIndex(i);
            if (ordered[i]) onPick?.(ordered[i].id, { suppressFocus: true });
          }}
          aria-label="Scrub loaded observations"
          className="timeline-slider"
        />
        <span className="mono timeline-pos">
          {Math.min(index + 1, ordered.length)} / {ordered.length}
        </span>
      </div>
      <div className="timeline-meta mono">
        <span>{spanStart}</span>
        <span className="timeline-current">
          {formatClock(current.timestamp)} · {current.source?.ip ?? current.raw?.cveID ?? current.id}
          {current.id === selectedId ? " · selected" : ""}
        </span>
        <span>{spanEnd}</span>
      </div>
      <p className="timeline-scope">Scope: {ordered.length} timestamped observations currently in memory — not global history.</p>
    </div>
  );
}
