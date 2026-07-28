# Rill v0.1.0

> **Let intelligence flow.**

Rill v0.1.0 is the first public **macOS ARM64** release of the local-first Rill
desktop workbench and the Rillagent CLI.

## Highlights

- A frozen 24-page desktop experience covering the core workbench and settings.
- Live projects, sessions, messages, files, Git diffs, exact file/Diff
  references, approvals, model questions, history, recycle bin, channels,
  automation, and persisted settings.
- Automated coverage for the seven P0 regressions and the principal desktop
  workflows.
- Model-context clearing that keeps immutable visible history and restores the
  context boundary after process restart.
- No inherited reporting, crash upload, or automatic-update requests; local
  diagnostics are redacted before viewing, copying, or export.
- Full Go, Desktop, frontend, E2E, visual, isolation, zero-egress, Wails build,
  and real-model restart acceptance before release.

## Download files

- `Rill-darwin-arm64.dmg`
- `Rill-darwin-arm64.dmg.sha256`
- `Rillagent-darwin-arm64.tar.gz`
- `Rillagent-darwin-arm64.tar.gz.sha256`

Verify each downloaded archive from the directory containing its sidecar:

```sh
shasum -a 256 -c Rill-darwin-arm64.dmg.sha256
shasum -a 256 -c Rillagent-darwin-arm64.tar.gz.sha256
```

## Install the desktop app

1. Open `Rill-darwin-arm64.dmg`.
2. Drag `Rill.app` to `/Applications`.
3. Launch `/Applications/Rill.app`.

The v0.1.0 application is **ad-hoc signed** and **not notarized** by Apple. If
macOS blocks the downloaded bundle, remove quarantine from this exact installed
copy and retry:

```sh
xattr -dr com.apple.quarantine /Applications/Rill.app
open /Applications/Rill.app
```

## Install the CLI

Extract `Rillagent-darwin-arm64.tar.gz`, then move `rillagent` to a directory on
your `PATH`. Confirm the binary before setup:

```sh
./rillagent version
```

Expected output:

```text
Rillagent v0.1.0
```

## Data and credential boundary

Rill uses `~/.rillagent` by default. Set `RILLAGENT_HOME` to choose an isolated
root for configuration, credentials, sessions, state, and cache.

Provider API keys saved through Rill live in the
**restricted-permission `.env`** under the Rillagent home. They are not macOS Keychain
entries. Protect that file as a credential. Rill does not
automatically import configuration, credentials, sessions, or memory from a
previous product.

## Known limits

- macOS ARM64 only; Intel macOS, Windows, and Linux packages are not included.
- ad-hoc signing only; the application is not notarized.
- Automatic updates are disabled. Download future versions manually from
  [GitHub Releases](https://github.com/Lmq1111/Rill/releases).
- Provider behavior depends on the endpoint and model configured by the user.

Rill is distributed under the MIT `LICENSE`; retained attribution is recorded
in `NOTICE`.
