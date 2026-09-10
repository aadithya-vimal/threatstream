import { describe, expect, it } from "vitest";
import landingSrc from "./features/landing/Landing.jsx?raw";
import shellSrc from "./components/layout/AppShell.jsx?raw";
import methodSrc from "./features/methodology/Methodology.jsx?raw";
import monitorSrc from "./features/monitor/Monitor.jsx?raw";
import eventPageSrc from "./features/events/EventPage.jsx?raw";

/**
 * Product-presentation guards: prototype/disclaimer marketing must stay out
 * of the active product surface. Technical trust content (attribution,
 * observed-vs-enriched, verified-path rules) lives elsewhere and is kept.
 */
const BANNED_PHRASES = [
  "What it refuses to do",
  "frontend-only",
  "browser-only",
  "no database",
  "No database",
  "no accounts",
  "refresh resets",
  "resets all state",
  "no backend",
  "No backend",
  "refuses to",
  "proof of concept",
  "in-memory · no tracking",
  "Never fabricated",
];

const BANNED_WORDS = [/\bprototype\b/i, /\bdemo\b/i];

const SOURCES = { Landing: landingSrc, AppShell: shellSrc, Methodology: methodSrc, Monitor: monitorSrc, EventPage: eventPageSrc };

describe("product presentation", () => {
  for (const [name, src] of Object.entries(SOURCES)) {
    it(`${name} contains no prototype/disclaimer marketing`, () => {
      for (const phrase of BANNED_PHRASES) {
        expect(src, `${name} contains banned phrase: ${phrase}`).not.toContain(phrase);
      }
      for (const re of BANNED_WORDS) {
        expect(src, `${name} matches banned pattern: ${re}`).not.toMatch(re);
      }
    });
  }
});
