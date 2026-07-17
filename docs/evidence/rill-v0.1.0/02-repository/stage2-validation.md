# 阶段二仓库与基础设施验收记录

验收日期：2026-07-17（Asia/Shanghai）

当前状态：**进行中——仅剩 GitHub 私密仓库分支保护受账户套餐限制**。

## 1. Git 与仓库基线

- 上游基线：`9b54b9f8937b9878d9052833bff4ab99ba7638de`
- 阶段一提交：`55bc09b14c9ed55ba2d80ca53cd34f4304b4faec`
- 阶段二基础设施提交：`781f6842cdab160278ac25df0435a691ee09bfd9`（仓库来源说明与工作流精简）
- CI 启动兼容提交：`8ddb8ce5a0c41d297864b6a8603193669c1dd500`（首轮私密仓库手动验证入口）
- CI 测试兼容提交：`789448925fac0ccfb1fc722d500c1f5ebe92098d`（删除发布工作流后同步移除旧测试依赖）
- 当前开发分支：`agent/rill-bootstrap`
- `main` 与 `upstream/main-v2` 均指向同一基线提交。
- `git fsck --full` 通过，`upstream/main-v2` 是 `main` 的祖先。

远端：

```text
origin   git@github.com:Lmq1111/Rill.git
upstream https://github.com/esengine/DeepSeek-Reasonix.git
```

GitHub 仓库：<https://github.com/Lmq1111/Rill>

- 可见性：`PRIVATE`
- 默认分支：`main`
- 仓库描述：`Rill — Let intelligence flow.`

## 2. LICENSE、NOTICE 与 Actions

- 根目录上游 `LICENSE` 未修改。
- 已新增根目录 `NOTICE`，说明 Rill 基于 DeepSeek-Reasonix 二次开发、保留 MIT 许可与原作者版权，且 Rill 不代表上游官方产品。
- 开发分支源码中 `.github/workflows/` 只剩 `ci.yml`。
- 上游实际共有 19 个工作流，不是早期阶段文档记录的 17 个；除 `CI` 外的 18 个上游工作流均已在仓库设置中 `disabled_manually`，避免 Draft PR 合并前误触发。
- GitHub 自动显示一个不属于源码树的系统工作流 `Dependabot Updates`；它不引用上游 Secret，不是本次保留的源文件工作流，GitHub 对其 workflow disable API 返回 422。
- `ci.yml` 顶层权限为 `contents: read`，未引用上游组织 Secret，也未创建发布工作流。

## 3. Draft PR 与真实 CI

Draft PR：<https://github.com/Lmq1111/Rill/pull/1>

```text
base: main
head: agent/rill-bootstrap
draft: true
```

成功的 PR CI：<https://github.com/Lmq1111/Rill/actions/runs/29555211998>

- 事件：`pull_request`
- HEAD：`789448925fac0ccfb1fc722d500c1f5ebe92098d`
- 结论：`success`
- 用时：8 分 56 秒

全部步骤均通过：

1. Go 格式检查。
2. 根模块 `go vet ./...`。
3. 根模块 `go test ./...`。
4. 当前上游 CLI 入口 `./cmd/reasonix` 构建。
5. Wails 2.12.0 安装与前端绑定生成。
6. pnpm 10 frozen install。
7. 前端 `pnpm typecheck`。
8. 前端 `pnpm test:all`。
9. 前端 `pnpm build`。
10. 桌面嵌套 Go module `go test ./...`。

首轮 CI 的桌面测试曾因 `desktop/guard_packaging_test.go` 强制读取已删除的 `.github/workflows/release-desktop.yml` 失败。修复只移除了该旧发布工作流断言；仍存在的 macOS、Windows 和 Linux 打包脚本契约继续受同一测试保护，没有恢复发布工作流，也没有修改产品行为。

## 4. 分支保护外部阻塞

2026-07-17 对 `main` 启用经典分支保护时，GitHub REST API 返回：

```text
HTTP 403
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

检查 Repository Ruleset 作为等价替代时同样返回 HTTP 403。仓库必须保持 private，因此不能采用“改为公开”的绕过方式。

待用户完成的最小外部操作：将 GitHub 账户 `Lmq1111` 升级到支持私密仓库保护规则的 Pro 套餐。升级后需要重新执行保护设置并验证：

- 必须通过 PR 合并。
- 必需状态检查为 `CI`。
- 对管理员同样强制执行。
- 禁止 force push。
- 禁止删除 `main`。

在保护规则真实生效前，不得把阶段二标记为完成，也不得开始阶段三。

## 5. 范围边界检查

- 未创建 `rill-v*` 标签。
- 私密仓库没有 Release。
- 未创建 `cmd/rillagent`，当前 CI 仍构建 `cmd/reasonix`。
- 未实施 Rillagent 数据路径、24 页 UI 或七个 P0 修复。
- 未修改 Figma、`raw/` 或 `notes/`。

## 6. 当前验收表

| 验收项 | 状态 | 证据 |
|---|---|---|
| 完整 Git 历史 | 通过 | `git fsck --full`；基线祖先检查通过 |
| 双远端 | 通过 | `origin` 与 `upstream` 地址如上 |
| 私密仓库与默认分支 | 通过 | `PRIVATE`；`main` |
| 开发分支 | 通过 | `agent/rill-bootstrap` |
| LICENSE 与 NOTICE | 通过 | LICENSE 未改；NOTICE 已新增 |
| 危险工作流停用 | 通过 | 18 个上游非 CI 工作流 `disabled_manually` |
| 最小权限 CI | 通过 | 源码仅 `ci.yml`；`contents: read` |
| Draft PR | 通过 | PR #1，`agent/rill-bootstrap` → `main` |
| PR CI 真实通过 | 通过 | Run `29555211998` |
| `main` 分支保护 | **未通过** | GitHub Free 私密仓库返回 HTTP 403 |
| 标签与 Release 未创建 | 通过 | `rill-v*` 为空；Release 列表为空 |
| 阶段三未开始 | 通过 | 差异仅含审计、NOTICE、CI、工作流删除及测试兼容 |
