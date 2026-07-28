package plugin

import (
	"context"
	"runtime"
	"strings"
	"testing"

	"reasonix/internal/secrets"
)

func TestStdioShellPATHProbeFiltersEnvWhenEnabled(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("POSIX shell probe")
	}
	secrets.SetFilterSubprocessEnv(true)
	t.Cleanup(func() { secrets.SetFilterSubprocessEnv(false) })
	t.Setenv("RILLAGENT_TEST_SECRET_TOKEN", "ghp_abcdefghijklmnopqrstuvwxyz")

	out := runShellPATHCommand(context.Background(), "/bin/sh", []string{"-c", `printf 'tok=%s' "${RILLAGENT_TEST_SECRET_TOKEN:-none}"`})
	if !strings.Contains(string(out), "tok=none") {
		t.Fatalf("stdio shell PATH probe leaked filtered env: %q", out)
	}
}

func TestMergeEnvRejectsRetiredProductNamespaces(t *testing.T) {
	base := []string{
		"PATH=/usr/bin",
		"REASONIX_HOME=/tmp/inherited-reasonix",
		"LDAGENT_HOME=/tmp/inherited-ldagent",
	}
	overrides := map[string]string{
		"REASONIX_HOME":     "/tmp/explicit-reasonix",
		"LDAGENT_SAFE_MODE": "1",
		"RILLAGENT_HOME":    "/tmp/rill",
		"MCP_MODE":          "readonly",
	}

	joined := strings.Join(mergeEnv(base, overrides), "\n")
	for _, forbidden := range []string{"REASONIX_", "LDAGENT_", "/tmp/inherited-reasonix", "/tmp/inherited-ldagent", "/tmp/explicit-reasonix"} {
		if strings.Contains(joined, forbidden) {
			t.Fatalf("retired product environment leaked %q:\n%s", forbidden, joined)
		}
	}
	for _, want := range []string{"PATH=/usr/bin", "RILLAGENT_HOME=/tmp/rill", "MCP_MODE=readonly"} {
		if !strings.Contains(joined, want) {
			t.Fatalf("allowed environment %q was removed:\n%s", want, joined)
		}
	}
}
