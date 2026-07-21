package config

import "testing"

func TestRillUpstreamBackgroundFeaturesRemainDisabledForLegacyConfig(t *testing.T) {
	enabled := true
	c := Default()
	c.Desktop.CheckUpdates = &enabled
	c.Desktop.Telemetry = &enabled
	c.Desktop.Metrics = &enabled

	if c.DesktopCheckUpdates() {
		t.Fatal("legacy desktop.check_updates re-enabled background update checks")
	}
	if c.DesktopTelemetry() {
		t.Fatal("legacy desktop.telemetry re-enabled the upstream launch ping")
	}
	if c.DesktopMetrics() {
		t.Fatal("legacy desktop.metrics re-enabled upstream metrics")
	}
}
