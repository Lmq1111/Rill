package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"reasonix/internal/config"
)

func TestStageSevenRuntimeNeverPostsUpstreamReports(t *testing.T) {
	isolateDesktopUserDirs(t)
	oldVersion := version
	t.Cleanup(func() {
		version = oldVersion
	})
	version = "v9.9.9"

	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		w.WriteHeader(http.StatusAccepted)
	}))
	defer srv.Close()
	t.Setenv("HTTP_PROXY", srv.URL)
	t.Setenv("HTTPS_PROXY", srv.URL)
	t.Setenv("NO_PROXY", "")
	writePendingCrash("stage-seven", "local crash", []byte("local stack"))
	metricsPath := filepath.Join(config.MemoryUserDir(), metricsPendingFile)
	writeCounters(metricsPath, counters{"turn": {"done": 1}})

	app := NewApp()
	app.sendStartupPing()
	app.flushPendingCrash()
	app.flushMetrics()
	if err := app.ReportCrash("feedback", "local-only report"); err != nil {
		t.Fatalf("ReportCrash should retain a local report: %v", err)
	}

	if got := hits.Load(); got != 0 {
		t.Fatalf("upstream reporting produced %d HTTP requests, want 0", got)
	}
	if _, err := os.Stat(pendingCrashPath()); err != nil {
		t.Fatalf("local crash record was not retained: %v", err)
	}
	if _, err := os.Stat(metricsPath); err != nil {
		t.Fatalf("local metrics record was not retained: %v", err)
	}
}

func TestStageSevenUpdaterIsManualRillReleasesOnly(t *testing.T) {
	if endpoints := manifestEndpoints(); len(endpoints) != 0 {
		t.Fatalf("automatic updater still has manifest endpoints: %v", endpoints)
	}
	if got := downloadPage(); got != "https://github.com/Lmq1111/Rill/releases" {
		t.Fatalf("downloadPage() = %q", got)
	}

	info, err := NewApp().CheckUpdate()
	if err != nil {
		t.Fatalf("CheckUpdate: %v", err)
	}
	if info == nil || !info.ManualOnly || info.CanSelfUpdate || info.DownloadURL != downloadPage() || info.Err != "" {
		t.Fatalf("CheckUpdate() = %+v, want local manual-only Rill Releases result", info)
	}
	result, err := NewApp().DownloadUpdate()
	if err != nil || result != nil {
		t.Fatalf("DownloadUpdate() = (%+v, %v), want disabled nil result", result, err)
	}
	if err := NewApp().InstallUpdate(); err != nil {
		t.Fatalf("InstallUpdate() = %v, want disabled result", err)
	}
	if err := NewApp().ApplyUpdate(); err != nil {
		t.Fatalf("ApplyUpdate() = %v, want disabled result", err)
	}
}

func TestStageSevenProductionSourcesContainNoUpstreamReportingOrUpdateDomains(t *testing.T) {
	for _, name := range []string{
		"crash_app.go",
		"crash_pending.go",
		"metrics_app.go",
		"telemetry_app.go",
		"updater.go",
		"updater_app.go",
	} {
		body, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		for _, forbidden := range []string{
			"crash.reasonix.io",
			"dl.reasonix.io",
			"github.com/esengine/DeepSeek-Reasonix/releases",
		} {
			if strings.Contains(string(body), forbidden) {
				t.Errorf("%s still contains forbidden upstream endpoint %q", name, forbidden)
			}
		}
	}
}

func TestStageSevenStartupDoesNotScheduleUpstreamBackgroundWork(t *testing.T) {
	body, err := os.ReadFile("app.go")
	if err != nil {
		t.Fatal(err)
	}
	for _, forbidden := range []string{
		"sendStartupPing",
		"flushPendingCrash",
		"flushMetrics",
		"newMetricsAggregator",
	} {
		if strings.Contains(string(body), forbidden) {
			t.Errorf("desktop startup still references %s", forbidden)
		}
	}
}

func TestStageSevenPrivacySettingsCannotBeReenabled(t *testing.T) {
	isolateDesktopUserDirs(t)
	app := NewApp()
	for name, set := range map[string]func(bool) error{
		"check updates": app.SetDesktopCheckUpdates,
		"telemetry":     app.SetDesktopTelemetry,
		"metrics":       app.SetDesktopMetrics,
	} {
		if err := set(true); err != nil {
			t.Fatalf("%s setter: %v", name, err)
		}
	}
	view := app.Settings()
	if view.CheckUpdates || view.Telemetry || view.Metrics {
		t.Fatalf("privacy settings were re-enabled: check=%v telemetry=%v metrics=%v", view.CheckUpdates, view.Telemetry, view.Metrics)
	}
}
