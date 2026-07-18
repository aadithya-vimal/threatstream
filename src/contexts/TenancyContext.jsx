import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const TenancyContext = createContext(null);
const STORAGE_KEY = 'threatstream.current_workspace_id';

export const TenancyProvider = ({ children }) => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setWorkspaces([]);
      setError(null);
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
        if (next) localStorage.setItem(STORAGE_KEY, next);
        else localStorage.removeItem(STORAGE_KEY);
        return next;
      });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectWorkspace = (workspaceId) => {
    if (!workspaces.some((workspace) => workspace.id === workspaceId)) return;
    localStorage.setItem(STORAGE_KEY, workspaceId);
    setCurrentWorkspaceId(workspaceId);
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

  return (
    <TenancyContext.Provider value={{
      organizations,
      workspaces,
      currentOrganization,
      currentWorkspace,
      loading,
      error,
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
