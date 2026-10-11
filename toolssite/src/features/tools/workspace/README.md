# Tool workspace

这个模块为所有工具提供多标签和持久化能力。

## 职责

- `ToolWorkspaceProvider`：打开 IndexedDB、加载/保存标签与工具状态，并把 workspace value 提供给工具组件。
- `ToolWorkspaceContext`：组件读取当前激活标签和状态更新器的唯一入口。
- `toolStates.ts`：声明每个工具的可持久化 state、默认值和运行时校验。
- `workspaceDatabase.ts`：封装 IndexedDB schema 和所有读写操作。
- `ToolTabBar` / `ToolWorkspace`：渲染标签栏、加载/错误状态和当前工具面板；标签栏支持箭头和滚轮滚动、重命名和右键批量关闭。
- `WorkspaceHome`：没有激活标签时的首页，提供站点介绍和工具快速入口。

## 使用方式

工具组件不要自行创建新的存储入口，也不要用 `useState` 保存需要跨会话保留的内容。应调用：

```tsx
const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.base64);
```

state 更新会先进入内存缓存，再防抖写入 IndexedDB。切换标签不会丢弃未挂载标签的数据；同一个工具可以打开多个互不影响的标签。

## 注意事项

- IndexedDB 中的数据在读取时必须经过 `toolStates.ts` 校验，禁止直接假设其结构可信。
- 新增工具时必须同时扩展 `ToolStateMap`、默认值、校验器和 `TOOL_COMPONENTS`。
- 派生数据（例如正则匹配结果、颜色转换结果）不写入数据库，只持久化重新计算所需的输入与显式操作结果。
- 标题可选，最大长度为 60 个字符；空标题会回退为 `<工具名> #<序号>`。
- 所有标签都可以关闭；没有激活标签时展示 `WorkspaceHome` 首页。首次访问（本地无标签数据）也直接展示首页，不会自动创建标签。
- “关闭所有标签”会原子删除现有标签与状态并回到首页；`activeTabId` 可以持久化为 `null`，表示停留在首页但保留已打开的标签。
- URL `?tool=` 参数始终跟随当前激活标签的工具；没有参数（或参数无效）时展示首页，工具标签只会因用户主动选择而创建。
