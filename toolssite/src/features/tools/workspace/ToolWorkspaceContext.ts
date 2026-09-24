import { createContext, useContext } from 'react';
import type { ToolTab, WorkspaceStateCache } from './workspaceDatabase';
import type { ToolStateDefinition, ToolStateName, ToolStateMap } from './toolStates';
import type { ToolId } from '../../../types/tool';
import type { TranslationKey } from '../../../i18n/translations';

export type ToolWorkspaceValue = {
  readonly status: 'loading' | 'ready' | 'error';
  readonly tabs: readonly ToolTab[];
  readonly activeTab: ToolTab | null;
  readonly stateCache: WorkspaceStateCache;
  readonly error: TranslationKey | null;
  readonly activateTab: (tabId: string) => void;
  readonly createTab: (toolId: ToolId) => Promise<void>;
  readonly closeTab: (tabId: string) => Promise<void>;
  readonly closeTabs: (tabIds: readonly string[]) => Promise<void>;
  readonly closeAllTabs: () => Promise<void>;
  readonly renameTab: (tabId: string, title: string) => Promise<void>;
  readonly reload: () => void;
  getState: <TName extends ToolStateName>(
    definition: ToolStateDefinition<TName>,
  ) => ToolStateMap[TName];
  updateState: <TName extends ToolStateName>(
    definition: ToolStateDefinition<TName>,
    value: ToolStateMap[TName] | ((current: ToolStateMap[TName]) => ToolStateMap[TName]),
  ) => void;
};

export const ToolWorkspaceContext = createContext<ToolWorkspaceValue | null>(null);

export function useToolWorkspace(): ToolWorkspaceValue {
  const value = useContext(ToolWorkspaceContext);

  if (!value) {
    throw new Error('Tool components must be rendered inside the tool workspace provider.');
  }

  return value;
}
