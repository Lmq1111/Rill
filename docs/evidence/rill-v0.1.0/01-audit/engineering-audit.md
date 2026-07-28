# Rill v0.1.0 阶段一工程审计

## 1. 审计结论

- 上游基线已锁定为 `9b54b9f8937b9878d9052833bff4ab99ba7638de`。2026-07-17 重新执行 `git ls-remote`，远端 `main-v2` 仍为同一 SHA，没有静默漂移。
- 当前仓库保留完整上游历史，根模块为 `reasonix`，桌面端为独立嵌套模块 `reasonix/desktop`。
- Figma 24 页与关键状态已经冻结；页面和后端能力的对应关系见 `figma-coverage.md`。
- 目标文档写“上游 17 个工作流”，锁定提交实际存在 **19 个**。本报告按实际文件逐个审计，阶段二只保留并替换 `ci.yml`，删除其余 18 个。
- 上游桌面端的更新检查、启动 Ping 和聚合指标默认开启；崩溃报告还存在显式提交和下一次启动自动补发两条路径，均不满足 Rill 隐私边界。
- `.reasonix`、`reasonix.toml`、`REASONIX_*` 的生产代码扫描结果已保存；阶段三必须建立 Rillagent 独立路径并禁止旧数据回退或迁移。
- Figma 原型内 7 个 P0 已定位。阶段一只记录，不修改原型或产品代码。

## 2. 基线与工具链

| 项目 | 锁定事实 | 证据/影响 |
|---|---|---|
| 上游 | `esengine/DeepSeek-Reasonix`，分支 `main-v2` | `git ls-remote` 与本地 HEAD 均为 `9b54b9f8937b9878d9052833bff4ab99ba7638de` |
| 根 Go module | `module reasonix` | `go.mod:1`；内部 import 路径按总方案暂不改名 |
| Go 声明 | `go 1.25.0`，`toolchain go1.26.5` | 根模块及 `desktop/go.mod` 一致 |
| 桌面 module | `module reasonix/desktop` | `desktop/go.mod:1`；根模块的 `go test ./...` 不覆盖此嵌套模块 |
| Wails | `github.com/wailsapp/wails/v2 v2.12.0` | `desktop/go.mod` |
| 前端 | React `^19.2.7`、TypeScript `^6.0.3`、Vite `^8.0.16`、Zustand `^5.0.14` | `desktop/frontend/package.json` |
| 包管理 | 上游前端有 `pnpm-lock.yaml`；阶段二固定 pnpm 10 | 审计机当前 pnpm `11.9.0`，不能作为 CI 版本依据 |
| 本机 Node | `v25.9.0` | 仅为审计环境；CI 使用显式版本 |
| 本机 Go | PATH 中不存在 | 阶段二必须由 `actions/setup-go` 提供声明 toolchain，不能把本机缺失误判为源码失败 |
| 本机 Wails / create-dmg | 未安装 | 阶段二不构建安装包；后续阶段按计划安装 |
| Git / GitHub CLI | Git `2.50.1`，GitHub CLI `2.92.0` | GitHub 身份另行验证为 `Lmq1111` |

## 3. 构建入口与测试边界

| 范围 | 入口/命令 | 审计结论 |
|---|---|---|
| CLI | `cmd/reasonix/main.go` | 阶段二仍构建 `./cmd/reasonix`；`cmd/rillagent` 属于阶段三，禁止提前创建 |
| Guard | `cmd/reasonix-guard/` | 后续品牌阶段改产物名；阶段一、二不动 |
| 桌面 | `desktop/main.go`、`desktop/wails.json` | 独立 Go module；Wails 绑定对象为 `App` |
| 前端入口 | `desktop/frontend/src/main.tsx`、`App.tsx` | 当前上游界面不是 Figma 24 页，需要阶段四以后替换展示层 |
| 前后端缝 | `desktop/frontend/src/lib/bridge.ts` | 手写 `AppBindings` 对应 Wails `window.go.main.App.*`；后续页面应复用该缝而不是从组件散接全局对象 |
| 根检查 | `gofmt`、`go vet ./...`、`go test ./...`、`go build ./cmd/reasonix` | 阶段二 CI 必须执行 |
| 桌面检查 | `(cd desktop && go test ./...)` | 必须单独执行，根 module 不包含桌面 |
| 前端检查 | `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm test:all`、`pnpm build` | 工作目录 `desktop/frontend` |

