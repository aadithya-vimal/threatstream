// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, configureApiAuth } from './api';

describe('apiFetch authentication', () => {
  afterEach(() => {
    configureApiAuth(null);
    vi.restoreAllMocks();
  });

  it('attaches the configured bearer token and workspace scope', async () => {
    configureApiAuth({ getToken: async () => 'neon-auth-session-token' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await apiFetch('/example', { workspaceId: 'workspace-1' });
    const request = fetchMock.mock.calls[0][1];
    expect(request.headers.Authorization).toBe('Bearer neon-auth-session-token');
    expect(request.headers['X-Workspace-ID']).toBe('workspace-1');
  });

  it('performs one forced token refresh and one retry after a backend 401', async () => {
    const getToken = vi.fn()
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('refreshed-token');
    configureApiAuth({ getToken });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(apiFetch('/example')).resolves.toEqual({ ok: true });
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(getToken).toHaveBeenLastCalledWith({ forceRefresh: true, retries: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer refreshed-token');
  });

  it('does not recursively retry a second backend 401', async () => {
    const getToken = vi.fn().mockResolvedValue('session-token');
    configureApiAuth({ getToken });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));

    await expect(apiFetch('/example')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('preserves typed errors and correlation identifiers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'permission_denied', message: 'Denied', correlation_id: 'correlation-1' } }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    await expect(apiFetch('/example')).rejects.toMatchObject({ code: 'permission_denied', status: 403, correlationId: 'correlation-1' });
  });
});
