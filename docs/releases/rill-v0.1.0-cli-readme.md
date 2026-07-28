# Rillagent v0.1.0

This directory is extracted from `Rillagent-darwin-arm64.tar.gz`, the
**macOS ARM64** command-line release of Rillagent.

## Verify and start

```sh
./rillagent version
```

Expected output:

```text
Rillagent v0.1.0
```

Run `./rillagent setup` to configure a provider, then run `./rillagent` inside a
project. See the repository documentation for the full CLI and configuration
reference.

Rillagent uses `~/.rillagent` by default. Set `RILLAGENT_HOME` to choose an
isolated root. Provider API keys saved by Rill live in the
**restricted-permission `.env`** under that root; they are not macOS Keychain entries.
Protect this file as a credential.

The archive includes the MIT `LICENSE` and the required `NOTICE`.
