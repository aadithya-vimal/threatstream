/**
 * src/lib/api.js
 * Typed fetch wrapper for the FastAPI backend.
 * Automatically attaches Supabase session token as Bearer.
 */
import { supabase } from './supabase/client';

export const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;
const BASE = API_BASE;
const V1 = `${BASE}/api/v1`;

export async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export async function getAuthHeaders(extraHeaders = {}) {
  const token = await getToken();
  const hasContentType = Object.keys(extraHeaders || {}).some(
    (key) => key.toLowerCase() === 'content-type'
  );
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!hasContentType ? { 'Content-Type': 'application/json' } : {}),
    ...extraHeaders,
  };
}

export async function apiRequest(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = await getAuthHeaders({
    ...(options.headers || {}),
    ...(isFormData ? { 'Content-Type': undefined } : {}),
  });
  if (isFormData) {
    delete headers['Content-Type'];
  }
  const res = await fetch(`${V1}${path}`, { ...options, headers });
  return res;
}

export async function apiFetch(path, options = {}) {
  const res = await apiRequest(path, options);
  if (!res.ok) {
    let detail = `API ${res.status}`;
    try { const j = await res.json(); detail = j.detail || detail; } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Jobs
  getJobs: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status_filter', params.status);
    if (params.type)   q.set('type_filter', params.type);
    return apiFetch(`/jobs${q.toString() ? '?' + q : ''}`);
  },
  getJob:    (id)  => apiFetch(`/jobs/${id}`),
  createJob: (body) => apiFetch('/jobs/', { method: 'POST', body: JSON.stringify(body) }),
  cancelJob: (id)  => apiFetch(`/jobs/${id}/cancel`, { method: 'POST' }),
  retryJob:  (id)  => apiFetch(`/jobs/${id}/retry`,  { method: 'POST' }),
  deleteJob: (id)  => apiFetch(`/jobs/${id}`,        { method: 'DELETE' }),
  pauseJob:  (id)  => apiFetch(`/jobs/${id}/pause`,  { method: 'POST' }),
  resumeJob: (id)  => apiFetch(`/jobs/${id}/resume`, { method: 'POST' }),

  // Plugins / Connectors
  getPlugins:     ()        => apiFetch('/plugins/'),
  testPlugin:     (id)      => apiFetch(`/plugins/${id}/test`,    { method: 'POST' }),
  executePlugin:  (id, payload) => apiFetch(`/plugins/${id}/execute`, { method: 'POST', body: JSON.stringify(payload) }),
  configPlugin:   (id, cfg) => apiFetch(`/plugins/${id}/config`,  { method: 'POST', body: JSON.stringify(cfg) }),

  // Telemetry
  getTelemetryEvents: (params = {}) => {
    const q = new URLSearchParams();
    if (params.hostname) q.set('hostname', params.hostname);
    if (params.event_type) q.set('event_type', params.event_type);
    if (params.severity) q.set('severity', params.severity);
    if (params.limit) q.set('limit', params.limit);
    if (params.offset) q.set('offset', params.offset);
    return apiFetch(`/telemetry/events${q.toString() ? '?' + q : ''}`);
  },
  getTelemetryAlerts: (params = {}) => {
    const q = new URLSearchParams(params);
    return apiFetch(`/telemetry/alerts${q.toString() ? '?' + q : ''}`);
  },
  getTelemetryDetections: () => apiFetch('/telemetry/detections'),

  // Malware
  getMalwareSamples: () => apiFetch('/malware/samples'),
  getMalwareYaraRules: () => apiFetch('/malware/yara-rules'),
  getMalwareHuntSessions: () => apiFetch('/malware/hunt-sessions'),
  getMalwareStats: () => apiFetch('/malware/stats'),

  // Scheduler
  getScheduledTasks: () => apiFetch('/scheduler/tasks'),

  // Health
  health: () => fetch(`${BASE}/health`).then(r => r.json()),
};

export default api;
