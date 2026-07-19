export const ACTIVE_SCAN_STATUSES = [
  "queued",
  "claimed",
  "running",
  "processing",
];
export const scanLabel = (value = "") =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const formatScanDate = (value) =>
  value ? new Date(value).toLocaleString() : "Not started";
export const canManageScans = (role) =>
  [
    "workspace_administrator",
    "application_security_engineer",
    "devsecops_engineer",
  ].includes(role);
export const canRunScans = (role) =>
  canManageScans(role) || role === "secops_analyst";
