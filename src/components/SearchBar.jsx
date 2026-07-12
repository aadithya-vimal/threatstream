import React from 'react';
import { Icon } from './Icons';

export const SearchBar = ({ 
  value = '', 
  onChange, 
  placeholder = 'Search records...',
  style = {},
  hint
}) => {
  return (
    <div 
      style={{ 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'center', 
        flex: 1,
        minWidth: '200px',
        ...style 
      }}
    >
      <span 
        style={{ 
          position: 'absolute', 
          left: '12px', 
          color: 'var(--text-muted)', 
          display: 'flex', 
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        <Icon name="search" size={16} />
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        title={hint || placeholder}
        style={{
          width: '100%',
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '8px 12px 8px 36px',
          color: 'var(--text-primary)',
          fontSize: '13px',
          outline: 'none',
          transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)'
        }}
        className="search-input-focus"
      />
    </div>
  );
};

export default SearchBar;
