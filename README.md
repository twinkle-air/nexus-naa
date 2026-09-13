# Nexus-NAA · v0.4

> 面向中子活化分析的证据驱动智能分析平台与 Agent Skill

本地 γ 能谱分析原型：读谱 → QC → 寻峰 → 用户参考点标定 → 核素候选与证据 → HTML 报告。自然语言入口、MCP 工具和手动按钮共用同一套确定性科学工作流。

> 本项目用于研究、教学和方法验证，不是经认证的实验室测量系统。数据库命中只构成候选证据；当前版本不包含效率刻度、照射/衰变修正、完整不确定度或经验证的元素定量，不能独立用于安全、监管或商业检测结论。

## v0.4 能力

- CSV/TXT/DAT、ORTEC/GammaVision 文本 SPE、XLS/XLSX 统一导入与基础 QC；
- 局部泊松显著性寻峰、实验性 SNIP 本底和相邻双峰 Gaussian 拟合；
- 仅使用用户或实验提供参考点的线性能量刻度；
- 版本固定、逐条标注资格的 γ 谱线候选与伴随峰证据；
- HTML、JSON、CSV 可追溯输出，以及工作区 JSON 恢复；
- 离线规则助手、可选模型适配层、MCP、HTTP API 和本地可视化工作台。

## 运行
要求 Node.js 18+，无第三方包依赖。在项目目录运行 `node server.mjs`，浏览器打开 http://127.0.0.1:4173 。停止用 Ctrl+C。端口占用时可在 PowerShell 先执行 `$env:PORT='4185'`，再启动并打开对应端口。关闭旧版本服务以免看到旧页面。
完整语法检查与测试：`node scripts/check.mjs`（无需 npm）。

## 安装为 Agent Skill

克隆仓库后，可直接把整个仓库作为 Skill 使用；`SKILL.md` 是入口，应用、MCP 服务、核数据、文档和测试都包含在同一目录中。

一次安装到所有支持的用户级目录：

```bash
python scripts/install.py --tool all --scope user
```

也可将 `all` 换成 `codex`、`claude`、`workbuddy`、`codebuddy`、`qoder`、`zcode` 或 `deepseek-harness`。项目级安装示例：

```bash
python scripts/install.py --tool codex --scope project --project-root /path/to/project
```

安装器默认不覆盖已有副本；显式使用 `--force` 时，会先创建带时间戳的备份。安装或更新后请重启/刷新 Agent。各工具目录和 MCP 配置见[智能体接入说明](docs/AGENT_INTEGRATION.md)。即使不使用 Agent，仍可直接运行上面的本地可视化工作台。

## 使用
点击“载入合成双峰验证谱”，输入“分析这张谱”，可验证双峰候选与伴随支持，再下载 HTML 报告。可用“保存分析 JSON”保存当前工作区，并从导入区域“恢复分析 JSON”。合成谱的预设 E=C 仅来自生成公式，不是实验标定。公开 Cs-137 实测谱未提供可靠参考点时只读谱和寻峰，不自动推断标定。
支持 CSV/TXT/DAT、ORTEC/GammaVision 文本 SPE，以及 XLS/XLSX。分隔文本须为两列 channel,counts，可选同名首行表头；SPE 读取 `$DATA:` 通道范围和对应计数；Excel 从各工作表选择数值行最多的前两列。通道须非负递增整数，计数须有限非负。间断通道可查看，不允许寻峰。QC PASS 仅表示基础格式通过。

XLS/XLSX 优先使用 Windows 上已安装的 Microsoft Excel：服务端禁用宏和更新链接、只读打开上传的临时副本。若 Excel COM 因登录会话或安装状态不可用，则自动切换到项目固定版本的 xlrd/openpyxl 只读解析器；转换完成后立即删除上传副本。

界面顶部的“共享数据流”显示当前谱、峰列表、标定和候选状态。所有功能区共用同一个 Workspace；更换文件或修改上游参数会自动清除相关下游结果。

