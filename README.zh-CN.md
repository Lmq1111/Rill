<p align="center">
  <img src="docs/logo.svg" alt="Rill" width="640"/>
</p>

<p align="center">
  <a href="./README.md">English</a>
  &nbsp;·&nbsp;
  <strong>简体中文</strong>
  &nbsp;·&nbsp;
  <a href="./docs/GUIDE.zh-CN.md">指南</a>
  &nbsp;·&nbsp;
  <a href="./docs/SPEC.md">规格</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Lmq1111/Rill">代码仓库</a>
</p>

> [!IMPORTANT]
> **Rill 使用 Go 开发，主开发分支为 `main`。** Rill 的版本序列与本地数据命名空间均
> 独立于上游项目。**[转用 Rillagent](./docs/MIGRATING.md)** 说明了干净、隔离的配置方式；
> Rill 不会导入其他产品的本地数据。

<p align="center">
  <a href="https://github.com/Lmq1111/Rill/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Lmq1111/Rill/ci.yml?style=flat-square&label=ci&labelColor=161b22&logo=githubactions&logoColor=white" alt="CI"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-8b949e?style=flat-square&labelColor=161b22" alt="license"/></a>
  <a href="https://github.com/Lmq1111/Rill/stargazers"><img src="https://img.shields.io/github/stars/Lmq1111/Rill.svg?style=flat-square&color=dbab09&labelColor=161b22&logo=github&logoColor=white" alt="GitHub stars"/></a>
  <a href="https://github.com/Lmq1111/Rill/graphs/contributors"><img src="https://img.shields.io/github/contributors/Lmq1111/Rill.svg?style=flat-square&color=bc8cff&labelColor=161b22&logo=github&logoColor=white" alt="contributors"/></a>
  <a href="https://github.com/Lmq1111/Rill/discussions"><img src="https://img.shields.io/github/discussions/Lmq1111/Rill.svg?style=flat-square&color=58a6ff&labelColor=161b22&logo=github&logoColor=white" alt="Discussions"/></a>
</p>

<br/>

<h3 align="center">Rill — Let intelligence flow.</h3>
<p align="center">面向 macOS 与终端的本地优先 AI 编程工作台，覆盖真实项目、会话、文件、Git Diff、审批、自动化和可配置模型。</p>

<br/>

## 下载 Rill v0.1.0

