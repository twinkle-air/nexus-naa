# 方法与数据改进依据

核对日期：2026-09-06。本文件区分“研究依据”和“当前已经实现”，避免用论文引用代替软件验证。

## 核数据

- [NNDC NuDat 3 User Guide](https://www.nndc.bnl.gov/nudat3/guide/)：NuDat 的结构和衰变数据来自 ENSDF，是持续更新的评价数据；可查询能级、γ 能量、强度、符合关系和衰变辐射。后续扩库应保存提取日期、母体/衰变数据集和记录级来源，而不能只保存数据库首页。
- [NNDC Levels and Gammas Search Help](https://www.nndc.bnl.gov/nudat3/guide/adhelp.html)：说明可机读的格式化输出及能量、强度、不确定度字段。适合作为未来受控导入器的数据契约依据。
- [IAEA INDC(NDS)-0534](https://www-nds.iaea.org/sgnucdat/safeg2008.pdf)：当前58条已核对谱线的固定报告来源。

当前活动库是29种实际发射核素、81条谱线：58条逐页核对的IAEA固定记录，加23条源自用户工作簿并已用 IAEA、LNHB/DDEP 和 NNDC 资料独立审查的记录。没有将NuDat搜索结果自动灌入活动库，因为NuDat会更新，且衰变母体、子体、强度归一方式和不确定度需要逐条保存后才能复核。

## 寻峰、本底与定量边界

- Morháč 等，[Background elimination methods for multidimensional coincidence gamma-ray spectra](https://doi.org/10.1016/S0168-9002(97)01023-1)：非线性峰削减是估计谱本底的一类重要方法。
- Morháč 与 Matoušek，[Peak Clipping Algorithms for Background Estimation in Spectroscopic Data](https://doi.org/10.1366/000370208783412762)：讨论SNIP类统计敏感本底估计。
- [IAEA-TECDOC-1011](https://www-pub.iaea.org/mtcd/publications/pdf/te_1011_prn.pdf)：高分辨γ谱分析通常包括本底处理、峰搜索、带低能拖尾的Gaussian峰形及非线性最小二乘拟合，并报告面积和不确定度。
- [IAEA-TECDOC-1401](https://pub.iaea.org/MTCD/Publications/PDF/te_1401_web.pdf)：低水平峰的检出和定量需要区分本底、基线和空白等条件，并给出实际弱峰算例。

当前默认仍是透明、轻量的局部泊松筛查和线性ROI本底；另加入可选的LLS-SNIP本底和相邻双Gaussian实验拟合。它们记录算法和参数，但不声称完成检出限计算、低能拖尾模型或计量学不确定度评定。用户标准谱表明SNIP需要比默认局部模式更高的筛查阈值，详见 `REFERENCE_VALIDATION.md`。

## 本轮由依据推动的改进

- 候选理由在网页、HTML报告和智能体摘要中使用同一函数。
- 标定建议报告点数、能量覆盖范围和通道跨度；两点标定要求第三条独立线复核，窄能区提示外推风险。
- 活动库记录继续区分“固定报告已核对”和“用户提供、已独立审查”，后者仍保留原始工作簿及哈希。
- 增加分析JSON恢复，使输入、参数、标定、峰、候选和证据可以复核。
- 增加统一文件导入工具：文本谱使用 `fileText`，XLS/XLSX使用Base64字节；不允许模型从文件名推断标定或核素。
