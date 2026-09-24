import ToolCatalog from './features/tools/ToolCatalog';
import { useToolSelection } from './features/tools/useToolSelection';
import ToolWorkspaceProvider from './features/tools/workspace/ToolWorkspaceProvider';
import ToolWorkspace from './features/tools/workspace/ToolWorkspace';
import './App.css';

export default function App() {
  const [activeToolId, selectTool] = useToolSelection();

  return (
    <ToolWorkspaceProvider
      activeToolId={activeToolId}
      onToolChange={selectTool}
    >
      <div className="app-shell">
        <ToolCatalog
          activeToolId={activeToolId}
          onSelect={selectTool}
        />
        <ToolWorkspace />
      </div>
    </ToolWorkspaceProvider>
  );
}