## 4. 领域代码映射

| 领域 | 上游主要实现 | 可复用能力 | 后续工作 |
|---|---|---|---|
| CLI 与帮助 | `cmd/reasonix/`、`internal/cli/`、`internal/i18n/` | 命令解析、TUI、setup/doctor/upgrade、国际化 | 阶段三建立 `cmd/rillagent` 和统一品牌常量；保留内部 module 路径 |
| 配置与路径 | `internal/config/paths.go`、`load.go`、`edit.go`、`migrate.go`、`credentials.go`、`mcpjson.go` | TOML、凭证、项目配置、MCP 合并、状态目录 | 阶段三切换到 Rillagent 路径并删除 Reasonix/LDagent 回退与迁移 |
| 桌面壳 | `desktop/main.go`、`app.go`、`menu.go`、`tray.go`、`window_state.go`、`wails.json` | Wails 生命周期、原生菜单、托盘、窗口状态 | 阶段三替换产品标识；阶段四接 Figma 壳 |
| 项目与标签页 | `desktop/tabs.go`、`workspace.go`、`workspace_changes.go`；前端 `ProjectTree`、`TabBar`、`WorkspacePanel` | 项目树、标签页、工作区文件与 Diff | 阶段四/五用 Figma 结构包裹现有状态与绑定 |
| 会话与历史 | `desktop/app.go` 的 session bindings、`sessions.go`；前端 `HistoryPanel`、`Transcript`、`useController` | 列表、预览、恢复、重命名、回收、消息流 | 阶段五/六接入 Figma 工作台、历史和回收站 |
| 对话控制 | `Submit/Steer/Cancel/Approve/AnswerQuestion` 及 `*ForTab`；`useController.ts` | 真实模型对话、运行中 steer、审批、问题回答 | 阶段五接线并修复 Figma P0，不重写内核 |
| 自动化 | `desktop/heartbeat.go` 与 `HeartbeatList/Save/TriggerNow/GenerateID` | 定时任务持久化和立即执行 | 阶段六接 Figma 自动化页，使用真实 ID 与会话策略 |
| 模型与设置 | `desktop/settings_app.go`、`SettingsPanel.tsx` | Provider、模型、权限、沙箱、网络、桌面偏好 | 阶段六拆成 Figma 的 16 个设置页 |
| MCP/技能/插件 | `internal/mcpcatalog/`、`desktop/app.go` 相关绑定、`plugin_packages_app.go` | MCP CRUD/信任、Skill 路径、插件包 | 阶段六重做展示层；MCP 目录按唯一白名单保留 |
| 子智能体 | `desktop/subagents_app.go`、`SubagentsPanel.tsx` | Profile CRUD、模型/推理、试运行 | 阶段六接 Figma 页面 |
| 记忆 | `internal/memory/`、`memorycompiler/`、`desktop/memory_suggestions*.go`、`MemoryPanel.tsx` | 全局/项目记忆与建议 | 先完成阶段三数据隔离，再在阶段六接 UI |
| Hooks | `internal/hook/`、`desktop/hooks_settings_app.go` | 用户/项目 Hook 与信任 | 阶段三改路径，阶段六接 UI |
| 诊断 | `desktop/capdiag_app.go`、`DiagnosticsSettingsPage.tsx`、`crash_app.go` | 能力诊断与上游报告 | 只复用本地诊断；上游上传在阶段七删除 |
| 更新 | `desktop/updater.go`、`updater_app.go`、`UpdateBanner.tsx`、`useUpdater.ts` | 自动更新与上游 manifest | 不复用上游传输；阶段七改为私密 Release 手动检查 |

