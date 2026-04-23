# claude-oh Detailed Explanation / claude-oh 详细说明

## 1. Project Purpose / 项目目标

**中文**

`claude-oh` 是基于 `claude-code-haha` 的本地可运行 Claude Code 变体。它保留原项目的 Ink 终端交互界面、`--print` 非交互模式、MCP、插件和 Skills 能力，同时增加了多 CLI 协作层，让同一个入口可以调度本机已安装的 Claude CLI、Codex CLI 和 OpenCode CLI。

这个项目的核心目标不是重写 Claude Code，而是在本地启动链路可用的基础上，把多个外部 AI 编程 CLI 统一成可诊断、可选择、可组合的 provider 系统。

**English**

`claude-oh` is a locally runnable Claude Code variant based on `claude-code-haha`. It keeps the original Ink terminal UI, `--print` non-interactive mode, MCP, plugins, and Skills support, then adds a multi-CLI collaboration layer that can route work to locally installed Claude CLI, Codex CLI, and OpenCode CLI.

The goal is not to rewrite Claude Code. The goal is to keep the local startup path usable while adding a provider system that can diagnose, select, and coordinate multiple external AI coding CLIs.

## 2. Main Entry Point / 主入口

**中文**

主命令是：

```powershell
claude-oh
```

`bin/claude-oh` 是 Windows PowerShell 友好的 Bun 入口。它会：

- 读取项目根目录下的 `.env`。
- 预加载 `preload.ts`。
- 设置 `CLAUDE_HAHA_COMMAND_NAME=claude-oh`。
- 默认设置 `CLAUDE_HAHA_PROVIDER=auto`。
- 进入完整 Ink TUI；如果设置 `CLAUDE_CODE_FORCE_RECOVERY_CLI=1`，则进入简化 Recovery CLI。

**English**

The main command is:

```powershell
claude-oh
```

`bin/claude-oh` is a Bun entry point designed to work cleanly from Windows PowerShell. It:

- Loads `.env` from the project root.
- Preloads `preload.ts`.
- Sets `CLAUDE_HAHA_COMMAND_NAME=claude-oh`.
- Defaults `CLAUDE_HAHA_PROVIDER=auto`.
- Starts the full Ink TUI, or starts the simplified Recovery CLI when `CLAUDE_CODE_FORCE_RECOVERY_CLI=1`.

## 3. Provider Modes / Provider 模式

**中文**

`claude-oh` 支持以下 provider：

| Provider | 说明 |
| --- | --- |
| `anthropic` | 使用原本的 Anthropic 兼容 API 路径。 |
| `auto` | 自动检查本机外部 CLI，并按任务阶段调度 Claude、Codex、OpenCode。 |
| `claude` | 直接调用 Claude CLI。 |
| `codex` | 直接调用 Codex CLI。 |
| `opencode` | 直接调用 OpenCode CLI。 |

默认情况下，`claude-oh` 使用 `auto`。如果用户运行的是兼容命令或未显式启用外部 provider，则仍可走原本的 Anthropic API 路径。

**English**

`claude-oh` supports these providers:

| Provider | Description |
| --- | --- |
| `anthropic` | Uses the original Anthropic-compatible API path. |
| `auto` | Detects local external CLIs and assigns task stages across Claude, Codex, and OpenCode. |
| `claude` | Calls Claude CLI directly. |
| `codex` | Calls Codex CLI directly. |
| `opencode` | Calls OpenCode CLI directly. |

By default, `claude-oh` uses `auto`. Compatibility usage can still use the original Anthropic API path when no external provider is configured.

## 4. Command-Line Options / 命令行参数

**中文**

新增的 provider 参数：

```powershell
claude-oh --provider auto
claude-oh --provider claude
claude-oh --provider codex
claude-oh --provider opencode
claude-oh --provider anthropic
claude-oh --provider-model "model-name"
claude-oh --agent-providers "claude,codex,opencode"
```

环境变量也可以控制 provider：

```powershell
$env:CLAUDE_HAHA_PROVIDER = "auto"
$env:CLAUDE_HAHA_PROVIDER_MODEL = "model-name"
$env:CLAUDE_HAHA_AGENT_PROVIDERS = "claude,codex,opencode"
claude-oh
```

优先级是：命令行参数高于环境变量，环境变量高于默认值。

**English**

New provider options:

```powershell
claude-oh --provider auto
claude-oh --provider claude
claude-oh --provider codex
claude-oh --provider opencode
claude-oh --provider anthropic
claude-oh --provider-model "model-name"
claude-oh --agent-providers "claude,codex,opencode"
```

Providers can also be controlled through environment variables:

```powershell
$env:CLAUDE_HAHA_PROVIDER = "auto"
$env:CLAUDE_HAHA_PROVIDER_MODEL = "model-name"
$env:CLAUDE_HAHA_AGENT_PROVIDERS = "claude,codex,opencode"
claude-oh
```

Precedence is: CLI flags override environment variables, and environment variables override defaults.

## 5. Slash Commands / 斜杠命令

