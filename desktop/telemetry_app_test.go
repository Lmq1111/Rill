package main

import (
	"os"
	"path/filepath"
	"testing"

	"reasonix/internal/config"
)

func TestInstallIDStableAcrossCalls(t *testing.T) {
	isolateDesktopUserDirs(t)
	first, err := installID()
	if err != nil {
		t.Fatal(err)
	}
	if !installIDPattern.MatchString(first) {
		t.Fatalf("installID() = %q, want 32 hex chars", first)
	}
	second, err := installID()
	if err != nil {
		t.Fatal(err)
	}
	if second != first {
		t.Errorf("second call returned %q, want stable %q", second, first)
	}
}

func TestSendStartupPingAlwaysDisabled(t *testing.T) {
	isolateDesktopUserDirs(t)
	NewApp().sendStartupPing()
	if _, err := os.Stat(filepath.Join(config.MemoryUserDir(), "install-id")); !os.IsNotExist(err) {
		t.Fatalf("disabled startup ping created install identifier: %v", err)
	}
}
