# Configuration Paths

Rill uses one user-facing home directory for global configuration and
user-owned state. CLI and desktop share this location.

## Rill Home

| Platform | Rillagent home |
| --- | --- |
| macOS | `~/.rillagent` |
| Linux | `~/.rillagent` |
| Windows | `%APPDATA%\rillagent` |

Set `RILLAGENT_HOME` to override Rillagent home for tests, CI, or portable
installations. Normal users should not need it.

When `RILLAGENT_HOME` is set, the runtime is fully self-contained: all
configuration, state, cache, and data live under that directory tree. Rill does
not scan other products' home directories or use them as fallback paths.

Advanced test and portable setups may set `RILLAGENT_STATE_HOME` to move runtime
state such as sessions, archives, and memory. It does not move global config or
provider credentials: those remain under `RILLAGENT_HOME`.

## Runtime Environment Overrides

The following process-local switches override the corresponding configuration
for one run and do not rewrite any config file:

| Variable | Accepted values and effect |
| --- | --- |
| `RILLAGENT_THEME` | `auto`, `dark`, `light`, or a CLI palette name; overrides the CLI color mode or selects that palette. |
| `RILLAGENT_THEME_STYLE` | `graphite`, `ember`, `aurora`, `midnight`, `sandstone`, `porcelain`, `linen`, or `glacier`; overrides the CLI accent palette when it matches the resolved light/dark mode. |
| `RILLAGENT_CREDENTIALS_STORE` | `auto`, `keyring`, or `file`; overrides the compatibility selector in global config. Provider secrets saved by current Rill builds still live in the global `.env`. |
| `RILLAGENT_SAFE_MODE` | `1`, `true`, `yes`, or `on` enables Safe Mode for this process. Safe Mode ignores user/project runtime extensions and boots from built-in defaults without changing saved settings. |

Retired product environment namespaces are never used as fallback values and
are removed from Rill-managed child-process environments.

## What Lives There

| Data | Path |
| --- | --- |
| Global config | `<Rillagent home>/config.toml` |
| Global provider credentials | `<Rillagent home>/.env` |
| Global slash commands | `<Rillagent home>/commands/` |
| Global skills | `<Rillagent home>/skills/` |
| Global hooks | `<Rillagent home>/settings.json` |
| Hook trust store | `<Rillagent home>/trust.json` |
| Sessions | `<state root>/sessions/` |
| Archives | `<state root>/archive/` |
| Memory | `<state root>/memory/` and `<state root>/projects/` |

`<state root>` defaults to `<Rillagent home>`. It only differs when
`RILLAGENT_STATE_HOME` is set.

The global user config is named `config.toml`. Project-local config files keep
the name `rillagent.toml`. If someone says "global rillagent.toml", they usually
mean `<Rillagent home>/config.toml`.

## Global `config.toml`

`<Rillagent home>/config.toml` stores non-secret configuration shared by the CLI
and desktop app. It may contain the same provider, plugin, UI, desktop, tool,
skill, sandbox, bot, and agent settings that Rill renders into user config.
Provider entries store the name of the credential variable in `api_key_env`, not
the secret value.

Saved provider and bot credential variables are removed from every
model-controlled child-process environment. The global credential `.env` is
also hidden from Rill's file readers, sandboxed shell commands, and MCP
servers; this does not change the visibility of a project's ordinary `.env`.
On Windows, shell commands remain outside an OS sandbox as documented in the
Guide, so approve shell access only for trusted tasks.

Example:

```toml
config_version = 1
default_model = "deepseek/deepseek-v4-flash"
language = "zh"
credentials_store = "auto"   # legacy compatibility; provider keys are in .env

[ui]
theme = "auto"
cursor_shape = "underline"   # CLI/TUI text cursor: underline|block|bar

[desktop]
provider_access = ["deepseek"]

[agent]
auto_plan = "off"

[[providers]]
name        = "deepseek"
kind        = "openai"
base_url    = "https://api.deepseek.com"
models      = ["deepseek-v4-flash", "deepseek-v4-pro"]
default     = "deepseek-v4-flash"
api_key_env = "DEEPSEEK_API_KEY"

[[plugins]]
name    = "example"
command = "example-mcp-server"
```

Do not put API key values in `config.toml`. This file is regular configuration:
it is safe to inspect, edit, copy, and include in diagnostics after standard
redaction. Secrets belong in the global `.env` below.

`[ui].cursor_shape` affects only the CLI/TUI composer. The default `underline`
avoids terminal block-cursor artifacts with double-width CJK characters; use
`block` or `bar` if you prefer those cursor shapes.

### Custom provider `api_key_env` names

