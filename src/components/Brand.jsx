import React from 'react';
import { Link } from 'react-router-dom';

export const Brand = ({ compact = false, className = '', onClick }) => (
  <Link to="/" className={`brand ${compact ? 'brand--compact' : ''} ${className}`} onClick={onClick} aria-label="ThreatStream home">
    <span className="brand__mark" aria-hidden="true"><img src="/logo.svg" alt="" /></span>
    {!compact && <span className="brand__wordmark">Threat<span>Stream</span></span>}
  </Link>
);
export default Brand;
