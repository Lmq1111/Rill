#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

pattern='泉犀|Quanxi|DeepSeek-Rill|LDagent|ldagent|REASONIX_|reasonix\.toml|\.reasonix|DeepSeek-Reasonix|Reasonix|reasonix\.io|reasonix-guide|(^|[^[:alnum:]_])reasonix([[:space:]]|$)|cmd/reasonix|bin/reasonix|reasonix-desktop|reasonix-guard|reasonix-plugin'
scan_paths=(
  .env.example
  .github
  CHANGELOG.md
  CONTRIBUTING.md
  LICENSE
  NOTICE
  README.md
  README.zh-CN.md
  RILL.md
  SECURITY.md
  cmd
  desktop
  docs
  internal
  release-notes
  scripts
  Makefile
  .goreleaser.yaml
)
unexpected=0
match_count=0

# Every allowlisted file has a narrow, documented reason. Adding another file
# with a retired public name must update this review surface intentionally.
while IFS= read -r match; do
  [[ -z "$match" ]] && continue
  match_count=$((match_count + 1))
  file="${match%%:*}"
  case "$file" in
    # Open-source attribution and the real upstream repository identity.
    LICENSE|NOTICE|README.md|README.zh-CN.md|CHANGELOG.md|release-notes/releases.json|desktop/go.mod|desktop/cmd/sign/main_test.go|desktop/third_party/go-webview2/PATCHES.md|docs/RELEASING.md|docs/SESSION_REFERENCE_ARCHITECTURE.md)
      ;;
    # Stage-seven deferred upstream telemetry/update endpoints, documented as
    # still active and never mistaken for a completed privacy migration.
    desktop/README.md|desktop/crash_app.go|desktop/metrics_app.go|desktop/telemetry_app.go|desktop/updater.go|desktop/updater_test.go)
      ;;
    # The one approved, signed, read-only upstream MCP catalog dependency.
    internal/mcpcatalog/catalog.go)
      ;;
    # Runtime rejection code and explicit negative isolation/brand tests.
    docs/CONFIG_PATHS.md|docs/CONFIG_PATHS.zh-CN.md|docs/MIGRATING.md|internal/secrets/redact.go|internal/secrets/redact_test.go|internal/plugin/transport_stdio_env_test.go|internal/hook/hook_test.go|internal/lsp/lsp_test.go|internal/environment/probe_test.go|internal/config/rillagent_isolation_test.go|internal/config/commanddirs_test.go|internal/config/paths.go|internal/boot/boot_test.go|internal/cli/cli_test.go|internal/cli/rillagent_brand_test.go|internal/skill/rillagent_guide_contract_test.go|desktop/brand_identity_test.go)
      ;;
    *)
      printf 'unexpected retired brand reference: %s\n' "$match" >&2
      unexpected=1
      ;;
  esac
done < <(rg --hidden --no-heading --line-number --color never \
  --glob '!docs/evidence/**' \
  --glob '!scripts/check-rill-brand.sh' \
  -e "$pattern" "${scan_paths[@]}" || true)

if [[ "$unexpected" -ne 0 ]]; then
  exit 1
fi

printf 'Rill brand scan passed (%d allowlisted references reviewed).\n' "$match_count"
