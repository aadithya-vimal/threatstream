/**
 * Providers deliberately NOT enabled — with the exact reason.
 *
 * Rule: if a source needs a secret server-side key or disallows browser
 * usage, it stays disabled with an explanation rather than compromising
 * the static-frontend architecture by leaking credentials into the bundle.
 *
 * A second list covers sources that are public and keyless but NOT
 * browser-compatible (e.g. missing CORS headers). They stay out of the
 * live provider list rather than failing silently every cycle.
 */
export const DISABLED_PROVIDERS = [
  {
    id: "urlhaus",
    name: "URLhaus",
    reason:
      "Requires a personal abuse.ch Auth-Key since the Community API change. A browser bundle cannot hold that key without exposing it, so URLhaus stays disabled until a keyless bulk mirror is available.",
    reference: "https://urlhaus.abuse.ch/api/",
  },
  {
    id: "threatfox",
    name: "ThreatFox",
    reason:
      "abuse.ch API access now requires an Auth-Key. Exposing it client-side would leak credentials and violate fair-use terms.",
    reference: "https://threatfox.abuse.ch/",
  },
  {
    id: "feodo",
    name: "Feodo Tracker",
    reason:
      "Same abuse.ch Auth-Key requirement as URLhaus/ThreatFox — no keyless browser-compatible bulk feed.",
    reference: "https://feodotracker.abuse.ch/",
  },
  {
    id: "abuseipdb",
    name: "AbuseIPDB",
    reason:
      "API requires a per-user secret key. Disabled to avoid shipping private credentials in client JavaScript.",
    reference: "https://www.abuseipdb.com/",
  },
  {
    id: "greynoise",
    name: "GreyNoise",
    reason:
      "API requires a secret key (and the community tier disallows redistribution). Disabled for the same credential reason.",
    reference: "https://www.greynoise.io/",
  },
  {
    id: "otx",
    name: "AlienVault OTX",
    reason:
      "API requires an authenticated user key. Disabled — no secrets in the frontend bundle.",
    reference: "https://otx.alienvault.com/",
  },
];

/**
 * Public, keyless sources that are NOT browser-compatible.
 * Verified 2026-09-10: the Feodo Tracker blocklist download returns HTTP 200
 * but sends no `Access-Control-Allow-Origin` header (with or without Origin),
 * so browsers block the fetch; the public list was also stale-dated
 * 2026-03-04 with 5 entries at verification time, and abuse.ch API access
 * now requires a personal Auth-Key. Kept out of the live list; the UI must
 * not claim it as a live source.
 */
export const UNAVAILABLE_PROVIDERS = [
  {
    id: "feodo-tracker",
    name: "Feodo Tracker",
    reason:
      "Not browser-compatible: the blocklist endpoint sends no CORS headers, so browsers block the fetch. The public list was also stale at verification time, and API access now requires a personal Auth-Key.",
    reference: "https://feodotracker.abuse.ch/blocklist/",
  },
];
