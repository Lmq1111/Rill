# Stage 3 — Rill brand and data isolation evidence

Validation date: 2026-07-18

Baseline before stage three: `8e6f0aea` on `agent/rill-bootstrap`.

This directory records the stage-three implementation and validation boundary:

- [stage3-validation.md](stage3-validation.md) — toolchain, full test matrix, CLI checks, and exit status.
- [data-isolation.md](data-isolation.md) — Rillagent paths, retired namespace rejection, and migration boundary.
- [brand-boundary.md](brand-boundary.md) — public identity and the reviewed brand-scan allowlist.
- [packaging-smoke.md](packaging-smoke.md) — macOS ARM64 Wails, Guard, bundle, signature, and artifact checks.

Stage four production code was not started while gathering this evidence. The
`desktop/frontend/src/rill/` directory did not exist at the stage-three gate.