**中文**

新增两个本地斜杠命令：

### `/providers`

显示 Claude、Codex、OpenCode 三个外部 CLI 是否可用。等价的顶层命令是：

```powershell
claude-oh providers
```

### `/clwb`

提供多 CLI 协作流水线：

| Pipeline | 说明 |
| --- | --- |
| `single` | 不启用流水线，使用当前 provider。 |
| `code-review` | coder 先给出实现方案，reviewer 再审查。 |
| `review-code` | planner 先设计方案，coder 再基于方案实现。 |
| `dual-review` | coder 实现，reviewer 审查，最后再给出总结评估。 |

示例：

```text
/clwb status
/clwb code-review 修复启动时没有显示 Claude 标志的问题
/clwb review-code 为 provider 路由增加测试
/clwb dual-review 审查这次多 CLI 接入是否存在风险
```

后续阶段会收到前一阶段输出，因此 reviewer 不会只看到用户原始问题，而是会基于 coder 或 planner 的产物继续工作。

**English**

Two local slash commands were added:

### `/providers`

Shows whether Claude, Codex, and OpenCode external CLIs are available. The top-level equivalent is:

```powershell
claude-oh providers
```

### `/clwb`

Provides multi-CLI collaboration pipelines:

| Pipeline | Description |
| --- | --- |
| `single` | Disables the pipeline and uses the current provider. |
| `code-review` | The coder proposes an implementation, then the reviewer reviews it. |
| `review-code` | The planner designs first, then the coder implements from that plan. |
| `dual-review` | The coder implements, the reviewer reviews, and a final assessment is produced. |

Examples:

```text
/clwb status
/clwb code-review Fix the startup screen so the Claude logo appears
/clwb review-code Add tests for provider routing
/clwb dual-review Review the multi-CLI integration for risks
```

Later stages receive the previous stage output, so a reviewer sees the coder or planner result instead of only the original user prompt.

## 6. Runtime Architecture / 运行时架构

**中文**

多 CLI 接入主要由以下模块组成：

| 文件或目录 | 职责 |
| --- | --- |
| `bin/claude-oh` | PowerShell 友好的主入口，设置默认 provider 并启动 CLI。 |
| `src/services/multiCli/providerTypes.ts` | 定义 provider、agent role、provider 输出事件和安全 edit proposal 类型。 |
| `src/services/multiCli/providerOptions.ts` | 解析 `--provider`、`--provider-model`、`--agent-providers` 和环境变量。 |
| `src/services/multiCli/providerProfiles.ts` | 把 provider 映射为真实外部 CLI 调用参数。 |
| `src/services/multiCli/diagnostics.ts` | 通过 `--version` 检查外部 CLI 是否可用。 |
| `src/services/multiCli/externalCliBackend.ts` | 调用外部 CLI，解析输出，收集文本和 edit proposal。 |
| `src/services/multiCli/taskAllocator.ts` | 在 `auto` 模式下分配 planner、coder、reviewer 阶段。 |
| `src/services/multiCli/externalModel.ts` | 把外部 provider 接入主 query 流。 |
| `src/commands/clwb/` | `/clwb` 多阶段协作命令。 |
| `src/commands/providers/` | `/providers` provider 诊断命令。 |

主查询入口 `src/query/deps.ts` 会根据 provider 配置决定使用原 Anthropic API，还是使用外部 provider 的 streaming 查询函数。

**English**

The multi-CLI integration is mainly implemented by these modules:

| File or directory | Responsibility |
| --- | --- |
| `bin/claude-oh` | PowerShell-friendly entry point that sets default provider state and starts the CLI. |
| `src/services/multiCli/providerTypes.ts` | Defines providers, agent roles, provider output events, and safe edit proposal types. |
| `src/services/multiCli/providerOptions.ts` | Parses `--provider`, `--provider-model`, `--agent-providers`, and environment variables. |
| `src/services/multiCli/providerProfiles.ts` | Maps providers to real external CLI invocations. |
| `src/services/multiCli/diagnostics.ts` | Checks external CLI availability with `--version`. |
| `src/services/multiCli/externalCliBackend.ts` | Calls external CLIs, parses output, and collects text plus edit proposals. |
| `src/services/multiCli/taskAllocator.ts` | Assigns planner, coder, and reviewer stages in `auto` mode. |
| `src/services/multiCli/externalModel.ts` | Connects external providers into the main query flow. |
| `src/commands/clwb/` | Implements the `/clwb` multi-stage collaboration command. |
| `src/commands/providers/` | Implements the `/providers` provider diagnostics command. |

The main query dependency factory in `src/query/deps.ts` chooses between the original Anthropic API path and the external provider streaming path based on provider configuration.

## 7. Safety Model / 安全模型

**中文**

外部 CLI 被当作“建议提供者”，而不是直接文件修改者。`externalCliBackend` 会把提示词包上一层约束，要求外部 CLI 不要直接修改文件，而是返回说明或结构化 edit proposal。

