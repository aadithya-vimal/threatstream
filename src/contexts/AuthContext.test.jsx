// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authClient = vi.hoisted(() => ({
  getJWTToken: vi.fn(async () => 'session-jwt'),
  signOut: vi.fn(async () => undefined),
  useSession: vi.fn(),
}));

vi.mock('@neondatabase/auth-ui', () => ({
  NeonAuthUIProvider: ({ children }) => children,
}));

vi.mock('../lib/neonAuth', () => ({
  authClient,
  isNeonAuthConfigured: true,
}));

import { AuthProvider, useAuth } from './AuthContext';

const AuthProbe = () => {
  const auth = useAuth();
  return (
    <div>
      <span>{auth.loading ? 'loading' : auth.user?.email || 'signed-out'}</span>
      <span>{auth.isAuthenticated ? 'authenticated' : 'anonymous'}</span>
      <button type="button" onClick={() => auth.getToken()}>token</button>
      <button type="button" onClick={auth.logout}>logout</button>
    </div>
  );
};

const renderProvider = () => render(
  <MemoryRouter initialEntries={['/overview']}>
    <AuthProvider>
      <Routes>
        <Route path="/overview" element={<AuthProbe />} />
        <Route path="/" element={<div>landing</div>} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>,
);

describe('Neon Auth context', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores and normalizes an authenticated session', async () => {
    authClient.useSession.mockReturnValue({
      isPending: false,
      data: {
        session: { id: 'session-1', expiresAt: '2026-07-19T00:00:00Z' },
        user: { id: 'user-1', email: 'engineer@example.test', name: 'Engineer', image: null },
      },
    });
    renderProvider();
    expect(screen.getByText('engineer@example.test')).toBeTruthy();
    expect(screen.getByText('authenticated')).toBeTruthy();
    fireEvent.click(screen.getByText('token'));
    await waitFor(() => expect(authClient.getJWTToken).toHaveBeenCalled());
  });

  it('signs out through Neon Auth and returns to the landing page', async () => {
    authClient.useSession.mockReturnValue({
      isPending: false,
      data: { session: { id: 'session-1' }, user: { id: 'user-1', email: 'engineer@example.test' } },
    });
    renderProvider();
    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(authClient.signOut).toHaveBeenCalledOnce());
    expect(await screen.findByText('landing')).toBeTruthy();
  });
});
