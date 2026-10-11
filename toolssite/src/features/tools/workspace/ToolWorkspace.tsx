import { Suspense, lazy } from 'react';
import { useTranslation } from '../../../i18n/LanguageContext';
import { DEFAULT_TOOL_ID } from '../registry';
import type { ToolId } from '../../../types/tool';
import { useToolWorkspace } from './ToolWorkspaceContext';
import ToolTabBar from './ToolTabBar';
import WorkspaceHome from './WorkspaceHome';

const TOOL_COMPONENTS = {
  base64: lazy(() => import('../components/Base64Tool')),
  url: lazy(() => import('../components/UrlTool')),
  jwt: lazy(() => import('../components/JwtTool')),
  json: lazy(() => import('../components/JsonTool')),
  hash: lazy(() => import('../components/HashTool')),
  uuid: lazy(() => import('../components/UuidTool')),
  regex: lazy(() => import('../components/RegexTool')),
  color: lazy(() => import('../components/ColorTool')),
  timestamp: lazy(() => import('../components/TimestampTool')),
  diff: lazy(() => import('../components/DiffTool')),
  notepad: lazy(() => import('../components/NotepadTool')),
} as const;

type ToolWorkspaceProps = {
  onSelectTool: (toolId: ToolId) => void;
};

export default function ToolWorkspace({ onSelectTool }: ToolWorkspaceProps) {
  const workspace = useToolWorkspace();
  const { t } = useTranslation();

  if (workspace.status === 'error') {
    return (
      <main className="tool-workspace">
        <div
          className="workspace-message"
          role="alert"
        >
          <p>{workspace.error ? t(workspace.error) : null}</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={workspace.reload}
          >
            {t('common.retry')}
          </button>
        </div>
      </main>
    );
  }

  if (workspace.status === 'loading') {
    return (
      <main className="tool-workspace">
        <div
          className="workspace-message"
          role="status"
        >
          {t('workspace.loading')}
        </div>
      </main>
    );
  }

  const activeTab = workspace.activeTab;
  const ActiveTool = activeTab ? TOOL_COMPONENTS[activeTab.toolId] : null;

  return (
    <main className="tool-workspace">
      <ToolTabBar
        tabs={workspace.tabs}
        activeTabId={activeTab?.id ?? null}
        onSelect={workspace.activateTab}
        onClose={(tabId) => void workspace.closeTab(tabId)}
        onCreate={() => void workspace.createTab(activeTab?.toolId ?? DEFAULT_TOOL_ID)}
        onCloseTabs={(tabIds) => void workspace.closeTabs(tabIds)}
        onCloseAll={() => void workspace.closeAllTabs()}
        onRename={(tabId, title) => void workspace.renameTab(tabId, title)}
      />
      {workspace.error && (
        <p
          className="workspace-warning"
          role="alert"
        >
          {workspace.error ? t(workspace.error) : null}
        </p>
      )}
      {ActiveTool ? (
        <div
          id="tool-tab-panel"
          role="tabpanel"
          className="workspace-content"
          aria-labelledby={`tool-tab-${activeTab?.id}`}
        >
          <Suspense fallback={<div className="tool-loading">{t('common.loading')}</div>}>
            <ActiveTool />
          </Suspense>
        </div>
      ) : (
        <div className="workspace-content">
          <WorkspaceHome onSelectTool={onSelectTool} />
        </div>
      )}
    </main>
  );
}
