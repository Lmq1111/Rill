package main

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"reasonix/internal/agent"
	agenttest "reasonix/internal/agent/testutil"
	"reasonix/internal/config"
	"reasonix/internal/control"
	"reasonix/internal/event"
	"reasonix/internal/tool"
)

type stageSevenAuditTransport struct {
	mu       sync.Mutex
	requests []string
}

func (t *stageSevenAuditTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	t.mu.Lock()
	t.requests = append(t.requests, req.Method+" "+req.URL.String())
	t.mu.Unlock()
	return nil, errors.New("stage-seven audit blocked unexpected HTTP request")
}

func (t *stageSevenAuditTransport) snapshot() []string {
	t.mu.Lock()
	defer t.mu.Unlock()
	return append([]string(nil), t.requests...)
}

func TestStageSevenZeroEgressAcrossDesktopLifecycle(t *testing.T) {
	isolateDesktopUserDirs(t)

	var proxyMu sync.Mutex
	var proxyRequests []string
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		proxyMu.Lock()
		proxyRequests = append(proxyRequests, r.Method+" "+r.Host+r.URL.String())
		proxyMu.Unlock()
		http.Error(w, "stage-seven audit proxy", http.StatusBadGateway)
	}))
	defer proxy.Close()
	t.Setenv("HTTP_PROXY", proxy.URL)
	t.Setenv("HTTPS_PROXY", proxy.URL)
	t.Setenv("NO_PROXY", "127.0.0.1,localhost")

	auditTransport := &stageSevenAuditTransport{}
	oldDefaultTransport := http.DefaultTransport
	http.DefaultTransport = auditTransport
	t.Cleanup(func() { http.DefaultTransport = oldDefaultTransport })

	app := NewApp()
	_ = app.DesktopStartupSettings()
	_ = app.Settings()
	_ = app.CapabilityDiagnostics(false)
	_ = app.Version()
	if _, err := app.CheckUpdate(); err != nil {
		t.Fatalf("CheckUpdate: %v", err)
	}

	events := make(chan event.Event, 32)
	sink := event.FuncSink(func(e event.Event) { events <- e })
	model := agenttest.NewMock("stage-seven-controlled", agenttest.Turn{Text: "controlled response"})
	exec := agent.New(model, tool.NewRegistry(), agent.NewSession("system"), agent.Options{}, sink)
	sessionDir := config.SessionDir()
	if err := os.MkdirAll(sessionDir, 0o755); err != nil {
		t.Fatalf("mkdir sessions: %v", err)
	}
	ctrl := control.New(control.Options{
		Runner:      exec,
		Executor:    exec,
		Sink:        sink,
		SessionDir:  sessionDir,
		SessionPath: agent.NewSessionPath(sessionDir, "stage-seven-controlled"),
		Label:       "stage-seven-controlled",
	})
	app.setTestCtrl(ctrl, "stage-seven-controlled")
	if err := app.NewSessionForTab("test"); err != nil {
		t.Fatalf("NewSessionForTab: %v", err)
	}
	if err := app.SubmitToTab("test", "exercise the controlled conversation path"); err != nil {
		t.Fatalf("SubmitToTab: %v", err)
	}
	deadline := time.After(5 * time.Second)
	for {
		select {
		case e := <-events:
			if e.Kind != event.TurnDone {
				continue
			}
			if e.Err != nil {
				t.Fatalf("controlled conversation failed: %v", e.Err)
			}
			goto conversationDone
		case <-deadline:
			t.Fatal("timed out waiting for controlled conversation")
		}
	}

conversationDone:
	if err := app.ReportCrash("crash", "local-only stage-seven error at /Users/private/work.go"); err != nil {
		t.Fatalf("ReportCrash: %v", err)
	}
	ctrl.Close()

	// A fresh bound object models the restart boundary. Reading the startup,
	// diagnostics, version, privacy, and update surfaces must remain local.
	restarted := NewApp()
	_ = restarted.DesktopStartupSettings()
	_ = restarted.Settings()
	_ = restarted.CapabilityDiagnostics(false)
	_ = restarted.Version()
	if _, err := restarted.CheckUpdate(); err != nil {
		t.Fatalf("CheckUpdate after restart: %v", err)
	}

	if got := auditTransport.snapshot(); len(got) != 0 {
		t.Fatalf("desktop lifecycle reached the default HTTP transport: %v", got)
	}
	proxyMu.Lock()
	gotProxy := append([]string(nil), proxyRequests...)
	proxyMu.Unlock()
	if len(gotProxy) != 0 {
		t.Fatalf("desktop lifecycle reached the audit proxy: %v", gotProxy)
	}
}

