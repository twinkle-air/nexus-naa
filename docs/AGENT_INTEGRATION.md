# 智能体、MCP、CLI 与 HTTP API 接入

Nexus-NAA V1.3 将宿主模型与科学计算严格分离：模型负责选择工具、提出一个最高优先级问题并解释结构化证据；`agent-tools.mjs` 负责确定性计算与状态判定。Codex、Claude Code 及其他 MCP 宿主使用自己的模型，不需要再为 Nexus-NAA 配置模型密钥。

## 十个工具

| 工具 | 用途 | 关键停止条件 |
| --- | --- | --- |
| `nexus_import_spectrum` | CSV/TXT/DAT/SPE/XLS/XLSX 归一化 | 文件不可解析 |
| `nexus_quality_check` | 通道、计数、基础统计 QC | 非连续通道不得寻峰 |
| `nexus_fit_energy_calibration` | 拟合用户/仪器/实验提供的参考点 | 少于两点、非正斜率 |
| `nexus_find_peaks` | 生成峰表，可带已有标定 | QC 阻断；不自行识别核素 |
| `nexus_query_gamma` | 查询一个明确能量 | 仅数据库候选，不是检出 |
| `nexus_rank_nuclide_candidates` | 形成核素级证据与四级状态 | 缺标定；外推不得支持 |
| `nexus_analyze_spectrum` | 兼容的一体化入口 | 仍服从相同停止规则 |
| `nexus_validate_analysis` | 验证哈希、数值、证据与来源 | `valid=false` 时停止报告 |
| `nexus_generate_report` | 便捷入口：重新分析、验证并生成 HTML | 不用于既有快照 |
| `nexus_generate_report_from_analysis` | 验证并报告传入的同一份分析快照 | 任一字段不一致即停止 |

输入与输出字段由 [`schemas/`](../schemas/) 固定，并由锁定版本 Ajv 8 在 CLI、HTTP 和 MCP 共用入口执行。发布检查会执行 Schema 元验证，每个工具的实际输入输出也会被对应 Schema 验证。分析结果保留兼容字段 `schemaVersion: "0.4"`，另以 `skillContractVersion` 和 `softwareVersion` 标明 V1.3。谱线结果另返回支持资格、支持窗、独立性状态和排除原因。错误具有稳定 `code`；MCP 同时设置 `isError: true` 并在 `structuredContent.error` 返回代码和消息。

## MCP（Codex、Claude Code 等）

服务器为 `mcp-server.mjs`，采用 MCP `2025-06-18` 的 stdio/JSON-RPC 传输。不要手工常驻启动，宿主会创建并管理进程。

Codex `config.toml`：

```toml
[mcp_servers.nexus-naa]
command = "node"
args = ["C:/path/to/nexus-naa/mcp-server.mjs"]
```

Claude Code 项目级 `.mcp.json`：

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

配置后重启或重新加载宿主，再查看工具列表。实际配置位置及授权界面以宿主当前版本为准。协议依据：[MCP 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/index)、[stdio 传输](https://modelcontextprotocol.io/specification/draft/basic/transports)、[Claude MCP 文档](https://docs.anthropic.com/en/docs/mcp)。

## CLI 与直接调用

通用入口读取 JSON 文件，省略文件名时读取标准输入：

```bash
node scripts/run-tool.mjs nexus_query_gamma request.json
node scripts/run-tool.mjs nexus_analyze_spectrum analysis-input.json
```

常用工具也提供独立包装器：`import-spectrum.mjs`、`analyze-spectrum.mjs`、`query-gamma.mjs`、`validate-analysis.mjs` 和 `generate-report.mjs`。Node 程序可直接导入：

```js
import {executeAgentTool} from './agent-tools.mjs';
const result = await executeAgentTool('nexus_query_gamma', {
  energyKeV: 661.657,
  toleranceKeV: 0.1
});
```

## 本地 HTTP API

运行 `node server.mjs`，服务只监听 `127.0.0.1`。这适合本机程序和智能体；若要暴露到网络，必须另加 TLS、身份验证、速率限制和部署层，不能直接转发当前开发服务器。

```text
GET  /api/v1/tools
POST /api/v1/tools/{上述任一工具名}
```

请求体就是对应工具的 JSON 参数。谱文本上限 10 MB，表格字节上限 20 MB。浏览器跨站 Origin 被拒绝，但这不是公网身份认证。

## 宿主编排规则

1. 先阅读 [`references/input-requirements.md`](../references/input-requirements.md) 并运行 QC。
2. 缺信息时一次只问一个会改变下一步工具选择的问题。
3. 不从文件名、未知峰或模型常识生成标定点。
4. 保留工具返回的 `warnings`、`missing_information`、`contradictions` 和 `interferences`。
5. 按 [`references/candidate-evidence-rules.md`](../references/candidate-evidence-rules.md) 原样使用状态；不得升级结论。
6. 对外报告前调用 `nexus_validate_analysis`；失败即停止。验证通过后优先把同一快照交给 `nexus_generate_report_from_analysis`。
7. 始终分开表述核素谱线证据状态和 `calibration_assessment`；`supported` 对人只表述为“谱线一致性支持”。

## 验证

```bash
node scripts/run-skill-conformance.mjs
node scripts/check.mjs
node scripts/validate-reference-spectra.mjs
node scripts/evaluate-host-behavior.mjs
node scripts/evaluate-identification.mjs
```

契约测试覆盖：完整 Co-60、孤立 511 keV、无标定、两点标定、标定外推、通道间断、混合核素、弱伴随线不可评估、拒绝忽略警告、核素结果十个字段的逐项篡改、同快照报告、Schema 输入输出负例、本地数据离线可用和重复运行确定性。宿主行为评测器与参考谱三系统对照的边界分别见对应文档。

## 边界

数据库命中、`supported` 状态和伴随峰都是候选证据，不是确认检出。当前固定数据快照是经过资格标注的有限集合，不是完整、实时 NuDat/ENSDF 镜像。缺少效率标定、时间、几何、质量、空白和必要修正时，工具不得输出活度或元素定量。报告 HTML 是输出文本；工具不会擅自写入用户文件。
