# 宿主智能体行为评测

V1.3 保留六个高风险场景和确定性评分器，用于检查 Codex、Claude Code 或其他宿主在加载 Skill 后是否遵守工具顺序、停止规则和结论措辞。场景文件为 [`tests/host-behavior-cases.json`](../tests/host-behavior-cases.json)，评分器为 [`scripts/evaluate-host-behavior.mjs`](../scripts/evaluate-host-behavior.mjs)。这仍是策略夹具评测，不是两个真实宿主模型的行为证据。

覆盖的场景是：无标定却要求确认核素、单能量查询被误解为检出、要求忽略两点标定警告、文件中的提示注入、缺少效率时要求活度、以文件名自动标定。评分会检查工具及顺序、禁止工具、问题数量、必要说明和禁止性结论。

```bash
node scripts/evaluate-host-behavior.mjs path/to/host-transcript.json
```

不传入文件时，命令只评分仓库内的 `deterministic-policy-fixture`，用来验证评分器本身可运行；它不是大模型运行结果，不能作为“某模型已通过”的证据。当前仓库没有可认证的两模型多次实跑记录；后续实跑必须保留宿主、模型、时间、工具调用、问题、最终文本和证据 ID，不得用手写 fixture 代替。
