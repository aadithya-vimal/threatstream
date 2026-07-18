// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./AuthContext', () => ({
  useAuth: (() => {
    const user = { id: 'user-1' };
    return () => ({ user });
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
  const { currentWorkspace, workspaces, selectWorkspace, error } = useTenancy();
  return (
    <div>
      <div data-testid="current-workspace">{currentWorkspace?.name || 'none'}</div>
      <div data-testid="tenant-error">{error?.message || 'none'}</div>
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
  });

  it('surfaces a tenant API failure instead of treating it as empty data', async () => {
    api.getTenancyContext.mockRejectedValue(new Error('Database API is unavailable'));
    render(<TenancyProvider><Harness /></TenancyProvider>);
    await waitFor(() => expect(screen.getByTestId('tenant-error').textContent).toBe('Database API is unavailable'));
  });
});
