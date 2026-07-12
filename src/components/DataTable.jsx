import React from 'react';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

export const DataTable = ({ 
  columns = [], 
  data = [], 
  loading = false, 
  emptyText = 'No data available',
  onRowClick,
  tableHint
}) => {
  if (loading) {
    return <LoadingState />;
  }

  if (!data || data.length === 0) {
    return <EmptyState description={emptyText} />;
  }

  return (
    <div title={tableHint || emptyText} style={{ width: '100%', overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                title={col.hint || col.header}
                style={{ 
                  padding: '12px 16px', 
                  fontWeight: 600, 
                  color: 'var(--text-secondary)', 
                  textTransform: 'uppercase', 
                  fontSize: '11px',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr 
              key={rowIdx} 
              onClick={() => onRowClick && onRowClick(row)}
              title={row.rowHint || row.summary || row.title || row.id || ''}
              style={{ 
                borderBottom: rowIdx === data.length - 1 ? 'none' : '1px solid var(--border-color)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color var(--transition-fast)'
              }}
              className="table-row-hover"
            >
              {columns.map((col, colIdx) => {
                const cellValue = row[col.accessor];
                return (
                  <td 
                    key={colIdx} 
                    style={{ 
                      padding: '12px 16px', 
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'middle'
                    }}
                  >
                    {col.renderCell ? col.renderCell(cellValue, row) : cellValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
