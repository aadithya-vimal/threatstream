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
  health: () => fetch(`${API_BASE}/health`).then((response) => response.json()),
  readiness: () => fetch(`${API_BASE}/ready`).then((response) => response.json())
};

export default api;
