# 阶段四第三批（17–24）验收记录

日期：2026-07-18

## 范围

- 设置－Hooks、诊断、快捷键、权限、沙箱、网络、外观、版本与隐私。
- 8 个页面使用阶段四登记的稳定路由和完整设置导航，不进入真实 Wails 业务接线。
- Figma 已有演示状态通过 `rill-state` 查询参数确定性初始化；快捷键页没有全局演示状态切换器，因此未新增虚构状态。
- 页面继续使用仅开发/测试环境可用的视觉适配器，生产默认入口不读取 Mock 数据。

## Figma 源码对等审查

结构真源：

`/Users/lmq/Lab Direct/work/.rill-figma-audit/src/app/components/settings/`

迁移目标：

`desktop/frontend/src/rill/components/settings/`

逐文件审查覆盖第三批 8 个页面以及共享设置壳/数据。差异限制在：

1. 冻结原型 Store 路径改为 Rill 展示层 `visualStore`。
2. 泉犀、LDagent、旧路径、旧项目名和旧版本替换为统一 Rill / Rillagent 品牌常量、`0.1.0` 与 `~/.rillagent` 数据边界。
3. 私密仓库文案按最新“Rill 开源、仓库公开”决定改为公开 GitHub Releases。
4. 增加确定性查询状态初始化、`aria-pressed` 状态语义和 TypeScript 类型修复。
5. 仅保留版本与隐私页中明确允许的 MIT/NOTICE、DeepSeek-Reasonix 归属及 minisign 校验的只读 MCP 目录说明。
6. 未改变 Figma 锁定页面的 className、布局层级、尺寸、间距或交互结构。

## 确定性状态入口

| 页面 | `rill-state` | 可见状态 |
|---|---|---|
| Hooks | `empty` | 无 Hook |
| 诊断 | `idle` | 未诊断 |
| 权限 | `conflict` | 规则冲突 |
| 沙箱 | `unavailable` | 后端不可用 |
| 网络 | `manual` | 手动配置 |
| 外观 | `dark` | 深色预览 |
| 版本与隐私 | `offline` | 离线 |

## 视觉基线与环境

- 主视口：`1440×900`，8 张无损 PNG。
- 补充视口：`1280×800`，8 张无损 PNG。
- `maxDiffPixelRatio`：`0.01`。
- macOS arm64，设备缩放比 1，浅色模式，`zh-CN`，`Asia/Shanghai`。
- Google Chrome `150.0.7871.127`，`@playwright/test` `1.61.1`，通过 `RILL_PLAYWRIGHT_CHANNEL=chrome` 固定当前本机复验入口。
- 校验值见 `third-batch-SHA256SUMS`。

## 验证结果

```text
tsc --noEmit
PASS

pnpm test:all
PASS

pnpm build
PASS

playwright test tests/visual/rill-third-batch.spec.ts
23 passed
  - 双视口像素回归：16 passed
  - 确定性状态入口：7 passed

git diff --check
PASS

shasum -a 256 -c third-batch-SHA256SUMS
16 passed

第三批旧品牌、旧版本与私密仓库文案扫描
0 matches

scripts/check-rill-brand.sh
Rill brand scan passed (108 allowlisted references reviewed)
```

视觉检查确认 8 张主视口页面无截断、错位、异常遮罩或旧品牌残留。版本与隐私页显示 `Rill 0.1.0`、`Rillagent`、公开 GitHub Releases 与 `~/.rillagent` 目录。

## 阶段边界说明

版本与隐私页中的“自动更新、遥测、崩溃报告已关闭”属于 Figma 锁定的阶段四静态展示。阶段四没有借此修改或宣称上游外联运行时已经完成；相关真实后端禁用仍属于阶段七。本批也没有修复七个 P0 或进入阶段五。

## 结论

第三批 8 页的静态展示层、双视口基线与已有 Figma 状态查询入口已完成本批验收。至此 24 页均已具备稳定路由和双视口技术基线；最终结论仍需以阶段四全量门禁为准。
