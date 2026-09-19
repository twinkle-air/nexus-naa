# Nexus-NAA · V1.0

[中文](README.md)

> An evidence-driven intelligent analysis platform and Agent Skill for neutron activation analysis

Nexus-NAA is an evidence-driven gamma-spectrum analysis agent for neutron activation analysis (NAA). It supports spectrum import and QC, peak finding, user-referenced energy calibration, nuclide candidate evidence, and traceable reports through a local workbench, MCP tools, and an HTTP API. Its natural-language interface and manual controls share the same deterministic scientific workflow.

> This project is intended for research, education, and method validation. It is not a certified laboratory measurement system. A database match is candidate evidence only. The current release does not include efficiency calibration, irradiation/decay corrections, complete uncertainty evaluation, or validated elemental quantification, and must not be used on its own for safety, regulatory, or commercial testing conclusions. V1.0 is the software release and registration version; its scientific feature scope remains that of v0.4. Analysis JSON retains schema version 0.4 for compatibility with saved files.

## Agent Workbench

![Nexus-NAA agent workbench (v0.4-stage screenshot)](assets/nexus-naa-workbench.png)

## V1.0 Capabilities

- Unified import and basic QC for CSV/TXT/DAT, ORTEC/GammaVision text SPE, and XLS/XLSX files
- Local Poisson-significance peak detection, experimental SNIP background estimation, and adjacent-doublet Gaussian fitting
- Linear energy calibration based only on reference points supplied by the user or the experiment
- Version-pinned gamma-line candidates with per-line qualification and companion-peak evidence
- Traceable HTML, JSON, and CSV output, plus restoration from workspace JSON
- An offline rule-based assistant, optional model adapter layer, MCP interface, HTTP API, and local visual workbench

## Run Locally

Requirements: Node.js 18 or later. No third-party package installation is required.

From the project directory, run:

```bash
node server.mjs
```

Then open <http://127.0.0.1:4173> in a browser. Press `Ctrl+C` to stop the server.

If the port is already in use, run the following in PowerShell before starting the server, then open the corresponding port:

```powershell
$env:PORT='4185'
node server.mjs
```

Stop any older instance of the service to avoid loading an outdated interface.

Run all syntax checks and tests without npm:

```bash
node scripts/check.mjs
```

## Install as an Agent Skill

After cloning the repository, the entire repository can be used directly as a Skill. `SKILL.md` is the entry point; the application, MCP server, nuclear data, documentation, and tests are all included in the same directory.

Install once into every supported user-level directory:

```bash
python scripts/install.py --tool all --scope user
```

You may replace `all` with `codex`, `claude`, `workbuddy`, `codebuddy`, `qoder`, `zcode`, or `deepseek-harness`.

Example of a project-level installation:

```bash
python scripts/install.py --tool codex --scope project --project-root /path/to/project
```

By default, the installer does not overwrite an existing copy. With `--force`, it first creates a timestamped backup. Restart or refresh the Agent after installation or an update. See the [Agent integration guide](docs/AGENT_INTEGRATION.md) for tool-specific directories and MCP configuration. The local visual workbench can also be used without installing the Skill.

## Usage

Click **Load synthetic doublet validation spectrum**, enter “analyze this spectrum,” and inspect the doublet candidates and companion-line support before downloading an HTML report. Use **Save analysis JSON** to preserve the current workspace, and restore it later from the import area. The synthetic spectrum's preset `E = C` relation comes only from its generation formula; it is not an experimental calibration. When a public Cs-137 measured spectrum has no reliable reference point, Nexus-NAA imports it and detects peaks but does not infer a calibration automatically.

Supported inputs are CSV/TXT/DAT, ORTEC/GammaVision text SPE, and XLS/XLSX. Delimited text must contain two columns, `channel,counts`, with an optional first-row header using those names. SPE import reads the channel range and counts under `$DATA:`. For Excel workbooks, the two columns with the most numeric rows are selected from each worksheet. Channels must be non-negative, strictly increasing integers; counts must be finite and non-negative. Spectra with channel gaps can be viewed but cannot be processed for peak detection. A QC PASS means only that the basic format checks succeeded.

For XLS/XLSX files on Windows, Nexus-NAA first attempts to use an installed copy of Microsoft Excel. The server disables macros and link updates and opens a temporary upload copy in read-only mode. If Excel COM is unavailable because of the login session or installation state, the program automatically falls back to the repository-pinned xlrd/openpyxl read-only parser. Temporary upload copies are deleted immediately after conversion.

The fixed **Shared Data Flow** rail on the right side of the interface shows the current spectrum, peak list, calibration, and candidate status. Every section uses the same Workspace. Replacing the input file or changing an upstream parameter automatically clears dependent downstream results.

