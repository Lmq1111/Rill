//go:build windows

package main

import (
	"os/exec"
	"strings"
	"syscall"
)

func nativeRecoveryChoice() recoveryChoice {
	script := `Add-Type -AssemblyName PresentationFramework; $r=[System.Windows.MessageBox]::Show('Rill failed to start repeatedly. Yes: repair configuration and start. No: start in Safe Mode. Cancel: quit.','Rill Recovery','YesNoCancel','Warning'); Write-Output $r`
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.Output()
	if err != nil {
		return recoverySafeMode
	}
	switch strings.TrimSpace(string(out)) {
	case "Yes":
		return recoveryRepair
	case "No":
		return recoverySafeMode
	default:
		return recoveryQuit
	}
}
