# Releasing Rill

Rill releases belong to
[`Lmq1111/Rill`](https://github.com/Lmq1111/Rill). The upstream
[DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) repository is
a source and attribution reference, not a Rill publication target.

## Current Repository Contract

- Development and pull requests target `main`.
- Release tags use `v<semver>` for the Rill release series.
- CLI archives contain `rillagent` (or `rillagent.exe`).
- Desktop artifacts use the `Rill-<platform>-<arch>` prefix.
- Checksums are published as `SHA256SUMS`.
- GitHub release and download URLs must use `Lmq1111/Rill`.

The repository currently has CI but no public release-publishing workflow.
Do not claim that npm, Homebrew, CDN, canary, signing, or in-app update channels
have published a Rill release until those channels are configured and verified.

## Pre-release Checklist

1. Update `CHANGELOG.md` and any user-facing release notes.
2. Confirm all public commands and paths use `rillagent`, `~/.rillagent/`,
   `rillagent.toml`, and `RILLAGENT_*`.
3. Run the repository test suite:

   ```sh
   go test ./...
   go vet ./...
   cd desktop && go test ./...
   ```

4. Build and inspect the CLI:

   ```sh
   make build
   ./bin/rillagent version
   ```

5. Build the desktop artifacts using the repository's release scripts once
   those scripts and signing inputs have been reviewed for the intended tag.
6. Verify every artifact checksum and, where applicable, its minisign
   signature before uploading.
7. Wait for the `main` commit's required CI check to pass.

## Publishing

Create the release only in
[`Lmq1111/Rill/releases`](https://github.com/Lmq1111/Rill/releases). The release
body should identify the exact commit, supported platforms, checksum file, known
limitations, and whether packages are signed or ad-hoc.

After publication, verify the release page and each download from a clean
machine before announcing availability. The `rillagent upgrade` command and
desktop manifests must resolve assets from the same `Lmq1111/Rill` release.