Rill v0.1.0 首期仅提供 **macOS ARM64**（Apple 芯片）版本。请从
**[GitHub Releases](https://github.com/Lmq1111/Rill/releases)** 下载
`Rill-darwin-arm64.dmg` 和对应校验文件，并在两个文件所在目录执行：

```sh
shasum -a 256 -c Rill-darwin-arm64.dmg.sha256
```

打开 DMG 后，将 `Rill.app` 拖入 `/Applications`。首期版本只做
**ad-hoc 签名**，**未经过 Apple 公证**。如果 macOS 提示无法打开下载的应用，
请只对这个已安装应用移除隔离属性后重新启动：

```sh
xattr -dr com.apple.quarantine /Applications/Rill.app
open /Applications/Rill.app
```

桌面端、CLI 和本地历史默认使用 `~/.rillagent`；可通过
`RILLAGENT_HOME` 指向完全隔离的数据根目录。用户在 Rill 中保存的模型 API Key
会写入 `<Rillagent home>/.env`，该文件使用受限权限，**不写入 macOS Keychain**。
请将它视为凭据文件。Rill 不会导入其他产品的本地配置、凭据或对话数据。

本版本使用 MIT [LICENSE](./LICENSE)，上游归因见 [NOTICE](./NOTICE)。

## 特性

- **桌面工作台**：管理本地项目和真实会话，浏览文件与 Git Diff，引用精确片段，
  处理安全审批和模型提问，并在重启后恢复历史。
- **本地优先隐私边界**：Rill 使用独立数据命名空间，关闭继承的报告和自动更新
  外联，并支持经过凭据与私人路径脱敏的本地诊断导出。
- **配置驱动**：provider、agent、启用的工具、插件全部在 `rillagent.toml` 中声明，
  内核无硬编码模型。
- **多模型 · 可组合**：DeepSeek 作为预设内置；任何 OpenAI 兼容
  端点都只是一条配置。可选让两个模型协同（执行器 + 规划器），各自独立、缓存稳定的 session。
- **插件驱动**：外部工具以子进程形式运行，通过 stdio JSON-RPC 通信（MCP 兼容）；
  内置工具在编译期自注册。
- **缓存友好的上下文维护**：启动时注入稳定的环境摘要；旧工具输出会先 snip/prune，
  再进入摘要 compaction；内置工具 schema 合约有文档和回归测试保护。
- **单二进制构建**：`CGO_ENABLED=0` 生成独立 CLI；仓库可用一条命令在本地
  交叉编译六个目标平台。

## 从源码构建

```sh
git clone https://github.com/Lmq1111/Rill.git
cd Rill
make build
./bin/rillagent version             # Windows：.\bin\rillagent.exe version
```

## 快速开始

```sh
./bin/rillagent setup                # 管理用户配置中的 provider
./bin/rillagent setup --local        # 可选：管理 ./rillagent.toml
export DEEPSEEK_API_KEY=sk-...      # 也可以让 setup 保存到 Rill 全局 .env
./bin/rillagent                      # 然后在会话里运行 /init 生成 RILL.md（项目记忆）
./bin/rillagent run "把 main.go 里的 TODO 实现掉"
./bin/rillagent run --model deepseek-pro "给这个函数补单元测试"
echo "解释这段代码" | ./bin/rillagent run
```

## 配置

一个最小的 `rillagent.toml`——一个 provider 加一个默认模型——就够跑起来:

```toml
default_model = "deepseek-flash"

[[providers]]
name        = "deepseek-flash"
kind        = "openai"
base_url    = "https://api.deepseek.com"
model       = "deepseek-v4-flash"
api_key_env = "DEEPSEEK_API_KEY"
```

优先级为 **flag > `./rillagent.toml` > 用户配置文件 > 内置默认值**。用户配置位于
macOS/Linux 的 `~/.rillagent/config.toml`，Windows 为
`%AppData%\rillagent\config.toml`。数据隔离与完整路径约定见
**[配置路径](./docs/CONFIG_PATHS.zh-CN.md)**，其中也说明了全局 `config.toml`
和 `.env` 的完整结构。Provider 通过 `api_key_env` 命名密钥，真实密钥值保存在
CLI 与桌面端共用的 Rill 全局 `<Rillagent home>/.env`；项目 `.env` 不再作为
provider key 的运行时 fallback，但仍会作为当前 workspace 范围内的 MCP/plugin 非 provider `${VAR}` 展开来源，不导入 Rill 控制变量。权限、沙盒、插件(MCP)、
斜杠命令、`@` 引用与双模型设置,全部在 **[指南](./docs/GUIDE.zh-CN.md)** 里。

## 文档

- **[CLI 命令参考](./docs/CLI.zh-CN.md)** —— 交互与一次性命令、结构化输出、
  会话恢复、权限模式和可搜索选择器。
- **[指南](./docs/GUIDE.zh-CN.md)** —— 配置、权限与沙盒、插件(MCP)、斜杠命令、
  `@` 引用、双模型协同。
- **[子智能体 Profile](./docs/SUBAGENT_PROFILES.zh-CN.md)** —— 在桌面端或 CLI
  创建、共享、预览、运行、编辑和安全删除隔离智能体 Profile。
- **[能力诊断](./docs/CAPABILITY_DIAGNOSTICS.zh-CN.md)** ——
  `rillagent doctor capabilities`、桌面端 **设置 → 诊断**，以及内置 Skill
  `/rillagent-guide`，用于 skills / hooks / MCP / 插件排障。
- **[恢复与安全模式](./docs/RECOVERY.zh-CN.md)** —— Guard 诊断、配置快照、
  原生恢复、更新回滚和可选 AI 修复计划。
- **[机器人使用指南](./docs/BOT_GUIDE.zh-CN.md)** —— 桌面端连接飞书、Lark、微信
  Bot，以及 IM 里的审批、YOLO 和命令交互。
- **[规格](./docs/SPEC.md)** —— 工程契约:架构、registry、数据类型与路线图。
- **[任务合约与暂停策略](./docs/TASK_CONTRACT.zh-CN.md)** —— 用背景、输出边界、约束和暂停条件组织复杂请求。
- **[工具合约](./docs/TOOL_CONTRACT.zh-CN.md)** —— provider 可见的内置工具名、
  read-only 标记和 schema 快照保护。
- **[转用 Rillagent](./docs/MIGRATING.md)** —— 干净安装、隔离路径与经复核设置的手动转录。
- **[Checkpoints 与 rewind](./docs/CHECKPOINTS.md)** —— 基于快照的编辑安全网
  (Esc-Esc / `/rewind`)。

<br/>

## Star 趋势

<a href="https://www.star-history.com/?repos=Lmq1111%2FRill&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=Lmq1111/Rill&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=Lmq1111/Rill&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=Lmq1111/Rill&type=date&legend=top-left" />
 </picture>
</a>

<br/>

## 致谢

Rill 基于
[DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) 二次开发，保留
MIT 许可与上游归因。Rill 是独立项目，不代表上游官方产品。

下面这些朋友的工作塑造了 Rill 今天的样子 —— 当前按 commit 数统计的前 20 名贡献者。
完整贡献者列表在
[GitHub](https://github.com/Lmq1111/Rill/graphs/contributors?all=1)。

<!-- rillagent-top-contributors:start -->
| Contributor | Contributor | Contributor | Contributor |
| --- | --- | --- | --- |
| [**SivanCola**](https://github.com/SivanCola) | [**esengine**](https://github.com/esengine) | [**ttmouse**](https://github.com/ttmouse) | [**lifu963**](https://github.com/lifu963) |
| **rillagent**（anonymous） | [**HUQIANTAO**](https://github.com/HUQIANTAO) | [**GTC2080**](https://github.com/GTC2080) | [**light-front-theory**](https://github.com/light-front-theory) |
| **merge-order-check**（anonymous） | [**Li-Charles-One**](https://github.com/Li-Charles-One) | [**eghrhegpe**](https://github.com/eghrhegpe) | **wufengfan**（anonymous） |
| [**CVEngineer66**](https://github.com/CVEngineer66) | [**dependabot\[bot\]**](https://github.com/apps/dependabot) | [**lanshi17**](https://github.com/lanshi17) | [**SuMuxi66**](https://github.com/SuMuxi66) |
| [**CnsMaple**](https://github.com/CnsMaple) | [**cyq1017**](https://github.com/cyq1017) | [**JesonChou**](https://github.com/JesonChou) | [**XTLine**](https://github.com/XTLine) |
<!-- rillagent-top-contributors:end -->

<p align="center">
  <a href="https://github.com/Lmq1111/Rill/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Lmq1111/Rill&max=100&columns=12" alt="Lmq1111/Rill 贡献者" width="860"/>
  </a>
</p>

<br/>

---

<p align="center">
  <sub>MIT —— 见 <a href="./LICENSE">LICENSE</a></sub>
  <br/>
  <sub>由 <a href="https://github.com/Lmq1111/Rill/graphs/contributors">Lmq1111/Rill</a> 社区共建</sub>
</p>
