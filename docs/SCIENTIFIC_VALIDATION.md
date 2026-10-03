# 科学派生结果验证范围 / Scientific validation scope

修复日期：2026-10-03。保留 V1.3 工具接口与 `0.4` 快照格式；这是验证器加固，不是新增识别算法或准确率声明。

## 已确认问题及修复

旧实现可接受以下联合修改：将合成 Co-60 谱的候选参考能量从 1173.228 改成 1198.228 keV，修改对应声明，再从修改后的谱线重建核素汇总。修复前实跑返回 `valid: true`。内部一致并不保证数据库数值正确。

现在验证器以声明的谱数组、标定参考点和设置为复算输入，不使用快照中的候选数值作为核数据依据：

1. 检查通道/计数、数组长度、非有限数值，以及文件名/哈希在谱和来源中的一致性；重新计算规范化警告及 QC。
2. 从参考点重新拟合标定，核对系数、RMSE、残差、范围和标定状态。
3. 从谱和寻峰设置重算峰表，包括能量、宽度、面积及可选双 Gaussian 拟合。
4. 按外部固定数据库记录 ID 核对全部记录字段、参考能量、发射强度、核素、辐射类型及来源。拒绝未知或重复引用；快照自行声明的数据库来源不作为信任根。
5. 从复算峰和固定数据库重算候选检索、排序、残差、伴随线、干扰和支持资格；核对完整证据链、声明和核素级汇总，并检查必要警告。

峰表、标定、候选、QC、来源和五类证据行的嵌套 Schema 现在均约束字段与类型，并关闭多余字段。NaN/Infinity 会在工具输入层被拒绝；直接调用验证器及报告函数也会拒绝非有限数值。保留 `null` 表示尚未执行，区分于已执行但零结果的 `[]`。发射强度没有错误地统一限制为 100%：湮没光子的每次衰变发射数量可能超过 1。

## 接口与停止条件

- `nexus_validate_analysis` 使用工具内部加载的固定核数据库。
- `nexus_generate_report_from_analysis` 拒绝未通过验证的快照，不用修改后的快照重新分析并掩盖错误。
- `nexus_generate_report` 验证其新分析结果后生成报告。
- 库调用 `htmlReport(result, language, referenceDatabase)`：已匹配快照必须显式传入可信数据库；不传时失败关闭，错误包含 `TRUSTED_DATABASE_REQUIRED`。网页两个报告入口均已传入当前固定数据库。
- 典型错误：`DATABASE_RECORD_MISMATCH`、`DATABASE_RECORD_UNKNOWN`、`DATABASE_RECORD_DUPLICATE`、`MATCHING_REPLAY_MISMATCH`、`PEAK_REPLAY_MISMATCH`、`CALIBRATION_REPLAY_MISMATCH`、`EVIDENCE_REPLAY_MISMATCH`。结构畸形或不可复算输入返回失败，不把异常当作通过。

## 验证通过不代表什么

`valid: true` 表示派生结果能由声明的输入与当前固定数据库确定性复现。复算复用同一套计算实现，可发现修改、遗漏和不一致，但不是独立算法正确性证明。

不能由此认证原始测量、仪器标定参考点、样品标签或数据库评估本身的真实性。如果输入谱和参考点被一起替换，随后按工具重新分析，新的结果可能合法通过；这是新输入的一致结果，不是旧输入的真实性证明。输入字节哈希只检查格式和引用一致性：没有原始文件字节或可信外部存证时，不能重新认证该哈希对应的原件。分析 SHA-256 仅标识内容，不能替代科学数值核对。

支持窗仍是本项目的保守工程规则；数据库覆盖有限，结论不是确认检出。三份参考谱仍使用标签辅助标定；没有新增独立标定实测谱、空白实测谱或有完整杂质真值的负样本。本轮不能提高或重新宣称盲识别准确率。宿主行为夹具也不是实际模型实跑证据。

## 本轮清单复核与证据

| 清单 | 状态与证据 |
| --- | --- |
| 固定数据库记录核对 | 完成；`src/validation.js`，联合篡改测试 |
| 科学派生结果复算 | 完成；QC/标定/峰/匹配/证据复算，正常与修改拟合测试 |
| 嵌套 Schema | 完成；`schemas/analysis-result.schema.json`、独立 MCP Schema 编译测试 |
| 原反例及联合篡改负例 | 完成；`tests/scientific-validation.test.js` 共 28 项，包含正常对照及工具输出不泄露数据库可变引用的检查；合成样本非实测 |
| 回归与适用边界 | 完成；下列检查与本说明、主 Skill 和决策流程 |

本轮实跑：31 模块语法通过，5 份 Schema 元验证通过，116/116 项项目测试通过；Skill 契约 13/13，宿主策略夹具 6/6。参考谱寻峰回归：Co-60 2/2、Ba-133 4/4；Eu-152 自适应 14/14，SNIP 8σ 为 13/14，仍遗漏 1089.737 keV、1.731% 弱线。12 组识别回归质量门槛通过，完整证据的非参考 `supported` 为 0。

另外三份参考谱均通过新工具输出 Schema、科学复算验证和同快照报告，SNIP 峰数分别为 4、48、10，报告指纹与验证指纹一致。HTTP 实跑中，正常报告返回 200，联合篡改快照验证失败，篡改报告返回 400。网页完整分析及真实下载事件也已验证：合成谱 2 峰，HTML 包含 SHA-256 指纹和 Co-60，未出现页面异常；下载测试临时文件已删除。上述都是固定样本或合成输入的回归，不是盲样准确率。

可复现命令：

```text
node scripts/check.mjs
node --test tests/scientific-validation.test.js
node scripts/run-skill-conformance.mjs
node scripts/evaluate-host-behavior.mjs
node scripts/validate-reference-spectra.mjs
node scripts/evaluate-identification.mjs
```

## 研究依据与取舍

查阅日期：2026-10-03。检索范围：JSON Schema 2020-12 对嵌套对象、required、additionalProperties 的约束，以及 Ajv 严格模式的数值校验；结合本项目源代码和可复现实测反例制定工程修复。不引入新核数据、识别阈值或未核实的实验标签。

- JSON Schema 官方对象规则：<https://json-schema.org/understanding-json-schema/reference/object>。用于结构层约束，不作为数据库数值正确性的依据。
- Ajv 官方严格模式：<https://ajv.js.org/strict-mode.html>。用于类型/非有限数值等契约检查；项目仍锁定 Ajv 8.17.1。
- 核数据信任根为现有 `data/nuclear-lines.json` 固定集合及其来源、审查记录。本次不重新评估或替换核数据库的科学数据。

## English summary

Validation now replays QC, calibration, peak search, matching and evidence from the declared inputs and checks line records against an external trusted database. Jointly edited line values, claims and nuclide summaries no longer pass merely by being internally consistent. Nested runtime schemas reject malformed snapshots. A matched report requires an explicit trusted database and fails closed without it.

Passing validation establishes deterministic consistency only. It does not authenticate original measurements or calibration references, prove the shared algorithm independently correct, demonstrate blind-identification accuracy, or establish real host-model compliance. SHA-256 identifies content; it is not a scientific-value check. No new independently calibrated measured spectra or certified negative-sample truth was added in this hardening pass.
