# Rill v0.1.0 Figma 覆盖矩阵

## 冻结信息

| 项目 | 记录 |
|---|---|
| Figma Make | <https://www.figma.com/make/rJ8wh6spHtCCOCLrGmWO9t/> |
| File Key | `rJ8wh6spHtCCOCLrGmWO9t` |
| 冻结日期 | 2026-07-17（Asia/Shanghai） |
| 访问结果 | 已通过只读接口读取当前 Make 代码资源并在本地重建；未修改 Figma |
| 版本说明 | Make 当前版本未暴露不可变 revision ID；本冻结以截图 SHA256、页面清单和源码聚合指纹共同标识 |
| Figma 资源 | 读取 121 个资源；本地重建目录含 124 个非依赖、非构建、非截图文件 |
| 源码聚合指纹 | `a2cc801c997644e29be990fe661b0fcf54a0ca8d21ea388c259ab442663451f6` |
| 主参考视口 | `1440×900`；作为后续 `FIGMA_LOCKED` 视觉回归主基线 |
| 补充视口 | `1280×800`；用于验证较小桌面视口 |
| 关键状态视口 | `1280×720`；只作为交互状态证据，不作为像素差异主基线 |
| 哈希清单 | `screenshots/SHA256SUMS`，共 58 个截图文件 |

Figma 源码使用 `h-screen`、`w-full` 等响应式容器，没有声明唯一固定画布尺寸。因此阶段一将完整桌面状态冻结为 `1440×900` 主基线，并按阶段文档另存 `1280×800` 补充基线；不把二者误述为 Figma 源码内置画布尺寸。

## 分类口径

- `FIGMA_LOCKED`：页面结构、尺寸、层级、组件、文案位置、默认状态和 Figma 已呈现的交互均按当前设计冻结。
- `BRAND_SUBSTITUTION`：页面中的“泉犀 / LDagent / quanxi / ldagent”只在后续阶段替换为 Rill 品牌，结构和布局不变。
- `GAP_EXTENSION`：只用于 Figma 未覆盖的功能缺口和已确认 P0；本阶段仅登记，不设计、不实施。

24 个页面均包含需要保留结构的设计内容，因此页面主体分类均为 `FIGMA_LOCKED`；出现旧品牌的节点同时标记 `BRAND_SUBSTITUTION`。不能据此把整页视为可自由改版。

## 24 页覆盖矩阵

“数据来源”描述冻结原型当前使用的数据；“后端目标”记录后续接线方向，不代表本阶段已实施。验收截图将在阶段四至阶段七由真实 Rill 桌面端生成。

