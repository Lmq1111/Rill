# Rillagent data-isolation boundary

## Public namespace

| Surface | Rill value |
| --- | --- |
| User home | `~/.rillagent` |
| Project config | `./rillagent.toml` |
| Project commands | `./.rillagent/commands/` |
| Project memory | `RILL.md` and optional ignored `RILL.local.md` |
| Built-in guide | `/rillagent-guide` |
| Home override | `RILLAGENT_HOME` |
| State override | `RILLAGENT_STATE_HOME` |
| Cache override | `RILLAGENT_CACHE_HOME` |

All other public process controls use the `RILLAGENT_*` prefix. The four
runtime controls that previously lacked public documentation — theme, theme
style, credential-store selector, and Safe Mode — are now documented in both
configuration-path guides.

## Retired namespace rejection

Rill does not use retired product variables as fallback values. The release
binaries clear both retired prefixes before configuration is read:

- `cmd/rillagent`
- `cmd/rill-guard`
- `desktop`

The common subprocess environment builder always removes those prefixes. MCP,
Hook, LSP, and environment-probe explicit overrides are filtered again after
merge, preventing configuration from reintroducing a retired control variable.
The parent-process cleanup also protects production subprocesses that
intentionally inherit the parent environment, including Guard-to-Desktop,
workspace Git commands, and user shell commands.

This is a release-binary boundary, not a claim that arbitrary external programs
which import an internal package automatically sanitize their own process.

## No migration or compatibility reads

- Legacy agent and configuration migration implementations were removed.
- Global and project loading has no fallback to another product home, state,
  cache, config, credential, session, memory, plugin, command, hook, or trust path.
- `setup --local` writes only `rillagent.toml`.
- Project command discovery reads only `.rillagent/commands/` for the Rill convention.
- The signed, read-only upstream MCP catalog is accessed only through the
  explicit catalog client, never through a legacy user-directory compatibility path.

The full Go suite includes temporary-HOME negative tests with old homes, project
configs, environment variables, sessions, commands, hooks, skills, credentials,
and migration fixtures present. Those tests passed without touching the real
user home.
