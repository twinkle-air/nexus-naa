# V1.3 来源登记

检索日期：2026-09-22。范围：Skill 结构、MCP 接入、JSON Schema 运行时契约、评测方法、γ 能谱标定与质量保证、核数据来源。未声称穷尽全部文献。

| 来源 | 用途 | 采用情况 |
| --- | --- | --- |
| [OpenAI, Build skills](https://developers.openai.com/docs/build-skills) | `SKILL.md`、references、scripts 与渐进披露 | 采用 |
| [Model Context Protocol 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/) | MCP 工具、结构化输出和错误返回 | 采用，保持当前协议版本 |
| [MCP Tools, outputSchema and structuredContent](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) | 工具输出 Schema 与结构化内容一致性 | 采用，十个工具均声明严格输入/输出 Schema |
| [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12) | 契约方言与元 Schema | 采用 |
| [Ajv 8 documentation](https://ajv.js.org/guide/getting-started.html) | Node.js 运行时 Schema 编译与验证 | 采用，精确锁定 8.17.1 |
| [OpenAI Evals design guide](https://developers.openai.com/api/docs/guides/evals) | 宿主行为场景、可重复评分与结果记录 | 采用评测集/评分器分离思路；未宣称已运行真实模型 |
| [IAEA TRS 295, Measurement of Radionuclides](https://www-pub.iaea.org/MTCD/Publications/PDF/trs295_web.pdf) | 能量标定是核素识别前提 | 采用 |
| [IAEA TRS 454, Quality Assurance for Radioactivity Measurement](https://www-pub.iaea.org/MTCD/Publications/PDF/TRS454_web.pdf) | 标定点数量、能区覆盖、效率与几何边界 | 采用 |
| [IAEA TRS 487, Quality Assurance in NAA](https://www-pub.iaea.org/MTCD/Publications/PDF/PUB_DOC-010-487_web.pdf) | 漂移、重叠、非高斯峰、残差和干扰检查 | 采用 |
| [IAEA INDC(NDS)-428, Update of X Ray and Gamma Ray Decay Data Standards](https://www-nds.iaea.org/publications/indc/indc-nds-0428.pdf) | 识别用能量与相对发射强度、干扰修正背景 | 采用其证据维度；未在缺少效率修正时强行比较峰面积比 |
| [NIST, N42-2011 Radionuclide Identifier Example](https://www.nist.gov/pml/radiation-physics/n42-2011/n42-2011-radionuclide-identifier) | 核素识别输出中的峰宽和本底信息 | 用于说明 FWHM/本底应成为可审查输入，不据此声称本项目阈值是 NIST 标准 |
| [Sandia, Gamma-Ray Spectral Resolution](https://www.osti.gov/servlets/purl/1769008) | 探测器分辨率、FWHM 与相邻线分辨能力 | 支持分辨率相关审查；项目支持窗公式仍明确标为工程规则 |
| [NIST, Measurements of Scatter Peaks from Cs-137 and Co-60 Sources](https://www.nist.gov/publications/measurements-scatter-peaks-137cs-and-60co-sources) | 标准源谱仍可能包含散射结构与环境贡献 | 用于限制“非文件标签候选即假阳性”的表述 |
| [NIST FIPS 180-4, Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) | 分析快照 SHA-256 指纹 | 采用；浏览器、CLI、HTTP 与 MCP 使用同一同步实现并以标准向量测试 |
| [NNDC ENSDF API](https://www.nndc.bnl.gov/ensdf-api/) | 可追溯数据集关系和导入来源 | 仅用于固定批次；因 public beta 不作实时依赖 |
| [NIST Procedure 23](https://www.nist.gov/system/files/documents/2024/01/29/Procedure%2023v100.pdf) | 效率、几何、峰拟合和定量限制 | 采用 |

没有可靠效率、几何、计数时间、质量和修正信息时，不采用任何活度或元素定量推断。
