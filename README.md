# toolssite
一个纯前端实现的工具站点

## 技术栈
- 技术基线为 **React 19 + TypeScript + Vite + React Compiler + Oxlint + pnpm**
- 浏览器工作区持久化使用 [idb](https://github.com/jakearchibald/idb) 封装 IndexedDB。
- JSON 修复功能使用 [jsonrepair](https://github.com/josdejong/jsonrepair)，处理单引号、缺失闭合括号、字符串以外的中英文逗号/冒号/分号分隔符等常见 JSON 问题。
- JWT 调试器的签名与编码能力使用 [jose](https://github.com/panva/jose)；jose 仅在签名或验证时按需加载。

## 环境要求

- Node.js：使用 `^20.19.0 || >=22.12.0`，与依赖声明保持一致。
- 包管理器：统一使用 pnpm，不混用 npm、Yarn 或 Bun。
- 不允许把 `node_modules`、构建产物、环境变量真实值、密钥或个人编辑器配置提交到仓库，你应该合理添加到 `.gitignore` 中。

## 国际化

- 当前支持英文（`en`）和简体中文（`zh`）。
- 侧边栏底部的语言切换按钮位于主题切换按钮左侧。
- 选择结果保存在 `localStorage` 的 `devkit-language`；没有选择记录时按浏览器语言初始化。
- 新增界面文案时，在 `toolssite/src/i18n/translations.ts` 中同时补充英文和中文词条，并复用现有通用 key。
- i18n 模块约定见 `toolssite/src/i18n/README.md`。

## 标准命令

所有前端命令默认在 `toolssite/` 目录下执行：

```bash
pnpm install          # 安装依赖，锁文件变化必须一起提交
pnpm dev              # 本地开发
pnpm lint             # 代码检查
pnpm build            # TypeScript 构建检查和生产构建
pnpm preview          # 验证生产构建产物
```

## 基本的目录结构示例

当前阶段保持简单、可生长的结构；不要预先创建大量空目录。建议按职责演进：

```text
toolssite/
├─ public/                     # 原样发布的静态资源
├─ src/
│  ├─ assets/                  # 需要构建处理的图片、字体等资源
│  ├─ components/              # 通用组件
│  ├─ features/                # 按业务能力拆分的模块
│  ├─ hooks/                   # 通用 React Hooks
│  ├─ lib/                     # 纯工具函数与第三方封装
│  ├─ types/                   # 跨模块共享类型
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ index.css
├─ index.html
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
└─ vite.config.ts
```

约束：

- 跨页面复用的组件放 `components/`；只属于一个业务模块的组件放对应 `features/<module>/components/`。
- `lib/` 中的函数必须保持可独立理解，不依赖组件生命周期或 DOM 副作用。
- 禁止新建 `utils2/`、`common/`、`temp/`、`new/` 这类含义不明确的目录。
- 新增超过一个文件的模块时，补充 `README.md` 或模块入口注释，说明职责、公开 API 和不应使用的内部实现。

## 工作区多标签与持久化

- 所有侧边栏工具都在同一个多标签工作区中打开，`New tab` 可为当前工具再开一个独立实例。
- 标签支持双击或铅笔按钮重命名；在标签上右键可批量关闭左侧、右侧或所有标签。
- 每个标签的输入、模式、显式生成的结果和错误状态保存在 IndexedDB 数据库 `devkit-workspace`；浏览器重启后会恢复标签和内容。
- 状态更新先进入内存缓存，再以 500ms 防抖写入 IndexedDB；`pagehide` 时会触发未完成的写入。
- 正则匹配和 Text Diff 设置了计算/渲染上限，避免超大文本阻塞主线程。
- 工作区模块的详细约定见 `toolssite/src/features/tools/workspace/README.md`。