逐页的“Figma 页面—现有组件—后端绑定—需要新建内容”映射已在 `figma-coverage.md` 的“数据来源 / 后端目标”列登记。

## 5. 配置与数据路径审计

完整生产代码匹配保存在 `inventory-data-paths.txt`（524 行）。该清单包含代码、配置、脚本与工作流中的全部基线匹配；测试文件另由后续阶段的品牌/隔离测试覆盖，不用测试夹具替代生产路径整改。

| 当前入口 | 当前行为 | 风险 | 处置阶段 |
|---|---|---|---|
| `REASONIX_HOME` / `~/.reasonix` | `internal/config/paths.go:46-66` 决定全局 home，承载 `config.toml`、`.env`、命令等 | 会读取和写入上游用户数据 | 阶段三改为 `RILLAGENT_HOME` / `~/.rillagent`，禁止 fallback |
| `REASONIX_STATE_HOME` | `paths.go:145-150,333-354` 控制 session、archive、worktree、memory 等状态 | 状态可能与 Reasonix 混用 | 阶段三改为 `RILLAGENT_STATE_HOME` |
| `REASONIX_CACHE_HOME` | `paths.go:167-178` 控制可再生缓存 | 缓存可能混用 | 阶段三改为 `RILLAGENT_CACHE_HOME` |
| OS cache `reasonix/workspace-leases` | `paths.go:318-327` 刻意忽略 home/cache override | 即使设置隔离 home 仍与上游共用锁路径 | 阶段三必须改为 Rillagent 专用 lease 路径并加隔离测试 |
| `reasonix.toml` | `load.go:55-82` 读取项目配置；`edit.go` 多处写回；`paths.go:581-590` 选源 | 会自动读取/改写上游项目配置 | 阶段三只读写 `rillagent.toml`，不得探测旧文件 |
| `.reasonix/commands/` | `ConventionDirs` 与 `CommandRootsForRoot` 扫描用户和项目命令 | 会加载上游命令 | 阶段三 canonical 改为 `.rillagent/commands/`；不得扫描 `.reasonix` |
| `.reasonix/settings.json` | Hooks 专用项目配置 | 会加载上游 Hook | 阶段三改为 `.rillagent/settings.json` |
| `.reasonix/autoresearch/` | `internal/autoresearch/store.go` 持久化研究任务 | 会读写上游项目状态 | 阶段三改到 `.rillagent/autoresearch/` |
| `.reasonix/output-styles/`、skills/plugins | `internal/outputstyle`、`skill`、`pluginpkg` 等加载项目/用户资产 | 会混用上游资产 | 阶段三逐项切换并补负向测试 |
| `~/.reasonix/config.json` | `mcpjson.go:95-125` 与 `migrate.go` 导入旧版 MCP/配置 | 明确违反“不读取、不迁移” | 阶段三删除 Rill 运行路径中的 legacy import；保留上游来源仅可在同步文档中说明 |
| 旧 XDG / OS app-support `reasonix` | `legacyUserConfigPaths`、`migrateSupportData` 等回退/复制 | 隐式导入旧数据 | 阶段三禁用所有 Reasonix legacy candidates |
| `REASONIX_SAFE_MODE`、`REASONIX_CREDENTIALS_STORE`、`REASONIX_LANG` 等 | 运行模式、凭证与语言开关 | 用户环境可能影响 Rill | 阶段三统一为对应 `RILLAGENT_*`，并验证旧变量无效 |
| `.agents` / `.agent` / `.claude` | 通用兼容目录，不属于 Reasonix 或 LDagent 数据 | 与目标禁读范围不同，但仍需明确优先级 | 可保留跨工具兼容；Rill canonical 目录必须最高优先级 |
| 项目 `.mcp.json` | Claude/MCP 通用互操作文件 | 非 Reasonix 专属；可能启动外部命令/网络 | 可保留，但继续受 MCP 信任、审批与 minisign 策略约束 |

目标路径在阶段三统一为 `~/.rillagent`、`rillagent.toml`、`.rillagent/commands/` 和 `RILLAGENT_*`。本阶段未修改任何路径，也未读取用户现有 Reasonix 数据。

