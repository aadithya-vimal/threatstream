import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(async () => ({ data: null })),
  getJWTToken: vi.fn(async () => 'jwt-token'),
}));

vi.mock('@neondatabase/auth', () => ({
  createInternalNeonAuth: vi.fn(() => ({
    adapter: { getSession: mocks.getSession },
    getJWTToken: mocks.getJWTToken,
  })),
}));
vi.mock('@neondatabase/auth/react/adapters', () => ({ BetterAuthReactAdapter: vi.fn(() => 'adapter-builder') }));

import { getNeonAuthToken, resetTokenRequestForTests } from './neonAuth';

describe('Neon Auth token coordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTokenRequestForTests();
    mocks.getSession.mockResolvedValue({ data: null });
    mocks.getJWTToken.mockResolvedValue('jwt-token');
  });

  it('deduplicates concurrent token requests', async () => {
    let resolveToken;
    mocks.getJWTToken.mockReturnValue(new Promise((resolve) => { resolveToken = resolve; }));
    const first = getNeonAuthToken();
    const second = getNeonAuthToken();
    expect(mocks.getJWTToken).toHaveBeenCalledOnce();
    resolveToken('shared-token');
    await expect(Promise.all([first, second])).resolves.toEqual(['shared-token', 'shared-token']);
  });

  it('forces one uncached session retrieval before refreshing a token', async () => {
    await expect(getNeonAuthToken({ forceRefresh: true, retries: 0 })).resolves.toBe('jwt-token');
    expect(mocks.getSession).toHaveBeenCalledWith({ query: { disableCookieCache: true } });
    expect(mocks.getJWTToken).toHaveBeenCalledOnce();
  });

  it('bounds token retrieval retries to one', async () => {
    mocks.getJWTToken.mockRejectedValue(new Error('token unavailable'));
    await expect(getNeonAuthToken({ retries: 50 })).rejects.toThrow('token unavailable');
    expect(mocks.getJWTToken).toHaveBeenCalledTimes(2);
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
  });

  it('clears failed requests so a later token request can recover', async () => {
    mocks.getJWTToken.mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce('recovered');
    await expect(getNeonAuthToken({ retries: 0 })).rejects.toThrow('temporary');
    await expect(getNeonAuthToken({ retries: 0 })).resolves.toBe('recovered');
  });
});
