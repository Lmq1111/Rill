# macOS ARM64 packaging smoke test

## Wails build

The production frontend was built first with pnpm 10.34.5. Wails 2.12.0 then
completed a native `darwin/arm64` build with Go 1.26.5.

Wails 2.12 uses `name` for the macOS bundle directory and `outputfilename` for
the Mach-O executable. The verified intermediate result was therefore:

```text
desktop/build/bin/Rill.app/Contents/MacOS/rill-desktop
```

The packaging script was corrected to consume that real Wails output. It also
uses `-m -nosyncgomod`, so packaging consumes reviewed `go.mod`/`go.sum` files
instead of running an implicit tidy or rewriting module metadata.

## Guard packaging

The complete local packaging command ran with DMG creation disabled (DMG is a
later release-stage concern). It built `rill-guard`, copied both executables into
`Rill.app`, made Guard the public bundle launcher, and ad-hoc signed the result.

After extracting `dist/Rill-darwin-arm64.zip`, validation confirmed:

```text
CFBundleName               Rill
CFBundleIdentifier         io.github.lmq1111.rill
CFBundleExecutable         rill-guard
CFBundleShortVersionString 0.1.0
CFBundleVersion            0.1.0
rill-guard version         rill-guard 0.1.0
rill-guard architecture    Mach-O arm64
rill-desktop architecture  Mach-O arm64
codesign --verify          valid, deep, strict, ad-hoc
```

Local ZIP SHA256:

```text
b80d7071503199681e496fd747b475f55768de6811d44335e231ed666b15c094  dist/Rill-darwin-arm64.zip
```

This local archive is validation output only. It is ignored by Git and was not
uploaded, tagged, or published as a Release.
