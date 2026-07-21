import type { FilePreview, WorkspaceChangesView, WorkspaceFileDiffView } from "../../lib/types";
import type { DiffFile, DiffStatus, FileNode, Session } from "../state/visualStore";

export function buildRillSubmitText(session: Session, input: string) {
  const references = session.refs.filter((ref) => ref.detail).map((ref) =>
    `### ${ref.kind}: ${ref.label}\n${ref.detail}`,
  );
  return references.length ? `${input}\n\n<rill_context>\n${references.join("\n\n")}\n</rill_context>` : input;
}

export function adaptFilePreview(preview: FilePreview): FileNode {
  const name = preview.path.split("/").filter(Boolean).pop() ?? preview.path;
  if (preview.err) return { path: preview.path, name, type: "file", kind: "unreadable" };
  if (preview.binary || preview.kind) return { path: preview.path, name, type: "file", kind: "binary" };
  if (preview.size === 0) return { path: preview.path, name, type: "file", kind: "empty", content: "" };
  return {
    path: preview.path,
    name,
    type: "file",
    kind: "text",
    content: preview.body,
    large: preview.truncated,
  };
}

function adaptDiffStatus(status = ""): DiffStatus {
  if (status === "??") return "untracked";
  if (status.includes("R")) return "renamed";
  if (status.includes("D")) return "deleted";
  if (status.includes("A")) return "added";
  return "modified";
}

export function adaptWorkspaceChanges(view: WorkspaceChangesView): DiffFile[] {
  return view.files
    .filter((file) => file.sources.includes("git") || Boolean(file.gitStatus))
    .map((file) => ({
      path: file.path,
      oldPath: file.oldPath,
      status: adaptDiffStatus(file.gitStatus),
      added: 0,
      removed: 0,
    }));
}

export function attachWorkspaceDiff(file: DiffFile, view: WorkspaceFileDiffView): DiffFile {
  if (view.err) return { ...file, aiNote: view.err, hunks: [] };
  if (view.binary) return { ...file, status: "binary", added: view.added, removed: view.removed, hunks: [] };
  const lines = view.diff
    .split("\n")
    .filter((line) => !line.startsWith("diff --git ") && !line.startsWith("index ") && !line.startsWith("--- ") && !line.startsWith("+++ "))
    .map((line) => ({
      t: line,
      kind: line.startsWith("+") ? "add" as const : line.startsWith("-") ? "del" as const : "ctx" as const,
    }));
  return {
    ...file,
    added: view.added,
    removed: view.removed,
    hunks: lines.length ? [{ lines }] : [],
    aiNote: view.truncated ? "差异过大，当前仅显示前 2 MiB。" : undefined,
  };
}
