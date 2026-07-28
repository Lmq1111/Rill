package config

import "testing"

func TestDefaultAutoPlanOff(t *testing.T) {
	if got := Default().Agent.AutoPlan; got != "off" {
		t.Fatalf("default auto_plan = %q, want off", got)
	}
}

func TestDefaultReasoningLanguageAuto(t *testing.T) {
	if got := Default().ReasoningLanguage(); got != "auto" {
		t.Fatalf("default reasoning_language = %q, want auto", got)
	}
}

func TestDefaultMemoryCompilerEnabled(t *testing.T) {
	cfg := Default()
	if !cfg.MemoryCompilerEnabled() {
		t.Fatal("default memory compiler = false, want true")
	}
	if got := cfg.MemoryCompilerVerbosity(); got != MemoryCompilerVerbosityObserve {
		t.Fatalf("default memory compiler verbosity = %q, want observe", got)
	}
}

func TestDefaultDesktopAppearanceAutoGraphite(t *testing.T) {
	cfg := Default()
	if got := cfg.DesktopTheme(); got != "auto" {
		t.Fatalf("default desktop theme = %q, want auto", got)
	}
	if got := cfg.DesktopThemeStyle(); got != "" {
		t.Fatalf("default desktop theme style = %q, want empty so frontend resolves graphite", got)
	}
}

func TestDefaultDesktopUpstreamReportingOff(t *testing.T) {
	cfg := Default()
	if cfg.DesktopCheckUpdates() || cfg.DesktopTelemetry() || cfg.DesktopMetrics() {
		t.Fatalf("default upstream features = check:%v telemetry:%v metrics:%v, want all false", cfg.DesktopCheckUpdates(), cfg.DesktopTelemetry(), cfg.DesktopMetrics())
	}
	enabled := true
	cfg.Desktop.CheckUpdates = &enabled
	cfg.Desktop.Telemetry = &enabled
	cfg.Desktop.Metrics = &enabled
	if cfg.DesktopCheckUpdates() || cfg.DesktopTelemetry() || cfg.DesktopMetrics() {
		t.Fatal("legacy explicit true values must not re-enable upstream features")
	}
}
