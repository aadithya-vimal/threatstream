import React from 'react';
export const SectionHeader = ({ title, description, actions, eyebrow = 'ThreatStream workspace' }) => (
  <header className="section-header">
    <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="section-header__actions">{actions}</div>}
  </header>
);
export default SectionHeader;
