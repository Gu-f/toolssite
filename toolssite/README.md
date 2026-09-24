# ToolsSite

工具站支持多标签工作区，标签可重命名并通过右键菜单批量关闭。工具输入与显式输出通过 [idb](https://github.com/jakearchibald/idb) 持久化到 IndexedDB，模块约定见 `src/features/tools/workspace/README.md`。

文本对比提供行内字符差异高亮，并支持在内联和左右分栏视图间切换。

Base64 编码支持标准字母表和 URL 安全字母表；URL 安全形式将 `+` 替换为 `-`、`/` 替换为 `_`，并保留 `=` 填充符。解码兼容两种字母表。

JSON 格式化与校验支持修复常见的无效 JSON，例如单引号、缺失闭合括号，以及字符串以外的中英文逗号、冒号和分号分隔符。

URL 编码保留协议和域名，并分别编码路径与 Query 组件；`?`、`&`、`=` 等 Query 结构保持不变。路径空格编码为 `%20`；Query 键和值中的空格编码为 `+`，真实加号编码为 `%2B`。解码按相同区域还原，因此不会把 `%2B` 误判为空格。

JWT 调试器支持解码 Header / Payload、编码 JWT，以及使用 HMAC、RSA、ECDSA 或 EdDSA 密钥验证签名。签名密钥只在当前标签页内存中保留。
