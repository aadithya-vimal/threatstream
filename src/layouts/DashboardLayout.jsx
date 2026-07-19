import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export const DashboardLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="app-shell">
    <button aria-label="Close navigation" className={`mobile-backdrop ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />
    <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} onToggle={() => setCollapsed(!collapsed)} />
    <div className="shell-main">
      <Topbar onOpenMenu={() => setMobileOpen(true)} />
      <main className="shell-content"><div className="shell-content__inner">{children}</div></main>
    </div>
  </div>;
};
export default DashboardLayout;
