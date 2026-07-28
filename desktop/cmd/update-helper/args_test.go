package main

import (
	"strings"
	"testing"
)

func TestInstallerCommandLineIsSilentAndLeavesDFlagLast(t *testing.T) {
	got := installerCommandLine(`C:\Temp\Rill Installer.exe`, `D:\Tools\Rill App`)
	want := `"C:\Temp\Rill Installer.exe" /S /D=D:\Tools\Rill App`
	if got != want {
		t.Fatalf("installerCommandLine = %q, want %q", got, want)
	}
	if !strings.HasSuffix(got, `/D=D:\Tools\Rill App`) {
		t.Fatalf("/D= must be the final unquoted NSIS token, got %q", got)
	}
}
