import { useEffect, useState } from 'react';
import { DEFAULT_TOOL_ID, isToolId } from './registry';
import type { ToolId } from '../../types/tool';

function readToolIdFromUrl(): ToolId {
  const toolId = new URLSearchParams(window.location.search).get('tool');

  return isToolId(toolId) ? toolId : DEFAULT_TOOL_ID;
}

export function useToolSelection(): readonly [ToolId, (toolId: ToolId) => void] {
  const [toolId, setToolId] = useState<ToolId>(readToolIdFromUrl);

  useEffect(() => {
    const handlePopState = () => {
      setToolId(readToolIdFromUrl());
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectTool = (nextToolId: ToolId) => {
    if (nextToolId === toolId) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('tool', nextToolId);
    window.history.pushState(
      null,
      '',
      `${window.location.pathname}?${searchParams.toString()}`,
    );
    setToolId(nextToolId);
  };

  return [toolId, selectTool] as const;
}
