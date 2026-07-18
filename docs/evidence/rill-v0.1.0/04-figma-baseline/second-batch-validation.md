# 阶段四第二批（09–16）验收记录

日期：2026-07-18

## 范围

- 设置－通用、模型、机器人、MCP 与工具、技能、子智能体、插件、记忆。
- 8 个页面均使用阶段四已登记的稳定路由，经设置 tab 映射进入同一 Figma 设置壳。
- Figma 已有演示状态通过 `rill-state` 查询参数确定性初始化；未新增 Figma 未设计的状态。
- 页面继续使用仅开发/测试环境可用的视觉适配器，生产默认入口不读取 Mock 数据。

## Figma 源码对等审查

结构真源：

`/Users/lmq/Lab Direct/work/.rill-figma-audit/src/app/components/settings/`

迁移目标：

`desktop/frontend/src/rill/components/settings/`

逐文件审查覆盖设置壳、公共 kit、共享数据和本批 8 个页面。差异限制在：

1. 冻结原型 Store 路径改为 Rill 展示层 `visualStore`。
2. 泉犀、LDagent、旧路径和旧命令替换为统一 Rill / Rillagent 品牌常量与隔离路径。
3. 模型示例地址改为不会产生真实外联的 `example.invalid` 占位地址。
4. 增加确定性查询状态初始化、`aria-pressed` 状态语义和 TypeScript 类型修复。
5. 未改变 Figma 锁定页面的 className、布局层级、尺寸、间距或交互结构。

## 确定性状态入口

| 页面 | `rill-state` | 可见状态 |
|---|---|---|
| 通用 | `loading` | 设置加载中 |
| 通用 | `running` | 运行中且部分设置不可修改 |
| 模型 | `keyInvalid` | 密钥无效 |
| MCP 与工具 | `authExpired` | 认证过期 |
| 技能 | `scanning` | 扫描中 |
| 子智能体 | `failed` | 试运行失败 |
| 插件 | `installing` | 安装中 |
| 记忆 | `empty` | 无记忆 |

机器人页的渠道连接、错误和配对状态已经嵌入默认页面或编辑抽屉，没有额外全局演示状态切换器，因此未虚构新的查询状态。

## 视觉基线与环境

- 主视口：`1440×900`，8 张无损 PNG。
- 补充视口：`1280×800`，8 张无损 PNG。
- `maxDiffPixelRatio`：`0.01`。
- macOS arm64，设备缩放比 1，浅色模式，`zh-CN`，`Asia/Shanghai`。
- Google Chrome `150.0.7871.127`，`@playwright/test` `1.61.1`，通过 `RILL_PLAYWRIGHT_CHANNEL=chrome` 固定当前本机复验入口。
- 校验值见 `second-batch-SHA256SUMS`。

## 验证结果

```text
tsc --noEmit
PASS

playwright test tests/visual/rill-second-batch.spec.ts
24 passed
  - 双视口像素回归：16 passed
  - 确定性状态入口：8 passed

git diff --check
PASS

第二批旧品牌扫描
0 matches
```

视觉检查确认 8 张主视口页面无截断、错位、异常遮罩或旧品牌残留。最终阶段四仍需在全量 24 页最终 HEAD 上复跑全部工程和视觉门禁。

## 结论

第二批 8 页的静态展示层、双视口基线与已有 Figma 状态查询入口已完成本批验收。真实设置持久化和 Wails 后端接线属于阶段六，不在阶段四实现。
