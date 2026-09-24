import { useCallback } from 'react';
import { useToolWorkspace } from './ToolWorkspaceContext';
import type {
  ToolStateDefinition,
  ToolStateMap,
  ToolStateName,
} from './toolStates';

export function useToolTabState<TName extends ToolStateName>(
  definition: ToolStateDefinition<TName>,
) {
  const workspace = useToolWorkspace();
  const state = workspace.getState(definition);
  const setState = useCallback(
    (
      value: ToolStateMap[TName]
        | ((current: ToolStateMap[TName]) => ToolStateMap[TName]),
    ) => {
      workspace.updateState(definition, value);
    },
    [definition, workspace],
  );

  return [state, setState] as const;
}