func TestStageSevenRillagentHomeSwitchKeepsAllLocalDataIsolated(t *testing.T) {
	base := t.TempDir()
	t.Setenv("RILLAGENT_STATE_HOME", "")
	t.Setenv("RILLAGENT_CACHE_HOME", "")

	type roots struct {
		config  string
		state   string
		cache   string
		session string
	}
	activate := func(name string) roots {
		home := filepath.Join(base, name)
		t.Setenv("RILLAGENT_HOME", home)
		return roots{
			config:  config.UserConfigPath(),
			state:   config.MemoryUserDir(),
			cache:   config.CacheDir(),
			session: config.SessionDir(),
		}
	}
	writeMarker := func(r roots, marker string) {
		t.Helper()
		for _, dir := range []string{filepath.Dir(r.config), r.state, r.cache, r.session} {
			if err := os.MkdirAll(dir, 0o755); err != nil {
				t.Fatalf("mkdir %s: %v", dir, err)
			}
		}
		for _, path := range []string{
			r.config,
			filepath.Join(r.state, "state.marker"),
			filepath.Join(r.cache, "cache.marker"),
			filepath.Join(r.session, "session.marker"),
		} {
			if err := os.WriteFile(path, []byte(marker), 0o600); err != nil {
				t.Fatalf("write marker %s: %v", path, err)
			}
		}
	}
	assertMarker := func(r roots, marker string) {
		t.Helper()
		for _, path := range []string{
			r.config,
			filepath.Join(r.state, "state.marker"),
			filepath.Join(r.cache, "cache.marker"),
			filepath.Join(r.session, "session.marker"),
		} {
			body, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("read marker %s: %v", path, err)
			}
			if strings.TrimSpace(string(body)) != marker {
				t.Fatalf("marker %s = %q, want %q", path, body, marker)
			}
		}
	}

	rootA := activate("profile-a")
	writeMarker(rootA, "profile-a")
	rootB := activate("profile-b")
	for _, path := range []string{rootB.config, filepath.Join(rootB.state, "state.marker"), filepath.Join(rootB.cache, "cache.marker"), filepath.Join(rootB.session, "session.marker")} {
		if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
			t.Fatalf("profile B observed profile A data at %s: %v", path, err)
		}
	}
	writeMarker(rootB, "profile-b")

	rootAAgain := activate("profile-a")
	assertMarker(rootAAgain, "profile-a")
	rootBAgain := activate("profile-b")
	assertMarker(rootBAgain, "profile-b")
}

func TestStageSevenModelFailureKeepsLocalConversationHistory(t *testing.T) {
	isolateDesktopUserDirs(t)
	events := make(chan event.Event, 32)
	sink := event.FuncSink(func(e event.Event) { events <- e })
	model := agenttest.NewMock("stage-seven-offline", agenttest.Turn{StreamError: errors.New("provider offline")})
	exec := agent.New(model, tool.NewRegistry(), agent.NewSession("system"), agent.Options{}, sink)
	ctrl := control.New(control.Options{Runner: exec, Executor: exec, Sink: sink, Label: "stage-seven-offline"})
	defer ctrl.Close()
	app := NewApp()
	app.setTestCtrl(ctrl, "stage-seven-offline")

	const prompt = "keep this local prompt when the provider is unavailable"
	if err := app.SubmitToTab("test", prompt); err != nil {
		t.Fatalf("SubmitToTab: %v", err)
	}
	deadline := time.After(5 * time.Second)
	for {
		select {
		case e := <-events:
			if e.Kind != event.TurnDone {
				continue
			}
			if e.Err == nil || !strings.Contains(e.Err.Error(), "provider offline") {
				t.Fatalf("turn error = %v, want provider offline", e.Err)
			}
			goto turnDone
		case <-deadline:
			t.Fatal("timed out waiting for failed provider turn")
		}
	}

turnDone:
	history := app.HistoryForTab("test")
	for _, message := range history {
		if message.Role == "user" && message.Content == prompt {
			return
		}
	}
	t.Fatalf("failed provider turn lost the local prompt: %+v", history)
}
