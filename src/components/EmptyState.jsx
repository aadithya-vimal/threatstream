import React from 'react';
import { Icon } from './Icons';
export const EmptyState = ({ title = 'Nothing here yet', description = 'There is no data to show.', icon, footer }) => (
  <div className="empty-state"><div><div style={{ color: 'var(--accent-cyan)' }}>{icon || <Icon name="info" size={32} />}</div><h3>{title}</h3><p>{description}</p>{footer && <div style={{ marginTop: 18 }}>{footer}</div>}</div></div>
);
export default EmptyState;