The default peak detector uses local Poisson significance so that a very intense peak does not raise a single whole-spectrum threshold and hide weaker peaks. The earlier whole-spectrum proportional mode remains available for comparison. An experimental SNIP background mode and a local two-Gaussian fit for adjacent peaks are also provided. SNIP uses a log-log-square-root transform and a decreasing clipping window; for regression against user reference spectra, `8σ` is a recommended starting point. SNIP is not superior to the default mode for every spectrum. Gaussian results are stored in the peak record's `overlapFit` field. The fit operates only on adjacent peaks that have already been detected and does not automatically split a broad peak into multiple components.

Energy calibration supports manual entry and an **assist with known standard source** option. After the user selects a standard nuclide known to be present in the experiment, the program detects peaks in the current spectrum and proposes channel-to-reference-energy pairs. It fills the fields but never applies the calibration automatically. Two peaks in an unknown spectrum cannot uniquely determine both the nuclide identity and a linear calibration, and a two-point fit with zero RMSE is not an accuracy validation.

The active nuclear dataset contains 29 actual emitting nuclides and 81 gamma lines. Of these, 58 lines come from a fixed IAEA 2008 report and were checked page by page; 23 come from a user competition dataset and were independently reviewed against IAEA, LNHB/DDEP, and NNDC material. The 63.29 and 92.38 keV lines originally labeled U-238 are assigned to their actual emitter, Th-234. They may indicate U-238 only indirectly when equilibrium is justified. The included dataset is not presented as a complete or continuously updated nuclear database.

## Assistant and Model Integration

The default offline operational assistant uses rule-based routing; it is not a large language model. It supports analysis, peak detection, single-energy lookup, reliability explanations, and report generation.

The unified model adapter supports Ollama, OpenAI-compatible APIs, Anthropic, and Gemini, and can be extended with additional providers. A model may select only allowlisted actions; nuclear data, calculations, and evidence interpretation remain in local code.

Configure only the provider you intend to use, and never commit credentials to the repository:

- **OpenAI-compatible:** `NAA_MODEL_BASE_URL` (for example, ending in `/v1`) and `NAA_MODEL_API_KEY`; remote endpoints must use HTTPS.
- **Anthropic:** `ANTHROPIC_API_KEY`.
- **Gemini:** `GEMINI_API_KEY`.
- **Ollama:** fixed to local `127.0.0.1:11434`; no API key is required.

The **manual real-model validation** workflow generates a complete prompt that can be submitted to the current conversational model or another model. Paste the raw JSON response back into the application; the application validates and executes it. Because Nexus-NAA cannot authenticate the origin of pasted content, the audit record marks it as `user_pasted_not_authenticated`. Automatic API calls are marked `server_api`.

## Output and Scope

The HTML report contains the full spectrum, QC results, calibration, peak table, candidate rationale, sources, evidence chain, parameters, and warnings. JSON output contains raw counts and the input file's SHA-256 hash and can be re-imported to restore an analysis. During restoration, only the spectrum, calibration, and parameters are accepted; peaks and candidates are recalculated with the current version, rather than trusting cached derived conclusions. CSV output contains the peak table. JSON is the stable machine-exchange format, and its field names do not change with the interface language.

- [Four-stage acceptance matrix](docs/acceptance-matrix.md)
- [Method limitations](docs/methods.md)
- [Nuclear data notes](data/NUCLEAR_DATA.md)
- [Public measured-spectrum sources](data/SOURCES.md)
- [Agent, MCP, and HTTP API integration](docs/AGENT_INTEGRATION.md)
- [Basis for method and data improvements](docs/research-basis.md)
- [User reference-spectrum regression results](docs/REFERENCE_VALIDATION.md)
- [Reproducible ENSDF import pipeline](docs/ENSDF_PIPELINE.md)

This is a simplified four-stage prototype. It does not provide general-purpose overlapping-peak deconvolution, complete uncertainty analysis, efficiency calibration, or elemental quantification, and it does not represent completion of the original large-platform concept.

## Open Source and Data Notes

The code is released under the [MIT License](LICENSE). Nuclear data and reference spectra in this repository retain their respective source, qualification, and limitation notes. Before citing or redistributing them, review [data/NUCLEAR_DATA.md](data/NUCLEAR_DATA.md), [data/SOURCES.md](data/SOURCES.md), and the original source terms. Do not upload unredacted experimental records, API keys, or restricted data when filing an issue.

## Author and Feedback

**twinkle-air**  
Email: [twinkleair369@gmail.com](mailto:twinkleair369@gmail.com) or [twinkle-air@qq.com](mailto:twinkle-air@qq.com)
