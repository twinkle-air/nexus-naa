# 用户提供核数据的独立审查

审查日期：2026-09-06。审查对象是 `reference-nuclide-library.xlsx`（SHA-256 `a818b34161319527cb913d92414c890b967faa0b2f6d2eae408406417d103a39`）中进入活动库的23条非重复记录。本文记录的是“工作簿记录与独立权威资料是否一致”，不是对原子核评价工作本身的再评价。

## 资格规则

- 必须能定位到 IAEA、LNHB/DDEP 或 NNDC/ENSDF 的具体记录，不仅是数据库首页。
- 能量和每100次母核衰变的光子数必须对应同一条跃迁及同一归一口径。
- 数值在评价不确定度内视为核验通过；活动库采用所选固定资料的推荐中心值。
- 核素字段表示实际发射光子的核素。衰变链子体只能在平衡等条件成立时间接指示母体。

## 审查结果

|ID|结论|采取的处理|
|---|---|---|
|COMP2026-01|原表将 63.29 keV 标为 U-238，发射者实为 Th-234|改为 Th-234，3.70%，24.10 d；增加 `proxyFor=U-238` 及平衡限定|
|COMP2026-02|原表将 92.38 keV 标为 U-238，发射者实为 Th-234|改为 Th-234，采用 DDEP 2.18%，24.10 d；保留 U-238 间接指示限定|
|COMP2026-03|一致|保留 Pb-210 46.539 keV、4.25%；半衰期规范为22.20 y|
|COMP2026-04|一致|保留 U-235 143.76 keV、10.96%|
|COMP2026-05|舍入差异|采用 U-235 185.715 keV、57.2%|
|COMP2026-06–09|基本一致|采用 Ba-133 半衰期10.539 y；356.0129 keV 为62.05%，其余保留|
|COMP2026-10–11|末位/版本差异|采用 Pb-214 295.224 keV、18.414% 与351.932 keV、35.60%|
|COMP2026-12–14|末位与半衰期版本差异|采用 LNHB/DDEP 光子评价能量609.316、1120.295、1764.498 keV；NNDC A=214 评价半衰期19.71 min|
|COMP2026-15–17|一致|保留 Ac-228 两线与 Pb-212 238.632 keV 记录|
|COMP2026-18–19|评价版本差异|采用 IAEA 固定表：Tl-208 583.187 keV/85.0%、2614.511 keV/99.79%、3.060 min|
|COMP2026-20|与所选 IAEA 衰变链表一致|保留 Bi-212 727.330 keV、6.67%、60.55 min|
|COMP2026-21–23|评价版本差异|采用 IAEA 评价：284.305/6.15%、364.490/81.4%、636.988/7.14% keV；8.0233 d|

23条记录均已完成独立比对；其中不存在需要从活动库删除的伪造或无法定位记录，但对发射核素误标和若干评价版本差异进行了修正。原始工作簿保持不变，活动 JSON 保留工作簿来源并为每条增加 `auditSourceUrl`。

## 固定审查来源

- LNHB/DDEP, Th-234 evaluation: https://www.lnhb.fr/nuclides/Th-234_com.pdf
- LNHB/DDEP, Ba-133 evaluation: https://www.lnhb.fr/nuclides/Ba-133_com.pdf
- LNHB/DDEP, Pb-214 recommended table: https://www.lnhb.fr/nuclides/Pb-214_tables.pdf
- IAEA INDC(NDS)-0502, actinides and natural decay products: https://nds.iaea.org/publications/indc/indc-nds-0502.pdf
- LNHB/DDEP, Bi-214 evaluation comments: https://www.lnhb.fr/nuclides/Bi-214_com.pdf
- NNDC ENSDF, Bi-214 decay dataset and half-life context: https://www.nndc.bnl.gov/ensnds/214/Po/beta_decay.pdf
- IAEA Safety Reports Series decay-chain table: https://www-pub.iaea.org/MTCD/Publications/PDF/Pub1568_web.pdf
- IAEA I-131 decay evaluation: https://www-nds.iaea.org/IRDFFtest/decay-eval/T%20G%20X_I-131.pdf

## 使用限制

- 发射概率不等于实测峰高；还受效率、自吸收、几何、符合加和和测量时间影响。
- Th-234、Pb-214、Bi-214、Ac-228、Pb-212、Bi-212 和 Tl-208 不能在任意样品中无条件地代表其衰变链母核活度。
- 92.38 keV Th-234 线与邻近跃迁及自吸收有关，不应单独用于高准确度 U-238 定量。
