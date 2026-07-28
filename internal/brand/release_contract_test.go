package brand

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func releaseRepoPath(parts ...string) string {
	return filepath.Join(append([]string{"..", ".."}, parts...)...)
}

func readReleaseRepoFile(t *testing.T, parts ...string) string {
	t.Helper()
	data, err := os.ReadFile(releaseRepoPath(parts...))
	if err != nil {
		t.Fatalf("read %s: %v", filepath.Join(parts...), err)
	}
	return string(data)
}

func TestRillReleaseWorkflowContract(t *testing.T) {
	workflow := readReleaseRepoFile(t, ".github", "workflows", "release-rill.yml")
	for _, want := range []string{
		`tags: ["rill-v*"]`,
		"permissions:\n  contents: read",
		"contents: write",
		`go-version: "1.26.5"`,
		"version: 10.34.5",
		`node-version: "24"`,
		"wails@v2.12.0",
		"scripts/package-rill-release.sh",
		"Rill-darwin-arm64.dmg",
		"Rillagent-darwin-arm64.tar.gz",
		"git merge-base --is-ancestor",
		"playwright test tests/e2e",
		"playwright test tests/visual",
		`gh release create "$TAG"`,
	} {
		if !strings.Contains(workflow, want) {
			t.Errorf("release workflow missing %q", want)
		}
	}
	assertNoUpstreamReleaseReferences(t, "release workflow", workflow)
}

func TestRillReleasePackagingContract(t *testing.T) {
	script := readReleaseRepoFile(t, "scripts", "package-rill-release.sh")
	for _, want := range []string{
		"Rill-darwin-arm64.dmg",
		"Rillagent-darwin-arm64.tar.gz",
		"Rill-darwin-arm64.dmg.sha256",
		"Rillagent-darwin-arm64.tar.gz.sha256",
		"codesign --verify --deep --strict",
		"shasum -a 256",
		`scripts/desktop-build.sh darwin/arm64 "$version" stable`,
		`"$go_bin" build -trimpath`,
		`-X reasonix/internal/brand.Version=$version`,
	} {
		if !strings.Contains(script, want) {
			t.Errorf("release packaging script missing %q", want)
		}
	}
	assertNoUpstreamReleaseReferences(t, "release packaging script", script)

	cmd := exec.Command("bash", releaseRepoPath("scripts", "package-rill-release.sh"), "v0.1.0")
	output, err := cmd.CombinedOutput()
	if err == nil {
		t.Fatal("package-rill-release.sh accepted a non-semver version with a v prefix")
	}
	if !strings.Contains(string(output), "version must match X.Y.Z") {
		t.Fatalf("invalid-version error = %q, want strict X.Y.Z guidance", output)
	}
}

func assertNoUpstreamReleaseReferences(t *testing.T, name, content string) {
	t.Helper()
	for _, blocked := range []string{
		"reasonix.io",
		"dl.reasonix.io",
		"crash.reasonix.io",
		"R2_",
		"MINISIGN_PRIVATE_KEY",
		"APPLE_CERT",
		"notarytool",
		"desktop-v",
		"windows-",
		"linux-",
	} {
		if strings.Contains(content, blocked) {
			t.Errorf("%s contains blocked upstream release reference %q", name, blocked)
		}
	}
}
