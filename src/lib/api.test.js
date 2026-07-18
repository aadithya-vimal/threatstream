// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, configureApiAuth } from './api';

describe('apiFetch authentication', () => {
  afterEach(() => {
    configureApiAuth(async () => null);
    vi.restoreAllMocks();
  });

  it('attaches the configured bearer token and workspace scope', async () => {
    configureApiAuth(async () => 'neon-auth-session-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await apiFetch('/example', { workspaceId: 'workspace-1' });
    const request = fetchMock.mock.calls[0][1];
    expect(request.headers.Authorization).toBe('Bearer neon-auth-session-token');
    expect(request.headers['X-Workspace-ID']).toBe('workspace-1');
  });

  it('preserves typed errors and correlation identifiers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'permission_denied', message: 'Denied', correlation_id: 'correlation-1' } }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    await expect(apiFetch('/example')).rejects.toMatchObject({ code: 'permission_denied', status: 403, correlationId: 'correlation-1' });
  });
});