## 6. 外联与隐私审计

`inventory-upstream-network.txt` 保存 437 行基线匹配。该原始清单同时包含真正的网络传输、配置说明和内部“telemetry/metrics”术语；以下表格给出运行时风险判定。

| 能力/端点 | 触发与默认值 | 数据/行为 | 判定与处置 |
|---|---|---|---|
| `POST https://crash.reasonix.io/v1/report` | `desktop/crash_app.go:17,244-266`；前端显式报告；`crash_pending.go:84-118` 还会在下一次正常启动自动补发 Go panic | 脱敏后的错误、栈、设备、版本、面包屑 | 禁止；阶段七改为仅本地复制/导出，移除发送和自动补发 |
| `POST https://crash.reasonix.io/v1/ping` | `telemetry_app.go:18-77`；正式构建每次启动；`DesktopTelemetry()` 缺省返回 `true` | 安装 ID、版本、OS、架构、OS 版本 | 禁止；阶段七使传输不存在，而不是只把开关默认设为 false |
| `POST https://crash.reasonix.io/v1/metrics` | `metrics_app.go:21-27,495-546`；聚合后下次启动发送；`DesktopMetrics()` 缺省返回 `true` | 安装 ID、版本、OS、signal/bucket 计数 | 禁止；阶段七删除上游发送与待发送队列 |
| 上游自动更新 | `updater.go:37-73` 请求 `dl.reasonix.io`、`crash.reasonix.io`、`esengine/DeepSeek-Reasonix` GitHub manifest；`DesktopCheckUpdates()` 缺省返回 `true` | 启动检查、下载、验证和安装；失败时打开 `reasonix.io` | 禁止；阶段七关闭自动检查/下载/安装，改为私密 `Lmq1111/Rill` Release 手动入口 |
| 上游 changelog / 下载页 | `App.tsx`、`SettingsPanel.tsx`、`bridge.ts`、`updater_app.go` 打开 `reasonix.io` | 用户浏览器跳转 | 删除或改为私密仓库 Release；不得残留上游升级入口 |
| MCP 只读目录 | `internal/mcpcatalog/catalog.go:30-44,124-170` 请求 `https://dl.reasonix.io/plugins/catalog/v1/index.json(.minisig)` | 目录与签名；本地固定公钥验证、回滚保护和缓存 | **唯一允许的 `reasonix.io` 运行时依赖**；保留并在隐私页明确说明 |
| 模型 Provider API | `internal/provider/` 与 `internal/config/load.go` 的官方/自定义 base URL | 用户主动配置后发送提示词与模型请求 | Rill 核心功能所需；不属于上游遥测，但必须受用户配置和代理设置控制 |
| QQ/飞书/Lark/微信 | `internal/bot/`、`desktop/bot_connection_app.go` | 用户启用渠道后收发消息/鉴权 | 可保留业务能力；默认不应无授权启用 |
| GitHub/plugin install API | `internal/installsource/`、`pluginpkg` | 用户主动安装或刷新来源 | 可保留受控功能；私密更新另行实现 |
| Workers/accounts/forum/site | `workers/`、`site/` | 上游公开服务部署 | v0.1.0 不部署；阶段二删除相应 Actions，代码后续可作为上游来源保留但不可被 CI 误部署 |

启动顺序证据：`desktop/app.go:431-460` 在非 Safe Mode 下启动 `sendStartupPing`、`flushMetrics` 和 `flushPendingCrash`。因此仅隐藏设置开关不足以满足“向上游请求为零”的最终验收。

## 7. 品牌替换清单

`inventory-brand-files.txt` 记录 516 个生产/配置文件的匹配计数。匹配项按下列白名单和整改范围处理：

