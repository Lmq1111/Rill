# 配置路径

Rill 使用一个用户可见的全局目录存放配置和用户状态。CLI 与桌面端共用这个目录。

## Rill Home

| 平台 | Rillagent home |
| --- | --- |
| macOS | `~/.rillagent` |
| Linux | `~/.rillagent` |
| Windows | `%APPDATA%\rillagent` |

可以设置 `RILLAGENT_HOME` 覆盖 Rillagent home，主要用于测试、CI 或便携安装。普通用户通常不需要设置。

设置 `RILLAGENT_HOME` 后，运行时会变成完整自包含模式：配置、状态、缓存和数据都会位于该目录树下。
Rill 不会扫描其他产品的 home，也不会把它们作为 fallback 路径。

高级测试或便携安装可以设置 `RILLAGENT_STATE_HOME` 来移动 sessions、archive、memory 等运行状态。
它不会移动全局配置或 provider 凭据；这些仍然位于 `RILLAGENT_HOME` 下。

## 运行时环境变量覆盖

以下进程级开关只覆盖本次运行对应的配置，不会改写任何配置文件：

| 变量 | 可选值与作用 |
| --- | --- |
| `RILLAGENT_THEME` | `auto`、`dark`、`light` 或 CLI 调色板名称；覆盖 CLI 明暗模式，或直接选择对应调色板。 |
| `RILLAGENT_THEME_STYLE` | `graphite`、`ember`、`aurora`、`midnight`、`sandstone`、`porcelain`、`linen` 或 `glacier`；当调色板与解析后的明暗模式一致时，覆盖 CLI 强调色。 |
| `RILLAGENT_CREDENTIALS_STORE` | `auto`、`keyring` 或 `file`；覆盖全局配置中的兼容选择项。当前 Rill 版本保存的 provider 密钥仍位于全局 `.env`。 |
| `RILLAGENT_SAFE_MODE` | `1`、`true`、`yes` 或 `on` 会为当前进程启用安全模式。安全模式忽略用户和项目运行时扩展，从内置默认值启动，但不会修改已保存设置。 |

旧产品的环境变量命名空间不会被用作 fallback，也会从 Rill 管理的子进程环境中移除。

## 目录内容

| 数据 | 路径 |
| --- | --- |
| 全局配置 | `<Rillagent home>/config.toml` |
| 全局 provider 凭据 | `<Rillagent home>/.env` |
| 全局斜杠命令 | `<Rillagent home>/commands/` |
| 全局 skills | `<Rillagent home>/skills/` |
| 全局 hooks | `<Rillagent home>/settings.json` |
| hooks 信任状态 | `<Rillagent home>/trust.json` |
| 会话 | `<state root>/sessions/` |
| 归档 | `<state root>/archive/` |
| 记忆 | `<state root>/memory/` 与 `<state root>/projects/` |

`<state root>` 默认等于 `<Rillagent home>`；只有设置 `RILLAGENT_STATE_HOME`
时才会不同。

全局用户配置文件名是 `config.toml`。项目本地配置文件仍叫 `rillagent.toml`。
如果有人说“全局 rillagent.toml”，通常指的是 `<Rillagent home>/config.toml`。

## 全局 `config.toml`

`<Rillagent home>/config.toml` 存放 CLI 与桌面端共用的非密钥配置。它可以包含
Rill 写入用户配置的 provider、plugin、UI、desktop、tool、skill、sandbox、
bot 和 agent 设置。Provider 条目只保存 `api_key_env` 里的凭据变量名，不保存真实密钥值。

已保存的 provider 与 bot 凭据变量不会进入任何由模型控制的子进程环境。Rill 的
文件读取工具、受沙盒保护的 shell 命令和 MCP server 也无法读取全局凭据 `.env`；
项目自身的普通 `.env` 可见性保持不变。Windows 的 shell 命令仍不具备 OS 级沙箱，
详见《使用指南》，因此只应为可信任务批准 shell 权限。

示例：

