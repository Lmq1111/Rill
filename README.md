<p align="center">
  <img src="docs/logo.svg" alt="Rill" width="640"/>
</p>

<p align="center">
  <strong>English</strong>
  &nbsp;·&nbsp;
  <a href="./README.zh-CN.md">简体中文</a>
  &nbsp;·&nbsp;
  <a href="./docs/GUIDE.md">Guide</a>
  &nbsp;·&nbsp;
  <a href="./docs/SPEC.md">Spec</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Lmq1111/Rill">Repository</a>
</p>

> [!IMPORTANT]
> **Rill is developed in Go on the `main` branch.** Its release series and local
> data namespace are independent from the upstream project. See
> **[Moving to Rillagent](./docs/MIGRATING.md)** for the clean, isolated setup;
> Rill does not import another product's local data.

<p align="center">
  <a href="https://github.com/Lmq1111/Rill/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Lmq1111/Rill/ci.yml?style=flat-square&label=ci&labelColor=161b22&logo=githubactions&logoColor=white" alt="CI"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-8b949e?style=flat-square&labelColor=161b22" alt="license"/></a>
  <a href="https://github.com/Lmq1111/Rill/stargazers"><img src="https://img.shields.io/github/stars/Lmq1111/Rill.svg?style=flat-square&color=dbab09&labelColor=161b22&logo=github&logoColor=white" alt="GitHub stars"/></a>
  <a href="https://github.com/Lmq1111/Rill/graphs/contributors"><img src="https://img.shields.io/github/contributors/Lmq1111/Rill.svg?style=flat-square&color=bc8cff&labelColor=161b22&logo=github&logoColor=white" alt="contributors"/></a>
  <a href="https://github.com/Lmq1111/Rill/discussions"><img src="https://img.shields.io/github/discussions/Lmq1111/Rill.svg?style=flat-square&color=58a6ff&labelColor=161b22&logo=github&logoColor=white" alt="Discussions"/></a>
</p>

<br/>

<h3 align="center">Rill — Let intelligence flow.</h3>
<p align="center">A local-first AI coding workbench for macOS and the terminal, with live projects, sessions, files, Git diffs, approvals, automation, and configurable model providers.</p>

<br/>

## Download Rill v0.1.0

