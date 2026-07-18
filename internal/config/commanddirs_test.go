package config

import (
	"path/filepath"
	"strings"
	"testing"
)

// TestCommandDirsUseOnlyRillagentConventions verifies project commands cannot
// leak in from old-brand or cross-tool directories.
func TestCommandDirsUseOnlyRillagentConventions(t *testing.T) {
	root := t.TempDir()
	dirs := CommandDirsForRoot(root)
	joined := strings.Join(dirs, "\n")
	want := filepath.Join(root, ".rillagent", "commands")
	if !strings.Contains(joined, want) {
		t.Fatalf("CommandDirs missing %q\ngot:\n%s", want, joined)
	}
	for _, forbidden := range []string{".reasonix", ".ldagent", ".claude", ".agents", ".agent"} {
		if strings.Contains(joined, filepath.Join(root, forbidden, "commands")) {
			t.Errorf("CommandDirs unexpectedly includes %s commands:\n%s", forbidden, joined)
		}
	}
	// The project's .rillagent/commands must be the highest-priority (last) entry.
	if last := dirs[len(dirs)-1]; last != want {
		t.Errorf("project .rillagent/commands should be highest priority (last), got %q", last)
	}
}
