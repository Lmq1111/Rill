package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"reasonix/internal/control"
	"reasonix/internal/plugin"
)

func TestCapabilityDiagnosticsStaticUsesWorkspaceRoot(t *testing.T) {
	isolateDesktopUserDirs(t)
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "AGENTS.md"), []byte("# workspace agents\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	app := NewApp()
	app.mu.Lock()
	tab := &WorkspaceTab{
		ID:            "diag",
		Scope:         "project",
		WorkspaceRoot: root,
		Ready:         true,
		disabledMCP:   map[string]ServerView{},
	}
	app.tabs = map[string]*WorkspaceTab{"diag": tab}
	app.tabOrder = []string{"diag"}
	app.activeTabID = "diag"
	app.mu.Unlock()

	report := app.CapabilityDiagnostics(false)
	if report.Live {
		t.Fatal("static diagnostics must not set live")
	}
	if report.SchemaVersion != 1 {
		t.Fatalf("schema = %d", report.SchemaVersion)
	}
	if report.Root != "<workspace>" {
		t.Fatalf("diagnostics root = %q, want redacted workspace marker", report.Root)
	}
}

func TestSaveExportFileWritesDiagnosticsPayloadLocally(t *testing.T) {
	app := NewApp()
	path := filepath.Join(t.TempDir(), "rill-diagnostics.json")
	payload := `{"product":"Rill","redactedFields":["token"]}`
	if err := app.SaveExportFile(path, payload, false); err != nil {
		t.Fatalf("SaveExportFile() error = %v", err)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read exported diagnostics: %v", err)
	}
	if string(got) != payload {
		t.Fatalf("exported payload = %q, want exact preview bytes %q", got, payload)
	}
}

func TestSaveExportFileReturnsDiagnosticsWriteError(t *testing.T) {
	app := NewApp()
	path := filepath.Join(t.TempDir(), "missing", "rill-diagnostics.json")
	err := app.SaveExportFile(path, `{}`, false)
	if err == nil {
		t.Fatal("SaveExportFile() error = nil, want local write failure")
	}
	if !strings.Contains(err.Error(), "no such file") {
		t.Fatalf("SaveExportFile() error = %q, want real filesystem error", err)
	}
}

func TestCapabilityDiagnosticsRuntimeUsesActiveHost(t *testing.T) {
	isolateDesktopUserDirs(t)
	app := NewApp()
	host := plugin.NewHost()
	ctrl := control.New(control.Options{Host: host})
	app.setTestCtrl(ctrl, "test-model")

	report := app.CapabilityDiagnostics(true)
	if report.SchemaVersion != 1 {
		t.Fatalf("schema = %d", report.SchemaVersion)
	}
	_ = app.CapabilityDiagnostics(true)
	if ctrl.Host() != host {
		t.Fatal("diagnostics must reuse the same Host pointer")
	}
}

func TestCapabilityDiagnosticsAtomicSnapshot(t *testing.T) {
	isolateDesktopUserDirs(t)
	app := NewApp()
	host := plugin.NewHost()
	ctrl := control.New(control.Options{Host: host})
	root := t.TempDir()
	app.mu.Lock()
	app.tabs = map[string]*WorkspaceTab{
		"t1": {
			ID: "t1", Scope: "project", WorkspaceRoot: root, Ready: true,
			Ctrl: ctrl, disabledMCP: map[string]ServerView{},
		},
	}
	app.tabOrder = []string{"t1"}
	app.activeTabID = "t1"
	app.mu.Unlock()

	gotRoot, gotHost := app.activeDiagSnapshot(true)
	if gotRoot != root {
		t.Fatalf("root = %q, want %q", gotRoot, root)
	}
	if gotHost != host {
		t.Fatal("host mismatch from atomic snapshot")
	}
}

func TestCapabilityDiagnosticsRuntimeUnavailableWithoutTab(t *testing.T) {
	isolateDesktopUserDirs(t)
	app := NewApp()
	// Explicitly empty tabs.
	app.mu.Lock()
	app.tabs = map[string]*WorkspaceTab{}
	app.tabOrder = nil
	app.activeTabID = ""
	app.mu.Unlock()

	report := app.CapabilityDiagnostics(true)
	found := false
	for _, is := range report.Issues {
		if is.Code == "mcp.runtime_unavailable" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected mcp.runtime_unavailable, issues=%+v", report.Issues)
	}
}