| 范围 | 典型路径 | 决定 |
|---|---|---|
| CLI 用户界面 | `cmd/reasonix/`、`internal/cli/`、`internal/i18n/messages_*`、内置 guide Skill | 阶段三统一为 Rill / Rillagent / `rillagent` / `/rillagent-guide` |
| 桌面标题、菜单、托盘、错误和设置 | `desktop/main.go`、`menu.go`、`tray.go`、`settings_app.go`、前端 locales/components | 阶段三替换品牌；阶段四以后使用 Figma 布局 |
| Wails 与打包 | `desktop/wails.json`、`desktop/build/**`、图标、Linux/Windows 元数据 | 阶段三替换标识；首期只验收 macOS ARM64 |
| 文档与安装入口 | README、desktop README、脚本、示例配置、release notes | 用户可见内容改为 Rill；上游同步说明保留来源 |
| Figma 旧品牌 | 泉犀、LDagent、quanxi、ldagent | 只做 `BRAND_SUBSTITUTION`，不得改变布局 |
| 上游运行时地址 | crash、telemetry、metrics、update、changelog | 除 MCP 目录外全部移除或改为私密 Rill 地址 |
| 内部 Go module/import | `module reasonix`、`reasonix/...` | 按总方案暂时保留，为审计白名单；不得出现在用户安装/运行界面 |
| `LICENSE` / `NOTICE` | 根目录 | 保留原 MIT 和版权；NOTICE 说明二开来源，不视为品牌残留 |
| MCP 目录 | `internal/mcpcatalog`、签名目录 | 允许保留 Reasonix 名称和 `reasonix.io`，必须在隐私页披露 |
| 上游同步文档 | 未来 `docs/upstream-*` | 允许准确引用上游，不能被产品 UI 引用为升级地址 |

用户可见内容不得出现旧“泉犀 / Quanxi / LDagent / ldagent”，也不得把产品继续显示为 Reasonix。

## 8. GitHub Actions：实际 19 个工作流

阶段文档的“17 个”与锁定提交不一致。没有忽略差异，以下按实际 19 个文件审计。

| 工作流 | 当前用途与权限/密钥风险 | 阶段二决定 |
|---|---|---|
| `cache-impact.yml` | `pull_request_target` 元数据守卫，面向上游 `main-v2` 规则 | 删除；Rill 首期无对应治理流程 |
| `ci.yml` | 三平台、多 job 的上游 CI，触发分支为 `main-v2` | **替换**为单一 Rill CI；仅 `contents: read`，目标 `main` |
| `codeql.yml` | CodeQL，需 `security-events: write`、`packages: read` | 删除；首期只保留基础 CI |
| `deploy-accounts-worker.yml` | Cloudflare accounts worker；`CLOUDFLARE_API_TOKEN`、`RESEND_API_KEY` | 删除，防止误部署 |
| `deploy-crash-worker.yml` | Cloudflare crash/registry worker；Cloudflare 与 webhook secrets | 删除，防止误部署 |
| `deploy-forum-worker.yml` | Cloudflare forum worker；`CLOUDFLARE_API_TOKEN` | 删除，防止误部署 |
| `e2e-bot.yml` | 评论触发真实模型 E2E；PR 写权限、`DEEPSEEK_API_KEY` | 删除；不引入上游组织密钥 |
| `issue-auto-label.yml` | 调 DeepSeek 自动分类 Issue；issues 写权限和模型密钥 | 删除 |
| `issue-version-label.yml` | Issue 版本标签自动化 | 删除 |
| `mcp-catalog.yml` | 构建/签名/上传 MCP 目录，涉及 R2 与 minisign 密钥 | 删除；Rill 只消费已签名只读目录，不发布目录 |
| `pages.yml` | GitHub Pages/站点部署 | 删除 |
| `pr-auto-label.yml` | PR 自动标签 | 删除 |
| `pr-version-label.yml` | PR 版本标签 | 删除 |
| `prepare-release-notes.yml` | 准备上游 Release Notes/分支提交 | 删除 |
| `release-desktop.yml` | 桌面多平台 Release、签名、公证、R2、上游 gateway | 删除；阶段二不得创建 Rill 发布工作流 |
| `release-notes.yml` | 上游 changelog 校验 | 删除 |
| `release-npm.yml` | 公开 npm 发布；`NPM_TOKEN` | 删除 |
| `release.yml` | CLI、GitHub Release、Homebrew、R2；写权限及多个 secrets | 删除 |
| `update-acknowledgments.yml` | 定时写仓库并开 PR | 删除 |

