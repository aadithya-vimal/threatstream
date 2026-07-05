import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import GlobalSearch from '../components/GlobalSearch';

export const DashboardLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      // Check for Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  return (
    <div 
      style={{ 
        display: 'flex', 
        height: '100vh', 
        width: '100vw', 
        backgroundColor: 'var(--bg-primary)', 
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Collapsible Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      {/* Main Content Area */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          height: '100%', 
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Top Header Bar */}
        <Topbar onSearchTrigger={() => setIsSearchOpen(true)} />

        {/* Dynamic Page content */}
        <main 
          style={{ 
            flex: 1, 
            padding: '24px', 
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {children}
        </main>
      </div>

      {/* Reusable Enterprise Command Palette */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
