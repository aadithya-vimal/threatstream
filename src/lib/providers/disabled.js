/**
 * Providers deliberately NOT enabled — with the exact reason.
 *
 * Rule: if a source needs a secret server-side key or disallows browser
 * usage, it stays disabled with an explanation rather than compromising
 * the static-frontend architecture by leaking credentials into the bundle.
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
