# 阶段七隐私、稳定性与全量回归验收记录

日期：2026-07-22（Asia/Shanghai）

## 结论

阶段七完成上游外联关闭、本地脱敏诊断、MCP 例外审计、品牌与数据路径扫描、网络零外联和稳定性回归，并使用 macOS ARM64 发布候选 `Rill.app` 完成真实模型对话及进程级重启恢复验收。

本记录不包含 API Key、Token、Authorization Header、完整环境变量、完整私人路径、完整提示词、完整模型回复或完整会话截图。真实模型验收沿用阶段五创建的临时合成 Git 项目，不包含用户业务数据。

## 实现提交边界

- `b67fd09c privacy: disable upstream reporting and updates`
- `f3643898 feat: export local diagnostics`
- `7b98c9bc privacy: audit Rill upstream exceptions`
- `e7589b8b test: enforce Rill zero-egress stability`

对应精确 HEAD GitHub Actions：

- A：Run `29854342774`，成功。
- B：Run `29855857941`，成功。
- C：Run `29857423247`，成功。
- D：Run `29858814824`，成功；HEAD `e7589b8b18e7b314b0395631256515f2ece3f53d`。

## 阶段七要求核对

| 要求 | 结果 | 脱敏证据 |
| --- | --- | --- |
| 上游遥测、崩溃和升级请求为零 | 通过 | 默认 Transport/代理拦截、桌面生命周期测试及浏览器 `*.reasonix.io` 请求监听均为零 |
| 本地诊断查看、复制和导出 | 通过 | 系统剪贴板、原生路径选择、导出预览、真实文件写入和失败保留精确快照均有测试 |
| 诊断脱敏 | 通过 | API Key、Token、环境变量值、私人消息正文和私人路径不会进入诊断快照 |
| MCP 例外边界 | 通过 | 仅保留 minisign 校验的只读 MCP 目录来源说明和测试，不复用遥测、崩溃或更新端点 |
| 品牌、旧数据路径和域名扫描 | 通过 | `scripts/check-rill-brand.sh` 审核 1907 个 tracked allowlist 命中后通过 |
| RILLAGENT_HOME 隔离 | 通过 | 配置、状态、缓存和会话在测试根目录间完全隔离 |
| 模型失败与离线稳定性 | 通过 | 模型失败保留本地历史；离线草稿、历史和重新加载恢复均有自动化回归 |
| 完整工程回归 | 通过 | 根模块、Desktop、前端、完整 E2E 和完整视觉套件均通过 |
| 24 页双视口 | 通过 | 24 张 `1440×900` 主视口和 24 张 `1280×800` 补充视口均在 1% 阈值内 |
| Wails macOS ARM64 构建 | 通过 | 生成 thin arm64 `Rill.app`；Bundle ID、名称和版本正确，严格 codesign 校验通过 |
| 真实模型与重启恢复 | 通过 | 发布候选构建在重启前后分别返回预期合成探针，同一项目、会话和历史恢复 |
| 未解释的跳过、遮罩或白名单 | 通过 | E2E/视觉目录无 `test.skip`、`test.fixme` 或截图 `mask`；域名白名单由扫描脚本逐项登记 |

## 最终工程回归

指定 Go：`go1.26.5 darwin/arm64`。

根模块：

```text
gofmt -l .
./scripts/check-rill-brand.sh
go vet ./...
go test ./... -count=1
go build -o dist/rillagent ./cmd/rillagent
```

结果：格式检查无输出；扫描脚本通过；vet、全量测试和 CLI build 均退出 `0`。

Desktop：

```text
cd desktop
go test ./... -count=1
```

结果：`reasonix/desktop` 及四个 Desktop 子模块通过，退出 `0`。

前端：

```text
cd desktop/frontend
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:all
pnpm build
```

结果：锁文件供应链策略检查 `383 entries` 通过；类型检查、全量测试和生产构建均退出 `0`。

完整 E2E：

```text
RILL_PLAYWRIGHT_CHANNEL=chrome \
./node_modules/.bin/playwright test tests/e2e
```

结果：`14 passed`。受控桌面后端用于验证 UI、Wails 绑定、失败和离线状态，不替代下述真实模型验收。

完整视觉：

```text
RILL_VISUAL_BASE_URL=http://127.0.0.1:5173 \
RILL_PLAYWRIGHT_CHANNEL=chrome \
./node_modules/.bin/playwright test tests/visual
```

结果：`73 passed`，包括 48 个页面视口截图（24 页 × 2 个视口）、10 个关键交互状态和 15 个设置查询状态。未扩大遮罩，也没有未解释的跳过。

## Wails 发布候选构建

```text
cd desktop
PATH="<GO_BIN>:$PATH" \
GOPROXY=https://goproxy.cn,direct \
wails build -platform darwin/arm64
codesign --verify --deep --strict --verbose=2 build/bin/Rill.app
```

首次构建在 Wails 固定执行的 `go mod tidy` 阶段因 `proxy.golang.org` 网络超时失败；确认同一依赖在 `goproxy.cn` 可达后，仅对该构建命令临时指定代理并成功完成，没有修改全局 Go 配置或仓库文件。

构建结果：

- 产物：`desktop/build/bin/Rill.app`。
- 二进制：Mach-O 64-bit thin arm64。
- Bundle ID：`io.github.lmq1111.rill`。
- Bundle 名称：`Rill`。
- Bundle 版本：`0.1.0`。
- 签名：ad-hoc；`codesign --verify --deep --strict` 通过。

未生成 DMG、Tag 或 Release。

## 真实模型与重启恢复（脱敏）

- 应用：本次 Wails 构建生成的发布候选 `Rill.app`。
- 模型标签：`deepseek-v4-flash`。
- 凭证：使用用户已在 Rill 设置页保存的现有配置；验收过程未读取、复制、打印或写入 Key。
- 项目：临时合成 Git 项目；绝对路径省略。
- 会话：沿用同一真实会话，清空前历史仍可查看，模型上下文边界在启动时恢复为 `0 k / 1000 k`。

验收步骤与结果：

1. 在发布候选应用中发送非敏感阶段七探针，真实模型只返回 `stage7-release-candidate-ok`。
2. 通过 `Cmd+Q` 退出应用，确认原 `rill-desktop` 进程消失。
3. 重新打开同一 `Rill.app`，恢复同一项目、同一会话、17 条历史消息和清空后的 `0 k` 模型上下文边界；重启前探针仍可查看。
4. 在恢复后的同一会话发送第二条非敏感探针，真实模型只返回 `stage7-restart-ok`。
5. 第二轮完成后同一历史追加为 19 条，模型上下文只统计清空后的请求。

这两个短标记是本记录保存的全部模型输出；未保存完整私人对话或其他回复。

## 提交与远端门槛

本文件随阶段七收口提交进入 Draft PR。最终完成判定以以下命令返回“最终证据提交精确 HEAD 且 `CI=SUCCESS`”为准；该外部结果不能在同一自引用提交内预先写死：

```text
gh pr view 1 --repo Lmq1111/Rill --json url,isDraft,headRefOid,statusCheckRollup
```

阶段七完成后立即停止，不创建 Release、Tag 或 DMG，不合并 Draft PR，不进入阶段八。