```toml
config_version = 1
default_model = "deepseek/deepseek-v4-flash"
language = "zh"
credentials_store = "auto"   # 旧兼容字段；provider key 保存在 .env

[ui]
theme = "auto"
cursor_shape = "underline"   # CLI/TUI 输入光标：underline|block|bar

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

不要把 API key 的真实值写进 `config.toml`。这个文件是普通配置：可以查看、编辑、
复制，也可以在常规脱敏后用于诊断。密钥值属于下面的全局 `.env`。

`[ui].cursor_shape` 只影响 CLI/TUI 的输入框。默认值 `underline` 用来避免终端块状光标在
CJK 双宽字符上造成视觉覆盖；如果偏好其它形状，可以设为 `block` 或 `bar`。

### 自定义 provider 的 `api_key_env` 命名

通过桌面端设置或 `rillagent setup` 添加自定义 provider 时，Rill 会把生成的
`api_key_env` 保存到 `config.toml`，并把真实密钥值写入全局 `.env` 中同名的 key。
生成结果是稳定的，因此同一个 provider 重启后仍会读取同一个凭据槽位。

Rill 会根据 provider 名称生成默认值。能规范化成 ASCII 的名称会得到可读的
env 名，例如 `LOCAL_GATEWAY_API_KEY`；如果名称全部由中文等非 ASCII 字符组成，则会
生成带稳定 hash 后缀的名称，例如 `CUSTOM_d39b9067_API_KEY`，避免多个中文 provider
都共用 `CUSTOM_API_KEY`。

CLI 的自定义 provider 向导会先根据 base URL 生成 provider 名称，再套用同一套
provider-name 规则。例如 `https://token.sensenova.cn/v1` 会生成 provider 名
`custom-token-sensenova-cn`，默认 key env 是 `CUSTOM_TOKEN_SENSENOVA_CN_API_KEY`。
直接回车会接受这个默认值；如果你确实想让多个 provider 共用一个凭据，也可以手动输入
`CUSTOM_API_KEY` 或其他自定义 env 名。

升级时不会自动改写已有配置。旧配置中已经使用 `CUSTOM_API_KEY` 的自定义 provider 会继续
读取这个 key。若多个旧自定义 provider 已经意外共用了 `CUSTOM_API_KEY`，需要手动把各自的
`api_key_env` 改成不同名称，并重新保存对应的 API key。

### 自定义 provider 的端点 URL

自定义 OpenAI-compatible provider 通常只需要在 `base_url` 中填写 API 端点。
Rill 会把聊天请求发送到 `base_url + "/chat/completions"`，并尝试 `/models`
和 `/v1/models` 等模型发现地址。如果网关给的是完整聊天请求 URL，可以设置
`chat_url`；Rill 会直接使用这个地址，不再追加 `/chat/completions`。如果模型
发现需要使用单独地址，可以设置 `models_url`。

## 全局 `.env`

`<Rillagent home>/.env` 是 Rill 保存的 provider API key 的唯一运行时来源。
setup 向导、桌面端设置页、CLI 缺 key 提示以及删除 provider key 的操作，都会通过同一套凭据 helper 读写这个文件。

结构：

```dotenv
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
# rillagent-cleared OLD_API_KEY
```

规则：

- 每行一个 `KEY=value`；
- 空行和 `#` 注释会被忽略；
- 读取时接受 `export KEY=value` 和带引号的值；
- Rill 写入时会拒绝多行值；
- key 必须是类似 `DEEPSEEK_API_KEY` 的 shell 风格变量名；
- `# rillagent-cleared KEY` 是删除 key 后写入的非密钥标记；
- 在操作系统支持的情况下，Rill 会用受限权限写入该文件。

Provider 请求只会从这个全局 `.env` 解析 key。项目 `.env`、home `.env`、继承的 shell
环境变量、其他产品的凭据文件和系统 keyring 都不作为运行时 provider key fallback，也不会导入到全局凭据文件。
项目 `.env` 仍会作为当前 workspace 范围内的非 provider 变量展开来源，例如 MCP/plugin 的 env、headers、URL、command 和 args 中的 `${VAR}`；这些值不会写入进程环境，`RILLAGENT_HOME`、`RILLAGENT_STATE_HOME`、`XDG_CONFIG_HOME` 等 Rill 控制变量也会被忽略。

缓存仍放在系统缓存目录，例如 macOS 的 `~/Library/Caches/rillagent`、
Linux 的 `$XDG_CACHE_HOME/rillagent` 或 `~/.cache/rillagent`、Windows 的
`%LOCALAPPDATA%\rillagent\cache`。可以设置 `RILLAGENT_CACHE_HOME` 覆盖缓存根目录。
设置 `RILLAGENT_HOME` 后，缓存会放在 `$RILLAGENT_HOME/cache`；如果同时设置
`RILLAGENT_CACHE_HOME`，后者优先。

## 配置优先级

运行时配置按下面顺序解析：

```text
命令行参数
> 项目 ./rillagent.toml
> 全局 <Rillagent home>/config.toml
> 内置默认值
```

写配置时始终写入新的全局路径：

```text
macOS/Linux: ~/.rillagent/config.toml
Windows:     %APPDATA%\rillagent\config.toml
```

## 数据隔离

Rill 使用独立的 home 与项目命名空间，不会扫描、读取、复制或转换 Reasonix、LDagent
或其他产品的配置、凭据、会话、记忆、插件与信任记录，也不提供旧数据导入命令。

请使用 `rillagent setup` 重新建立设置，或直接编辑
`~/.rillagent/config.toml`。Provider 密钥放在 `~/.rillagent/.env`；把第三方插件或
MCP 配置加入 `rillagent.toml` 前，请先重新检查其来源与权限。
