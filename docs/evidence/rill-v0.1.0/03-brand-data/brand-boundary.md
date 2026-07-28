# Rill public-brand boundary

## Canonical identity

| Field | Value |
| --- | --- |
| Product | `Rill` |
| Slogan | `Let intelligence flow.` |
| CLI brand | `Rillagent` |
| Executable | `rillagent` |
| Version | `0.1.0` |
| macOS bundle ID | `io.github.lmq1111.rill` |
| Desktop executable | `rill-desktop` |
| Guard executable | `rill-guard` |

Go and frontend constants are the implementation sources of truth. CLI help,
desktop titles and menus, docs, build configuration, app metadata, and visual
assets were migrated to this identity. The root Go module path remains internal
upstream compatibility and is not a public installation surface.

## Automated scan

`scripts/check-rill-brand.sh` scans the stage-three runtime, desktop, CLI, CI,
build-script, and user-documentation scope and is now part of `ci.yml`. A new
file containing a retired public name fails CI until it is either corrected or
deliberately added to the reviewed file allowlist.

The 108 current matches fall into these explicit categories:

1. MIT/open-source attribution and real upstream repository references.
2. Stage-seven deferred telemetry, crash, metrics, and updater endpoints, with
   their current status stated in `desktop/README.md`.
3. The signed, read-only upstream MCP catalog, which is the approved runtime exception.
4. Runtime rejection code and negative brand/data-isolation tests.
5. A third-party patch record that links to the original upstream issue.
6. The Figma-locked version/privacy page disclosure for open-source attribution
   and the signed, read-only MCP catalog exception.

Historical stage-one evidence is outside the scan and retained unchanged as an
audit fact source. Restored `site/` and `workers/` are upstream source retained
for future reference and are not built or deployed by Rill CI.

## Original visual identity

The Rill mark uses flowing streams and intelligence nodes. SVG, PNG, ICNS, ICO,
Linux icon sizes, desktop assets, and documentation marks were regenerated.
Tests reject known upstream artwork markers and verify required Rill artwork
metadata and non-empty platform assets.
