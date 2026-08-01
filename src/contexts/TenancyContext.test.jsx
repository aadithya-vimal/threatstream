// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logout = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('./AuthContext', () => ({
  useAuth: (() => {
    const user = { id: 'user-1' };
    return () => ({ user, logout });
  })()
}));

vi.mock('../lib/api', () => ({
  api: {
    getTenancyContext: vi.fn(),
    createOrganization: vi.fn()
  }
}));

import { api } from '../lib/api';
import { TenancyProvider, useTenancy } from './TenancyContext';

const Harness = () => {
  const { currentWorkspace, workspaces, selectWorkspace, error, status, selectionNotice, createOrganization } = useTenancy();
  return (
    <div>
      <div data-testid="current-workspace">{currentWorkspace?.name || 'none'}</div>
      <div data-testid="tenant-error">{error?.message || 'none'}</div>
      <div data-testid="tenant-status">{status}</div>
      <div data-testid="selection-notice">{selectionNotice || 'none'}</div>
      <button onClick={() => selectWorkspace('workspace-forbidden')}>Forbidden workspace</button>
      <button onClick={() => createOrganization({ name: 'Example', slug: 'example', workspace_name: 'Product', workspace_slug: 'product' })}>Bootstrap</button>
      {workspaces.map((workspace) => (
        <button key={workspace.id} onClick={() => selectWorkspace(workspace.id)}>{workspace.name}</button>
      ))}
    </div>
  );
};

describe('TenancyProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('loads tenant context and persists workspace switching', async () => {
    api.getTenancyContext.mockResolvedValue({
      organizations: [{ id: 'organization-1', name: 'Example', slug: 'example' }],
      workspaces: [
        { id: 'workspace-1', organization_id: 'organization-1', name: 'Product One', role_key: 'workspace_administrator' },
        { id: 'workspace-2', organization_id: 'organization-1', name: 'Product Two', role_key: 'application_security_engineer' }
      ]
    });

    render(<TenancyProvider><Harness /></TenancyProvider>);

    await waitFor(() => expect(screen.getByTestId('current-workspace').textContent).toBe('Product One'));
    fireEvent.click(screen.getByRole('button', { name: 'Product Two' }));

    expect(screen.getByTestId('current-workspace').textContent).toBe('Product Two');
    expect(localStorage.getItem('threatstream.current_workspace_id')).toBe('workspace-2');
  });

  it('represents a successful empty tenant without an error', async () => {
    api.getTenancyContext.mockResolvedValue({ organizations: [], workspaces: [] });
    render(<TenancyProvider><Harness /></TenancyProvider>);
    await waitFor(() => expect(api.getTenancyContext).toHaveBeenCalled());
    expect(screen.getByTestId('current-workspace').textContent).toBe('none');
    expect(screen.getByTestId('tenant-error').textContent).toBe('none');
    expect(screen.getByTestId('tenant-status').textContent).toBe('onboarding');
  });

  it('clears an invalid stored workspace and selects the first permitted workspace', async () => {
    localStorage.setItem('threatstream.current_workspace_id', 'deleted-workspace');
    api.getTenancyContext.mockResolvedValue({ organizations: [{ id: 'organization-1' }], workspaces: [{ id: 'workspace-1', organization_id: 'organization-1', name: 'Product' }] });
    render(<TenancyProvider><Harness /></TenancyProvider>);
    await waitFor(() => expect(screen.getByTestId('current-workspace').textContent).toBe('Product'));
    expect(localStorage.getItem('threatstream.current_workspace_id')).toBe('workspace-1');
    expect(screen.getByTestId('selection-notice').textContent).toContain('previously selected workspace');
  });

  it('rejects unauthorized local workspace selection', async () => {
    api.getTenancyContext.mockResolvedValue({ organizations: [{ id: 'organization-1' }], workspaces: [{ id: 'workspace-1', organization_id: 'organization-1', name: 'Product' }] });
    render(<TenancyProvider><Harness /></TenancyProvider>);
    await waitFor(() => expect(screen.getByTestId('current-workspace').textContent).toBe('Product'));
    fireEvent.click(screen.getByText('Forbidden workspace'));
    expect(screen.getByTestId('selection-notice').textContent).toContain('not available');
    expect(localStorage.getItem('threatstream.current_workspace_id')).toBe('workspace-1');
  });

  it('refreshes and selects the created bootstrap workspace', async () => {
    api.getTenancyContext.mockResolvedValueOnce({ organizations: [], workspaces: [] }).mockResolvedValueOnce({ organizations: [{ id: 'organization-1' }], workspaces: [{ id: 'workspace-1', organization_id: 'organization-1', name: 'Product' }] });
    api.createOrganization.mockResolvedValue({ workspace: { id: 'workspace-1' } });
    render(<TenancyProvider><Harness /></TenancyProvider>);
    await waitFor(() => expect(screen.getByTestId('tenant-status').textContent).toBe('onboarding'));
    fireEvent.click(screen.getByText('Bootstrap'));
    await waitFor(() => expect(screen.getByTestId('current-workspace').textContent).toBe('Product'));
    expect(localStorage.getItem('threatstream.current_workspace_id')).toBe('workspace-1');
  });

  it('logs out once after an authentication-expired response', async () => {
    api.getTenancyContext.mockRejectedValue(Object.assign(new Error('Expired'), { status: 401 }));
    render(<TenancyProvider><Harness /></TenancyProvider>);
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(screen.getByTestId('tenant-status').textContent).toBe('authentication_expired');
  });

  it('distinguishes permission failures from backend errors', async () => {
    api.getTenancyContext.mockRejectedValue(Object.assign(new Error('Denied'), { status: 403 }));
    const { unmount } = render(<TenancyProvider><Harness /></TenancyProvider>);
    await waitFor(() => expect(screen.getByTestId('tenant-status').textContent).toBe('permission_denied'));
    unmount();
    api.getTenancyContext.mockRejectedValue(Object.assign(new Error('Unavailable'), { status: 503 }));
    render(<TenancyProvider><Harness /></TenancyProvider>);
    await waitFor(() => expect(screen.getByTestId('tenant-status').textContent).toBe('backend_unavailable'));
  });

  it('surfaces a tenant API failure instead of treating it as empty data', async () => {
    api.getTenancyContext.mockRejectedValue(new Error('Database API is unavailable'));
    render(<TenancyProvider><Harness /></TenancyProvider>);
    await waitFor(() => expect(screen.getByTestId('tenant-error').textContent).toBe('Database API is unavailable'));
  });
});
