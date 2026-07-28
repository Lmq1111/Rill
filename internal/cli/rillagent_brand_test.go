package cli

import (
	"strings"
	"testing"
)

func TestRillagentVersionOutput(t *testing.T) {
	out := captureStdout(t, func() {
		if rc := Run([]string{"version"}, "0.1.0"); rc != 0 {
			t.Fatalf("Run(version) = %d, want 0", rc)
		}
	})
	if out != "Rillagent v0.1.0\n" {
		t.Fatalf("version output = %q, want %q", out, "Rillagent v0.1.0\\n")
	}
}

func TestRillagentHelpUsesNewCLIName(t *testing.T) {
	out := captureStdout(t, func() {
		if rc := Run([]string{"help"}, "0.1.0"); rc != 0 {
			t.Fatalf("Run(help) = %d, want 0", rc)
		}
	})
	if !strings.Contains(out, "Rillagent") || !strings.Contains(out, "rillagent") {
		t.Fatalf("help does not contain Rillagent command branding:\n%s", out)
	}
	if strings.Contains(out, "Reasonix") || strings.Contains(out, "reasonix ") {
		t.Fatalf("help contains old product branding:\n%s", out)
	}
}
