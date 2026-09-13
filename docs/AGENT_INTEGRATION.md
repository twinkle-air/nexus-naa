# 智能体与 API 接入

Nexus-NAA 的模型层和科学工具层彼此独立：模型负责决定是否调用工具，`agent-tools.mjs` 负责确定性计算。Codex、Claude Code 及其他支持 MCP 的宿主无需配置模型 API Key；宿主自己的模型负责工具调用。

## MCP（Codex、Claude Code 等）

服务器：`mcp-server.mjs`，采用 MCP `2025-06-18` 的 stdio/JSON-RPC 传输。不要手工常驻启动，MCP 宿主会创建并管理进程。

工具：

- `nexus_import_spectrum`：统一导入 CSV/TXT/DAT/SPE 文本或Base64编码的XLS/XLSX，并返回标准化谱文本和解析警告。
- `nexus_analyze_spectrum`：输入两列谱文本及可选的用户标定点，返回完整结构化快照和短摘要。
- `nexus_query_gamma`：查询用户明确给出的能量；始终说明不是测量检出结论。
- `nexus_generate_report`：分析并返回独立 HTML 报告文本。

Codex 的 `config.toml` 示例：

```toml
[mcp_servers.nexus-naa]
command = "node"
args = ["C:/path/to/nexus-naa/mcp-server.mjs"]
```

Claude Code 项目级 `.mcp.json` 示例：

```json
{
  "mcpServers": {
    "nexus-naa": {
      "command": "node",
      "args": ["C:/path/to/nexus-naa/mcp-server.mjs"]
    }
  }
}
```

配置后重启或重新加载对应宿主，再查看工具列表。实际配置位置及授权界面以宿主当前版本为准。协议依据：[MCP 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/index)、[stdio 传输](https://modelcontextprotocol.io/specification/draft/basic/transports)、[Claude MCP 文档](https://docs.anthropic.com/en/docs/mcp)。

## 本地 HTTP API

运行 `node server.mjs`，服务只监听 `127.0.0.1`。这适合本机程序和智能体；若要暴露到网络，必须另加 TLS、身份验证、速率限制和部署层，不能直接转发当前开发服务器。

```text
GET  /api/v1/tools
POST /api/v1/tools/nexus_query_gamma
POST /api/v1/tools/nexus_analyze_spectrum
POST /api/v1/tools/nexus_generate_report
```

查询请求示例：

```json
{"energyKeV":661.657,"toleranceKeV":0.1,"topN":3}
```

分析请求示例：

```json
{
  "filename":"sample.csv",
  "spectrumText":"channel,counts\n0,1\n1,5\n2,1",
  "calibrationText":"0,0\n2,2",
  "settings":{"smoothingWindow":3,"minProminencePercent":5,"minDistance":1},
  "matchSettings":{"toleranceKeV":2,"topN":3}
}
```

谱文本上限 10 MB，表格字节上限20 MB。API 返回 JSON；错误返回 `error`。浏览器跨站 Origin 被拒绝，但这不是公网身份认证。

## 边界

标定点必须由用户或实验元数据提供，智能体不得生成。数据库命中、`supported` 状态和伴随峰均是候选证据，不是确认检出。活动数据库是固定 IAEA 2008 小型子集。报告 HTML 是输出文本；MCP 工具不会擅自写入用户文件。