阶段二的新 `ci.yml` 必须只执行：gofmt、根 vet/test、当前 `cmd/reasonix` 构建、桌面 Go 测试、前端 frozen install/typecheck/test/build。它不得引用上游组织 Secret，也不得包含发布、Pages、Workers、npm、Homebrew 或 Release 行为。

## 9. Figma 原型 7 个 P0

以下位置相对于冻结 Figma Make 源码 `src/app/components/...`；对应源码聚合指纹见 `figma-coverage.md`。这些是冻结设计原型的状态逻辑，不是上游产品仓库当前文件。

| P0 | 代码位置 | 触发路径 | 影响 | 后续修复建议 / 阶段 |
|---|---|---|---|---|
| 新建会话固定用 `projects[0]` | `workbench/Sidebar.tsx:65-96`，按钮直接 `createSession(projects[0].id)` | 用户正在第二个项目或希望按当前项目新建时点击“新建会话” | 会话被创建到错误项目；空项目数组还会异常 | 从当前选中项目/会话派生 target project，并覆盖无项目状态；阶段五 |
| AI 运行时补充发送被禁用 | `workbench/Composer.tsx:41-45,70,110-111`，发送按钮 `disabled={!draft || running || blocked}` | `runState === "aiRunning"` 时输入补充指令 | UI 文案说“可以补充指令”，实际无法发送；上游已有 `SteerForTab` 未利用 | 运行中把发送动作路由到 steer，仅在确认/问题等真正阻塞状态禁用；阶段五 |
| 忙碌历史会话仍可点击 | `workbench/History.tsx:24,36,68,123-141`；checkbox 使用 `disabled`，但行容器始终 `onClick={onSelect}` | 当前 AI 输出中进入历史页并点击任意行 | 右侧预览仍切换，违反“当前只能查看/不能切换”口径并可能引发状态混淆 | `disabled` 时阻止行选择并添加一致的禁用语义/样式；阶段五 |
| 清空上下文删除消息 | `workbench/store.tsx:507-511`，把 `messages` 过滤到最多一条 notice | 上下文页确认“清空上下文” | 当前会话历史消息从状态中消失，而 Toast 又宣称历史保留 | 将模型上下文窗口重置与不可变历史记录分离；UI 历史仍完整，执行层从新边界开始；阶段五 |
| 自动化持久化 ID `new` | `workbench/Automation.tsx:164-165` 创建 `id: "new"`；`store.tsx:526` 原样追加 | 新增任务填写后保存 | 第一个任务以 `new` 持久化；再次新增会覆盖/冲突 | 保存前调用真实 `HeartbeatGenerateID` 或在领域层生成稳定唯一 ID；阶段五/六 |
| 复用会话没有消息和结果 | `workbench/store.tsx:529-548` 只有 `sessionPolicy === "new"` 分支创建/更新会话；reuse 分支只改任务并显示成功 Toast | 复用型任务点击“立即运行” | 目标会话没有触发消息、执行消息或结果，用户看到与事实不符的成功提示 | 定位/创建 `reuseSessionId`，追加触发、运行、结果事件并维护会话 ID；阶段五/六 |
| 新项目显示内部 ID | `workbench/store.tsx:157-169` 的 `projectName()` 只查静态 `initialProjectsById`，而运行态项目在 `projectList` | “添加已有项目/创建空白项目”后在历史、自动化、回收站等处显示项目名 | 动态项目查不到，直接显示 `p-<timestamp>` 内部 ID | 从当前 store 建立响应式 selector/map，禁止业务组件使用初始快照；阶段五 |

## 10. 已知功能缺口

