// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({ value: null }));
const tenancy = vi.hoisted(() => ({ value: null }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('../contexts/TenancyContext', () => ({ useTenancy: () => tenancy.value }));
import { ProtectedRoute } from './ProtectedRoute';

describe('ProtectedRoute', () => {
  afterEach(cleanup);
  const readyTenancy = { status: 'ready', refresh: vi.fn(), currentWorkspace: { id: 'workspace-1' } };
  const renderRoute = (child = <div>private</div>) => render(
    <MemoryRouter><ProtectedRoute>{child}</ProtectedRoute></MemoryRouter>,
  );

  it('shows loading while session restoration is initializing', () => {
    auth.value = { user: null, loading: true, status: 'initializing', login: vi.fn(), signup: vi.fn() };
    tenancy.value = readyTenancy;
    renderRoute();
    expect(screen.getByText('Authenticating session…')).toBeTruthy();
    expect(screen.queryByText('private')).toBeNull();
  });

  it('shows sign-in actions for signed-out users', () => {
    auth.value = { user: null, loading: false, status: 'signed_out', login: vi.fn(), signup: vi.fn() };
    tenancy.value = readyTenancy;
    renderRoute();
    expect(screen.getByText('Sign in to continue')).toBeTruthy();
    expect(screen.queryByText('private')).toBeNull();
  });

  it('renders protected content for an authenticated user', () => {
    auth.value = { user: { id: 'user-1' }, loading: false, status: 'signed_in', login: vi.fn(), signup: vi.fn() };
    tenancy.value = readyTenancy;
    renderRoute();
    expect(screen.getByText('private')).toBeTruthy();
  });

  it('shows a terminal session error with a bounded retry action', () => {
    auth.value = { user: null, loading: false, status: 'error', retryInitialization: vi.fn() };
    tenancy.value = readyTenancy;
    renderRoute();
    expect(screen.getByRole('alert').textContent).toContain('We could not restore your session');
    expect(screen.getByText('Retry authentication')).toBeTruthy();
  });

  it('blocks private content until tenancy resolves', () => {
    auth.value = { user: { id: 'user-1' }, loading: false, status: 'signed_in' };
    tenancy.value = { status: 'loading', refresh: vi.fn() };
    renderRoute();
    expect(screen.getByText('Loading workspace context…')).toBeTruthy();
    expect(screen.queryByText('private')).toBeNull();
  });

  it('shows controlled permission and backend states', () => {
    auth.value = { user: { id: 'user-1' }, loading: false, status: 'signed_in' };
    tenancy.value = { status: 'permission_denied', refresh: vi.fn() };
    const { unmount } = renderRoute();
    expect(screen.getByRole('alert').textContent).toContain('not permitted');
    unmount();
    tenancy.value = { status: 'backend_unavailable', refresh: vi.fn() };
    renderRoute();
    expect(screen.getByRole('alert').textContent).toContain('temporarily unavailable');
  });
});
