# 分析决策流程

1. **识别目标**：若不是 γ 能谱任务则停止调用本 Skill。若用户要求医疗、安全、监管或缺条件的定量结论，解释边界并停止。
2. **导入**：非标准文本先调用 `nexus_import_spectrum`。解析失败即停止，不从文件名推断核素。
3. **QC**：调用 `nexus_quality_check`。负计数、重复/乱序通道已在导入时拒绝；间断通道阻断寻峰。
4. **标定判断**：查看谱或寻峰不要求标定；能量解释和核素候选必须标定。仅用用户、仪器元数据或实验标准提供的点调用 `nexus_fit_energy_calibration`。
5. **寻峰**：调用 `nexus_find_peaks`。保留算法、阈值、本底和峰形限制；零峰是有效结果，不得创造峰。
6. **标定范围**：目标峰必须在参考点能量范围内才能形成支持性结论。外推只能输出 `insufficient_evidence` 和警告。
7. **查询或排序**：单能量问题用 `nexus_query_gamma`；测量谱用 `nexus_rank_nuclide_candidates`。查询结果永远不是测量检出。
8. **证据复核**：检查独立匹配线、伴随线状态、511 keV、线拥挤、重叠、可能逃逸峰/和峰、来源和缺失信息。
9. **结论分级**：只能使用工具给出的 `supported`、`tentative`、`conflicting`、`insufficient_evidence`，不得自行升级。
10. **验证**：交付结构化结果或报告前调用 `nexus_validate_analysis`。失败即停止并报告错误代码。
11. **报告**：验证通过后，优先将同一份已验证的分析快照交给 `nexus_generate_report_from_analysis`；它会再次验证快照并生成报告。仅在用户明确选择“一步完成分析与报告”时使用 `nexus_generate_report`。自然语言只能引用工具数值与 `evidence_id`。

任何一步失败都不得绕过或按用户要求“忽略警告直接确认”。
