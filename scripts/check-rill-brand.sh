#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

unexpected=0
reviewed=0

allowed_attribution_or_sync_doc() {
  case "$1" in
    LICENSE|NOTICE|README.md|README.zh-CN.md|CHANGELOG.md|release-notes/releases.json|desktop/README.md|desktop/third_party/go-webview2/PATCHES.md|docs/CONFIG_PATHS.md|docs/CONFIG_PATHS.zh-CN.md|docs/MIGRATING.md|docs/RELEASING.md|docs/SESSION_REFERENCE_ARCHITECTURE.md|docs/SPEC.md)
      return 0
      ;;
  esac
  return 1
}

allowed_match() {
  category="$1"
  file="$2"
  match="$3"

  # Explicit negative tests are allowed to spell the retired names and blocked
  # domains they prove cannot be read, written, contacted, or re-enabled.
  case "$file" in
    *_test.go|*_test.ts|*_test.tsx|*.test.ts|*.test.tsx|*.test.mjs)
      return 0
      ;;
  esac

  case "$category" in
    legacy_brand|legacy_data)
      allowed_attribution_or_sync_doc "$file" && return 0
      case "$file" in
        internal/config/paths.go|internal/secrets/redact.go)
          return 0
          ;;
      esac
      if [[ "$category" == "legacy_data" ]]; then
        case "$file:$match" in
          internal/mcpcatalog/catalog.go:*"https://dl.reasonix.io/plugins/catalog/v1/index.json"*|desktop/frontend/src/rill/components/settings/live/LiveAboutSettings.tsx:*"https://dl.reasonix.io/plugins/catalog/v1/index.json"*)
            return 0
            ;;
        esac
      fi
      ;;
    reasonix_name)
      # Internal Go module/import paths stay unchanged to preserve upstream
      # synchronization. This does not allow a public product label.
      case "$match" in
        *reasonix/internal/*|*reasonix/desktop/internal/*|*'prefix := "reasonix/"'*|*"module reasonix"*|*"require reasonix "*|*"replace reasonix "*|*"module (reasonix/desktop)"*)
          return 0
          ;;
      esac
      allowed_attribution_or_sync_doc "$file" && return 0
      case "$file" in
        .goreleaser.yaml|Makefile|go.mod|desktop/.gitignore|desktop/go.mod|internal/brand/brand.go|internal/config/paths.go|internal/secrets/redact.go)
          return 0
          ;;
        internal/mcpcatalog/catalog.go|desktop/frontend/src/rill/components/settings/AboutSettings.tsx|desktop/frontend/src/rill/components/settings/live/LiveAboutSettings.tsx)
          return 0
          ;;
      esac
      ;;
    upstream_domain)
      case "$file" in
        internal/mcpcatalog/catalog.go)
          case "$match" in
            *"https://dl.reasonix.io/plugins/catalog/v1/index.json"*) return 0 ;;
          esac
          ;;
        desktop/frontend/src/rill/components/settings/AboutSettings.tsx|desktop/frontend/src/rill/components/settings/live/LiveAboutSettings.tsx)
          case "$match" in
            *"reasonix.io 运行时依赖"*|*"只读 Reasonix MCP"*|*"dl.reasonix.io/plugins/catalog/v1/index.json"*) return 0 ;;
          esac
          ;;
      esac
      ;;
  esac
  return 1
}

scan_category() {
  category="$1"
  pattern="$2"
  count=0
  while IFS= read -r match; do
    [[ -z "$match" ]] && continue
    count=$((count + 1))
    reviewed=$((reviewed + 1))
    file="${match%%:*}"
    if ! allowed_match "$category" "$file" "$match"; then
      printf 'unexpected %s reference: %s\n' "$category" "$match" >&2
      unexpected=1
    fi
  done < <(git grep --line-number -I -E "$pattern" -- . ':(exclude)docs/evidence/**' ':(exclude)scripts/check-rill-brand.sh' || true)
  printf 'Rill %s scan reviewed %d tracked matches.\n' "$category" "$count"
}

# These are the four stage-seven audit surfaces. git grep is intentional: CI
# always has Git, while the previous rg-only check silently passed when rg was
# absent. Generated node_modules/dist/sourcemaps never enter the tracked scan.
scan_category legacy_brand '泉犀|Quanxi|LDagent|ldagent'
scan_category reasonix_name 'Reasonix|reasonix'
scan_category legacy_data 'REASONIX_|reasonix\.toml|\.reasonix'
scan_category upstream_domain 'crash\.reasonix\.io|dl\.reasonix\.io|reasonix\.io'

if [[ "$unexpected" -ne 0 ]]; then
  exit 1
fi

printf 'Rill stage-seven scan passed (%d allowlisted tracked references reviewed).\n' "$reviewed"
