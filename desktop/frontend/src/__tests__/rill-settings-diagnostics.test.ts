// Run: tsx src/__tests__/rill-settings-diagnostics.test.ts

import { strict as assert } from "node:assert";
import type { CapabilityDiagnosticsReport } from "../lib/types";
import { buildRillDiagnosticsPayload } from "../rill/settings/diagnostics";

const report = {
  schema_version: 1,
  root: "/Users/private-user/work/rill",
  live: false,
  summary: { errors: 1, warnings: 0, infos: 0, instructions: 0, skills: 0, commands: 0, hooks: 0, plugins: 0, mcp_servers: 0 },
  instructions: { docs: [] },
  skills: { roots: [], entries: [], winners: 0, shadowed: 0 },
  commands: { roots: [], entries: [], winners: 0, shadowed: 0 },
  hooks: { trusted_project: false, project_defines_hooks: false, sources: [], entries: [] },
  plugins: { packages: [] },
  mcp: { servers: [] },
  issues: [{
    severity: "error",
    code: "provider.failed",
    subsystem: "provider",
    message: "Authorization: Bearer secret-token-value at /Users/private-user/.rillagent/config.toml",
    source: "/Users/private-user/.rillagent/config.toml",
  }],
} as CapabilityDiagnosticsReport;

const payload = buildRillDiagnosticsPayload(report, {
  version: "v0.1.0",
  settings: { checkUpdates: false, telemetry: false, metrics: false },
});

assert.doesNotMatch(payload, /private-user/);
assert.doesNotMatch(payload, /secret-token-value/);
assert.match(payload, /<home>/);
assert.match(payload, /Bearer \[REDACTED\]/);
assert.match(payload, /"telemetry": false/);
assert.match(payload, /"redactedFields"/);

process.stdout.write("rill settings diagnostics tests passed\n");
