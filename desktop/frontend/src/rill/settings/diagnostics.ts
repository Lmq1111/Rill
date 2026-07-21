import type { CapabilityDiagnosticsReport } from "../../lib/types";

const SENSITIVE_KEY = /(api.?key|token|secret|password|cookie|authorization|credential)/i;
const PATH_KEY = /(^|_)(path|root|source|cwd|store_dir)$/i;

function redactText(value: string, pathLike = false): string {
  if (pathLike && /^(?:\/|[A-Za-z]:\\)/.test(value.trim())) return "<private-path>";
  let next = value
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED]")
    .replace(/\b(?:eyJ[A-Za-z0-9_-]{8,}\.){2}[A-Za-z0-9_-]{4,}\b/g, "[REDACTED]")
    .replace(/\b(?:api[_-]?key|token|secret|password)\s*[=:]\s*[^\s,;]+/gi, (match) => {
      const separator = match.includes("=") ? "=" : ":";
      return `${match.split(/[=:]/, 1)[0]}${separator}[REDACTED]`;
    })
    .replace(/\b([A-Z][A-Z0-9_]{1,})\s*=\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/g, "$1=[REDACTED]")
    .replace(/\/Users\/[^/\s"'<>]+(?:\/[^\s"'<>:,;)\]}]+)*/g, "<private-path>")
    .replace(/\/home\/[^/\s"'<>]+(?:\/[^\s"'<>:,;)\]}]+)*/g, "<private-path>")
    .replace(/[A-Za-z]:\\Users\\[^\\\s"'<>]+(?:\\[^\s"'<>:,;)\]}]+)*/g, "<private-path>");
  if (pathLike && /^(?:\/|[A-Za-z]:\\)/.test(next) && !next.startsWith("<home>")) {
    next = "<private-path>";
  }
  return next;
}

function redactValue(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactText(value, PATH_KEY.test(key));
  if (Array.isArray(value)) return value.map((item) => redactValue(item, key));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, redactValue(child, childKey)]),
  );
}

export interface RillDiagnosticsPayloadOptions {
  version: string;
  settings: {
    checkUpdates: boolean;
    telemetry: boolean;
    metrics: boolean;
  };
}

export function buildRillDiagnosticsPayload(
  report: CapabilityDiagnosticsReport,
  options: RillDiagnosticsPayloadOptions,
): string {
  return JSON.stringify({
    schemaVersion: 1,
    product: "Rill",
    version: options.version,
    generatedAt: new Date().toISOString(),
    privacy: {
      checkUpdates: options.settings.checkUpdates,
      telemetry: options.settings.telemetry,
      metrics: options.settings.metrics,
    },
    report: redactValue(report),
    redactedFields: [
      "apiKey",
      "token",
      "secret",
      "password",
      "cookie",
      "authorization",
      "userHome",
      "privatePaths",
      "sessionBody",
      "fileContents",
    ],
  }, null, 2);
}
