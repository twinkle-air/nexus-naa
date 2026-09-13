# 核数据快照说明
活动数据 nuclear-lines.json：nexus-naa-reviewed-supplied-library-2026-09-06，共 81 条。核对日期不是评价日期。
依据 [IAEA INDC(NDS)-0534，August 2008，Tables A-3 / B-2 / D-2](https://www-nds.iaea.org/sgnucdat/safeg2008.pdf)。逐条包含记录 ID、sourceId、sourcePage（PDF 从 1 起算页）、sourceUrl 和核对状态；来源版本 2008-08。
IAEA 固定快照覆盖58条。2026-09-06 又从用户提供的竞赛核素库录入23条不重复记录，涉及 Th-234、Pb-210、U-235、Ba-133、Pb-214、Bi-214、Ac-228、Pb-212、Tl-208、Bi-212 和 I-131；原始工作簿、哈希及三份参考谱见 [REFERENCE_SPECTRA.md](REFERENCE_SPECTRA.md)。这23条已独立审查，差异见 [SUPPLIED_DATA_AUDIT.md](SUPPLIED_DATA_AUDIT.md)。
旧 v0.3 快照仅链接若干数据库首页，不能证明逐条核实。本次以可定位报告数值替换活动数据；legacy-v03-unverified.json 原样保留供审计，不被应用加载。当前核素清单及每条数据资格以活动JSON为准。
不是最新完整核数据库或完整 PGNAA 库；“81 条”不可解释为已穷尽标准源。[NNDC NuDat](https://www.nndc.bnl.gov/nudat3/guide/) 基于持续更新的ENSDF评价数据，可查询衰变辐射、γ能量、强度及符合关系，是后续扩库的优先权威入口；但在未保存提取日期、具体衰变数据集、记录和不确定度前，不把动态查询结果冒充固定且逐条核实的数据。主要是衰变 γ；Na-22 的 511 keV 标为湮没线，不能唯一识别核素。发射概率单位为每百次衰变的光子数，湮没线可超过 100，不能直接当成实测峰强度。无命中或未观察到伴随峰不等于排除。
正式研究需扩充数据评价、不确定度及效率、照射与冷却条件。