Rill v0.1.0 is available for **macOS ARM64** (Apple silicon). Download
`Rill-darwin-arm64.dmg` and its checksum from
**[GitHub Releases](https://github.com/Lmq1111/Rill/releases)**, then verify the
download from the directory containing both files:

```sh
shasum -a 256 -c Rill-darwin-arm64.dmg.sha256
```

Open the DMG and drag `Rill.app` to `/Applications`. The first release is
**ad-hoc signed** and **not notarized** by Apple. If macOS reports that the
download cannot be opened, remove quarantine from this exact installed app and
launch it again:

```sh
xattr -dr com.apple.quarantine /Applications/Rill.app
open /Applications/Rill.app
```

The desktop app, CLI, and local history use `~/.rillagent` by default;
`RILLAGENT_HOME` selects an isolated root. Provider API keys saved by Rill are
written to the restricted-permission `<Rillagent home>/.env`, not the macOS Keychain.
Treat that file as a credential. Rill does not import another
product's local configuration, credentials, or conversation data.

The release includes the MIT [LICENSE](./LICENSE) and upstream attribution in
[NOTICE](./NOTICE).

## Features

- **Desktop workbench.** Manage local projects and sessions, inspect real files
  and Git diffs, attach exact selections, approve protected actions, answer
  model questions, and resume history after restart.
- **Local-first privacy boundary.** Rill keeps its own data namespace, disables
  inherited reporting and automatic-update traffic, and exports diagnostics
  locally with credential and private-path redaction.
- **Config-driven.** Providers, the agent, enabled tools, and plugins are all
  declared in `rillagent.toml`. No hardcoded models.
- **Multi-model & composable.** DeepSeek ships as a preset; any
  OpenAI-compatible endpoint is a config entry, not new code. Optionally run
  two models together (executor + planner) in separate, cache-stable sessions.
- **Plugin-driven.** External tools run as subprocesses over stdio JSON-RPC
  (MCP-compatible). Built-in tools self-register at compile time.
- **Cache-aware context maintenance.** Startup injects a small stable environment
  summary, stale tool output is snipped/pruned before summary compaction, and the
  built-in tool schema contract is documented for regression review.
- **Single-binary build.** `CGO_ENABLED=0` produces a standalone CLI; the
  repository can cross-compile six local targets with one command.

## Build from source

```sh
git clone https://github.com/Lmq1111/Rill.git
cd Rill
make build
./bin/rillagent version             # Windows: .\bin\rillagent.exe version
```

## Quick start

```sh
./bin/rillagent setup                # manage providers in the user config
./bin/rillagent setup --local        # optional: manage ./rillagent.toml
export DEEPSEEK_API_KEY=sk-...      # or let setup save it to Rill home .env
./bin/rillagent                      # then run /init to generate RILL.md (project memory)
./bin/rillagent run "implement the TODOs in main.go"
./bin/rillagent run --model deepseek-pro "add unit tests for this function"
echo "explain this code" | ./bin/rillagent run
```

## Configuration

A minimal `rillagent.toml` — one provider and a default model — is enough to start:

```toml
default_model = "deepseek-flash"

[[providers]]
name        = "deepseek-flash"
kind        = "openai"
base_url    = "https://api.deepseek.com"
model       = "deepseek-v4-flash"
api_key_env = "DEEPSEEK_API_KEY"
```

Resolution order is **flag > `./rillagent.toml` > the user config file >
built-in defaults**. The user file lives at
`~/.rillagent/config.toml` on macOS/Linux and
`%AppData%\rillagent\config.toml` on Windows. See
**[Configuration paths](./docs/CONFIG_PATHS.md)** for the data-isolation contract and the
full `config.toml` / `.env` structure. Provider entries name secrets with
`api_key_env`; the secret values themselves live in Rill's global
`<Rillagent home>/.env`, shared by CLI and desktop. Project `.env` files are not
provider-key runtime fallbacks, but still feed workspace-scoped, non-provider
`${VAR}` expansion for MCP/plugin settings without importing Rill control
variables. Permissions, the sandbox, plugins (MCP), slash
commands, `@` references, and two-model setup are all in the
**[Guide](./docs/GUIDE.md)**.

## Documentation

- **[CLI reference](./docs/CLI.md)** — interactive and one-shot commands,
  structured output, resume, permission modes, and searchable pickers.
- **[Guide](./docs/GUIDE.md)** — configuration, permissions & sandbox, plugins
  (MCP), slash commands, `@` references, two-model collaboration.
- **[Subagent profiles](./docs/SUBAGENT_PROFILES.md)** — create, share, preview,
  run, edit, and safely delete isolated agent profiles from desktop or CLI.
- **[Capability diagnostics](./docs/CAPABILITY_DIAGNOSTICS.md)** —
  `rillagent doctor capabilities`, desktop Settings → Diagnostics, and the
  `/rillagent-guide` skill for skills/hooks/MCP/plugin troubleshooting.
- **[Recovery and Safe Mode](./docs/RECOVERY.md)** — Guard diagnostics,
  configuration snapshots, native recovery, update rollback, and optional
  AI-assisted repair plans.
- **[Bot guide](./docs/BOT_GUIDE.md)** — connect Feishu, Lark, and WeChat bots
  from the desktop app, then use approvals, YOLO, and commands from IM.
- **[Spec](./docs/SPEC.md)** — engineering contract: architecture, registries,
  data types, and roadmap.
- **[Task contracts & pause policy](./docs/TASK_CONTRACT.md)** — structure
  complex requests with context, output boundaries, constraints, and when to ask.
- **[Tool contract](./docs/TOOL_CONTRACT.md)** — provider-visible built-in tool
  names, read-only flags, and schema snapshot guard.
- **[Moving to Rillagent](./docs/MIGRATING.md)** — clean setup, isolated paths,
  and deliberate transfer of reviewed settings.
- **[Checkpoints & rewind](./docs/CHECKPOINTS.md)** — the snapshot-based edit
  safety net (Esc-Esc / `/rewind`).

<br/>

## Star History

<a href="https://www.star-history.com/?repos=Lmq1111%2FRill&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=Lmq1111/Rill&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=Lmq1111/Rill&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=Lmq1111/Rill&type=date&legend=top-left" />
 </picture>
</a>

<br/>

## Acknowledgments

Rill is based on
[DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) and retains
its MIT license and upstream attribution. Rill is an independent project and is
not an official upstream product.

A small list of folks whose work has shaped Rill the most — the current top
20 contributors by commit count. The full contributor graph is on
[GitHub](https://github.com/Lmq1111/Rill/graphs/contributors?all=1).

<!-- rillagent-top-contributors:start -->
| Contributor | Contributor | Contributor | Contributor |
| --- | --- | --- | --- |
| [**SivanCola**](https://github.com/SivanCola) | [**esengine**](https://github.com/esengine) | [**ttmouse**](https://github.com/ttmouse) | [**lifu963**](https://github.com/lifu963) |
| **rillagent** (anonymous) | [**HUQIANTAO**](https://github.com/HUQIANTAO) | [**GTC2080**](https://github.com/GTC2080) | [**light-front-theory**](https://github.com/light-front-theory) |
| **merge-order-check** (anonymous) | [**Li-Charles-One**](https://github.com/Li-Charles-One) | [**eghrhegpe**](https://github.com/eghrhegpe) | **wufengfan** (anonymous) |
| [**CVEngineer66**](https://github.com/CVEngineer66) | [**dependabot\[bot\]**](https://github.com/apps/dependabot) | [**lanshi17**](https://github.com/lanshi17) | [**SuMuxi66**](https://github.com/SuMuxi66) |
| [**CnsMaple**](https://github.com/CnsMaple) | [**cyq1017**](https://github.com/cyq1017) | [**JesonChou**](https://github.com/JesonChou) | [**XTLine**](https://github.com/XTLine) |
<!-- rillagent-top-contributors:end -->

<p align="center">
  <a href="https://github.com/Lmq1111/Rill/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Lmq1111/Rill&max=100&columns=12" alt="Contributors to Lmq1111/Rill" width="860"/>
  </a>
</p>

<br/>

---

<p align="center">
  <sub>MIT — see <a href="./LICENSE">LICENSE</a></sub>
  <br/>
  <sub>Built by the community at <a href="https://github.com/Lmq1111/Rill/graphs/contributors">Lmq1111/Rill</a></sub>
</p>
