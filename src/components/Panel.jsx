import React from 'react';

export const Panel = ({ title, children, className = '', actions, style = {}, hint }) => (
  <section className={`panel ${className}`} style={style}>
    {title && <header className="panel__header">
      <div><h2 className="panel__title">{title}</h2>{hint && <p className="panel__hint">{hint}</p>}</div>
      {actions && <div className="panel__actions">{actions}</div>}
    </header>}
    <div className="panel__body">{children}</div>
  </section>
);
export default Panel;
