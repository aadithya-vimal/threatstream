/**
 * src/lib/api.js
 * Typed fetch wrapper for the FastAPI backend at http://localhost:8000
 * Automatically attaches Supabase session token as Bearer.
 */
import { supabase } from './supabase/client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const V1 = `${BASE}/api/v1`;

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${V1}${path}`, { ...options, headers });
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

  // Scheduler
  getScheduledTasks: () => apiFetch('/scheduler/tasks'),

  // Health
  health: () => fetch(`${BASE}/health`).then(r => r.json()),
};

export default api;
