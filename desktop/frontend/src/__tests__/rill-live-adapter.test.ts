// Run: tsx src/__tests__/rill-live-adapter.test.ts

import { strict as assert } from "node:assert";
import { adaptLiveProjects, adaptLiveSession } from "../rill/adapters/live";
import type { ProjectNode, TabMeta } from "../lib/types";

const tree: ProjectNode[] = [
  { key: "project-a", kind: "project", label: "动态项目 A", root: "/repo/a", children: [] },
  { key: "global", kind: "global_folder", label: "全局", root: "", children: [] },
];

const projects = adaptLiveProjects(tree, []);
assert.deepEqual(projects.map((project) => [project.id, project.name]), [["/repo/a", "动态项目 A"], ["global", "全局"]]);

const tab: TabMeta = {
  id: "tab-a",
  scope: "project",
  workspaceRoot: "/repo/a",
  workspaceName: "a",
  topicId: "topic-a",
  topicTitle: "真实会话",
  label: "model-a",
  ready: true,
  running: true,
  pendingPrompt: true,
  active: true,
  cwd: "/repo/a",
  mode: "normal",
};

const session = adaptLiveSession(tab, {
  items: [
    { kind: "user", id: "u1", text: "真实问题" },
    { kind: "assistant", id: "a1", text: "真实回答", reasoning: "", streaming: true },
  ],
  running: true,
  hydrating: false,
  approval: { id: "approval-1", tool: "run_shell", subject: "git status", reason: "需要确认" },
  context: { used: 1200, window: 200000, sessionTokens: 1800, cacheHitTokens: 700, cacheMissTokens: 500 },
  meta: { label: "model-a", ready: true, eventChannel: "events", cwd: "/repo/a", workspaceRoot: "/repo/a", gitBranch: "main" },
});

assert.equal(session.projectId, "/repo/a");
assert.equal(session.runState, "awaitingConfirm");
assert.deepEqual(session.messages.map((message) => [message.type, message.text]), [["user", "真实问题"], ["ai", "真实回答"]]);
assert.equal(session.context.used, 1200);
assert.equal(session.context.rounds, 1);
assert.equal(session.pendingConfirm?.command, "git status");

process.stdout.write("rill live adapter tests passed\n");