| 编号与页面 | 路由或入口 | 默认状态与关键状态 | 关键操作 | 数据来源 / 后端目标 | 分类 | 基准截图 | 验收截图 | 状态与备注 |
|---|---|---|---|---|---|---|---|---|
| 01 主工作台 | `workbench`；应用默认入口 | AI 运行中；工具成功；任务清单；确认、失败、只读、空会话另见状态截图 | 项目/会话切换、新建会话、补充发送、停止、审批、模型/推理/执行/协作/权限切换、打开上下文/文件/改动 | 原型 `StoreProvider`；后端目标 `ListProjectTree`、`ListTabs`、`HistoryForTab`、`Submit/Steer/Cancel`、`ContextPanel` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION`；7 个 P0 为 `GAP_EXTENSION` | `screenshots/primary-1440x900/01-main-workbench.jpg`；`screenshots/supplemental-1280x800/01-main-workbench.jpg` | `desktop/frontend/tests/visual/baselines/primary/01-main-workbench.png`；`desktop/frontend/tests/visual/baselines/supplemental/01-main-workbench.png` | 阶段四双视口及状态 01–06 已验收；真实接线与 P0 留待阶段五 |
| 02 消息渠道详情 | 点击机器人来源会话进入 `channel` | 已连接渠道、作用域、最近会话、状态与错误提示 | 复制标识、打开平台、机器人设置、测试连接、打开会话 | 原型静态 `channels`；后端目标 `BotRuntimeStatus`、`DiagnoseBotConnection`、`TestBotConnection`、`ListSessions`、`OpenChannelSessionForTab` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/02-channel-detail.jpg`；`screenshots/supplemental-1280x800/02-channel-detail.jpg` | `desktop/frontend/tests/visual/baselines/primary/02-channel-detail.png`；`desktop/frontend/tests/visual/baselines/supplemental/02-channel-detail.png` | 阶段四双视口已验收；真实渠道接线留待阶段六 |
| 03 历史记录 | 侧栏“历史记录”进入 `history` | AI 忙碌只读；当前、运行中、只读和普通历史混排；空筛选结果 | 搜索、筛选、多选、预览、恢复、重命名、移入回收站 | 原型 `sessions`；后端目标 `ListSessions`、`PreviewSession`、`ResumeSessionForTab`、`RenameSession`、`DeleteSession` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION`；忙碌行点击 P0 为 `GAP_EXTENSION` | `screenshots/primary-1440x900/03-history.jpg`；`screenshots/supplemental-1280x800/03-history.jpg` | `desktop/frontend/tests/visual/baselines/primary/03-history.png`；`desktop/frontend/tests/visual/baselines/supplemental/03-history.png` | 阶段四双视口及默认态中的忙碌禁用已验收；真实接线留待阶段六 |
| 04 回收站 | 侧栏“回收站”进入 `recycle` | 已删除会话、恢复副本、选择详情、永久删除确认、空回收站 | 搜索、筛选、多选、恢复、永久删除、清空、清理恢复副本 | 原型 `recycled`；后端目标 `ListTrashedSessions`、`RestoreSession`、`PurgeTrashedSession`、`PurgeRecoveryCopy` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/04-recycle-bin.jpg`；`screenshots/supplemental-1280x800/04-recycle-bin.jpg` | `desktop/frontend/tests/visual/baselines/primary/04-recycle-bin.png`；`desktop/frontend/tests/visual/baselines/supplemental/04-recycle-bin.png` | 阶段四双视口及永久删除确认状态 08 已验收；真实接线留待阶段六 |
| 05 自动化任务 | 侧栏“自动化任务”进入 `automation` | 启用/停用、成功/失败/运行中、项目不可用、编辑抽屉、YOLO 确认、空列表 | 新增、编辑、保存、启停、立即运行、打开生成会话、删除、推送到渠道 | 原型 `tasks/channels/projects`；后端目标 `HeartbeatListTasks`、`HeartbeatSaveTasks`、`HeartbeatTriggerNow`、会话与机器人绑定 | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION`；ID 与复用会话 P0 为 `GAP_EXTENSION` | `screenshots/primary-1440x900/05-automation.jpg`；`screenshots/supplemental-1280x800/05-automation.jpg` | `desktop/frontend/tests/visual/baselines/primary/05-automation.png`；`desktop/frontend/tests/visual/baselines/supplemental/05-automation.png` | 阶段四双视口及抽屉、YOLO 状态 09–10 已验收；真实接线与 P0 留待后续阶段 |
| 06 上下文概览 | 工作台顶部“上下文”或右栏入口进入 `context` | 占用率、轮数、Token、缓存、成本、余额；清空确认 | 刷新、清空上下文、新建会话 | 原型 `SessionContext`；后端目标 `ContextUsageForTab`、`BalanceForTab`、`MetaForTab`、`CompactForTab`；历史保留需新增语义 | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION`；清空历史 P0 为 `GAP_EXTENSION` | `screenshots/primary-1440x900/06-context-overview.jpg`；`screenshots/supplemental-1280x800/06-context-overview.jpg` | `desktop/frontend/tests/visual/baselines/primary/06-context-overview.png`；`desktop/frontend/tests/visual/baselines/supplemental/06-context-overview.png` | 阶段四双视口及清空确认状态 07 已验收；语义修复留待阶段五 |
| 07 文件 | 工作台顶部“文件”进入 `files` | 文件树、文件预览、选中状态、空目录/错误由后续真实数据提供 | 搜索、展开目录、预览、复制路径、打开/显示文件、加入当前输入 | 原型 `filesByProject`；后端目标 `ListDirForTab`、`SearchFileRefsForTab`、`ReadFileForTab`、`OpenWorkspacePathForTab`、`RevealWorkspacePathForTab` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/07-files.jpg`；`screenshots/supplemental-1280x800/07-files.jpg` | `desktop/frontend/tests/visual/baselines/primary/07-files.png`；`desktop/frontend/tests/visual/baselines/supplemental/07-files.png` | 阶段四双视口已验收；真实文件数据接线留待后续阶段 |
| 08 改动 | 工作台顶部“改动”进入 `changes` | 文件改动列表、Diff、增删统计、空改动/加载错误由后续真实数据提供 | 筛选、选择文件、复制 Diff、打开文件、加入当前输入、分支/历史查看 | 原型 `diffsByProject`；后端目标 `WorkspaceChanges`、`WorkspaceGitHistory`、`WorkspaceGitCommitDetail`、`GitBranches` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/08-changes.jpg`；`screenshots/supplemental-1280x800/08-changes.jpg` | `desktop/frontend/tests/visual/baselines/primary/08-changes.png`；`desktop/frontend/tests/visual/baselines/supplemental/08-changes.png` | 阶段四双视口已验收；真实 Diff 接线留待后续阶段 |
| 09 设置－通用 | `settings-general`（设置 tab `general`） | 正常；页面内提供加载中、运行中不可修改演示切换 | 语言、工作模式、关闭行为、显示模式、默认权限、自动计划、记忆编译、声音、状态栏 | 阶段四展示层本地 state；后端目标 `DesktopStartupSettings/Settings` 与 `SetDesktop*`、`SetAutoPlan`、`SetDefaultToolApprovalMode` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/09-settings-general.jpg`；`screenshots/supplemental-1280x800/09-settings-general.jpg` | `desktop/frontend/tests/visual/baselines/primary/09-settings-general.png`；`desktop/frontend/tests/visual/baselines/supplemental/09-settings-general.png` | 阶段四双视口及 `loading`、`running` 查询状态已验收；真实接线留待阶段六 |
| 10 设置－模型 | `settings-model`（设置 tab `model`） | Provider 列表、默认模型、密钥缺失、连接测试状态 | 新增/编辑/删除 Provider、密钥、拉取模型、设置默认/规划/子智能体模型 | 阶段四展示层本地 state；后端目标 `Settings`、`Models`、`SaveProviderWithKey`、`FetchProviderModels`、`SetDefaultModel` 等 | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/10-settings-model.jpg`；`screenshots/supplemental-1280x800/10-settings-model.jpg` | `desktop/frontend/tests/visual/baselines/primary/10-settings-model.png`；`desktop/frontend/tests/visual/baselines/supplemental/10-settings-model.png` | 阶段四双视口及连接错误查询状态已验收；真实模型与凭证接线留待阶段六 |
| 11 设置－机器人 | `settings-bot`（设置 tab `bot`） | 多渠道连接、连接/断开、错误、权限和路由 | 安装/配置 QQ、飞书/Lark、微信，诊断、测试、密钥和权限 | 阶段四展示层本地 state；后端目标 `SetBotSettings`、`Start/PollBotConnectionInstall`、`BotRuntimeStatus`、`Diagnose/TestBotConnection` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/11-settings-bot.jpg`；`screenshots/supplemental-1280x800/11-settings-bot.jpg` | `desktop/frontend/tests/visual/baselines/primary/11-settings-bot.png`；`desktop/frontend/tests/visual/baselines/supplemental/11-settings-bot.png` | 阶段四双视口已验收；已有后端能力留待阶段六适配 |
| 12 设置－MCP 与工具 | `settings-mcp`（设置 tab `mcp`） | Server 列表、信任、启停、连接失败、目录刷新 | 新增/编辑/删除/重连、清认证、信任、层级、刷新目录 | 阶段四展示层本地 state；后端目标 `MCPServers`、`Capabilities`、`Inspect/SetMCPTrust`、`RefreshMCPCatalog`、MCP CRUD | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/12-settings-mcp-tools.jpg`；`screenshots/supplemental-1280x800/12-settings-mcp-tools.jpg` | `desktop/frontend/tests/visual/baselines/primary/12-settings-mcp-tools.png`；`desktop/frontend/tests/visual/baselines/supplemental/12-settings-mcp-tools.png` | 阶段四双视口及认证过期查询状态已验收；minisign 目录仍为唯一允许的上游运行时依赖 |
| 13 设置－技能 | `settings-skills`（设置 tab `skill`） | 内置/用户/项目 Skill、启停、路径和刷新状态 | 添加/移除目录、刷新、启停、打开帮助 | 阶段四展示层本地 state；后端目标 `SkillsSettings`、`PickSkillFolder`、`Add/RemoveSkillPath`、`RefreshSkills`、`SetSkillEnabled` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/13-settings-skills.jpg`；`screenshots/supplemental-1280x800/13-settings-skills.jpg` | `desktop/frontend/tests/visual/baselines/primary/13-settings-skills.png`；`desktop/frontend/tests/visual/baselines/supplemental/13-settings-skills.png` | 阶段四双视口及扫描查询状态已验收；内置帮助使用 `/rillagent-guide` |
| 14 设置－子智能体 | `settings-subagents`（设置 tab `subagent`） | Profile 列表、工具、模型、推理、试运行结果 | 创建、编辑、删除、选择模型/推理、试运行、取消 | 阶段四展示层本地 state；后端目标 `AvailableSubagentTools`、Profile CRUD、`TrySubagentProfile`、`CancelTrySubagentProfile` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/14-settings-subagents.jpg`；`screenshots/supplemental-1280x800/14-settings-subagents.jpg` | `desktop/frontend/tests/visual/baselines/primary/14-settings-subagents.png`；`desktop/frontend/tests/visual/baselines/supplemental/14-settings-subagents.png` | 阶段四双视口及试运行失败查询状态已验收；真实接线留待阶段六 |
| 15 设置－插件 | `settings-plugins`（设置 tab `plugin`） | 已安装、安装中、空列表、可更新/禁用/诊断失败 | 选择目录、安装、启停、更新、诊断、移除 | 阶段四展示层本地 state；后端目标 `Plugins`、`Plan/InstallPlugin`、`UpdatePlugin`、`PluginDoctor`、`RemovePlugin` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/15-settings-plugins.jpg`；`screenshots/supplemental-1280x800/15-settings-plugins.jpg` | `desktop/frontend/tests/visual/baselines/primary/15-settings-plugins.png`；`desktop/frontend/tests/visual/baselines/supplemental/15-settings-plugins.png` | 阶段四双视口及安装中查询状态已验收；首期不发布公开插件目录 |
| 16 设置－记忆 | `settings-memory`（设置 tab `memory`） | 全局/项目记忆、编译建议、空状态 | 新增、遗忘、保存文档、接受建议、切换编译 | 阶段四展示层本地 state；后端目标 `MemoryForTab`、`Remember/Forget`、`SaveDoc`、`MemorySuggestions`、`AcceptMemorySuggestion` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/16-settings-memory.jpg`；`screenshots/supplemental-1280x800/16-settings-memory.jpg` | `desktop/frontend/tests/visual/baselines/primary/16-settings-memory.png`；`desktop/frontend/tests/visual/baselines/supplemental/16-settings-memory.png` | 阶段四双视口及空状态查询入口已验收；数据隔离由阶段三完成，真实接线留待阶段六 |
| 17 设置－Hooks | `settings-hooks`（设置 tab `hooks`） | 用户/项目 Hook、未信任、启停、校验错误、空列表 | 新增/编辑/删除/保存 Hook、信任项目 Hook | 阶段四展示层本地 state；后端目标 `HooksSettings`、`SaveHooksSettingsForRoot`、`TrustProjectHooksForRoot` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/17-settings-hooks.jpg`；`screenshots/supplemental-1280x800/17-settings-hooks.jpg` | `desktop/frontend/tests/visual/baselines/primary/17-settings-hooks.png`；`desktop/frontend/tests/visual/baselines/supplemental/17-settings-hooks.png` | 阶段四双视口及空列表查询状态已验收；真实接线留待阶段六 |
| 18 设置－诊断 | `settings-diagnostics`（设置 tab `diagnostics`） | 健康、警告、失败、离线；本地导出 | 刷新诊断、复制、导出脱敏诊断、跳转相关设置 | 阶段四展示层本地 state；后端目标 `CapabilityDiagnostics`、本地日志/导出；禁止调用上游 `ReportCrash` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION`；本地导出缺口为 `GAP_EXTENSION` | `screenshots/primary-1440x900/18-settings-diagnostics.jpg`；`screenshots/supplemental-1280x800/18-settings-diagnostics.jpg` | `desktop/frontend/tests/visual/baselines/primary/18-settings-diagnostics.png`；`desktop/frontend/tests/visual/baselines/supplemental/18-settings-diagnostics.png` | 阶段四双视口及未诊断查询状态已验收；上游崩溃上传移除仍属阶段七 |
| 19 设置－快捷键 | `settings-keyboard`（设置 tab `keys`） | 快捷键分组、搜索、冲突/恢复默认 | 查看、搜索、修改、恢复快捷键 | 阶段四展示层本地 state；现有 `ShortcutsCheatsheet`、`keyboardShortcuts.ts`，持久化层需后续补齐 | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/19-settings-keyboard.jpg`；`screenshots/supplemental-1280x800/19-settings-keyboard.jpg` | `desktop/frontend/tests/visual/baselines/primary/19-settings-keyboard.png`；`desktop/frontend/tests/visual/baselines/supplemental/19-settings-keyboard.png` | 阶段四双视口已验收；快捷键持久化留待阶段六 |
| 20 设置－权限 | `settings-permissions`（设置 tab `permissions`） | 默认审批模式、允许/拒绝规则、空列表、规则冲突 | 切换模式、新增/删除规则、恢复默认 | 阶段四展示层本地 state；后端目标 `SetPermissionMode`、`AddPermissionRule`、`RemovePermissionRule`、`SetDefaultToolApprovalMode` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/20-settings-permissions.jpg`；`screenshots/supplemental-1280x800/20-settings-permissions.jpg` | `desktop/frontend/tests/visual/baselines/primary/20-settings-permissions.png`；`desktop/frontend/tests/visual/baselines/supplemental/20-settings-permissions.png` | 阶段四双视口及规则冲突查询状态已验收；与沙箱语义保持分离 |
| 21 设置－沙箱 | `settings-sandbox`（设置 tab `sandbox`） | shell、bash backend、网络、工作区、额外写目录与检测结果 | 修改沙箱、网络与允许写路径、保存/恢复 | 阶段四展示层本地 state；后端目标 `SetSandbox` 与配置层 | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/21-settings-sandbox.jpg`；`screenshots/supplemental-1280x800/21-settings-sandbox.jpg` | `desktop/frontend/tests/visual/baselines/primary/21-settings-sandbox.png`；`desktop/frontend/tests/visual/baselines/supplemental/21-settings-sandbox.png` | 阶段四双视口及后端不可用查询状态已验收；真实能力留待按平台接线 |
| 22 设置－网络 | `settings-network`（设置 tab `network`） | 跟随系统、直连、手动代理、连接测试成功/失败 | 配置代理、No Proxy、模型/MCP/GitHub Releases 连通性测试 | 阶段四展示层本地 state；后端目标 `SetNetwork` 加受控诊断能力 | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION`；Releases 测试为 `GAP_EXTENSION` | `screenshots/primary-1440x900/22-settings-network.jpg`；`screenshots/supplemental-1280x800/22-settings-network.jpg` | `desktop/frontend/tests/visual/baselines/primary/22-settings-network.png`；`desktop/frontend/tests/visual/baselines/supplemental/22-settings-network.png` | 阶段四双视口及手动代理查询状态已验收；公开仓库文案已同步，不测试上游升级端点 |
| 23 设置－外观 | `settings-appearance`（设置 tab `appearance`） | 主题、样式、布局、缩放和实时预览 | 切换主题/样式/布局、调整缩放、恢复默认 | 阶段四展示层本地 state；后端目标 `SetDesktopAppearance`、`SetDesktopLayoutStyle`、`Set/GetDesktopZoomFactor` 与前端 theme/layout store | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | `screenshots/primary-1440x900/23-settings-appearance.jpg`；`screenshots/supplemental-1280x800/23-settings-appearance.jpg` | `desktop/frontend/tests/visual/baselines/primary/23-settings-appearance.png`；`desktop/frontend/tests/visual/baselines/supplemental/23-settings-appearance.png` | 阶段四双视口及深色预览查询状态已验收；真实持久化留待阶段六 |
| 24 设置－版本与隐私 | `settings-about-privacy`（设置 tab `about`） | 最新、检查中、发现新版、访问受限、检查失败、离线；本地诊断 | 查看版本、手动检查公开 GitHub Release、复制/导出诊断、查看 LICENSE/NOTICE/隐私说明 | 阶段四展示层本地 state；后端目标 `Version`、公开 GitHub Release 手动检查和本地导出；上游 `CheckUpdate/OpenDownloadPage/ReportCrash` 不可复用 | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION`；更新与隐私说明为 `GAP_EXTENSION` | `screenshots/primary-1440x900/24-settings-about-privacy.jpg`；`screenshots/supplemental-1280x800/24-settings-about-privacy.jpg` | `desktop/frontend/tests/visual/baselines/primary/24-settings-about-privacy.png`；`desktop/frontend/tests/visual/baselines/supplemental/24-settings-about-privacy.png` | 阶段四双视口及离线查询状态已验收；页面为静态展示，不代表阶段七运行时外联改造已完成 |

## 已冻结关键状态

| 状态 | 页面 | 截图 | 分类 | 说明 |
|---|---|---|---|---|
| 等待敏感操作确认 | 主工作台 | `screenshots/states-1280x720/01-session-awaiting-confirmation.jpg` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | 审批卡与输入区阻塞状态 |
| 执行失败 | 主工作台 | `screenshots/states-1280x720/02-session-failure.jpg` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | 错误详情、重试和切换模型 |
| 只读会话 | 主工作台 | `screenshots/states-1280x720/03-session-readonly.jpg` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | 输入禁用及只读解释 |
| 空会话 | 主工作台 | `screenshots/states-1280x720/04-session-empty.jpg` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | 首条输入引导 |
| 添加已有项目 | 主工作台 | `screenshots/states-1280x720/05-add-project-dialog.jpg` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | 项目选择弹窗 |
| 模型菜单 | 主工作台 | `screenshots/states-1280x720/06-composer-model-menu.jpg` | `FIGMA_LOCKED` | 输入区模型菜单 |
| 清空上下文确认 | 上下文概览 | `screenshots/states-1280x720/07-clear-context-confirmation.jpg` | `FIGMA_LOCKED`；语义修复为 `GAP_EXTENSION` | 后续不得删除历史消息 |
| 永久删除确认 | 回收站 | `screenshots/states-1280x720/08-recycle-permanent-delete-confirmation.jpg` | `FIGMA_LOCKED` | 不可逆操作确认 |
| 自动化任务抽屉 | 自动化任务 | `screenshots/states-1280x720/09-automation-task-drawer.jpg` | `FIGMA_LOCKED` + `BRAND_SUBSTITUTION` | 新增/编辑字段全集 |
| YOLO 高权限确认 | 自动化任务 | `screenshots/states-1280x720/10-automation-yolo-confirmation.jpg` | `FIGMA_LOCKED` | 保存、启用或立即运行前二次确认 |

以下重要状态已嵌入默认截图或在覆盖矩阵中明确登记，不额外重复截图：主工作台 AI 运行中与工具成功；历史页忙碌禁用；自动化页成功、失败、启用、停用；设置页加载中/运行中演示入口；版本页的检查状态枚举。真实数据下的空目录、网络失败、无权限和更新检查结果尚未实现，属于后续 `GAP_EXTENSION` 验收状态，不能在阶段一伪造为已完成。

## 阶段一结论

- 24/24 页面具有 `1440×900` 默认截图和 `1280×800` 补充截图。
- 10 个现有关键交互状态已单独冻结。
- 旧品牌节点只允许 `BRAND_SUBSTITUTION`，不得借品牌替换改变布局。
- 阶段一提交时验收截图留空是有意状态：阶段一不实施 UI；阶段四已在下方实施登记中逐页补齐无损技术基线。

## 阶段四实现登记

阶段一冻结证据保持不变。阶段四另建无损 Playwright 技术基线；原因、源码对等审查和截图异常记录见 `../04-figma-baseline/first-batch-validation.md`。

| 编号与页面 | 实现路由 | 主视口验收 | 次视口验收 | 关键状态 | 当前状态 |
|---|---|---|---|---|---|
| 01 主工作台 | `?rill-page=workbench` | `desktop/frontend/tests/visual/baselines/primary/01-main-workbench.png` | `desktop/frontend/tests/visual/baselines/supplemental/01-main-workbench.png` | 状态 01–06 | 第一批通过 |
| 02 消息渠道详情 | `?rill-page=channel` | `desktop/frontend/tests/visual/baselines/primary/02-channel-detail.png` | `desktop/frontend/tests/visual/baselines/supplemental/02-channel-detail.png` | 默认态 | 第一批通过 |
| 03 历史记录 | `?rill-page=history` | `desktop/frontend/tests/visual/baselines/primary/03-history.png` | `desktop/frontend/tests/visual/baselines/supplemental/03-history.png` | 忙碌禁用嵌入默认态 | 第一批通过 |
| 04 回收站 | `?rill-page=recycle` | `desktop/frontend/tests/visual/baselines/primary/04-recycle-bin.png` | `desktop/frontend/tests/visual/baselines/supplemental/04-recycle-bin.png` | 状态 08 | 第一批通过 |
| 05 自动化任务 | `?rill-page=automation` | `desktop/frontend/tests/visual/baselines/primary/05-automation.png` | `desktop/frontend/tests/visual/baselines/supplemental/05-automation.png` | 状态 09–10 | 第一批通过 |
| 06 上下文概览 | `?rill-page=context` | `desktop/frontend/tests/visual/baselines/primary/06-context-overview.png` | `desktop/frontend/tests/visual/baselines/supplemental/06-context-overview.png` | 状态 07 | 第一批通过 |
| 07 文件 | `?rill-page=files` | `desktop/frontend/tests/visual/baselines/primary/07-files.png` | `desktop/frontend/tests/visual/baselines/supplemental/07-files.png` | 默认态 | 第一批通过 |
| 08 改动 | `?rill-page=changes` | `desktop/frontend/tests/visual/baselines/primary/08-changes.png` | `desktop/frontend/tests/visual/baselines/supplemental/08-changes.png` | 默认态 | 第一批通过 |
| 09 设置－通用 | `?rill-page=settings-general` | `desktop/frontend/tests/visual/baselines/primary/09-settings-general.png` | `desktop/frontend/tests/visual/baselines/supplemental/09-settings-general.png` | `loading`、`running` | 第二批通过 |
| 10 设置－模型 | `?rill-page=settings-model` | `desktop/frontend/tests/visual/baselines/primary/10-settings-model.png` | `desktop/frontend/tests/visual/baselines/supplemental/10-settings-model.png` | `keyInvalid` | 第二批通过 |
| 11 设置－机器人 | `?rill-page=settings-bot` | `desktop/frontend/tests/visual/baselines/primary/11-settings-bot.png` | `desktop/frontend/tests/visual/baselines/supplemental/11-settings-bot.png` | 默认态 | 第二批通过 |
| 12 设置－MCP 与工具 | `?rill-page=settings-mcp` | `desktop/frontend/tests/visual/baselines/primary/12-settings-mcp-tools.png` | `desktop/frontend/tests/visual/baselines/supplemental/12-settings-mcp-tools.png` | `authExpired` | 第二批通过 |
| 13 设置－技能 | `?rill-page=settings-skills` | `desktop/frontend/tests/visual/baselines/primary/13-settings-skills.png` | `desktop/frontend/tests/visual/baselines/supplemental/13-settings-skills.png` | `scanning` | 第二批通过 |
| 14 设置－子智能体 | `?rill-page=settings-subagents` | `desktop/frontend/tests/visual/baselines/primary/14-settings-subagents.png` | `desktop/frontend/tests/visual/baselines/supplemental/14-settings-subagents.png` | `failed` | 第二批通过 |
| 15 设置－插件 | `?rill-page=settings-plugins` | `desktop/frontend/tests/visual/baselines/primary/15-settings-plugins.png` | `desktop/frontend/tests/visual/baselines/supplemental/15-settings-plugins.png` | `installing` | 第二批通过 |
| 16 设置－记忆 | `?rill-page=settings-memory` | `desktop/frontend/tests/visual/baselines/primary/16-settings-memory.png` | `desktop/frontend/tests/visual/baselines/supplemental/16-settings-memory.png` | `empty` | 第二批通过 |
| 17 设置－Hooks | `?rill-page=settings-hooks` | `desktop/frontend/tests/visual/baselines/primary/17-settings-hooks.png` | `desktop/frontend/tests/visual/baselines/supplemental/17-settings-hooks.png` | `empty` | 第三批通过 |
| 18 设置－诊断 | `?rill-page=settings-diagnostics` | `desktop/frontend/tests/visual/baselines/primary/18-settings-diagnostics.png` | `desktop/frontend/tests/visual/baselines/supplemental/18-settings-diagnostics.png` | `idle` | 第三批通过 |
| 19 设置－快捷键 | `?rill-page=settings-keyboard` | `desktop/frontend/tests/visual/baselines/primary/19-settings-keyboard.png` | `desktop/frontend/tests/visual/baselines/supplemental/19-settings-keyboard.png` | 默认态 | 第三批通过 |
| 20 设置－权限 | `?rill-page=settings-permissions` | `desktop/frontend/tests/visual/baselines/primary/20-settings-permissions.png` | `desktop/frontend/tests/visual/baselines/supplemental/20-settings-permissions.png` | `conflict` | 第三批通过 |
| 21 设置－沙箱 | `?rill-page=settings-sandbox` | `desktop/frontend/tests/visual/baselines/primary/21-settings-sandbox.png` | `desktop/frontend/tests/visual/baselines/supplemental/21-settings-sandbox.png` | `unavailable` | 第三批通过 |
| 22 设置－网络 | `?rill-page=settings-network` | `desktop/frontend/tests/visual/baselines/primary/22-settings-network.png` | `desktop/frontend/tests/visual/baselines/supplemental/22-settings-network.png` | `manual` | 第三批通过 |
| 23 设置－外观 | `?rill-page=settings-appearance` | `desktop/frontend/tests/visual/baselines/primary/23-settings-appearance.png` | `desktop/frontend/tests/visual/baselines/supplemental/23-settings-appearance.png` | `dark` | 第三批通过 |
| 24 设置－版本与隐私 | `?rill-page=settings-about-privacy` | `desktop/frontend/tests/visual/baselines/primary/24-settings-about-privacy.png` | `desktop/frontend/tests/visual/baselines/supplemental/24-settings-about-privacy.png` | `offline` | 第三批通过 |
