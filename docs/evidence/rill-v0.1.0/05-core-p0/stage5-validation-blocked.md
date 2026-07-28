# 阶段五核心工作台验收记录（真实模型待验收）

> 历史检查点：该阻塞已于 2026-07-21 在用户配置可用凭证后解除。当前结论见 `stage5-final-validation.md` 与 `real-model-acceptance-redacted.md`。

日期：2026-07-21（Asia/Shanghai）

## 当前结论

阶段五代码、受控后端 E2E 和本机工程回归已通过，但真实模型凭证不可用，因此阶段五保持“阻塞 / 待真实模型验收”，未标记完成，也未进入阶段六、阶段七或阶段八。

## 已验证提交边界

- `6b39d08c`：七个 P0 核心状态防护。
- `9d4f9e80`：七个 P0 剩余缺口。
- `f4872a5a`：真实会话展示适配。
- `d4ad1a2b`：主工作台真实会话接线。
- `6c84be74`：真实工作区、文件、Diff、引用和模型上下文边界。
- `f2f14f62`：隔离工作区、关闭/重命名会话和项目名搜索。
- `41d4645b`：真实斜杠命令列表与 Controller 提交链。
- `78043986`：历史问题编辑重跑、消息节点回滚及异常状态。
- `59633c4f`：修复隔离、会话管理、编辑和回滚动作的悬停可达性。
- `937f6b5d`：阶段五核心 E2E 与浏览器受控后端的 reload 恢复能力。

## GAP_EXTENSION 审计结果

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 隔离工作区入口和真实创建结果 | 通过 | `CreateDeliveryWorktree`；E2E 验证返回的隔离项目和会话 |
| 关闭会话 | 通过 | `CloseTab`；E2E 验证关闭后离开开放会话列表 |
| 重命名会话 | 通过 | `RenameTopic`；E2E 验证新标题可见 |
| 项目名称搜索 | 通过 | 动态项目注册表过滤；E2E 验证项目名命中 |
| 真实斜杠命令列表和执行 | 通过 | `App.Commands()`；E2E 验证 `/review` 进入 Controller 提交链 |
| 编辑历史问题并重新执行 | 通过 | conversation rewind + edited submit；E2E 验证修改后的问题提交 |
| 回滚到指定消息节点 | 通过 | `RewindForTab`；E2E 验证 checkpoint turn 调用 |
| 安全确认状态 | 通过 | Controller approval event；E2E 允许执行 |
| 启动失败状态 | 通过 | 受控后端 startup error；E2E 可见 |
| 模型不可用状态 | 通过 | 空模型注册表；E2E 可见 |
| 等待回答状态 | 通过 | Controller ask event；E2E 回答成功 |

## 阶段五核心 E2E

命令：

```text
RILL_VISUAL_BASE_URL=http://127.0.0.1:5173 \
RILL_PLAYWRIGHT_CHANNEL=chrome \
./node_modules/.bin/playwright test tests/e2e/rill-core.spec.ts
```

结果：`3 passed`。

覆盖：当前项目新建会话、真实会话切换、普通消息、运行中补充指令、停止、审批、回答提问、真实文件浏览与片段引用、真实 Git Diff 与片段引用、清空模型上下文、历史保留、reload 后恢复同一会话和清空边界，以及主要 GAP_EXTENSION 流程。

受控浏览器后端仅用于验证 UI 与 Controller/Wails 边界，不作为真实模型对话验收。

## 本机工程回归

工具链：Go `1.26.5 darwin/arm64`、Node.js `25.9.0`、npm `11.12.1`、Playwright `1.61.1`、Google Chrome `150.0.7871.129`。

以下命令均通过：

```text
/Users/lmq/.local/share/go1.26.5/bin/go vet ./...
/Users/lmq/.local/share/go1.26.5/bin/go test ./internal/agent/... ./internal/control/... -count=1
cd desktop && /Users/lmq/.local/share/go1.26.5/bin/go test ./... -count=1
cd desktop/frontend && npm run test:typecheck
cd desktop/frontend && npm test
cd desktop/frontend && npm run build
```

七个 P0 自动化套件结果：`17 passed, 0 failed`。

冻结视觉回归：

```text
RILL_VISUAL_BASE_URL=http://127.0.0.1:5173 \
RILL_PLAYWRIGHT_CHANNEL=chrome \
./node_modules/.bin/playwright test \
  tests/visual/rill-first-batch.spec.ts \
  tests/visual/rill-critical-states.spec.ts
```

结果：`26 passed`。阶段四冻结区域未发生像素回归。

## 真实模型验收阻塞

已进行不输出凭证值的脱敏检查：

- `DEEPSEEK_API_KEY`、`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`、`GOOGLE_API_KEY`、`OPENROUTER_API_KEY` 均未设置。
- `rillagent doctor` 显示当前配置的 `deepseek-flash` 和 `deepseek-pro` 均为 `key:missing`。
- Rill keychain 中未保存 DeepSeek、MiMo、OpenAI、Anthropic、Gemini、OpenRouter 或 LongCat 的常见凭证账户，`~/.rillagent/.env` 也不存在。
- 本机未安装或运行 Ollama、LM Studio、llama.cpp、MLX、vLLM 或 LocalAI，未发现可供本轮验收使用的本地无密钥模型运行时。

因此以下真实验收尚未执行：创建真实模型会话、真实模型回复、运行中真实补充指令、带真实文件/Diff 引用的模型请求、清空上下文后的新模型请求、应用重启后同一会话与上下文边界恢复验证。

没有保存 API Key、Token、完整私人对话或其他凭证，也没有以 Mock 对话冒充真实验收。

## 阶段边界

- 阶段五状态：阻塞 / 待真实模型验收。
- Draft PR：`Lmq1111/Rill#1`。
- 未更新 Lab Direct 阶段完成状态。
- 未开始阶段六、阶段七或阶段八。
