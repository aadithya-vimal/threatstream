// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Findings } from './Findings';
import { FindingDetail } from './FindingDetail';
import FindingForm from '../components/FindingForm';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: {
  getFindings: vi.fn(), getFinding: vi.fn(), getFindingAssignees: vi.fn(),
  transitionFinding: vi.fn(), updateFinding: vi.fn(), addFindingComment: vi.fn(),
  addFindingEvidence: vi.fn(), deleteFindingEvidence: vi.fn(), deleteFinding: vi.fn()
} }));
vi.mock('../contexts/TenancyContext', () => ({ useTenancy: () => ({ currentWorkspace: { id: 'workspace-1', name: 'Workspace Alpha', role_key: 'application_security_engineer' } }) }));
vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('../components/SectionHeader', () => ({ default: ({ title, description, actions }) => <header><h1>{title}</h1><p>{description}</p>{actions}</header> }));
vi.mock('../components/Panel', () => ({ default: ({ title, hint, actions, children }) => <section><h2>{title}</h2><p>{hint}</p>{actions}{children}</section> }));

const finding = (overrides={}) => ({
  id:'finding-1',workspace_id:'workspace-1',title:'SQL injection',description:'Unsafe query construction',severity:'high',status:'open',source:'manual',external_id:null,remediation:null,resolution_summary:null,assignee:null,version:1,created_at:'2026-07-19T00:00:00Z',updated_at:'2026-07-19T00:00:00Z',acknowledged_at:null,started_at:null,resolved_at:null,closed_at:null,reopened_at:null,evidence:[],comments:[],activity:[],...overrides
});

describe('Findings workflows',()=>{
  afterEach(cleanup);
  beforeEach(()=>{vi.clearAllMocks();api.getFindings.mockResolvedValue({items:[finding()],page:1,page_size:25,total:1,pages:1});api.getFinding.mockResolvedValue(finding());api.getFindingAssignees.mockResolvedValue([]);api.transitionFinding.mockResolvedValue(finding({status:'acknowledged',version:2}));});

  it('loads live findings and sends filtering, sorting, and pagination options',async()=>{render(<MemoryRouter><Findings/></MemoryRouter>);expect(await screen.findByText('SQL injection')).toBeTruthy();await waitFor(()=>expect(api.getFindings).toHaveBeenCalledWith('workspace-1',expect.objectContaining({page:1,page_size:25,sort:'updated_at',direction:'desc'})));fireEvent.change(screen.getByLabelText('Status'),{target:{value:'open'}});await waitFor(()=>expect(api.getFindings).toHaveBeenLastCalledWith('workspace-1',expect.objectContaining({status:'open'})));});

  it('renders safe live API errors',async()=>{api.getFindings.mockRejectedValue({message:'Workspace permission denied',correlationId:'correlation-safe'});render(<MemoryRouter><Findings/></MemoryRouter>);expect((await screen.findByRole('alert')).textContent).toContain('Workspace permission denied');expect(screen.getByRole('alert').textContent).toContain('correlation-safe');});

  it('submits the creation form without mock fields',()=>{const submit=vi.fn();render(<FindingForm assignees={[]} onSubmit={submit}/>);fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Exposed admin endpoint'}});fireEvent.change(screen.getByLabelText('Description'),{target:{value:'An unauthenticated endpoint exposes administrative data.'}});fireEvent.click(screen.getByRole('button',{name:'Save finding'}));expect(submit).toHaveBeenCalledWith(expect.objectContaining({title:'Exposed admin endpoint',severity:'medium',source:'manual',assignee_user_id:null}));});

  it('loads detail activity and performs an optimistic lifecycle transition',async()=>{render(<MemoryRouter initialEntries={['/findings/finding-1']}><Routes><Route path="/findings/:findingId" element={<FindingDetail/>}/></Routes></MemoryRouter>);expect(await screen.findByText('Unsafe query construction')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Change status'}));await waitFor(()=>expect(api.transitionFinding).toHaveBeenCalledWith('workspace-1','finding-1',{version:1,status:'acknowledged',note:null}));});
});
