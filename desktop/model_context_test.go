package main

import (
	"path/filepath"
	"testing"

	"reasonix/internal/agent"
	"reasonix/internal/control"
	"reasonix/internal/event"
	"reasonix/internal/provider"
	"reasonix/internal/tool"
)

func TestClearModelContextForTabKeepsSessionAndHistory(t *testing.T) {
	isolateDesktopUserDirs(t)
	root := t.TempDir()
	path := filepath.Join(root, "sessions", "session.jsonl")
	session := agent.NewSession("system prompt")
	session.Add(provider.Message{Role: provider.RoleUser, Content: "old question"})
	session.Add(provider.Message{Role: provider.RoleAssistant, Content: "old answer"})
	exec := agent.New(nil, tool.NewRegistry(), session, agent.Options{}, event.Discard)
	ctrl := control.New(control.Options{
		Runner:        exec,
		Executor:      exec,
		SessionDir:    filepath.Dir(path),
		SessionPath:   path,
		WorkspaceRoot: root,
	})
	app := &App{
		tabs:             map[string]*WorkspaceTab{},
		detachedSessions: map[string]*WorkspaceTab{},
		activeTabID:      "tab-a",
	}
	tab := &WorkspaceTab{
		ID:            "tab-a",
		Scope:         "project",
		WorkspaceRoot: root,
		SessionPath:   path,
		Ready:         true,
		Ctrl:          ctrl,
		disabledMCP:   map[string]ServerView{},
	}
	app.tabs[tab.ID] = tab

	before := app.HistoryForTab(tab.ID)
	if err := app.ClearModelContextForTab(tab.ID); err != nil {
		t.Fatalf("ClearModelContextForTab: %v", err)
	}
	after := app.HistoryForTab(tab.ID)
	if len(after) != len(before) {
		t.Fatalf("history length after clear = %d, want %d", len(after), len(before))
	}
	if ctrl.SessionPath() != path {
		t.Fatalf("session path rotated to %q, want %q", ctrl.SessionPath(), path)
	}
	meta, ok, err := agent.LoadBranchMeta(path)
	if err != nil || !ok {
		t.Fatalf("LoadBranchMeta: ok=%v err=%v", ok, err)
	}
	if got, want := meta.ModelContextStart, session.Len(); got != want {
		t.Fatalf("model context start = %d, want %d", got, want)
	}
	context := app.ContextUsageForTab(tab.ID)
	if !context.ModelContextCleared || context.ModelContextStart != session.Len() {
		t.Fatalf("context state after clear = %+v", context)
	}
}