寻峰默认采用局部泊松显著性，避免最高强峰把全谱统一阈值抬高而漏掉弱峰；旧版全谱比例模式仍可对照。另提供实验性的SNIP本底模式和相邻峰双Gaussian局部拟合。SNIP基于LLS变换与递减裁剪窗口，用户标准谱回归建议以8σ作为起点；它并未在所有谱上优于默认模式。Gaussian结果保存在峰记录的 `overlapFit` 中，只处理已经找到的相邻双峰，不自动把宽峰拆成多个峰。

能量标定保留手动输入，同时提供“已知标准源辅助填入”：选择实验中确知的标准核素后，程序从当前谱寻峰并提出通道—参考能量配对，只填入、不自动应用。未知谱不能靠两个峰唯一反推出核素和线性标定；两点零 RMSE 也不是准确性验证。活动核数据为29种实际发射核素、81条谱线：58条来自 IAEA 2008 固定报告并逐页核对，23条源自用户竞赛库并已用 IAEA、LNHB/DDEP 和 NNDC 资料独立审查。原标为 U-238 的 63.29/92.38 keV 线已按实际发射者改为 Th-234，仅在平衡条件有依据时可间接指示 U-238；不冒充完整或最新核数据库。

## 助手
默认离线操作助手是规则路由，不是大模型。支持分析、寻峰、单能量查询、可靠性说明、报告。
模型入口采用统一适配层，支持 Ollama、OpenAI-compatible、Anthropic、Gemini，也可继续添加 Provider。模型只选择白名单操作；核数据、计算及证据解释均来自本地代码。

服务端配置（只设置需要使用的一种，不要写入仓库）：

- OpenAI-compatible：`NAA_MODEL_BASE_URL`（例如以 `/v1` 结尾）和 `NAA_MODEL_API_KEY`；远程地址强制 HTTPS。
- Anthropic：`ANTHROPIC_API_KEY`。
- Gemini：`GEMINI_API_KEY`。
- Ollama：固定使用本机 `127.0.0.1:11434`，无需密钥。

“手动真实模型验证”会生成完整提示，可交给当前对话模型或任意其他模型，再把原始 JSON 回复粘贴回应用。应用验证并执行该回复，但不能认证粘贴内容的模型来源，因此审计记录明确标为 `user_pasted_not_authenticated`。自动 API 调用会标为 `server_api`。

## 输出与范围
HTML 包含完整谱、QC、标定、峰表、候选理由、来源、证据链、参数和警告；JSON 包含原始计数和文件字节 SHA-256，并可重新导入恢复分析；恢复时只采纳谱、标定和参数，峰与候选由当前版本重新计算，不信任文件中缓存的派生结论。CSV 为峰表。JSON作为机器交换格式保持稳定字段名，不随界面语言改变。
[四阶段整体核对](docs/acceptance-matrix.md) · [方法限制](docs/methods.md) · [核数据说明](data/NUCLEAR_DATA.md) · [公开实测谱来源](data/SOURCES.md)
[智能体、MCP 与 HTTP API 接入](docs/AGENT_INTEGRATION.md)
[方法与数据改进依据](docs/research-basis.md)
[用户标准谱回归结果](docs/REFERENCE_VALIDATION.md) · [ENSDF可复现导入流程](docs/ENSDF_PIPELINE.md)
这是简化四阶段原型，不含重叠峰拟合、不确定度、效率刻度及元素定量，不代表原始大型平台方案全部完成。

## 开源与数据说明

代码以 [MIT License](LICENSE) 发布。仓库中的核数据和参考谱保留各自来源、资格与限制说明；引用或再分发前请分别检查[data/NUCLEAR_DATA.md](data/NUCLEAR_DATA.md)、[data/SOURCES.md](data/SOURCES.md)及原始来源条款。提交 issue 时不要上传未脱敏的实验记录、API Key 或受限制数据。
