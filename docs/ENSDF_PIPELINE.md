# ENSDF 可复现导入与资格审查

本流程只接收从NNDC保存的固定ENSDF快照，不在运行期查询动态网页。原始文件须保留来源URL、下载日期与SHA-256。

```powershell
node scripts/import-ensdf.mjs path\to\ensdf.snapshot data\staging\ensdf.json https://www.nndc.bnl.gov/ensdf/
```

解析遵循NNDC的80列ENSDF格式。当前保守规则只接受：Decay dataset、存在父核素记录、γ能量和相对强度可解析，并且Normalization记录同时提供NR和BR。绝对发射概率按ENSDF定义计算为 `RI × NR × BR`。缺失归一、非衰变数据集、限定值或不可解析记录进入 `rejected`，不会进入活动匹配库。

资格等级：A为BIPM/DDEP或IAEA推荐值逐条核对；B为ENSDF评价衰变数据且绝对归一完整；C为权威来源但关键字段不完整；D为无法定位或未经评价来源。只有A/B默认允许进入候选库。B级数据在发布前还要经过重复线、近简并线、湮没线、母子体、异常强度和与A级数据差异检查。

解析器保留原始80列记录、数据集名称、参考文献字段、源行号、归一因子、原始不确定度编码和快照哈希。ENSDF的不确定度是末位数字编码，后续解析前保持原样，避免把它误当普通绝对误差。

当前脚本生成的是staging数据，不会自动覆盖 `data/nuclear-lines.json`。发布活动库必须另行生成差异报告并人工批准。
