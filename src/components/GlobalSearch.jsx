/**
 * src/components/GlobalSearch.jsx
 * Enterprise Command Palette and Global Search Indexer
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetService } from '../services/AssetService';
import { ThreatService } from '../services/ThreatService';
import { IncidentService } from '../services/IncidentService';
import { UserService } from '../services/UserService';
import { TelemetryService } from '../services/TelemetryService';
import { Icon } from './Icons';

const assetService = new AssetService();
const threatService = new ThreatService();
const incidentService = new IncidentService();
const userService = new UserService();
const telemetryService = new TelemetryService();

export const GlobalSearch = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Index search across multiple repository service layers
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchAllData = async () => {
      const q = query.toLowerCase();
      const matched = [];

      try {
        // 1. Search Assets
        const assets = await assetService.getAssets();
        assets.forEach(a => {
          if (a.hostname.toLowerCase().includes(q) || a.ip.includes(q)) {
            matched.push({ type: 'Asset', id: a.id, title: a.hostname, desc: `Host IP: ${a.ip} • OS: ${a.os}`, path: '/assets' });
          }
        });

        // 2. Search IOCs
        const iocs = await threatService.getIOCs();
        iocs.forEach(ioc => {
          if (ioc.value.toLowerCase().includes(q) || ioc.threat_type?.toLowerCase().includes(q)) {
            matched.push({ type: 'IOC (Threat)', id: ioc.id, title: ioc.value, desc: `Type: ${ioc.ioc_type} • Confidence: ${ioc.confidence}%`, path: '/threat-intelligence' });
          }
        });

        // 3. Search Incidents
        const incidents = await incidentService.getIncidents();
        incidents.forEach(inc => {
          if (inc.id.toLowerCase().includes(q) || inc.summary.toLowerCase().includes(q)) {
            matched.push({ type: 'Incident', id: inc.id, title: inc.id, desc: `${inc.summary} • Owner: ${inc.owner}`, path: '/incidents' });
          }
        });

        // 4. Search Users
        const users = await userService.getUsers();
        users.forEach(u => {
          if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) {
            matched.push({ type: 'Operator', id: u.email, title: u.name, desc: `Role: ${u.role} • Status: ${u.status}`, path: '/administration' });
          }
        });

        // 5. Search Rules
        const rules = await telemetryService.getRules();
        rules.forEach(r => {
          if (r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)) {
            matched.push({ type: 'Detection Rule', id: r.id, title: r.name, desc: `Rule Type: ${r.type} • Severity: ${r.severity}`, path: '/threat-hunting' });
          }
        });

        setResults(matched.slice(0, 8)); // Cap at 8 results
      } catch (err) {
        console.error('Global search indexing failed:', err);
      }
    };

    const delay = setTimeout(searchAllData, 150);
    return () => clearTimeout(delay);
  }, [query]);

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) {
        selectItem(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const selectItem = (item) => {
    onClose();
    navigate(item.path);
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '600px',
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border-color)', gap: '12px' }}>
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <Icon name="search" size={18} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search assets, threats, incidents, rules, CVEs..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit'
            }}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            ESC
          </span>
        </div>

        {/* Search body */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
          {results.length > 0 ? (
            results.map((item, idx) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  backgroundColor: idx === activeIndex ? 'var(--bg-secondary)' : 'transparent',
                  cursor: 'pointer',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.desc}</span>
                </div>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--color-blue)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  {item.type}
                </span>
              </div>
            ))
          ) : query.trim() ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matches found for "<strong>{query}</strong>"
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span>ProTip: Press <code>ArrowUp/Down</code> to navigate and <code>Enter</code> to select.</span>
              <span>Available indexes: Assets, CVEs, Indicators, Incidents, System Users, Threat Hunting Rules.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
