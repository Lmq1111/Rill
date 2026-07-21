// Rill does not run a background updater. Keep the component as a compatibility
// boundary for downstream imports, but render no UI and perform no side effects.
export function UpdateBanner(_props: {
  enabled?: boolean;
  onShowReleaseNotes?: (version: string) => void;
}) {
  return null;
}
