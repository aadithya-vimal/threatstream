export const FINDING_STATUSES = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'reopened'];
export const FINDING_SEVERITIES = ['critical', 'high', 'medium', 'low', 'informational'];

export const statusLabel = value => ({
  open: 'Open', acknowledged: 'Acknowledged', in_progress: 'In Progress',
  resolved: 'Resolved', closed: 'Closed', reopened: 'Reopened'
}[value] || value);

export const severityLabel = value => value ? value[0].toUpperCase() + value.slice(1) : '';
export const canTriageFindings = role => ['workspace_administrator', 'organization_administrator', 'application_security_engineer', 'devsecops_engineer', 'secops_analyst'].includes(role);
export const transitionsFor = status => ({
  open: ['acknowledged', 'in_progress', 'resolved', 'closed'],
  acknowledged: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'closed'], resolved: ['closed', 'reopened'],
  closed: ['reopened'], reopened: ['acknowledged', 'in_progress', 'resolved', 'closed']
}[status] || []);
export const formatFindingDate = value => value ? new Date(value).toLocaleString() : '—';
