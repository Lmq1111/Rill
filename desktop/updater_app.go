package main

import (
	"context"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"reasonix/desktop/internal/update"
)

// updater_app.go retains the legacy binding surface while enforcing Rill's
// manual-only update policy. No bound method checks, downloads, or installs an
// update; only an explicit browser action opens the public Rill Releases page.

// Version returns the build version injected via -ldflags (see main.go). The
// frontend displays it; CheckUpdate compares against it.
func (a *App) Version() string { return version }

// CheckUpdate returns the local manual-only policy without network access.
func (a *App) CheckUpdate() (*UpdateInfo, error) {
	return &UpdateInfo{
		Current:       version,
		Channel:       channel,
		CanSelfUpdate: false,
		ManualOnly:    true,
		ManualReason:  manualUpdateReason(),
		DownloadURL:   downloadPage(),
	}, nil
}

// OpenDownloadPage opens the install page in the browser — the macOS manual-update
// path and a fallback link elsewhere.
func (a *App) OpenDownloadPage() {
	if a.ctx != nil {
		wruntime.BrowserOpenURL(a.ctx, downloadPage())
	}
}

// OpenRillReleases opens the public Rill release page directly. Unlike the
// legacy updater entry it performs no manifest lookup, so the Version & Privacy
// settings page always has a deterministic, user-triggered public link.
func (a *App) OpenRillReleases() {
	if a.ctx != nil {
		wruntime.BrowserOpenURL(a.ctx, downloadPageURL)
	}
}

// DownloadUpdate is disabled. Users explicitly open Rill Releases instead.
func (a *App) DownloadUpdate() (*UpdateDownloadResult, error) {
	return nil, nil
}

// InstallUpdate is disabled.
func (a *App) InstallUpdate() error {
	return nil
}

// ApplyUpdate is kept for older frontend bindings and tests. New UI code uses the
// explicit download → install split.
func (a *App) ApplyUpdate() error {
	return nil
}

// downloadVerify downloads the asset (streaming progress), verifies its minisign
// signature against the embedded public key, then its sha256. It returns the
// verified bytes and never touches disk on a bad signature.
func (a *App) downloadVerify(asset update.Asset) ([]byte, error) {
	c, err := httpClient()
	if err != nil {
		return nil, err
	}
	v4, _ := httpClientIPv4() // best-effort IPv4 fallback; nil just means retries reuse c
	data, err := download(a.reqCtx(), c, v4, asset.URL, asset.Size, func(rcv, total int64) {
		a.emitProgress("downloading", rcv, total, "")
	})
	if err != nil {
		return nil, err
	}
	a.emitProgress("verifying", asset.Size, asset.Size, "")
	sig, err := fetchBytes(a.reqCtx(), c, asset.Sig)
	if err != nil {
		return nil, err
	}
	if err := update.Verify(data, sig); err != nil {
		return nil, err
	}
	if err := checkSHA256(data, asset.SHA256); err != nil {
		return nil, err
	}
	return data, nil
}

// reqCtx is the context for updater HTTP calls — the Wails context once startup has
// run, else Background (CheckUpdate may, in theory, be reached before startup).
func (a *App) reqCtx() context.Context {
	if a.ctx != nil {
		return a.ctx
	}
	return context.Background()
}

func (a *App) emitProgress(phase string, received, total int64, errMsg string) {
	if a.ctx == nil {
		return
	}
	wruntime.EventsEmit(a.ctx, "updater:progress", updateProgress{
		Phase: phase, Received: received, Total: total, Err: errMsg,
	})
}

// failUpdate emits an error progress event and returns the error to the caller.
func (a *App) failUpdate(err error) error {
	a.recordUpdateError(err)
	a.emitProgress("error", 0, 0, err.Error())
	return err
}

func (a *App) recordUpdateError(err error) {
	if err == nil || version == "dev" {
		return
	}
	if m := a.metrics.Load(); m != nil {
		m.inc("updater_error", errorClass(err.Error()))
	}
}
