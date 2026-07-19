// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Integrations } from './Integrations';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: { getIntegrations: vi.fn(), saveIntegration: vi.fn(), testIntegration: vi.fn(), deleteIntegration: vi.fn() } }));
vi.mock('../contexts/TenancyContext', () => ({ useTenancy: () => ({ currentWorkspace: { id: 'workspace-1', name: 'Workspace Alpha' }, loading: false }) }));
vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('../components/SectionHeader', () => ({ default: ({ title, description }) => <header><h1>{title}</h1><p>{description}</p></header> }));
vi.mock('../components/Panel', () => ({ default: ({ title, hint, children }) => <section><h2>{title}</h2><p>{hint}</p>{children}</section> }));

const integration = (overrides = {}) => ({
  provider: 'virustotal', display_name: 'VirusTotal', description: 'Reputation provider',
  setup_instructions: 'Paste your key.', configured: false, status: 'not_configured', masked_hint: null,
  last_tested_at: null, last_successful_test_at: null, updated_at: null, runtime_mode: 'web',
  credential_fields: [{ key: 'api_key', label: 'API key', field_type: 'password', required: true, min_length: 64, max_length: 64, pattern: '^[A-Fa-f0-9]{64}$', placeholder: '64-character key' }],
  capabilities: { can_manage: true, test_connection: true, web_supported: true, desktop_supported: true, requires_local_agent: false },
  ...overrides
});

describe('Integrations settings', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    api.getIntegrations.mockResolvedValue([integration()]);
  });

  it('renders integration cards and opens a dynamic unfilled secret field', async () => {
    render(<Integrations />);
    expect(await screen.findByText('VirusTotal')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    const field = screen.getByLabelText('API key');
    expect(field.type).toBe('password');
    expect(field.value).toBe('');
    expect(screen.getByText(/cannot be displayed again/i)).toBeTruthy();
  });

  it('submits backend-defined fields once and clears the dialog', async () => {
    const saved = integration({ configured: true, status: 'untested', masked_hint: '••••aaaa' });
    api.saveIntegration.mockResolvedValue(saved);
    render(<Integrations />);
    await screen.findByText('VirusTotal');
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'a'.repeat(64) } });
    fireEvent.click(screen.getByRole('button', { name: /Save for Workspace Alpha/ }));
    await waitFor(() => expect(api.saveIntegration).toHaveBeenCalledWith('workspace-1', 'virustotal', { api_key: 'a'.repeat(64) }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText((_text, element) => element.textContent === 'Credential: ••••aaaa')).toBeTruthy();
  });

  it('renders status, tests configured credentials, and refreshes state', async () => {
    api.getIntegrations.mockResolvedValue([integration({ configured: true, status: 'connected', masked_hint: '••••aaaa' })]);
    api.testIntegration.mockResolvedValue({ status: 'connected', message: 'The credential was accepted by the provider.' });
    render(<Integrations />);
    expect(await screen.findByText('Connected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(api.testIntegration).toHaveBeenCalledWith('workspace-1', 'virustotal'));
    expect(await screen.findByText('The credential was accepted by the provider.')).toBeTruthy();
  });

  it('requires confirmation before deleting and updates the card immediately', async () => {
    api.getIntegrations.mockResolvedValue([integration({ configured: true, status: 'untested', masked_hint: '••••aaaa' })]);
    api.deleteIntegration.mockResolvedValue(null);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Integrations />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Workspace Alpha'));
    await waitFor(() => expect(api.deleteIntegration).toHaveBeenCalledWith('workspace-1', 'virustotal'));
    expect(await screen.findByText('VirusTotal credential deleted.')).toBeTruthy();
  });

  it('shows read-only state without management controls', async () => {
    api.getIntegrations.mockResolvedValue([integration({ capabilities: { ...integration().capabilities, can_manage: false } })]);
    render(<Integrations />);
    expect(await screen.findByText('Read-only')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Configure' })).toBeNull();
  });

  it('displays safe API failures', async () => {
    api.getIntegrations.mockRejectedValue({ message: 'You do not have permission to manage integrations.', correlationId: 'safe-id' });
    render(<Integrations />);
    expect((await screen.findByRole('alert')).textContent).toContain('You do not have permission');
    expect(screen.getByRole('alert').textContent).toContain('safe-id');
  });
});
