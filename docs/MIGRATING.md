# Moving to Rillagent

Rill is an independent product with its own CLI, configuration, and user-data
namespace. It does not read, migrate, or write Reasonix or LDagent data. Start
Rillagent with a clean Rill configuration and bring over only the settings or
project instructions you have reviewed.

## Build Rillagent

```sh
git clone https://github.com/Lmq1111/Rill.git
cd Rill
make build
./bin/rillagent version
```

## Rill Paths

Rillagent uses only the Rill namespace:

| Purpose | Path |
| --- | --- |
| User home on macOS/Linux | `~/.rillagent/` |
| User home on Windows | `%APPDATA%\rillagent\` |
| User configuration | `~/.rillagent/config.toml` |
| Provider credentials | `~/.rillagent/.env` |
| Project configuration | `./rillagent.toml` |
| Project commands | `./.rillagent/commands/` |

Use `RILLAGENT_HOME`, `RILLAGENT_STATE_HOME`, or `RILLAGENT_CACHE_HOME` for an
explicit test, portable, or isolated location. See
[Configuration paths](./CONFIG_PATHS.md) for the complete path contract.

## Recreate Settings Deliberately

Use `./bin/rillagent setup` for user-level providers or
`./bin/rillagent setup --local` for
the current project's `rillagent.toml`. Do not copy provider secrets into TOML;
save them through setup or place them in `~/.rillagent/.env`.

For MCP servers, add reviewed entries to `rillagent.toml`. Rill can also read a
Claude Code-compatible `.mcp.json` from the project root. Reapprove plugins,
hooks, and MCP servers in Rill instead of copying another product's trust
receipts.

Project instructions can be reviewed and copied into `RILL.md`, `AGENTS.md`, or
`CLAUDE.md`. Do not copy session databases, caches, updater state, plugin
receipts, or credential stores from another product into `~/.rillagent/`.

## Upstream Heritage

Rill is based on
[DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) and retains
the upstream MIT license and attribution. That source relationship does not
create local data compatibility: Rill keeps its configuration and state
isolated under the Rill namespace.

Questions about Rill belong in the
[Rill repository](https://github.com/Lmq1111/Rill/discussions).
