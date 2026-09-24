# 前端开发规范

- 本规范适用于本仓库内所有前端代码、构建配置、静态资源、文档与提交内容。
- 当前前端工程位于 `toolssite/`，技术基线为 **React 19 + TypeScript + Vite + React Compiler + Oxlint + pnpm**。
- 遵守顺序：安全与数据要求 > 本规范 > 项目内 README > 个人习惯。临时妥协必须留下 `TODO` 和原因，禁止无解释绕过规则。


## 变更自查

变更涉及以下内容时，必须额外自查对应结果：

- 路由或页面入口：手动验证新入口、刷新、返回和错误路径。
- 状态或数据流：验证初始值、成功、失败、空数据、取消请求和竞态。
- 样式或响应式：检查移动端、桌面端、键盘焦点和深浅色主题。
- 静态资源：确认体积、格式、命名和引用路径。
- 文案变更：确认国际化对应的语言是否都正确变更。

## TypeScript 规范

### 基础规则

- 新代码使用 TypeScript；只在已有 JavaScript 文件中做最小改动时保留原格式。
- 优先使用显式类型边界，避免无意义的本地类型标注：
  - 组件 props 必须定义类型。
  - 导出函数必须定义参数和返回值类型；简单纯函数可用类型推断，但导出 API 需要稳定类型。
  - DOM 查询结果不能随意使用 `!`；不能确定时先处理空值。
- `tsconfig` 保持严格可用：至少启用 `noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`。
- 不使用 `any` 作为公开 API 的类型；确实未知的数据用 `unknown`，再收敛类型。
- 不通过 `@ts-ignore`、`as unknown as T`、双重断言掩盖类型问题。
- 组件应作为默认导出（default export）。

### 类型设计

优先定义领域类型，避免到处内联复杂对象：

```ts
export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
  tags?: readonly string[];
};
```

规则：

- 可复用对象结构放入 `src/types/` 或所属模块的 `types.ts`。
- 组件只接收它需要的数据，避免直接透传巨大的领域对象。
- 枚举优先使用字面量联合类型；只有需要运行时值和命名空间时才使用 `enum`。
- 只读集合优先声明 `readonly`，特别是配置和 props 内的数据。
- 判别联合优先使用明确的 `type` / `status` 字段，不要依赖多个布尔值组合表达互斥状态。

## React 与组件规范

### 文件与组件

- 组件文件使用 PascalCase：`ToolCard.tsx`。
- Hook 文件使用 `useXxx.ts`。
- 每个文件默认导出一个组件或一组紧密相关的类型/常量；不要在一个文件中堆积无关组件。
- 组件默认使用函数组件。类组件需要明确说明兼容性原因。
- 项目已启用 React Compiler。不要为了“性能优化”随手添加 `React.memo`、`useMemo`、`useCallback`；先让数据流简单清晰，有实际渲染问题再优化。

### Props

Props 类型命名采用 `<ComponentName>Props`：

```tsx
type ToolCardProps = {
  tool: Tool;
  isActive?: boolean;
  onSelect?: (id: string) => void;
};

export function ToolCard({ tool, isActive = false, onSelect }: ToolCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => onSelect?.(tool.id)}
    >
      {tool.name}
    </button>
  );
}
```

规则：

- 必填业务数据不要给默认值；只有交互或展示选项允许默认值。
- 回调命名使用 `on` 前缀，如 `onChange`、`onSelect`；内部处理函数使用 `handle` 前缀。
- 禁止把任意对象、DOM 节点或复杂函数作为 `key`。
- 受控组件优先提供 `value`、`onChange`；非受控组件需要说明默认行为。

### Hooks 与副作用

