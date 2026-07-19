import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './Icons';

const groups = [
  { label: 'Operations', items: [{ name: 'Overview', path: '/overview', icon: 'dashboard' }, { name: 'Audit log', path: '/audit', icon: 'activity' }] },
  { label: 'Workspace', items: [{ name: 'Teams', path: '/workspace/teams', icon: 'administration' }, { name: 'Integrations', path: '/settings/integrations', icon: 'settings2' }] }
];
export const Sidebar = ({ collapsed = false, mobileOpen = false, onToggle, onNavigate }) => {
  const { pathname } = useLocation();
  return <aside aria-label="Primary navigation" className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
    <div className="sidebar__brand"><Link to="/" className="brand" onClick={onNavigate}><img src="/logo.svg" alt="" /><span hidden={collapsed}>THREAT<em>STREAM</em></span></Link></div>
    <nav className="sidebar__nav">{groups.map(group => <React.Fragment key={group.label}>
      {!collapsed && <div className="sidebar__label">{group.label}</div>}
      {group.items.map(item => <Link key={item.path} to={item.path} onClick={onNavigate} title={collapsed ? item.name : undefined} className={`nav-item ${pathname === item.path ? 'active' : ''}`}><Icon name={item.icon} size={18} />{!collapsed && <span>{item.name}</span>}</Link>)}
    </React.Fragment>)}</nav>
    <div className="sidebar__footer"><button type="button" className="btn btn-secondary sidebar__toggle" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={15} />{!collapsed && 'Collapse'}</button></div>
  </aside>;
};
export default Sidebar;
