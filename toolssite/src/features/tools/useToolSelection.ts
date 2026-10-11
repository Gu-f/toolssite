import { useEffect, useState } from 'react';
import { isToolId } from './registry';
import type { ToolId } from '../../types/tool';

// `null` means the workspace home screen; no `tool` query param is present.
function readToolIdFromUrl(): ToolId | null {
  const toolId = new URLSearchParams(window.location.search).get('tool');

  return isToolId(toolId) ? toolId : null;
}

export function useToolSelection(): readonly [ToolId | null, (toolId: ToolId | null) => void] {
  const [toolId, setToolId] = useState<ToolId | null>(readToolIdFromUrl);

  useEffect(() => {
    const handlePopState = () => {
      setToolId(readToolIdFromUrl());
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectTool = (nextToolId: ToolId | null) => {
    if (nextToolId === toolId) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    if (nextToolId === null) {
      searchParams.delete('tool');
    } else {
      searchParams.set('tool', nextToolId);
    }

    const query = searchParams.toString();

    window.history.pushState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
    setToolId(nextToolId);
  };

  return [toolId, selectTool] as const;
}
