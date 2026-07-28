//go:build windows

package main

import "testing"

func TestRunRequiresTargetVersionBeforeStartingInstaller(t *testing.T) {
	if code := run([]string{"--installer", `C:\Temp\Rill-installer.exe`}); code != 2 {
		t.Fatalf("run without --to-version = %d, want 2", code)
	}
}
