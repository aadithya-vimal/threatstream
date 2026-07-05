import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export const DashboardLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
        <Topbar />

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
    </div>
  );
};

export default DashboardLayout;