当外部 provider 返回 edit proposal 时，代码会检查目标路径是否在当前工作目录内。工作区外的路径会被拒绝并记录为错误，避免外部 CLI 生成越界写入建议。

**English**

External CLIs are treated as proposal providers, not direct file writers. `externalCliBackend` wraps prompts with a guard instructing external CLIs not to modify files directly, but to return explanations or structured edit proposals.

When an external provider returns edit proposals, the target path is checked against the current working directory. Proposals outside the workspace are rejected and recorded as errors.

## 8. Installation / 安装

**中文**

项目依赖 Bun。推荐从项目根目录安装依赖并注册全局命令：

```powershell
bun install
npm install -g .
```

然后可以从任意 PowerShell 目录运行：

```powershell
claude-oh
```

如果 PowerShell 找不到命令，检查 npm 全局 bin 目录是否在 `PATH` 中：

```powershell
npm bin -g
Get-Command claude-oh -All
```

**English**

The project depends on Bun. Install dependencies and register the global command from the project root:

```powershell
bun install
npm install -g .
```

Then run from any PowerShell directory:

```powershell
claude-oh
```

If PowerShell cannot find the command, check whether the global npm bin directory is on `PATH`:

```powershell
npm bin -g
Get-Command claude-oh -All
```

## 9. Diagnostics / 诊断

**中文**

检查入口：

```powershell
claude-oh --help
claude-oh --version
claude-oh providers
```

检查外部 CLI：

```powershell
claude --version
codex --version
opencode --version
```

如果完整 Ink TUI 启动失败，可以进入 Recovery CLI：

```powershell
$env:CLAUDE_CODE_FORCE_RECOVERY_CLI = "1"
claude-oh
```

**English**

Check the main entry point:

```powershell
claude-oh --help
claude-oh --version
claude-oh providers
```

Check external CLIs:

```powershell
claude --version
codex --version
opencode --version
```

If the full Ink TUI cannot start, use the Recovery CLI:

```powershell
$env:CLAUDE_CODE_FORCE_RECOVERY_CLI = "1"
claude-oh
```

## 10. Verification Status / 验证状态

**中文**

本次上传前已验证：

- `bun test`：23 个测试通过。
- `claude-oh --help`：正常显示 `claude-oh` 程序名、provider 参数和顶层命令。
- `claude-oh providers`：可检测本机 Claude、Codex、OpenCode CLI。
- `src/screens/REPL.tsx`：可在超时内完成动态导入，说明原先启动卡住的关键位置已恢复。

当前 `bunx tsc --noEmit` 仍会因为上游源码中已有的缺失类型、缺失模块和 TypeScript 6 兼容问题失败。这些错误不是多 CLI 接入代码新增的启动阻断。

**English**

Before upload, these checks were run:

- `bun test`: 23 tests passed.
- `claude-oh --help`: shows the `claude-oh` program name, provider options, and top-level commands.
- `claude-oh providers`: detects local Claude, Codex, and OpenCode CLIs.
- `src/screens/REPL.tsx`: imports within the timeout, which verifies the previously blocked startup area.

`bunx tsc --noEmit` still fails because the upstream source tree already contains missing types, missing modules, and TypeScript 6 compatibility issues. Those errors are not introduced by the multi-CLI startup integration.

## 11. Typical Workflows / 常见工作流

**中文**

使用自动多 CLI 模式：

```powershell
claude-oh --provider auto
```

强制使用 Codex：

```powershell
claude-oh --provider codex -p "Review this repository and list risky areas"
```

限制 auto 模式只使用两个 provider：

```powershell
claude-oh --provider auto --agent-providers "codex,claude"
```

在交互界面中运行多阶段审查：

```text
/clwb dual-review 检查 provider 路由和启动链路是否可靠
```

**English**

Use automatic multi-CLI mode:

```powershell
claude-oh --provider auto
```

Force Codex:

```powershell
claude-oh --provider codex -p "Review this repository and list risky areas"
```

Restrict auto mode to two providers:

```powershell
claude-oh --provider auto --agent-providers "codex,claude"
```

Run a multi-stage review inside the interactive UI:

```text
/clwb dual-review Check whether provider routing and startup are reliable
```

## 12. Relationship to the Upstream Project / 与上游项目的关系

**中文**

当前项目重新基于 `https://github.com/Housetan218/claude-code-haha` 克隆，然后只迁移多 CLI 相关模块和入口改动。这样做的原因是旧本地目录曾经缺失多个上游 UI 组件，导致 REPL 动态导入卡住，PowerShell 标题变化后界面没有继续显示 Claude 标志。

新的项目保留了上游 UI 组件和原始启动结构，同时增加 `claude-oh` 多 CLI 层。

**English**

This project was refreshed from `https://github.com/Housetan218/claude-code-haha`, then only the multi-CLI modules and entry-point changes were migrated. The reason is that the old local directory was missing several upstream UI components, which caused the REPL dynamic import to hang. PowerShell changed the title, but the Claude logo never rendered.

The new project keeps the upstream UI components and startup structure, then adds the `claude-oh` multi-CLI layer.
