# claude-oh PowerShell startup

`claude-oh` is the PowerShell-friendly entrypoint for the multi CLI agent runtime.
It shares the same project and TUI as `claude-haha`, but defaults to automatic
agent allocation across Claude CLI, Codex CLI, and OpenCode CLI.

## Install locally

From the project root:

```powershell
npm install
npm install -g .
```

After global installation, this works from any PowerShell directory:

```powershell
claude-oh
```

## Common commands

```powershell
claude-oh --help
claude-oh providers
claude-oh -p "Reply with exactly OK"
claude-oh --provider codex -p "Review this repository"
claude-oh --provider opencode -p "Plan the next change"
claude-oh --provider auto -p "Modify code and run tests"
```

## Provider selection

The default `claude-oh` provider is `auto`.

Manual provider selection:

```powershell
claude-oh --provider anthropic
claude-oh --provider claude
claude-oh --provider codex
claude-oh --provider opencode
```

Environment variables:

```powershell
$env:CLAUDE_HAHA_PROVIDER = "auto"
$env:CLAUDE_HAHA_PROVIDER_MODEL = "minimax/MiniMax-M2.7"
$env:CLAUDE_HAHA_AGENT_PROVIDERS = "claude,codex,opencode"
claude-oh
```

## Recovery CLI

If the full Ink TUI cannot start, force the readline recovery CLI:

```powershell
$env:CLAUDE_CODE_FORCE_RECOVERY_CLI = "1"
claude-oh
```

## Relationship to claude-haha

`claude-haha` remains the compatibility command and keeps the original Anthropic
API path unless a provider is explicitly configured.

`claude-oh` is the new main command for the multi CLI agent workflow. It starts
the same app, but sets the default provider mode to `auto`.

## Troubleshooting

If PowerShell cannot find `claude-oh`, check the global npm bin directory:

```powershell
npm bin -g
```

If the app cannot start, make sure Bun is installed and available:

```powershell
bun --version
```

If provider diagnostics show a missing tool, install or fix the corresponding
external CLI first:

```powershell
claude --version
codex --version
opencode --version
```
