export const ASSET_TYPES=['domain','subdomain','ip_address','url','repository','cloud_account','host','container_image','kubernetes_cluster','custom'];
export const ASSET_CRITICALITIES=['critical','high','medium','low','unclassified'];
export const ASSET_ENVIRONMENTS=['production','staging','development','testing','internal','external','unknown'];
export const assetLabel=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase());
export const formatAssetDate=value=>value?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
export const canWriteAssets=role=>['workspace_administrator','organization_administrator','application_security_engineer','devsecops_engineer','secops_analyst'].includes(role);
export const canManageAssets=role=>['workspace_administrator','organization_administrator','application_security_engineer'].includes(role);
