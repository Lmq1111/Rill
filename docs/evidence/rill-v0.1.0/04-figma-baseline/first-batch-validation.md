# 阶段四第一批（01–08）验收记录

日期：2026-07-18

## 范围

- 主工作台、消息渠道详情、历史记录、回收站、自动化任务、上下文概览、文件、改动。
- 24 个稳定路由已经一次性登记；本批实现并验收前 8 个。
- 10 个阶段一冻结交互状态均已建立确定性查询入口。
- 视觉 Mock 入口只在 `import.meta.env.DEV` 为真时解析；生产默认入口继续使用现有 `App` 与真实适配路径。

## Figma 源码对等审查

结构真源：

`/Users/lmq/Lab Direct/work/.rill-figma-audit/src/app/components/workbench/`

迁移目标：

`desktop/frontend/src/rill/components/workbench/`

逐文件 `diff -u` 审查覆盖 14 个工作台组件。差异分类如下：

1. `./store` 改为展示层 `../../state/visualStore`。
2. 泉犀、LDagent、`quanxi-*` 和旧路径替换为统一 Rill / Rillagent 品牌常量和确定性 Mock。
3. 删除未使用导入、未调用的随机 `Date.now()` 示例函数，并修正 TypeScript 类型收窄。
4. 未改变 Figma 锁定页面的 className、布局层级、尺寸、间距或交互结构。

## 阶段一截图异常与技术基线策略

阶段一证据保持不变。审查发现：

- `.rill-figma-audit/captures/**/*.png` 实际文件格式为 JPEG，且与仓库 `screenshots/**/*.jpg` 哈希一致。
- 未迁移的冻结 Figma 源码在同机 Chrome 150 下直接与该 JPEG 比较，也有约 2% 像素差异，主要来自 JPEG 压缩与字体抗锯齿。
- 阶段一 `1280×800` 主工作台截图底部包含约 90px 黑帧，而实时冻结源码和 Rill 页面均完整填充视口。

因此：

- 不改写、不替换阶段一冻结证据。
- 阶段四在完成源码对等审查后生成独立的无损 PNG 技术基线。
- Playwright 仍使用 `maxDiffPixelRatio: 0.01`，没有放宽 1% 门槛。
- 技术基线位于 `desktop/frontend/tests/visual/baselines/`，校验值见同目录证据 `first-batch-SHA256SUMS`。

## 确定性状态入口

| 页面 | `rill-state` | 可见状态 |
|---|---|---|
| 工作台 | `awaiting-confirmation` | 敏感操作确认卡与输入阻塞 |
| 工作台 | `failure` | 执行失败与重试 |
| 工作台 | `readonly` | 只读会话与禁用输入 |
| 工作台 | `empty` | 空会话首条输入引导 |
| 工作台 | `add-project-dialog` | 添加已有项目弹窗 |
| 工作台 | `composer-model-menu` | 模型菜单 |
| 上下文 | `clear-context-confirmation` | 清空上下文确认 |
| 回收站 | `recycle-permanent-delete-confirmation` | 永久删除确认 |
| 自动化 | `automation-task-drawer` | 新增任务抽屉 |
| 自动化 | `automation-yolo-confirmation` | YOLO 高权限二次确认 |

## 验证结果

```text
tsx src/__tests__/rill-routes.test.ts
PASS

pnpm 10.34.5 typecheck
PASS

playwright test rill-first-batch.spec.ts rill-critical-states.spec.ts
26 passed
```

视觉基线运行环境：

- macOS arm64
- Google Chrome 150.0.7871.127（Playwright `channel=chrome`）
- `@playwright/test` 1.61.1
- 设备缩放比 1，浅色模式，`zh-CN`，`Asia/Shanghai`

Playwright 托管 Chromium 的本机下载因官方存储吞吐极低未在本批完成；最终阶段四验收仍需在固定 Playwright Chromium 或 CI 环境复跑，不能用本记录替代最终门禁。

## 结论

第一批 8 页、双视口 16 张默认基线和 10 个关键交互状态均可稳定打开并完成视觉回归。本记录只证明第一批范围，不代表阶段四或 24 页已经完成。
