import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { isToolId } from '../registry';
import { TOOL_STATE_DEFINITIONS, type AnyToolState } from './toolStates';
import type { ToolId } from '../../../types/tool';

export type ToolTab = {
  readonly id: string;
  readonly toolId: ToolId;
  readonly title: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type WorkspaceDatabaseSchema = DBSchema & {
  tabs: {
    key: string;
    value: ToolTab;
    indexes: { 'by-tool': ToolId };
  };
  states: {
    key: string;
    value: {
      tabId: string;
      toolId: ToolId;
      state: AnyToolState;
      updatedAt: number;
    };
  };
  workspace: {
    key: string;
    value: {
      id: 'active';
      activeTabId: string;
      updatedAt: number;
    };
  };
};

export type WorkspaceDatabase = IDBPDatabase<WorkspaceDatabaseSchema>;
export type WorkspaceStateCache = ReadonlyMap<string, AnyToolState>;

export type WorkspaceSnapshot = {
  readonly tabs: readonly ToolTab[];
  readonly states: WorkspaceStateCache;
  readonly activeTabId: string | null;
};

const ACTIVE_WORKSPACE_KEY = 'active';
export const MAX_TAB_TITLE_LENGTH = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseTab(value: unknown): ToolTab | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0
    || typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt)
    || typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)
    || typeof value.toolId !== 'string' || !isToolId(value.toolId)) {
    return null;
  }

  const title = typeof value.title === 'string' && value.title.trim().length > 0
    ? value.title.trim().slice(0, MAX_TAB_TITLE_LENGTH)
    : null;

  return {
    id: value.id,
    toolId: value.toolId,
    title,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseState(value: unknown): { tabId: string; state: AnyToolState } | null {
  if (!isRecord(value) || typeof value.tabId !== 'string' || typeof value.toolId !== 'string'
    || !isToolId(value.toolId)) {
    return null;
  }

  const state = TOOL_STATE_DEFINITIONS[value.toolId].validate(value.state);

  return state ? { tabId: value.tabId, state } : null;
}

export async function openWorkspaceDatabase(): Promise<WorkspaceDatabase> {
  return openDB<WorkspaceDatabaseSchema>('devkit-workspace', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const tabs = database.createObjectStore('tabs', { keyPath: 'id' });
        tabs.createIndex('by-tool', 'toolId');
        database.createObjectStore('states', { keyPath: 'tabId' });
        database.createObjectStore('workspace', { keyPath: 'id' });
      }

      // Version 2 adds an optional `title` field. IndexedDB records do not
      // require a physical migration because missing values are read as null.
    },
  });
}

export async function loadWorkspace(
  database: WorkspaceDatabase,
  defaultToolId: ToolId,
): Promise<WorkspaceSnapshot> {
  const [tabValues, stateValues, activePreference] = await Promise.all([
    database.getAll('tabs'),
    database.getAll('states'),
    database.get('workspace', ACTIVE_WORKSPACE_KEY),
  ]);

  const tabs = tabValues
    .map(parseTab)
    .filter((tab): tab is ToolTab => tab !== null)
    .sort((first, second) => first.createdAt - second.createdAt);
  const states = new Map<string, AnyToolState>();

  stateValues.map(parseState).forEach((state) => {
    if (state && tabs.some((tab) => tab.id === state.tabId)) {
      states.set(state.tabId, state.state);
    }
  });

  const validActiveTabId = typeof activePreference?.activeTabId === 'string'
    && tabs.some((tab) => tab.id === activePreference.activeTabId)
    ? activePreference.activeTabId
    : tabs[0]?.id ?? null;

  if (tabs.length === 0) {
    const now = Date.now();
    const defaultTab: ToolTab = {
      id: crypto.randomUUID(),
      toolId: defaultToolId,
      title: null,
      createdAt: now,
      updatedAt: now,
    };

    const transaction = database.transaction(['tabs', 'workspace'], 'readwrite');
    await Promise.all([
      transaction.objectStore('tabs').add(defaultTab),
      transaction.objectStore('workspace').put({
        id: ACTIVE_WORKSPACE_KEY,
        activeTabId: defaultTab.id,
        updatedAt: now,
      }),
      transaction.done,
    ]);

    return {
      tabs: [defaultTab],
      states: new Map([[defaultTab.id, TOOL_STATE_DEFINITIONS[defaultToolId].defaultValue]]),
      activeTabId: defaultTab.id,
    };
  }

  if (activePreference?.activeTabId !== validActiveTabId) {
    await saveActiveTabId(database, validActiveTabId);
  }

  return { tabs, states, activeTabId: validActiveTabId };
}

export async function saveActiveTabId(
  database: WorkspaceDatabase,
  activeTabId: string,
): Promise<void> {
  await database.put('workspace', {
    id: ACTIVE_WORKSPACE_KEY,
    activeTabId,
    updatedAt: Date.now(),
  });
}

export async function saveTab(database: WorkspaceDatabase, tab: ToolTab): Promise<void> {
  await database.put('tabs', tab);
}

export async function saveTabTitle(
  database: WorkspaceDatabase,
  tab: ToolTab,
  title: string,
): Promise<ToolTab> {
  const nextTitle = title.trim().slice(0, MAX_TAB_TITLE_LENGTH);
  const nextTab: ToolTab = {
    ...tab,
    title: nextTitle.length > 0 ? nextTitle : null,
    updatedAt: Date.now(),
  };

  await database.put('tabs', nextTab);

  return nextTab;
}

export async function saveToolState(
  database: WorkspaceDatabase,
  tab: ToolTab,
  state: AnyToolState,
): Promise<void> {
  await database.put('states', {
    tabId: tab.id,
    toolId: tab.toolId,
    state,
    updatedAt: Date.now(),
  });
}

export async function removeTab(
  database: WorkspaceDatabase,
  tabId: string,
  nextActiveTabId: string | null,
): Promise<void> {
  const transaction = database.transaction(['tabs', 'states', 'workspace'], 'readwrite');

  transaction.objectStore('tabs').delete(tabId);
  transaction.objectStore('states').delete(tabId);

  if (nextActiveTabId) {
    transaction.objectStore('workspace').put({
      id: ACTIVE_WORKSPACE_KEY,
      activeTabId: nextActiveTabId,
      updatedAt: Date.now(),
    });
  } else {
    transaction.objectStore('workspace').delete(ACTIVE_WORKSPACE_KEY);
  }

  await transaction.done;
}

export async function removeTabs(
  database: WorkspaceDatabase,
  tabIds: readonly string[],
  nextActiveTabId: string,
): Promise<void> {
  const transaction = database.transaction(['tabs', 'states', 'workspace'], 'readwrite');

  tabIds.forEach((tabId) => {
    transaction.objectStore('tabs').delete(tabId);
    transaction.objectStore('states').delete(tabId);
  });
  transaction.objectStore('workspace').put({
    id: ACTIVE_WORKSPACE_KEY,
    activeTabId: nextActiveTabId,
    updatedAt: Date.now(),
  });

  await transaction.done;
}

export async function removeAllTabs(
  database: WorkspaceDatabase,
  replacementTab: ToolTab,
): Promise<void> {
  const now = Date.now();
  const transaction = database.transaction(['tabs', 'states', 'workspace'], 'readwrite');

  transaction.objectStore('tabs').clear();
  transaction.objectStore('states').clear();
  transaction.objectStore('tabs').add(replacementTab);
  transaction.objectStore('workspace').put({
    id: ACTIVE_WORKSPACE_KEY,
    activeTabId: replacementTab.id,
    updatedAt: now,
  });

  await transaction.done;
}
