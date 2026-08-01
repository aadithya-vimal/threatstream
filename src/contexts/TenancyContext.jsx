import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const TenancyContext = createContext(null);
const STORAGE_KEY = 'threatstream.current_workspace_id';

export const TenancyProvider = ({ children }) => {
  const { user, logout } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectionNotice, setSelectionNotice] = useState(null);
  const logoutStarted = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setWorkspaces([]);
      setCurrentWorkspaceId(null);
      setError(null);
      setSelectionNotice(null);
      localStorage.removeItem(STORAGE_KEY);
      logoutStarted.current = false;
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const context = await api.getTenancyContext();
      const nextOrganizations = context.organizations || [];
      const nextWorkspaces = context.workspaces || [];
      setOrganizations(nextOrganizations);
      setWorkspaces(nextWorkspaces);
      setCurrentWorkspaceId((selected) => {
        const exists = nextWorkspaces.some((workspace) => workspace.id === selected);
        const next = exists ? selected : nextWorkspaces[0]?.id || null;
        setSelectionNotice(selected && !exists && next ? 'The previously selected workspace is unavailable. ThreatStream selected your first permitted workspace.' : null);
        if (next) localStorage.setItem(STORAGE_KEY, next);
        else localStorage.removeItem(STORAGE_KEY);
        return next;
      });
    } catch (requestError) {
      setError(requestError);
      if (requestError.status === 401 && !logoutStarted.current) {
        logoutStarted.current = true;
        await logout();
      }
    } finally {
      setLoading(false);
    }
  }, [user, logout]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectWorkspace = (workspaceId) => {
    if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
      setSelectionNotice('That workspace is not available to your account.');
      return false;
    }
    localStorage.setItem(STORAGE_KEY, workspaceId);
    setCurrentWorkspaceId(workspaceId);
    setSelectionNotice(null);
    return true;
  };

  const createOrganization = async (payload) => {
    const created = await api.createOrganization(payload);
    await refresh();
    localStorage.setItem(STORAGE_KEY, created.workspace.id);
    setCurrentWorkspaceId(created.workspace.id);
    return created;
  };

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId) || null,
    [currentWorkspaceId, workspaces]
  );
  const currentOrganization = useMemo(
    () => organizations.find((organization) => organization.id === currentWorkspace?.organization_id) || null,
    [currentWorkspace, organizations]
  );
  const status = !user ? 'signed_out'
    : loading ? 'loading'
      : error?.status === 401 ? 'authentication_expired'
        : error?.status === 403 ? 'permission_denied'
          : error ? 'backend_unavailable'
            : currentWorkspace ? 'ready'
              : organizations.length === 0 ? 'onboarding' : 'workspace_unavailable';

  return (
    <TenancyContext.Provider value={{
      organizations,
      workspaces,
      currentOrganization,
      currentWorkspace,
      loading,
      error,
      status,
      selectionNotice,
      refresh,
      selectWorkspace,
      createOrganization
    }}>
      {children}
    </TenancyContext.Provider>
  );
};

export const useTenancy = () => {
  const context = useContext(TenancyContext);
  if (!context) throw new Error('useTenancy must be used inside <TenancyProvider>');
  return context;
};

export default TenancyContext;
