export const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;
const V1 = `${API_BASE}/api/v1`;
let tokenGetter = async () => null;

export const configureApiAuth = (getToken) => {
  tokenGetter = typeof getToken === 'function' ? getToken : async () => null;
};

export class ApiError extends Error {
  constructor(message, { code = 'request_failed', status = 500, correlationId = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.correlationId = correlationId;
  }
}

export async function apiFetch(path, options = {}) {
  const token = await tokenGetter();
  const response = await fetch(`${V1}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.workspaceId ? { 'X-Workspace-ID': options.workspaceId } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    let errorPayload = null;
    try { errorPayload = (await response.json()).error; } catch { errorPayload = null; }
    throw new ApiError(errorPayload?.message || `API request failed with status ${response.status}`, {
      code: errorPayload?.code,
      status: response.status,
      correlationId: errorPayload?.correlation_id || response.headers.get('X-Correlation-ID')
    });
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  getTenancyContext: () => apiFetch('/tenancy/context'),
  createOrganization: (payload) => apiFetch('/tenancy/organizations', { method: 'POST', body: JSON.stringify(payload) }),
  createWorkspace: (organizationId, payload) => apiFetch(`/tenancy/organizations/${organizationId}/workspaces`, { method: 'POST', body: JSON.stringify(payload) }),
  getTeams: (workspaceId) => apiFetch(`/tenancy/workspaces/${workspaceId}/teams`, { workspaceId }),
  createTeam: (workspaceId, payload) => apiFetch(`/tenancy/workspaces/${workspaceId}/teams`, { method: 'POST', body: JSON.stringify(payload), workspaceId }),
  getAuditEvents: (workspaceId, limit = 100) => apiFetch(`/tenancy/workspaces/${workspaceId}/audit?limit=${limit}`, { workspaceId }),
  getIntegrations: (workspaceId) => apiFetch(`/workspaces/${workspaceId}/integrations`, { workspaceId }),
  saveIntegration: (workspaceId, provider, credentials) => apiFetch(`/workspaces/${workspaceId}/integrations/${provider}`, { method: 'PUT', body: JSON.stringify({ credentials }), workspaceId }),
  testIntegration: (workspaceId, provider) => apiFetch(`/workspaces/${workspaceId}/integrations/${provider}/test`, { method: 'POST', workspaceId }),
  deleteIntegration: (workspaceId, provider) => apiFetch(`/workspaces/${workspaceId}/integrations/${provider}`, { method: 'DELETE', workspaceId }),
  getFindings: (workspaceId, filters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) value.forEach(item => query.append(key, item));
      else query.set(key, String(value));
    });
    return apiFetch(`/workspaces/${workspaceId}/findings?${query}`, { workspaceId });
  },
  getFinding: (workspaceId, findingId) => apiFetch(`/workspaces/${workspaceId}/findings/${findingId}`, { workspaceId }),
  getFindingAssignees: (workspaceId) => apiFetch(`/workspaces/${workspaceId}/findings/assignees`, { workspaceId }),
  createFinding: (workspaceId, payload) => apiFetch(`/workspaces/${workspaceId}/findings`, { method: 'POST', body: JSON.stringify(payload), workspaceId }),
  updateFinding: (workspaceId, findingId, payload) => apiFetch(`/workspaces/${workspaceId}/findings/${findingId}`, { method: 'PATCH', body: JSON.stringify(payload), workspaceId }),
  transitionFinding: (workspaceId, findingId, payload) => apiFetch(`/workspaces/${workspaceId}/findings/${findingId}/transitions`, { method: 'POST', body: JSON.stringify(payload), workspaceId }),
  deleteFinding: (workspaceId, findingId, version) => apiFetch(`/workspaces/${workspaceId}/findings/${findingId}`, { method: 'DELETE', body: JSON.stringify({ version }), workspaceId }),
  addFindingComment: (workspaceId, findingId, version, body) => apiFetch(`/workspaces/${workspaceId}/findings/${findingId}/comments`, { method: 'POST', body: JSON.stringify({ version, body }), workspaceId }),
  addFindingEvidence: (workspaceId, findingId, payload) => apiFetch(`/workspaces/${workspaceId}/findings/${findingId}/evidence`, { method: 'POST', body: JSON.stringify(payload), workspaceId }),
  deleteFindingEvidence: (workspaceId, findingId, evidenceId, version) => apiFetch(`/workspaces/${workspaceId}/findings/${findingId}/evidence/${evidenceId}`, { method: 'DELETE', body: JSON.stringify({ version }), workspaceId }),
  getAssets: (workspaceId, filters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) value.forEach(item => query.append(key, item)); else query.set(key, String(value));
    });
    return apiFetch(`/workspaces/${workspaceId}/assets?${query}`, { workspaceId });
  },
  getAsset: (workspaceId, assetId) => apiFetch(`/workspaces/${workspaceId}/assets/${assetId}`, { workspaceId }),
  getAssetOwners: (workspaceId) => apiFetch(`/workspaces/${workspaceId}/assets/owners`, { workspaceId }),
  createAsset: (workspaceId, payload) => apiFetch(`/workspaces/${workspaceId}/assets`, { method: 'POST', body: JSON.stringify(payload), workspaceId }),
  updateAsset: (workspaceId, assetId, payload) => apiFetch(`/workspaces/${workspaceId}/assets/${assetId}`, { method: 'PATCH', body: JSON.stringify(payload), workspaceId }),
  activateAsset: (workspaceId, assetId, version) => apiFetch(`/workspaces/${workspaceId}/assets/${assetId}/activate`, { method: 'POST', body: JSON.stringify({ version }), workspaceId }),
  deactivateAsset: (workspaceId, assetId, version) => apiFetch(`/workspaces/${workspaceId}/assets/${assetId}/deactivate`, { method: 'POST', body: JSON.stringify({ version }), workspaceId }),
  health: () => fetch(`${API_BASE}/health`).then((response) => response.json()),
  readiness: () => fetch(`${API_BASE}/ready`).then((response) => response.json())
};

export default api;
