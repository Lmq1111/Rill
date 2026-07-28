package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func isolateRillagentPaths(t *testing.T) string {
	t.Helper()
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("USERPROFILE", home)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(home, ".config"))
	t.Setenv("AppData", filepath.Join(home, "AppData"))
	for _, name := range []string{
		"RILLAGENT_HOME", "RILLAGENT_STATE_HOME", "RILLAGENT_CACHE_HOME",
		"REASONIX_HOME", "REASONIX_STATE_HOME", "REASONIX_CACHE_HOME",
		"LDAGENT_HOME", "LDAGENT_STATE_HOME", "LDAGENT_CACHE_HOME",
	} {
		t.Setenv(name, "")
	}
	return home
}

func TestRillagentPathOverridesIgnoreOldBrandVariables(t *testing.T) {
	home := isolateRillagentPaths(t)
	rillHome := filepath.Join(home, "rill-home")
	rillState := filepath.Join(home, "rill-state")
	rillCache := filepath.Join(home, "rill-cache")
	t.Setenv("RILLAGENT_HOME", rillHome)
	t.Setenv("RILLAGENT_STATE_HOME", rillState)
	t.Setenv("RILLAGENT_CACHE_HOME", rillCache)
	t.Setenv("REASONIX_HOME", filepath.Join(home, "reasonix-home"))
	t.Setenv("LDAGENT_HOME", filepath.Join(home, "ldagent-home"))

	if got, want := UserConfigPath(), filepath.Join(rillHome, "config.toml"); got != want {
		t.Fatalf("UserConfigPath() = %q, want %q", got, want)
	}
	if got, want := SessionDir(), filepath.Join(rillState, "sessions"); got != want {
		t.Fatalf("SessionDir() = %q, want %q", got, want)
	}
	if got := CacheDir(); got != rillCache {
		t.Fatalf("CacheDir() = %q, want %q", got, rillCache)
	}
	if got, want := WorkspaceLeaseDir(), filepath.Join(rillCache, "workspace-leases"); got != want {
		t.Fatalf("WorkspaceLeaseDir() = %q, want %q", got, want)
	}
	if got, want := DeliveryWorktreeDir(), filepath.Join(rillState, "worktrees"); got != want {
		t.Fatalf("DeliveryWorktreeDir() = %q, want %q", got, want)
	}
}

func TestRillagentDefaultsUseIndependentDirectories(t *testing.T) {
	home := isolateRillagentPaths(t)
	originalCacheDir := osUserCacheDir
	osUserCacheDir = func() string { return filepath.Join(home, "Library", "Caches") }
	t.Cleanup(func() { osUserCacheDir = originalCacheDir })

	if got, want := UserConfigPath(), filepath.Join(home, ".rillagent", "config.toml"); got != want {
		t.Fatalf("UserConfigPath() = %q, want %q", got, want)
	}
	if got, want := WorkspaceLeaseDir(), filepath.Join(home, "Library", "Caches", "rillagent", "workspace-leases"); got != want {
		t.Fatalf("WorkspaceLeaseDir() = %q, want %q", got, want)
	}
	if got := LegacyUserConfigPath(); got != "" {
		t.Fatalf("LegacyUserConfigPath() = %q, want empty", got)
	}
	if got := LegacyUserConfigPaths(); len(got) != 0 {
		t.Fatalf("LegacyUserConfigPaths() = %v, want empty", got)
	}
}

func TestProjectConfigOnlyRecognizesRillagent(t *testing.T) {
	_ = isolateRillagentPaths(t)
	root := t.TempDir()
	for name, lang := range map[string]string{
		"reasonix.toml":  "zh",
		"ldagent.toml":   "zh-TW",
		"rillagent.toml": "en",
	} {
		if err := os.WriteFile(filepath.Join(root, name), []byte("language = \""+lang+"\"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	if got, want := SourcePathForRoot(root), filepath.Join(root, "rillagent.toml"); got != want {
		t.Fatalf("SourcePathForRoot() = %q, want %q", got, want)
	}
	cfg, err := LoadForRoot(root)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Language != "en" {
		t.Fatalf("Language = %q, want rillagent.toml value", cfg.Language)
	}
}

func TestCommandRootsUseRillagentAndExcludeOldBrandDirectories(t *testing.T) {
	_ = isolateRillagentPaths(t)
	root := t.TempDir()
	joined := strings.Join(CommandDirsForRoot(root), "\n")
	if !strings.Contains(joined, filepath.Join(root, ".rillagent", "commands")) {
		t.Fatalf("command dirs do not include project Rillagent directory:\n%s", joined)
	}
	for _, old := range []string{
		filepath.Join(root, ".reasonix", "commands"),
		filepath.Join(root, ".ldagent", "commands"),
	} {
		if strings.Contains(joined, old) {
			t.Fatalf("command dirs unexpectedly include old brand directory %q:\n%s", old, joined)
		}
	}
}

func TestLegacyReasonixAndLDagentMigrationIsDisabled(t *testing.T) {
	home := isolateRillagentPaths(t)
	legacyFiles := []string{
		filepath.Join(home, ".reasonix", "config.json"),
		filepath.Join(home, ".ldagent", "config.json"),
	}
	for _, path := range legacyFiles {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(`{"apiKey":"must-not-migrate"}`), 0o600); err != nil {
			t.Fatal(err)
		}
	}

	res, err := MigrateLegacyIfNeeded()
	if err != nil {
		t.Fatalf("MigrateLegacyIfNeeded() error = %v", err)
	}
	if res != nil {
		t.Fatalf("MigrateLegacyIfNeeded() = %+v, want nil", res)
	}
	if _, err := os.Stat(UserConfigPath()); !os.IsNotExist(err) {
		t.Fatalf("Rillagent config was unexpectedly created, stat error = %v", err)
	}
	if _, err := os.Stat(UserCredentialsPath()); !os.IsNotExist(err) {
		t.Fatalf("Rillagent credentials were unexpectedly created, stat error = %v", err)
	}
}