| 缺口 | 现状 | 分类 | 后续阶段 |
|---|---|---|---|
| Figma 页面尚未进入产品仓库 | 当前 Figma Make 是独立 mock store；上游仍是原界面 | `FIGMA_LOCKED` | 阶段四建立 24 页壳，阶段五/六接线 |
| 渠道详情操作 | “机器人设置”等操作仍为 Toast | `GAP_EXTENSION` | 阶段六接已有 bot bindings |
| 文件/Diff 引用 | 原型数据静态，无法证明引用包含真实选中内容 | `GAP_EXTENSION` | 阶段五用 `ReadFileForTab/WorkspaceChanges` 接线并回归 |
| 自动化持久化与真实结果 | 原型只用内存和 `setTimeout` | `GAP_EXTENSION` | 阶段六使用 Heartbeat 后端和真实会话 |
| 16 个设置页持久化 | 多数组件只维护本地 state，演示 loading/running/error | `FIGMA_LOCKED` 展示 + `GAP_EXTENSION` 数据 | 阶段六逐页接 `AppBindings` |
| 快捷键设置持久化 | 有现有快捷键实现和 cheatsheet，无 Figma 专用持久化页面 | `GAP_EXTENSION` | 阶段六补设置层 |
| 本地诊断导出 | 上游主路径是 `ReportCrash` 上传，Figma 要求本地复制/导出 | `GAP_EXTENSION` | 阶段七实现脱敏本地导出，删除上传 |
| 私密 GitHub Releases 手动更新 | 上游 updater 只访问公开上游端点 | `GAP_EXTENSION` | 阶段七实现私密仓库入口和明确鉴权/错误状态 |
| 真实空、失败、无权限与离线状态 | 部分只在 Figma 枚举或 mock 中存在 | `GAP_EXTENSION` | 阶段五至七使用真实错误模型完成 |
| 品牌 Logo 与文案 | Figma 仍是泉犀/LDagent，上游仍是 Reasonix | `BRAND_SUBSTITUTION` | 阶段三统一替换，布局不变 |

## 11. 阶段归属汇总

- 阶段二：私密仓库、双远端、`main`/`agent/rill-bootstrap`、NOTICE、单一 CI、Draft PR、分支保护。
- 阶段三：Rill 品牌、CLI/产物名、数据目录、环境变量、配置文件、旧数据负向隔离。
- 阶段四：24 页 `FIGMA_LOCKED` 静态壳与视觉回归基线。
- 阶段五：核心工作台接线与 7 个 P0。
- 阶段六：历史、回收站、渠道、自动化和 16 个设置页接线。
- 阶段七：移除崩溃/遥测/指标/自动更新上游传输，完成本地诊断与全量回归。
- 阶段八：macOS ARM64 打包、签名、DMG 和私密 Release。

## 12. 阶段一验收记录

| 验收项 | 证据 | 当前判定 |
|---|---|---|
| 24 个默认截图 | `screenshots/primary-1440x900/` 与 `supplemental-1280x800/` | 已具备，待提交前文件级校验 |
| 重要状态 | `screenshots/states-1280x720/` 与 `figma-coverage.md` 状态说明 | 已具备，待提交前文件级校验 |
| 页面分类 | `figma-coverage.md` | 已登记 |
| 上游提交和技术栈 | 本报告第 2 节 | 已锁定 |
| 7 个 P0 | 本报告第 9 节 | 已定位，未修复 |
| 数据路径与旧配置 | 本报告第 5 节、`inventory-data-paths.txt` | 已扫描并给出处置 |
| 外联与隐私 | 本报告第 6 节、`inventory-upstream-network.txt` | 已扫描并给出处置 |
| 品牌 | 本报告第 7 节、`inventory-brand-files.txt` | 已扫描并划定白名单 |
| Actions | 本报告第 8 节 | 实际 19/19 已决定去留 |
| 密钥与私人内容 | 证据目录仅含代码路径、设计 mock、截图和公开端点 | 未写入真实密钥或私人对话 |

在提交阶段一之前仍需执行独立的证据完整性检查；只有检查通过并形成独立 commit 后，才允许进入阶段二。
