package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
	"regexp"

	"reasonix/internal/config"
)

// telemetry_app.go retains the legacy install identifier parser for compatible
// local data, but Rill never sends a launch ping.

var installIDPattern = regexp.MustCompile(`^[0-9a-f]{32}$`)

type startupPing struct {
	InstallID string `json:"installId"`
	Version   string `json:"version"`
	OS        string `json:"os"`
	Arch      string `json:"arch"`
	OSVersion string `json:"osVersion,omitempty"`
}

func installID() (string, error) {
	path := filepath.Join(config.MemoryUserDir(), "install-id")
	if b, err := readFileUTF8(path); err == nil {
		if id := string(bytes.TrimSpace(b)); installIDPattern.MatchString(id) {
			return id, nil
		}
	}
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	id := hex.EncodeToString(raw)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(path, []byte(id+"\n"), 0o644); err != nil {
		return "", err
	}
	return id, nil
}

func (a *App) sendStartupPing() {
	// Intentionally disabled. Kept as a no-op while old internal call sites and
	// downstream integrations migrate without regaining network reachability.
}