- 只在组件或 Hook 顶层调用 Hooks。
- `useEffect` 只处理真正的同步副作用：订阅、命令式 API、焦点管理、非受控 DOM 等。不要用 effect 同步可由渲染推导的状态。
- 事件回调中可以派生的状态，不要保存重复 state。
- 需要清理的副作用必须返回清理函数，避免内存泄漏、重复监听和过期更新。
- 异步请求必须处理加载、成功、失败、空数据；组件卸载或新请求覆盖旧结果时需要终止或丢弃旧响应。
- 全局事件、定时器和第三方实例必须集中创建、清理和命名。

### 状态管理

按状态作用域选择方案，禁止一开始就引入全局状态库：

| 状态类型 | 推荐位置 |
| --- | --- |
| 仅当前组件使用 | `useState` / `useReducer` |
| 父子组件共享 | 最近公共父组件 |
| 跨组件、跨页面少量共享 | Context，或后续选择轻量状态库 |
| 服务端数据缓存 | 专门的请求缓存方案或独立 data layer |
| URL 可表达状态 | 路由参数或 search params |

规则：

- 列表页的筛选、分页、排序、标签页等可分享状态优先放入 URL。
- 服务端数据不要复制进全局状态长期维护；必须说明缓存、失效和错误恢复策略。
- `Context` 值要保持稳定，避免每次渲染都创建巨大新对象。

## 样式与设计实现

### CSS 基础

- 当前允许普通 CSS 和 CSS 嵌套；新增样式文件与组件同名或按模块命名。
- 全局基础样式只放 `index.css`；组件样式放在对应模块或组件文件中。
- 优先使用语义化 class；只有表示局部状态时使用 `is-active`、`has-error` 这类状态类。
- 避免深层选择器和 `!important`。覆盖第三方样式时必须注释原因和目标版本。
- 布局优先使用 Flexbox/Grid；不要使用浮动手工布局。

### 设计令牌

颜色、字体、间距、圆角、阴影、断点优先定义并复用 CSS variables：

```css
:root {
  --color-text-primary: #08060d;
  --color-surface: #ffffff;
  --space-4: 16px;
  --radius-md: 8px;
}
```

规则：

- 除非明确要求，否则主题风格应该与现有一致。
- 禁止在业务组件中散落同一品牌色的多个硬编码值。
- 深浅色主题通过 CSS variables 和 `prefers-color-scheme` 支持。
- 响应式优先移动端；使用 `max-width` 时必须与现有约定一致。
- 尺寸不要同时使用多种单位表达同一语义；文本相关尺寸使用相对单位，边框使用 `1px`。

### 资源

- 图片必须提供有意义替代文本；纯装饰图使用 `alt=""` 和 `aria-hidden="true"`。
- 图标优先 SVG Sprite 或内联 SVG；不重复上传同一资源。
- 大图考虑压缩、现代格式和按视口加载；首屏以外的图片使用懒加载。
- `public/` 中的文件通过根路径引用；需要构建指纹和优化的资源放 `src/assets/`。

## 可访问性与语义化 HTML

- 使用正确语义标签表达页面结构：`header`、`nav`、`main`、`section`、`footer`、`ul`、`button`、`a`。
- 交互元素必须可键盘操作，并提供可见的 `:focus-visible` 样式。
- `button` 必须显式写 `type`，默认 `type="button"`；表单内提交按钮使用 `type="submit"`。
- 外链需要说明行为；新窗口链接应带有可访问的行为提示或确保上下文清晰。
- 表单控件必须有 `label`；错误信息使用可关联的方式描述。
- 只使用 ARIA 补充语义，不用 ARIA 代替正确的 HTML。
- 颜色对比度必须满足 WCAG AA；不要只靠颜色传达状态。

## 数据请求、错误处理与安全

### 数据请求

- 请求封装统一放在 `src/lib/` 或所属 feature 的 `api.ts` 中，组件不直接散落完整 URL。
- 接口返回先按 `unknown` 接收，再验证或收敛类型，不直接相信外部数据结构。
- 用户触发的新请求必须考虑竞态：使用 `AbortController`、请求序号或其他取消机制。
- 错误信息面向用户展示可操作内容；技术细节输出到日志或错误边界，不直接暴露敏感信息。

