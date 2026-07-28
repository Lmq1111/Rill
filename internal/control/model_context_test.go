package control

import (
	"path/filepath"
	"testing"

	"reasonix/internal/agent"
	"reasonix/internal/event"
	"reasonix/internal/provider"
	"reasonix/internal/tool"
)

func TestClearModelContextPersistsBoundaryWithoutChangingHistory(t *testing.T) {
	path := filepath.Join(t.TempDir(), "session.jsonl")
	session := agent.NewSession("system prompt")
	session.Add(provider.Message{Role: provider.RoleUser, Content: "old question"})
	session.Add(provider.Message{Role: provider.RoleAssistant, Content: "old answer"})
	exec := agent.New(nil, tool.NewRegistry(), session, agent.Options{}, event.Discard)
	ctrl := New(Options{
		Runner:      exec,
		Executor:    exec,
		SessionPath: path,
	})
	before := ctrl.History()

	if err := ctrl.ClearModelContext(); err != nil {
		t.Fatalf("ClearModelContext: %v", err)
	}
	after := ctrl.History()
	if len(after) != len(before) {
		t.Fatalf("history length after clear = %d, want %d", len(after), len(before))
	}
	for i := range before {
		if before[i].Role != after[i].Role || before[i].Content != after[i].Content {
			t.Fatalf("history message %d changed: got %#v want %#v", i, after[i], before[i])
		}
	}
	if got, want := session.ModelContextStart(), len(before); got != want {
		t.Fatalf("in-memory model context start = %d, want %d", got, want)
	}

	meta, ok, err := agent.LoadBranchMeta(path)
	if err != nil || !ok {
		t.Fatalf("LoadBranchMeta: ok=%v err=%v", ok, err)
	}
	if got, want := meta.ModelContextStart, len(before); got != want {
		t.Fatalf("persisted model context start = %d, want %d", got, want)
	}
	loaded, err := agent.LoadSession(path)
	if err != nil {
		t.Fatalf("LoadSession: %v", err)
	}
	if got, want := loaded.ModelContextStart(), len(before); got != want {
		t.Fatalf("restored model context start = %d, want %d", got, want)
	}
}
