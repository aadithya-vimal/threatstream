// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../layouts/DashboardLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('../../components/SectionHeader', () => ({ default: ({ title, description }) => <header><h1>{title}</h1><p>{description}</p></header> }));
vi.mock('../../components/Panel', () => ({ default: ({ children }) => <section>{children}</section> }));

import NotFound from './NotFound';

describe('authenticated not-found page', () => {
  it('renders a controlled 404 with a safe overview link', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByText('Page not found')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Return to overview' }).getAttribute('href')).toBe('/overview');
  });
});
