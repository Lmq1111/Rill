#!/usr/bin/env bash
# Build the four public Rill v0.x macOS ARM64 release files. This intentionally
# does not reuse the upstream multi-channel publishing, updater, signing-secret,
# or mirror infrastructure.
set -euo pipefail

version="${1:-}"
case "$version" in
	[0-9]*.[0-9]*.[0-9]*) ;;
	*)
		echo "version must match X.Y.Z (for example: 0.1.0)" >&2
		exit 2
		;;
esac
if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "version must match X.Y.Z (for example: 0.1.0)" >&2
	exit 2
fi

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
	echo "Rill release packaging requires native macOS ARM64" >&2
	exit 2
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_dir="${RILL_RELEASE_OUTPUT_DIR:-$repo_root/dist/release-rill-v$version}"
go_bin="${RILL_RELEASE_GO_BIN:-go}"
cli_readme="$repo_root/docs/releases/rill-v${version}-cli-readme.md"
dmg_name="Rill-darwin-arm64.dmg"
cli_name="Rillagent-darwin-arm64.tar.gz"
dmg_checksum_name="Rill-darwin-arm64.dmg.sha256"
cli_checksum_name="Rillagent-darwin-arm64.tar.gz.sha256"

if [ -e "$release_dir" ]; then
	echo "release output already exists: $release_dir" >&2
	exit 2
fi
if [ ! -f "$cli_readme" ]; then
	echo "reviewed CLI release README is missing: $cli_readme" >&2
	exit 2
fi
for tool in "$go_bin" node wails create-dmg codesign hdiutil shasum tar; do
	if ! command -v "$tool" >/dev/null 2>&1; then
		echo "required release tool is unavailable: $tool" >&2
		exit 2
	fi
done

desktop_output="$(mktemp -d "${TMPDIR:-/tmp}/rill-desktop-release.XXXXXX")"
mount_dir="$(mktemp -d "${TMPDIR:-/tmp}/rill-dmg-mount.XXXXXX")"
mounted_device=""
cleanup() {
	if [ -n "$mounted_device" ]; then
		hdiutil detach "$mounted_device" >/dev/null 2>&1 || true
	fi
	if [ -n "$desktop_output" ]; then
		rm -rf "$desktop_output"
	fi
	if [ -n "$mount_dir" ]; then
		rm -rf "$mount_dir"
	fi
}
trap cleanup EXIT

mkdir -p "$release_dir/.staging/Rillagent-darwin-arm64"
cli_stage="$release_dir/.staging/Rillagent-darwin-arm64"

echo "==> build Rillagent $version"
(
	cd "$repo_root"
	"$go_bin" build -trimpath \
		-ldflags="-s -w -X reasonix/internal/brand.Version=$version" \
		-o "$cli_stage/rillagent" ./cmd/rillagent
)
cli_version="$("$cli_stage/rillagent" version)"
if [ "$cli_version" != "Rillagent v$version" ]; then
	echo "CLI version is $cli_version, want Rillagent v$version" >&2
	exit 1
fi
cp "$repo_root/LICENSE" "$cli_stage/LICENSE"
cp "$repo_root/NOTICE" "$cli_stage/NOTICE"
cp "$cli_readme" "$cli_stage/README.md"
COPYFILE_DISABLE=1 tar -czf "$release_dir/$cli_name" \
	-C "$release_dir/.staging" Rillagent-darwin-arm64

echo "==> build Rill.app and $dmg_name"
(
	cd "$repo_root"
	DESKTOP_BUILD_DIST_DIR="$desktop_output" \
		scripts/desktop-build.sh darwin/arm64 "$version" stable
)
if [ ! -f "$desktop_output/$dmg_name" ]; then
	echo "desktop build did not produce $dmg_name" >&2
	exit 1
fi
cp "$desktop_output/$dmg_name" "$release_dir/$dmg_name"

attach_output="$(hdiutil attach -readonly -nobrowse -mountpoint "$mount_dir" "$release_dir/$dmg_name")"
mounted_device="$(printf '%s\n' "$attach_output" | awk '/^\/dev\// { print $1; exit }')"
app="$mount_dir/Rill.app"
if [ ! -d "$app" ]; then
	echo "$dmg_name does not contain Rill.app" >&2
	exit 1
fi
codesign --verify --deep --strict "$app"
sign_info="$(codesign -dv --verbose=4 "$app" 2>&1)"
if ! grep -F -q "Signature=adhoc" <<<"$sign_info"; then
	echo "Rill.app is not ad-hoc signed as required for v$version" >&2
	exit 1
fi

plist="$app/Contents/Info.plist"
bundle_id="$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$plist")"
bundle_name="$(/usr/libexec/PlistBuddy -c "Print :CFBundleName" "$plist")"
bundle_version="$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$plist")"
if [ "$bundle_id" != "io.github.lmq1111.rill" ] ||
	[ "$bundle_name" != "Rill" ] ||
	[ "$bundle_version" != "$version" ]; then
	echo "Rill.app identity mismatch: id=$bundle_id name=$bundle_name version=$bundle_version" >&2
	exit 1
fi
if ! file "$app/Contents/MacOS/rill-guard" | grep -F -q "arm64"; then
	echo "Rill.app launcher is not a native arm64 binary" >&2
	exit 1
fi

hdiutil detach "$mounted_device" >/dev/null
mounted_device=""
rmdir "$mount_dir"
mount_dir=""

(
	cd "$release_dir"
	shasum -a 256 "$dmg_name" > "$dmg_checksum_name"
	shasum -a 256 "$cli_name" > "$cli_checksum_name"
)
rm -rf "$release_dir/.staging"

for artifact in \
	"$dmg_name" \
	"$cli_name" \
	"$dmg_checksum_name" \
	"$cli_checksum_name"; do
	if [ ! -s "$release_dir/$artifact" ]; then
		echo "release artifact is missing or empty: $artifact" >&2
		exit 1
	fi
done
file_count="$(find "$release_dir" -mindepth 1 -maxdepth 1 -type f | wc -l | tr -d ' ')"
if [ "$file_count" != "4" ]; then
	echo "release output contains $file_count files, want exactly 4" >&2
	exit 1
fi

echo "==> Rill v$version release files"
find "$release_dir" -mindepth 1 -maxdepth 1 -type f -print | sort