### 环境变量

- 浏览器可暴露的变量使用 `VITE_` 前缀，并通过集中模块访问：

```ts
export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
} as const;
```

- `.env.example` 必须列出所有变量名、用途和示例值。
- 任何密钥、token、私钥不允许放入 `VITE_` 变量、前端代码或提交记录。

### 安全基线

- 禁止使用 `dangerouslySetInnerHTML` 渲染不可信内容；确需渲染富文本必须先清洗。
- 用户输入在展示时交给框架转义；写入 URL、存储或接口前做校验和编码。
- 外链不要动态拼接用户输入；必要时校验协议和目标域名。
- 依赖新增前确认必要性、维护状态和许可；不引入只有少量代码却带来重依赖的包。

## 性能与构建

- 保持入口轻量：`main.tsx` 只负责启动应用，不承载业务逻辑。
- 大型页面、重组件和低频工具页使用动态导入拆包。
- 列表渲染必须提供稳定 `key`；不要用数组索引作为可变化列表的 `key`。
- 避免同步执行大循环、复杂解析或阻塞主线程的操作；必要时拆分任务。
- 生产构建必须无错误；禁止引入明显未使用的大依赖。
- 构建产物中的 sourcemap 策略需与部署环境一致，不公开包含源码细节的调试产物。
- 每次引入新依赖或新增大型资源时，对比构建前后体积和首屏影响。

## 测试与质量

当前项目尚未配置测试框架。补齐测试时遵循：

- 纯函数优先写单元测试，覆盖边界、空值、异常输入。
- 组件测试优先验证用户可见行为和可访问性，不断言内部实现细节。
- 关键流程至少覆盖：正常路径、空数据、加载、失败、用户取消。
- Bug 修复必须先补一个能复现问题的测试，再修复。

最低质量门槛：

```bash
pnpm lint
pnpm build
```

禁止出现以下结果：

- TypeScript 报错。
- Oxlint error。
- 无解释的新增 `@ts-ignore`、`eslint-disable`、`oxlint-disable`。
- 明显破坏移动端、键盘操作或深浅色主题的改动。

## 代码风格

- 使用编辑器或格式化工具保持换行和缩进一致；没有统一 Formatter 时，不要做整文件重排。
- 命名清晰：
  - 组件、类型：`PascalCase`
  - 变量、函数：`camelCase`
  - 常量：`SCREAMING_SNAKE_CASE`
  - 文件：组件 `PascalCase.tsx`，Hook `camelCase.ts`，工具函数 `camelCase.ts`
  - CSS class：`kebab-case`
- 布尔变量使用 `is`、`has`、`should`、`can` 前缀。
- 避免魔法数字和重复字符串；有业务含义的值提取为具名常量。
- 注释解释“为什么”，不复述代码。复杂算法、临时方案、外部系统约束必须写明背景。
- 优先小函数和纯函数；单一函数过长时按职责拆分。

## 文档与协作

- 新增命令、脚本、目录约定、环境变量或重要依赖时，必须更新对应位置的 `README.md`。
- 公共组件和 Hook 至少在文件顶部或模块 README 中说明用途、参数和注意事项。
- 代码审查优先检查：正确性、安全性、可访问性、状态边界、性能影响、可维护性。

## Agent 执行要求

在本仓库中执行前端任务时，Agent 必须遵守：

1. 先阅读 `toolssite/package.json`、`README.md`、现有同类实现，再修改代码。
2. 只修改与任务直接相关的文件；不顺手重构、不改无关格式。
3. 新增依赖前优先寻找现有能力；确需新增时说明用途、版本和体积影响。
4. 修改后运行 `pnpm lint` 和 `pnpm build`，不得留下报错。
5. 无法验证的功能必须在总结中明确说明未验证范围和风险。
6. 发现规范缺失或不适用的地方，先按最小惊讶原则执行，并在变更中提出规范修订建议。
