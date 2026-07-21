package agent

import (
	"context"
	"path/filepath"
	"testing"

	"reasonix/internal/agent/testutil"
	"reasonix/internal/event"
	"reasonix/internal/provider"
	"reasonix/internal/tool"
)

func TestClearModelContextKeepsHistoryAndFiltersNextProviderRequest(t *testing.T) {
	prov := testutil.NewMock("model", testutil.Turn{Text: "new answer"})
	session := NewSession("system prompt")
	session.Add(provider.Message{Role: provider.RoleUser, Content: "old question"})
	session.Add(provider.Message{Role: provider.RoleAssistant, Content: "old answer"})
	exec := New(prov, tool.NewRegistry(), session, Options{}, event.Discard)

	before := session.Snapshot()
	exec.ClearModelContext()
	if got := session.Snapshot(); !messagesEqualForStorageList(got, before) {
		t.Fatalf("history changed after clearing model context:\n got: %#v\nwant: %#v", got, before)
	}

	if err := exec.Run(context.Background(), "new question"); err != nil {
		t.Fatalf("Run: %v", err)
	}
	request := prov.LastRequest()
	if request == nil {
		t.Fatal("provider received no request")
	}
	if len(request.Messages) != 2 {
		t.Fatalf("provider messages = %#v, want only system prompt and new question", request.Messages)
	}
	if request.Messages[0].Role != provider.RoleSystem || request.Messages[0].Content != "system prompt" {
		t.Fatalf("provider system message = %#v", request.Messages[0])
	}
	if request.Messages[1].Role != provider.RoleUser || request.Messages[1].Content != "new question" {
		t.Fatalf("provider new user message = %#v", request.Messages[1])
	}

	history := session.Snapshot()
	if len(history) != len(before)+2 {
		t.Fatalf("history length = %d, want %d: %#v", len(history), len(before)+2, history)
	}
	if history[1].Content != "old question" || history[2].Content != "old answer" || history[3].Content != "new question" {
		t.Fatalf("history did not remain append-only: %#v", history)
	}
}

func TestLoadSessionRestoresModelContextStart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "session.jsonl")
	session := NewSession("system prompt")
	session.Add(provider.Message{Role: provider.RoleUser, Content: "old question"})
	session.Add(provider.Message{Role: provider.RoleAssistant, Content: "old answer"})
	if err := session.Save(path); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if err := SaveModelContextStart(path, session.Len()); err != nil {
		t.Fatalf("SaveModelContextStart: %v", err)
	}

	loaded, err := LoadSession(path)
	if err != nil {
		t.Fatalf("LoadSession: %v", err)
	}
	if got, want := loaded.ModelContextStart(), session.Len(); got != want {
		t.Fatalf("ModelContextStart = %d, want %d", got, want)
	}

	prov := testutil.NewMock("model", testutil.Turn{Text: "after restart"})
	exec := New(prov, tool.NewRegistry(), loaded, Options{}, event.Discard)
	if err := exec.Run(context.Background(), "new after restart"); err != nil {
		t.Fatalf("Run after restart: %v", err)
	}
	request := prov.LastRequest()
	if request == nil || len(request.Messages) != 2 {
		t.Fatalf("provider request after restart = %#v, want isolated system + new user", request)
	}
	if request.Messages[1].Content != "new after restart" {
		t.Fatalf("provider request after restart leaked old context: %#v", request.Messages)
	}
}
