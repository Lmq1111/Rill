# 阶段一验收记录

验收日期：2026-07-17（Asia/Shanghai）

基线 HEAD：`9b54b9f8937b9878d9052833bff4ab99ba7638de`

## 验收命令覆盖

- 统计 `primary-1440x900`、`supplemental-1280x800` 和 `states-1280x720` 的 JPEG 文件数。
- 使用 `file` 逐张确认格式和像素尺寸。
- 使用 `shasum -a 256 -c screenshots/SHA256SUMS` 校验全部截图。
- 检查 `figma-coverage.md` 是否恰有 24 个页面条目。
- 检查 `engineering-audit.md` 是否恰有 7 个 P0 条目。
- 检查锁定上游提交是否实际有 19 个 `.github/workflows/*.yml`。
- 检查覆盖矩阵引用的每个截图路径是否存在。
- 扫描 Markdown/TXT 证据中的常见 GitHub、AWS 和模型密钥形态。
- 检查 Git 工作区，确认阶段一新增内容只位于 `docs/evidence/rill-v0.1.0/01-audit/`。

## 验收结果

```text
primary=24
supplemental=24
states=10
sha256 entries verified=58
figma pages=24
p0 issues=7
upstream workflows audited=19
screenshot references=ok
credential-like content=none
```

补充说明：最初临时冻结的补充视口为 `1280×720`，不符合阶段文档要求，因此未纳入仓库；已重新生成并校验 24 张 `1280×800` 补充截图。`1280×720` 只用于 10 个关键交互状态，并在覆盖矩阵中明确标为非像素回归主基线。

阶段一提交前还需执行 `git diff --cached --check` 和暂存文件范围检查。提交成功后记录实际 commit SHA，才能进入阶段二。