When a custom provider is added from the desktop settings or `rillagent setup`,
Rill stores a generated `api_key_env` in `config.toml` and writes the secret
value to the matching key in the global `.env`. The generated name is stable, so
the same provider keeps using the same credential slot after restart.

Rill derives the default from the provider name. Names that normalize to
ASCII keep readable env names such as `LOCAL_GATEWAY_API_KEY`; names made
entirely of non-ASCII characters get a stable hash suffix such as
`CUSTOM_d39b9067_API_KEY` so two Chinese provider names do not share
`CUSTOM_API_KEY`.

In the CLI custom-provider wizard, the provider name is generated from the base
URL first, then the same provider-name rule is applied. For example
`https://token.sensenova.cn/v1` creates provider name
`custom-token-sensenova-cn`, whose default key env is
`CUSTOM_TOKEN_SENSENOVA_CN_API_KEY`. Press Enter to accept that default, or type
an explicit env name such as `CUSTOM_API_KEY` if you intentionally want to share
one credential across providers.

Existing configs are not rewritten on upgrade. If an old custom provider already
uses `CUSTOM_API_KEY`, it will keep working with that key. If several old custom
providers accidentally share `CUSTOM_API_KEY`, edit each provider's
`api_key_env` to a distinct name and save the corresponding API key again.

### Custom provider endpoint URLs

Custom OpenAI-compatible providers normally store an API endpoint in `base_url`.
Rill sends chat requests to `base_url + "/chat/completions"` and probes model
discovery candidates such as `/models` and `/v1/models`. If a gateway gives you a
complete chat request URL, set `chat_url`; Rill will use it directly and will
not append `/chat/completions`. If model discovery needs a separate address, set
`models_url`.

If a gateway requires vendor-specific top-level request body fields, set
`extra_body`, for example `extra_body = { enable_thinking = true }`. These values
are merged into the OpenAI-compatible chat JSON request body without allowing
core fields such as `model`, `messages`, `tools`, or `stream` to be overridden.

## Global `.env`

`<Rillagent home>/.env` is the single runtime source for provider API keys saved
by Rill. The setup wizard, desktop settings, CLI missing-key prompts, and
provider-key delete actions all read or write this file through the same
credential helpers.

Structure:

```dotenv
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
# rillagent-cleared OLD_API_KEY
```

Rules:

- one `KEY=value` assignment per line;
- blank lines and `#` comments are ignored;
- `export KEY=value` and quoted values are accepted when reading;
- multiline values are rejected by Rill writes;
- keys must use shell-style names such as `DEEPSEEK_API_KEY`;
- `# rillagent-cleared KEY` comments are non-secret tombstones written after a key
  is deleted;
- Rill writes this file with restricted permissions where the OS supports
  them.

For provider requests, Rill resolves only this global `.env`. Project `.env`
files, home `.env` files, inherited shell environment variables, other
products' credential files, and the OS keyring do not act as runtime
provider-key fallbacks and are not imported into the global credentials file.
Project `.env` files are still read as
workspace-scoped, non-provider expansion sources for `${VAR}` references in
MCP/plugin env, headers, URLs, commands, and args; those values are not written
into the process environment, and Rill control variables such as
`RILLAGENT_HOME`, `RILLAGENT_STATE_HOME`, and `XDG_CONFIG_HOME` are ignored there.

Caches remain in the OS cache directory, for example
`~/Library/Caches/rillagent` on macOS, `$XDG_CACHE_HOME/rillagent` or
`~/.cache/rillagent` on Linux, and `%LOCALAPPDATA%\rillagent\cache` on Windows.
Set `RILLAGENT_CACHE_HOME` to override the cache root. When `RILLAGENT_HOME` is
set, the cache is placed under `$RILLAGENT_HOME/cache` (unless
`RILLAGENT_CACHE_HOME` is also set, which takes precedence).

## Config Priority

Runtime configuration is resolved in this order:

```text
command-line flags
> project ./rillagent.toml
> global <Rillagent home>/config.toml
> built-in defaults
```

Writes always target the new global path:

```text
macOS/Linux: ~/.rillagent/config.toml
Windows:     %APPDATA%\rillagent\config.toml
```

## Data Isolation

Rill starts with an independent home and project namespace. It does not scan,
read, copy, or convert configuration, credentials, sessions, memory, plugins,
or trust records from Reasonix, LDagent, or another product. Rill also has no
legacy data-import command.

Recreate settings with `rillagent setup` or edit
`~/.rillagent/config.toml` directly. Keep provider secrets in
`~/.rillagent/.env`, and review third-party plugin or MCP configuration before
adding it to `rillagent.toml`.
