// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({ value: null }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth.value }));
import { ProtectedRoute } from './ProtectedRoute';

describe('ProtectedRoute', () => {
  afterEach(cleanup);
  const renderRoute = (child = <div>private</div>) => render(
    <MemoryRouter><ProtectedRoute>{child}</ProtectedRoute></MemoryRouter>,
  );

  it('shows loading while session restoration is initializing', () => {
    auth.value = { user: null, loading: true, status: 'initializing', login: vi.fn(), signup: vi.fn() };
    renderRoute();
    expect(screen.getByText('Authenticating session…')).toBeTruthy();
    expect(screen.queryByText('private')).toBeNull();
  });

  it('shows sign-in actions for signed-out users', () => {
    auth.value = { user: null, loading: false, status: 'signed_out', login: vi.fn(), signup: vi.fn() };
    renderRoute();
    expect(screen.getByText('Sign in to continue')).toBeTruthy();
    expect(screen.queryByText('private')).toBeNull();
  });

  it('renders protected content for an authenticated user', () => {
    auth.value = { user: { id: 'user-1' }, loading: false, status: 'signed_in', login: vi.fn(), signup: vi.fn() };
    renderRoute();
    expect(screen.getByText('private')).toBeTruthy();
  });

  it('shows a terminal session error with a bounded retry action', () => {
    auth.value = { user: null, loading: false, status: 'error', retryInitialization: vi.fn() };
    renderRoute();
    expect(screen.getByRole('alert').textContent).toContain('We could not restore your session');
    expect(screen.getByText('Retry authentication')).toBeTruthy();
  });
});
