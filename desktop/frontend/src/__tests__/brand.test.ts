import assert from "node:assert/strict";

import { brand } from "../lib/brand";

assert.deepEqual(brand, {
  productName: "Rill",
  slogan: "Let intelligence flow.",
  cliBrand: "Rillagent",
  executable: "rillagent",
  version: "0.1.0",
  bundleId: "io.github.lmq1111.rill",
  projectConfig: "rillagent.toml",
  projectDir: ".rillagent",
});

console.log("brand contract tests passed");
