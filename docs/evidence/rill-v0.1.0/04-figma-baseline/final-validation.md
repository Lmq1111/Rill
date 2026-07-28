# Stage four final validation

Date: 2026-07-18 (Asia/Shanghai)

## Validated source boundary

- Stage three implementation: `83cb49bcac0e62d75648bacec3103d796cc0e76b`
- Stage three CI compatibility fix: `46c270168024ceab171c1b5761a6dcf1ac64a93a`
- Stage four batch 1: `78e73e5a736fd33574d957d90fb876b9d56c5e6f`
- Stage four batch 2: `6268217bf53b677be8949af79c8cfdcce56a14a4`
- Stage four batch 3 and completed coverage matrix: `8a4ab42a4eb38660ab913f8bc5dc7533bace7997`

The final local validation ran on the clean `8a4ab42a` worktree. This record is
documentation-only and does not change the validated runtime or visual assets.

## Toolchain

| Tool | Version |
| --- | --- |
| Go | `go1.26.5 darwin/arm64` |
| Wails | `v2.12.0` |
| Node.js | `v25.9.0` |
| pnpm | `10.34.5` |
| Browser | Google Chrome `150.0.7871.127` |
| Playwright | `1.61.1` |

## Engineering gates

All of the following completed successfully:

```text
tracked Go source gofmt check: pass
go vet ./...: pass
RILLAGENT_RELEASE_CACHE_GUARD=1 go test ./... -count=1: pass
cd desktop && go test ./... -count=1: pass
pnpm install --frozen-lockfile: pass
pnpm typecheck: pass
pnpm test:all: pass
pnpm build: pass
git diff --check: pass
```

The CLI was rebuilt from `cmd/rillagent` with the Rill version linker value:

```text
./dist/rillagent version  -> Rillagent v0.1.0
./dist/Rillagent version  -> Rillagent v0.1.0
./dist/rillagent help     -> Rillagent — a config- and plugin-driven coding agent (multi-model)
SHA256                     68d723738559a28e3c834859fadc593e4a4cbc0bdd386e67d6127eb85b4a744b
```

The mixed-case invocation resolves to the same executable on the current
case-insensitive macOS APFS volume.

## Data isolation

Focused Rillagent configuration, command-directory, migration-rejection, CLI,
built-in guide, Wails identity, packaging identity, and original-icon tests all
passed.

`rillagent setup --local` was also executed in a temporary project containing
both `reasonix.toml` and `ldagent.toml`, while `REASONIX_HOME` and
`LDAGENT_HOME` pointed at sentinel directories and all three Rillagent home
overrides pointed at separate temporary directories. The command created only
`rillagent.toml`; both retired files and both sentinel directories remained
unchanged.

## Figma coverage and visual regression

- Stable routes: `24/24`, unique and in the frozen order.
- Default page baselines: 24 primary `1440×900` plus 24 supplemental `1280×800`.
- Frozen critical states: 10 at `1280×720`.
- Deterministic settings-state contracts: 15.
- Full visual suite: `73 passed`, `0 failed`, one worker, Chrome channel.
- Every screenshot comparison enforces `maxDiffPixelRatio: 0.01`.
- All 58 stage-four PNG files match the three committed SHA256 manifests.
- The coverage matrix contains 24 implementation rows and a real primary and
  supplemental acceptance path for every page.

The visual adapter remains development-only: `parseRillVisualRequest` returns
`null` when `import.meta.env.DEV` is false, and the production entry renders the
existing application rather than visual-test data. The route contract test
explicitly rejects the visual entry in production mode.

## Brand, attribution, and scope boundary

```text
scripts/check-rill-brand.sh
Rill brand scan passed (108 allowlisted references reviewed)
```

The allowlist includes the Figma-locked version/privacy disclosure only for the
open-source upstream attribution and signed, read-only MCP catalog exception.
Generated sourcemaps are excluded from source scanning. `LICENSE` is
byte-identical to `upstream/main-v2`; `NOTICE` retains the open-source derivative
statement.

No stage-five P0 behavior, stage-six real business wiring, stage-seven privacy
transport removal, or stage-eight packaging/release work was started. The
version/privacy page's disabled telemetry, crash reporting, and automatic update
copy remains a static Figma display and is not represented as completed runtime
privacy work.

## Result

Stage four's local acceptance gates pass for all 24 frozen pages. Final project
acceptance still requires the pushed latest Draft PR HEAD to receive a real
successful GitHub Actions CI run and the repository/knowledge-base checks to be
recorded.
