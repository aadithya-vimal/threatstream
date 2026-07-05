import React from 'react';
import { Icon } from './Icons';

export const FilterBar = ({ children, onClear, showClear = false }) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: 'var(--spacing-md)', 
        flexWrap: 'wrap',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        marginBottom: 'var(--spacing-md)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap', flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, gap: '4px', marginRight: 'var(--spacing-xs)' }}>
          <Icon name="filter" size={14} />
          FILTERS:
        </span>
        {children}
      </div>

      {showClear && onClear && (
        <button
          onClick={onClear}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-blue)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background-color var(--transition-fast)'
          }}
          className="btn-text-hover"
        >
          Clear All
        </button>
      )}
    </div>
  );
};

export default FilterBar;
