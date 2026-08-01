// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(async () => 'session-jwt'),
  signIn: vi.fn(async () => undefined),
  signUp: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  useSession: vi.fn(),
  configureApiAuth: vi.fn(),
}));

vi.mock('@neondatabase/auth-ui', () => ({ NeonAuthUIProvider: ({ children }) => children }));
vi.mock('../lib/api', () => ({ configureApiAuth: mocks.configureApiAuth }));
vi.mock('../lib/neonAuth', () => ({
  authClient: {
    signIn: { email: mocks.signIn },
    signUp: { email: mocks.signUp },
    signOut: mocks.signOut,
    useSession: mocks.useSession,
  },
  getNeonAuthToken: mocks.getToken,
  isNeonAuthConfigured: true,
}));

import { AuthProvider, useAuth } from './AuthContext';

const AuthProbe = () => {
  const auth = useAuth();
  return <div>
    <span data-testid="status">{auth.status}</span>
    <span>{auth.user?.email || 'signed-out'}</span>
    <button onClick={() => auth.getToken()}>token</button>
    <button onClick={() => auth.signIn({ email: 'a@example.test', password: 'secret' })}>sign-in</button>
    <button onClick={() => auth.signUp({ email: 'a@example.test', password: 'secret', name: 'A' })}>sign-up</button>
    <button onClick={auth.signOut}>sign-out</button>
    <button onClick={auth.retryInitialization}>retry</button>
  </div>;
};

const renderProvider = () => render(
  <MemoryRouter initialEntries={['/overview']}>
    <AuthProvider><Routes>
      <Route path="/overview" element={<AuthProbe />} />
      <Route path="/" element={<div>landing</div>} />
    </Routes></AuthProvider>
  </MemoryRouter>,
);

describe('Neon Auth context', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSession.mockReturnValue({ isPending: false, data: null, error: null, refetch: vi.fn() });
  });

  it('exposes deterministic initializing and signed-out states', () => {
    mocks.useSession.mockReturnValue({ isPending: true, data: null, error: null });
    const { unmount } = renderProvider();
    expect(screen.getByTestId('status').textContent).toBe('initializing');
    unmount();
    mocks.useSession.mockReturnValue({ isPending: false, data: null, error: null });
    renderProvider();
    expect(screen.getByTestId('status').textContent).toBe('signed_out');
  });

  it('restores and normalizes an authenticated session', async () => {
    mocks.useSession.mockReturnValue({ isPending: false, error: null, data: {
      session: { id: 'session-1', expiresAt: '2026-07-19T00:00:00Z' },
      user: { id: 'user-1', email: 'engineer@example.test', name: 'Engineer' },
    } });
    renderProvider();
    expect(screen.getByTestId('status').textContent).toBe('signed_in');
    expect(screen.getByText('engineer@example.test')).toBeTruthy();
    fireEvent.click(screen.getByText('token'));
    await waitFor(() => expect(mocks.getToken).toHaveBeenCalledOnce());
  });

  it('exposes sign-in and sign-up operations', async () => {
    renderProvider();
    fireEvent.click(screen.getByText('sign-in'));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByText('sign-up'));
    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledOnce());
  });

  it('shows a safe terminal error and retries session initialization', async () => {
    const refetch = vi.fn(async () => undefined);
    mocks.useSession.mockReturnValue({ isPending: false, data: null, error: new Error('Session unavailable'), refetch });
    renderProvider();
    expect(screen.getByTestId('status').textContent).toBe('error');
    fireEvent.click(screen.getByText('retry'));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
  });

  it('cleans up through Neon Auth and returns to landing', async () => {
    mocks.useSession.mockReturnValue({ isPending: false, error: null, data: {
      session: { id: 'session-1' }, user: { id: 'user-1', email: 'engineer@example.test' },
    } });
    renderProvider();
    fireEvent.click(screen.getByText('sign-out'));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(await screen.findByText('landing')).toBeTruthy();
  });

  it('configures one API token bridge and cleans it up', () => {
    const { unmount } = renderProvider();
    expect(mocks.configureApiAuth).toHaveBeenCalledTimes(1);
    expect(mocks.configureApiAuth.mock.calls[0][0].getToken).toBeTypeOf('function');
    unmount();
    expect(mocks.configureApiAuth).toHaveBeenLastCalledWith(null);
  });
});
