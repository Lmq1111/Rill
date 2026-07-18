import type { ReactNode } from "react";
import type { RillDisplayRequest } from "../adapters/types";

export function RillVisualShell({ request, children }: { request: RillDisplayRequest; children: ReactNode }) {
  return (
    <div
      className="rill-app"
      data-rill-page={request.page}
      data-rill-state={request.state}
      data-testid="rill-visual-shell"
    >
      {children}
    </div>
  );
}
