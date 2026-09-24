# Skill V1.2 完整性与实用性核对

V1.2 针对独立复核提出的两个 P1 完整性缺陷和两个证据缺口进行改进。

| 复核问题 | V1.2 处理 | 可执行证据 |
| --- | --- | --- |
| 核素说明字段可篡改 | 从谱线级匹配重建整个核素对象，对 10 类报告字段逐项比较 | `tests/v12-contract.test.js` 中的逐字段篡改用例 |
| Schema 只是文档 | 锁定 Ajv 8.17.1，CLI/HTTP/MCP 共用入口执行输入和输出 Schema，发布时元验证 | `contracts.mjs`、`scripts/check.mjs` 和 Schema 负例测试 |
| 未评测宿主行为 | 新增 6 个场景及确定性评分器 | `tests/host-behavior-cases.json`；当前只有策略 fixture，没有伪称真实模型结果 |
| 参考谱只统计检出线 | 新增三系统、四容差对照，同时统计排序、非标签支持、停止规则和未解释峰 | `scripts/evaluate-identification.mjs` 与 `docs/IDENTIFICATION_EVALUATION.md` |
| 两点标定与 supported 容易混淆 | 输出中并列 `calibration_assessment`，人类措辞使用“谱线一致性支持” | 报告表格与 Schema |
| 报告重新运行分析 | 新增 `nexus_generate_report_from_analysis`，报告携带同一 fingerprint | 同快照报告回归测试 |

三系统对照首轮发现了标定端点的浮点误差会被误判为外推。V1.2 只加入与数值量级成比例的 `1e-9` 浮点容差；实质越界仍会被标记为外推，并有专门回归测试。

2026-09-22 发布检查结果：`node scripts/check.mjs` 完成 30 个模块语法检查、5 份 Schema 元验证和 81 项测试；`node scripts/run-skill-conformance.mjs` 通过 13 项契约场景；三份参考谱继续得到 Co-60 2/2、Eu-152 13/14、Ba-133 4/4 的 SNIP 8σ 主要参考线结果。安装检查 `pnpm install --frozen-lockfile` 通过。

当前仍不能宣称“已经过多模型实际验证”或“已验证普适核素识别准确率”。检查时未配置 OpenAI-compatible、Anthropic 或 Gemini 密钥，本地 Ollama 也未运行，所以没有伪造两模型成绩；识别评测只有三份标签辅助标准谱，且没有纯度、杂质和全部峰的独立真值。
