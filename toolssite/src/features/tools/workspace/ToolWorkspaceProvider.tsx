import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { TranslationKey } from '../../../i18n/translations';
import { TOOLS } from '../registry';
import { generateUuidV7 } from '../../../lib/uuid';
import type { ToolId } from '../../../types/tool';
import {
  TOOL_STATE_DEFINITIONS,
  type AnyToolState,
  type ToolStateDefinition,
  type ToolStateMap,
  type ToolStateName,
} from './toolStates';
import { ToolWorkspaceContext, type ToolWorkspaceValue } from './ToolWorkspaceContext';
import {
  removeAllTabs,
  removeTabs,
  loadWorkspace,
  openWorkspaceDatabase,
  saveActiveTabId,
  saveTab,
  saveTabTitle,
  saveToolState,
  type ToolTab,
  type WorkspaceDatabase,
} from './workspaceDatabase';

const STATE_WRITE_DELAY_MS = 500;

function discardPendingStateWrites(
  pendingWrites: Map<string, () => void>,
  stateTimers: Map<string, number>,
  tabIds: readonly string[],
): void {
  tabIds.forEach((tabId) => {
    pendingWrites.delete(tabId);

    const timerId = stateTimers.get(tabId);

    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      stateTimers.delete(tabId);
    }
  });
}

type ToolWorkspaceProviderProps = {
  activeToolId: ToolId;
  onToolChange: (toolId: ToolId) => void;
  children: ReactNode;
};

