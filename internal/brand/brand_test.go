package brand

import "testing"

func TestRillBrandContract(t *testing.T) {
	tests := map[string]string{
		"ProductName":   ProductName,
		"Slogan":        Slogan,
		"CLIBrand":      CLIBrand,
		"Executable":    Executable,
		"Version":       Version,
		"BundleID":      BundleID,
		"ProjectConfig": ProjectConfig,
		"ProjectDir":    ProjectDir,
	}
	want := map[string]string{
		"ProductName":   "Rill",
		"Slogan":        "Let intelligence flow.",
		"CLIBrand":      "Rillagent",
		"Executable":    "rillagent",
		"Version":       "0.1.0",
		"BundleID":      "io.github.lmq1111.rill",
		"ProjectConfig": "rillagent.toml",
		"ProjectDir":    ".rillagent",
	}
	for name, value := range tests {
		if value != want[name] {
			t.Errorf("%s = %q, want %q", name, value, want[name])
		}
	}
}
