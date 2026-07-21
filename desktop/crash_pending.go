package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime/debug"

	"reasonix/internal/config"
)

// crash_pending.go captures Go-side panics to a local, scrubbed file. Rill never
// uploads or consumes this record automatically; local diagnostics may expose it
// only through an explicit user action.

const pendingCrashFile = "crash-pending.json"

func pendingCrashPath() string {
	return filepath.Join(config.MemoryUserDir(), pendingCrashFile)
}

// recoverToPending records a panicking goroutine to the pending-crash file and
// re-raises, so the process still crashes exactly as before.
func (a *App) recoverToPending(site string) {
	r := recover()
	if r == nil {
		return
	}
	writePendingCrash(site, r, debug.Stack())
	panic(r)
}

func writePendingCrash(site string, r any, stack []byte) {
	stackText := string(stack)
	msg := sanitizeCrashText(fmt.Sprintf("[go panic] %s: %v\n\n%s", site, r, stackText), maxCrashDetailBytes)
	report := baseCrashReport("crash")
	report.SchemaVersion = 2
	report.Source = "go"
	report.Label = sanitizeCrashField(site, 64)
	report.ErrorType = sanitizeCrashField(fmt.Sprintf("%T", r), 128)
	report.ErrorMessage = sanitizeCrashText(fmt.Sprint(r), maxCrashFieldBytes)
	report.Stack = sanitizeCrashText(stackText, maxCrashStackBytes)
	report.TopFrame = topFrameFromStack(report.Stack)
	report.Message = msg
	_ = writePendingReport(report, true)
}

func writePendingReport(report crashReport, overwrite bool) bool {
	body, err := json.Marshal(report)
	if err != nil {
		return false
	}
	path := pendingCrashPath()
	if os.MkdirAll(filepath.Dir(path), 0o755) != nil {
		return false
	}
	if overwrite {
		return os.WriteFile(path, body, 0o644) == nil
	}
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return false
	}
	defer f.Close()
	n, err := f.Write(body)
	if err != nil || n != len(body) {
		_ = os.Remove(path)
		return false
	}
	return true
}

func (a *App) goSafe(site string, fn func()) {
	go func() {
		defer a.recoverToPending(site)
		fn()
	}()
}

// flushPendingCrash is retained for compatibility but deliberately leaves the
// local record untouched. Rill never uploads crash data during startup.
func (a *App) flushPendingCrash() {
	// Local-only by design.
}
