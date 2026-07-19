import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenancy } from '../contexts/TenancyContext';
import { Icon } from './Icons';

const titles = { '/overview': 'Security overview', '/audit': 'Audit log', '/workspace/teams': 'Workspace teams', '/settings/integrations': 'Integration settings' };
export const Topbar = ({ onOpenMenu }) => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, selectWorkspace } = useTenancy();
  const displayName = user?.displayName || user?.email || 'Operator';
  return <header className="topbar">
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <button type="button" className="btn btn-secondary icon-btn mobile-menu" onClick={onOpenMenu} aria-label="Open navigation">☰</button>
      <div className="topbar__title"><span>Application security operations</span><strong>{titles[pathname] || 'ThreatStream'}</strong></div>
    </div>
    <div className="topbar__utilities">
      {workspaces.length > 0 && <select className="select" aria-label="Current workspace" value={currentWorkspace?.id || ''} onChange={event => selectWorkspace(event.target.value)}>{workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select>}
      <div className="user-chip"><div className="user-chip__avatar"><Icon name="user" size={16} /></div><div className="user-chip__meta"><strong>{displayName}</strong><span>{currentWorkspace?.role_key?.replaceAll('_', ' ') || 'No workspace'}</span></div></div>
      <button type="button" className="btn btn-ghost icon-btn" onClick={logout} aria-label="Sign out" title="Sign out"><Icon name="cross" size={16} /></button>
    </div>
  </header>;
};
export default Topbar;
