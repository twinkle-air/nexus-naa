# Skill V1.1 完整性与实用性核对

## 交付清单

| 项目 | 状态 | 落点 |
| --- | --- | --- |
| 精确触发与禁用范围 | 已完成 | `SKILL.md` frontmatter |
| 最低输入、阻断与一次一个问题 | 已完成 | `references/input-requirements.md` |
| 决策树与停止条件 | 已完成 | `references/decision-workflow.md`、`SKILL.md` |
| 九个确定性工具 | 已完成 | `agent-tools.mjs` |
| 稳定结构化契约 | 已完成 | `schemas/` |
| 核素级统一证据 | 已完成 | `src/core.js`、`schemas/evidence.schema.json` |
| 六种谱线状态 | 已完成 | `references/candidate-evidence-rules.md` |
| 四种候选状态 | 已完成 | 同上 |
| 标定参考范围与外推限制 | 已完成 | `src/core.js`、`references/calibration-rules.md` |
| 结果一致性验证器 | 已完成 | `src/validation.js` |
| 简答、结构化 JSON、HTML 报告 | 已完成 | `templates/`、`src/report.js` |
| 科学来源与固定数据政策 | 已完成 | `references/source-register.md`、`references/nuclear-data-policy.md` |
| 12 组契约场景 | 已完成 | `tests/skill-conformance.test.js` |
| MCP、CLI、HTTP 接入 | 已完成 | `mcp-server.mjs`、`scripts/`、`server.mjs` |

## 结论边界

V1.1 解决的是“可复核 γ 能谱分析 Skill”的完整闭环，不扩张为完整 NAA 定量平台。仍未提供经实验室认证的效率标定、完整不确定度预算、活度/元素定量、普适重叠峰解卷积或安全监管结论。标准谱回归结果应与 [`REFERENCE_VALIDATION.md`](REFERENCE_VALIDATION.md) 一起阅读，失败或未检出的弱线不能从报告中隐藏。

## 发布前命令

```bash
node scripts/check.mjs
node scripts/run-skill-conformance.mjs
node scripts/validate-reference-spectra.mjs
```

命令的实际通过数量和标准谱结果以当前提交的运行日志为准，不在本文硬编码。
