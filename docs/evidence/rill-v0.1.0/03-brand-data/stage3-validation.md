# Stage-three validation

## Toolchain

| Tool | Validated version |
| --- | --- |
| Go | `go1.26.5 darwin/arm64` |
| Wails | `v2.12.0` |
| Node.js | `v25.9.0` |
| pnpm | `10.34.5` from `desktop/frontend/package.json` |

The machine-wide pnpm was 11.9.0, so validation used an isolated pnpm 10.34.5
binary. The frozen install rebuilt `node_modules` with pnpm 10 before running
frontend checks.

## Final checks

All commands below completed successfully on the final stage-three worktree:

```text
gofmt -l across every tracked and untracked Go source: no output
go vet ./...: pass
go test ./... -count=1: pass
cd desktop && go test ./... -count=1: pass
pnpm install --frozen-lockfile: pass
pnpm typecheck: pass
pnpm test:all: pass
pnpm build: pass
./scripts/check-rill-brand.sh: pass, 105 allowlisted references reviewed
git diff --check: pass
```

The first full frontend run exposed two lease-message regressions: the frontend
matcher looked for “Rillagent window” while the desktop backend correctly emits
“Rill window.” The matcher was corrected at its source; the focused 123-case
suite and then the complete frontend suite passed.

## CLI contract

The final CLI was rebuilt from `cmd/rillagent` with version `0.1.0`.

```text
./dist/rillagent version  -> Rillagent v0.1.0
./dist/Rillagent version  -> Rillagent v0.1.0
./dist/rillagent help     -> Rillagent — a config- and plugin-driven coding agent (multi-model)
```

The lowercase and mixed-case executable paths both resolved on the current
case-insensitive macOS APFS volume.

`setup --local` was also run in a temporary project while old product home and
project command directories existed and their environment variables were set.
It created only `rillagent.toml`; it did not create either retired TOML name.

CLI SHA256 from this validation build:

```text
1a3a6ad0ad593ea35e74978ee8daf2b938457e59ddb7e3617ae7842515c4d9db  dist/rillagent
```

## Source and release-history integrity

- `LICENSE` is byte-identical to the stage-two/upstream baseline.
- `NOTICE` identifies Rill as an open-source derivative and retains MIT attribution.
- The upstream 1.17.11–1.17.14 entries in `release-notes/releases.json` link to
  their real `esengine/DeepSeek-Reasonix` releases; they are not represented as
  historical Rill releases.
- `site/` and `workers/` source were retained exactly from the baseline. Their
  deployment Actions remain removed, so stage two cannot deploy them.
- The three files that formed the retired public npm package entry remain
  removed because public npm distribution is outside Rill v0.1.0.

## Deferred contracts

- The desktop telemetry, crash, metrics, and updater endpoints are intentionally
  still present and documented as a stage-seven hard blocker. Stage three does
  not claim the privacy migration is complete.
- `upgrade.go` and current release documentation consume `v*`, while the stage
  eight plan names `rill-v*`. Stage eight must resolve that contract before any
  tag or Release is created. No tag behavior was changed in stage three.
- DMG creation, GitHub Release, real provider conversation, and the 24-page
  Figma implementation are outside this validation record.
