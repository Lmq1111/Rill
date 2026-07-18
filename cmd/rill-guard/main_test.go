package main

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"reasonix/internal/repair"
)

func TestCheckReportsInvalidProjectConfig(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "rillagent.toml"), []byte("[broken\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if code := run([]string{"check", "--root", root, "--json"}); code != 1 {
		t.Fatalf("exit code = %d, want 1", code)
	}
}

func TestFailedInstallBlocksLaunch(t *testing.T) {
	cases := []struct {
		name   string
		result repair.UpdateRollbackResult
		err    error
		want   bool
	}{
		{name: "no error never blocks", result: repair.UpdateRollbackResult{}, err: nil, want: false},
		{name: "incomplete rollback fails closed", result: repair.UpdateRollbackResult{}, err: errors.New("stage failed"), want: true},
		{name: "uncompensated rollback fails closed", result: repair.UpdateRollbackResult{MixedInstall: true}, err: errors.New("restore failed"), want: true},
		{name: "completed restore with marker cleanup error launches", result: repair.UpdateRollbackResult{RolledBack: true}, err: errors.New("remove marker: permission denied"), want: false},
	}
	for _, tc := range cases {
		if got := failedInstallBlocksLaunch(tc.result, tc.err); got != tc.want {
			t.Errorf("%s: failedInstallBlocksLaunch = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestDesktopExecutableNameMatchesWailsOutput(t *testing.T) {
	if got := desktopExecutableName("darwin"); got != "rill-desktop" {
		t.Fatalf("darwin desktop executable = %q, want rill-desktop", got)
	}
	if got := desktopExecutableName("linux"); got != "rill-desktop" {
		t.Fatalf("linux desktop executable = %q, want rill-desktop", got)
	}
	if got := desktopExecutableName("windows"); got != "rill-desktop.exe" {
		t.Fatalf("windows desktop executable = %q, want rill-desktop.exe", got)
	}
}

func TestPackagedDetachedLauncherNamesMatchPackaging(t *testing.T) {
	for _, name := range []string{"rill-launcher.exe", "Rill.exe"} {
		if !packagedDetachedLauncherName(name) {
			t.Errorf("packagedDetachedLauncherName(%q) = false, want true", name)
		}
	}
	for _, name := range []string{"rillagent-launcher.exe", "rillagent.exe", "rill-guard.exe"} {
		if packagedDetachedLauncherName(name) {
			t.Errorf("packagedDetachedLauncherName(%q) = true, want false", name)
		}
	}
}
