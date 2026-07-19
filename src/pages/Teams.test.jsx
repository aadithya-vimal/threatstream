// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Teams } from './Teams';
import { api } from '../lib/api';
vi.mock('../lib/api',()=>({api:{getTeams:vi.fn(),createTeam:vi.fn()}}));
vi.mock('../contexts/TenancyContext',()=>({useTenancy:()=>({currentWorkspace:{id:'workspace-1',name:'Product Security',role_key:'workspace_administrator'}})}));
vi.mock('../layouts/DashboardLayout',()=>({default:({children})=><main>{children}</main>}));
describe('Workspace teams',()=>{beforeEach(()=>{vi.clearAllMocks();api.getTeams.mockResolvedValue([])});afterEach(cleanup);it('renders a real empty state and creates a team',async()=>{api.createTeam.mockResolvedValue({id:'team-1',name:'Platform Security',slug:'platform-security',description:'Platform ownership'});render(<Teams/>);expect(await screen.findByText('No teams yet')).toBeTruthy();fireEvent.change(screen.getByPlaceholderText('Platform Security'),{target:{value:'Platform Security'}});fireEvent.change(screen.getByPlaceholderText('What this team owns'),{target:{value:'Platform ownership'}});fireEvent.click(screen.getByRole('button',{name:'Create team'}));await waitFor(()=>expect(api.createTeam).toHaveBeenCalledWith('workspace-1',{name:'Platform Security',slug:'platform-security',description:'Platform ownership'}));expect(await screen.findByText('Platform ownership')).toBeTruthy()})});