export default function ToolWorkspaceProvider({
  activeToolId,
  onToolChange,
  children,
}: ToolWorkspaceProviderProps) {
  const [status, setStatus] = useState<ToolWorkspaceValue['status']>('loading');
  const [tabs, setTabs] = useState<readonly ToolTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [stateCache, setStateCache] = useState<ReadonlyMap<string, AnyToolState>>(new Map());
  const [error, setError] = useState<TranslationKey | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const databaseRef = useRef<WorkspaceDatabase | null>(null);
  const stateCacheRef = useRef<ReadonlyMap<string, AnyToolState>>(new Map());
  const stateTimersRef = useRef<Map<string, number>>(new Map());
  const pendingStateWritesRef = useRef<Map<string, () => void>>(new Map());
  const creatingToolIdsRef = useRef<ReadonlySet<ToolId>>(new Set());
  const hasInitializedSelectionRef = useRef(false);
  const [shouldRestoreActiveTab] = useState(
    () => !new URLSearchParams(window.location.search).has('tool'),
  );
  const onToolChangeRef = useRef(onToolChange);

  useEffect(() => {
    onToolChangeRef.current = onToolChange;
  }, [onToolChange]);

  const flushStateWrites = useCallback(() => {
    stateTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    stateTimersRef.current.clear();
    pendingStateWritesRef.current.forEach((write) => write());
    pendingStateWritesRef.current.clear();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const initialize = async () => {
      const database = await openWorkspaceDatabase();

      if (isCurrent) {
        databaseRef.current = database;
      }

      const snapshot = await loadWorkspace(database, TOOLS[0].id);

      if (!isCurrent) {
        database.close();
        return;
      }

      setTabs(snapshot.tabs);
      stateCacheRef.current = snapshot.states;
      setStateCache(snapshot.states);
      setActiveTabId(snapshot.activeTabId);
      setStatus('ready');
    };

    initialize().catch(() => {
      if (isCurrent) {
        setStatus('error');
        setError('workspace.error.load');
      }
    });

    const handlePageHide = () => flushStateWrites();

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      isCurrent = false;
      window.removeEventListener('pagehide', handlePageHide);
      databaseRef.current?.close();
      databaseRef.current = null;
    };
  }, [flushStateWrites, reloadToken]);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs],
  );

  const activateTab = useCallback((tabId: string) => {
    const database = databaseRef.current;
    const nextTab = tabs.find((tab) => tab.id === tabId);

    if (!nextTab || nextTab.id === activeTabId) {
      return;
    }

    setActiveTabId(nextTab.id);

    if (database) {
      void saveActiveTabId(database, nextTab.id).catch(() => {
        setError('workspace.error.saveActiveTab');
      });
    }

    if (nextTab.toolId !== activeToolId) {
      onToolChangeRef.current(nextTab.toolId);
    }
  }, [activeTabId, activeToolId, tabs]);

  const createTab = useCallback(async (toolId: ToolId) => {
    const database = databaseRef.current;

    if (!database || creatingToolIdsRef.current.has(toolId)) {
      return;
    }

    creatingToolIdsRef.current = new Set(creatingToolIdsRef.current).add(toolId);

    const now = Date.now();
    const tab: ToolTab = {
      id: generateUuidV7(),
      toolId,
      title: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await saveTab(database, tab);
      await saveActiveTabId(database, tab.id);
      setTabs((currentTabs) => [...currentTabs, tab]);
      const nextStates = new Map(stateCacheRef.current).set(
        tab.id,
        TOOL_STATE_DEFINITIONS[toolId].defaultValue,
      );

      stateCacheRef.current = nextStates;
      setStateCache(nextStates);
      setActiveTabId(tab.id);
    } catch {
      setError('workspace.error.saveNewTab');
    } finally {
      const nextCreatingToolIds = new Set(creatingToolIdsRef.current);

      nextCreatingToolIds.delete(toolId);
      creatingToolIdsRef.current = nextCreatingToolIds;
    }
  }, []);

  const closeTab = useCallback(async (tabId: string) => {
    const database = databaseRef.current;

    if (!database || tabs.length <= 1) {
      return;
    }

    const closingTabIndex = tabs.findIndex((tab) => tab.id === tabId);

    if (closingTabIndex < 0) {
      return;
    }

    const closingTab = tabs[closingTabIndex];
    const nextTab = tabs[closingTabIndex + 1] ?? tabs[closingTabIndex - 1];
    discardPendingStateWrites(
      pendingStateWritesRef.current,
      stateTimersRef.current,
      [tabId],
    );

    try {
      await removeTabs(database, [tabId], nextTab.id);
      setTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));
      const nextStates = new Map(stateCacheRef.current);

      nextStates.delete(tabId);
      stateCacheRef.current = nextStates;
      setStateCache(nextStates);
      setActiveTabId(nextTab.id);

      if (closingTab.toolId !== activeToolId) {
        onToolChangeRef.current(nextTab.toolId);
      }
    } catch {
      setError('workspace.error.removeTab');
    }
  }, [activeToolId, tabs]);

  const closeTabs = useCallback(async (tabIds: readonly string[]) => {
    const database = databaseRef.current;

    if (!database || tabIds.length === 0) {
      return;
    }

    const closingIds = new Set(tabIds);
    const closingTabs = tabs.filter((tab) => closingIds.has(tab.id));

    if (closingTabs.length === 0 || closingTabs.length >= tabs.length) {
      return;
    }

    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    const nextTab = activeTab && !closingIds.has(activeTab.id)
      ? activeTab
      : tabs.find((tab) => !closingIds.has(tab.id));

    if (!nextTab) {
      return;
    }

    discardPendingStateWrites(
      pendingStateWritesRef.current,
      stateTimersRef.current,
      closingTabs.map((tab) => tab.id),
    );

    try {
      await removeTabs(
        database,
        closingTabs.map((tab) => tab.id),
        nextTab.id,
      );

      const closingIdSet = new Set(closingTabs.map((tab) => tab.id));

      setTabs((currentTabs) => currentTabs.filter((tab) => !closingIdSet.has(tab.id)));

      const nextStates = new Map(stateCacheRef.current);

      closingTabs.forEach((tab) => nextStates.delete(tab.id));
      stateCacheRef.current = nextStates;
      setStateCache(nextStates);
      setActiveTabId(nextTab.id);

      if (nextTab.toolId !== activeToolId) {
        onToolChangeRef.current(nextTab.toolId);
      }
    } catch {
      setError('workspace.error.removeTabs');
    }
  }, [activeTabId, activeToolId, tabs]);

  const closeAllTabs = useCallback(async () => {
    const database = databaseRef.current;

    if (!database) {
      return;
    }

    discardPendingStateWrites(
      pendingStateWritesRef.current,
      stateTimersRef.current,
      tabs.map((tab) => tab.id),
    );

    const now = Date.now();
    const replacementToolId = activeTab?.toolId ?? activeToolId;
    const replacementTab: ToolTab = {
      id: generateUuidV7(),
      toolId: replacementToolId,
      title: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await removeAllTabs(database, replacementTab);
      setTabs([replacementTab]);
      stateCacheRef.current = new Map([
        [replacementTab.id, TOOL_STATE_DEFINITIONS[replacementToolId].defaultValue],
      ]);
      setStateCache(stateCacheRef.current);
      setActiveTabId(replacementTab.id);

      if (replacementToolId !== activeToolId) {
        onToolChangeRef.current(replacementToolId);
      }
    } catch {
      setError('workspace.error.clearTabs');
    }
  }, [activeTab, activeToolId, tabs]);

  const renameTab = useCallback(async (tabId: string, title: string) => {
    const database = databaseRef.current;
    const tab = tabs.find((item) => item.id === tabId);

    if (!database || !tab) {
      return;
    }

    try {
      const nextTab = await saveTabTitle(database, tab, title);

      setTabs((currentTabs) => currentTabs.map((item) => (
        item.id === tabId ? nextTab : item
      )));
    } catch {
      setError('workspace.error.saveTitle');
    }
  }, [tabs]);

  useEffect(() => {
    if (status !== 'ready' || !activeTab) {
      return;
    }

    if (!hasInitializedSelectionRef.current) {
      hasInitializedSelectionRef.current = true;

      if (shouldRestoreActiveTab && activeTab.toolId !== activeToolId) {
        onToolChangeRef.current(activeTab.toolId);
      }

      return;
    }

    if (activeTab.toolId === activeToolId) {
      return;
    }

    const nextTab = [...tabs]
      .reverse()
      .find((tab) => tab.toolId === activeToolId);

    if (nextTab) {
      activateTab(nextTab.id);

      return;
    }

    if (!creatingToolIdsRef.current.has(activeToolId)) {
      void createTab(activeToolId);
    }
  }, [activeTab, activeToolId, activateTab, createTab, shouldRestoreActiveTab, status, tabs]);

  const getState = useCallback(
    <TName extends ToolStateName>(
      definition: ToolStateDefinition<TName>,
    ): ToolStateMap[TName] => {
      if (!activeTab || activeTab.toolId !== definition.toolId) {
        return definition.defaultValue;
      }

      const storedState = stateCacheRef.current.get(activeTab.id);

      return storedState === undefined
        ? definition.defaultValue
        : definition.validate(storedState) ?? definition.defaultValue;
    },
    [activeTab],
  );

  const updateState = useCallback(
    <TName extends ToolStateName>(
      definition: ToolStateDefinition<TName>,
      value: ToolStateMap[TName]
        | ((current: ToolStateMap[TName]) => ToolStateMap[TName]),
    ) => {
      if (!activeTab || activeTab.toolId !== definition.toolId) {
        return;
      }

      const storedState = stateCacheRef.current.get(activeTab.id);
      const currentState = storedState === undefined
        ? definition.defaultValue
        : definition.validate(storedState) ?? definition.defaultValue;
      const nextState = typeof value === 'function' ? value(currentState) : value;

      const nextStates = new Map(stateCacheRef.current).set(activeTab.id, nextState);

      stateCacheRef.current = nextStates;
      setStateCache(nextStates);

      const database = databaseRef.current;

      if (!database) {
        return;
      }

      const writeState = () => {
        pendingStateWritesRef.current.delete(activeTab.id);
        stateTimersRef.current.delete(activeTab.id);
        void saveToolState(database, activeTab, nextState).catch(() => {
          setError('workspace.error.saveContent');
        });
      };

      pendingStateWritesRef.current.set(activeTab.id, writeState);

      const pendingTimer = stateTimersRef.current.get(activeTab.id);

      if (pendingTimer !== undefined) {
        window.clearTimeout(pendingTimer);
      }

      stateTimersRef.current.set(
        activeTab.id,
        window.setTimeout(writeState, STATE_WRITE_DELAY_MS),
      );
    },
    [activeTab],
  );

  const reload = useCallback(() => {
    setStatus('loading');
    setError(null);
    setReloadToken((currentToken) => currentToken + 1);
  }, []);

  const workspaceValue = useMemo<ToolWorkspaceValue>(() => ({
    status,
    tabs,
    activeTab,
    stateCache,
    error,
    activateTab,
    createTab,
    closeTab,
    closeTabs,
    closeAllTabs,
    renameTab,
    reload,
    getState,
    updateState,
  }), [
    activateTab,
    activeTab,
    stateCache,
    closeTab,
    createTab,
    closeAllTabs,
    closeTabs,
    error,
    getState,
    reload,
    renameTab,
    status,
    tabs,
    updateState,
  ]);

  return (
    <ToolWorkspaceContext.Provider value={workspaceValue}>
      {children}
    </ToolWorkspaceContext.Provider>
  );
}
