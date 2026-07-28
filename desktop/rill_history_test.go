package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestListAllSessionsAggregatesKnownProjectSessionDirs(t *testing.T) {
	isolateDesktopUserDirs(t)

	projectA := t.TempDir()
	projectB := t.TempDir()
	if err := addProject(projectA, "Project Alpha"); err != nil {
		t.Fatalf("add project A: %v", err)
	}
	if err := addProject(projectB, "Project Beta"); err != nil {
		t.Fatalf("add project B: %v", err)
	}

	dirA := desktopSessionDir(projectA)
	dirB := desktopSessionDir(projectB)
	if err := os.MkdirAll(dirA, 0o755); err != nil {
		t.Fatalf("mkdir project A sessions: %v", err)
	}
	if err := os.MkdirAll(dirB, 0o755); err != nil {
		t.Fatalf("mkdir project B sessions: %v", err)
	}
	pathA := writeTopicSessionWithPrompt(t, dirA, "alpha.jsonl", "topic_alpha", "Alpha topic", projectA, "alpha body", time.Now().Add(-time.Hour))
	pathB := writeTopicSessionWithPrompt(t, dirB, "beta.jsonl", "topic_beta", "Beta topic", projectB, "beta body", time.Now())

	got := NewApp().ListAllSessions()
	paths := make(map[string]SessionMeta, len(got))
	for _, item := range got {
		paths[filepath.Clean(item.Path)] = item
	}
	if _, ok := paths[filepath.Clean(pathA)]; !ok {
		t.Fatalf("ListAllSessions() missing project A session %q: %+v", pathA, got)
	}
	if _, ok := paths[filepath.Clean(pathB)]; !ok {
		t.Fatalf("ListAllSessions() missing project B session %q: %+v", pathB, got)
	}
	if len(got) < 2 || filepath.Clean(got[0].Path) != filepath.Clean(pathB) {
		t.Fatalf("ListAllSessions() should be newest-first, got %+v", got)
	}
}

func TestRestoreSessionToProjectMovesTrashedSessionToSelectedProject(t *testing.T) {
	isolateDesktopUserDirs(t)

	projectA := t.TempDir()
	projectB := t.TempDir()
	if err := addProject(projectA, "Project Alpha"); err != nil {
		t.Fatalf("add project A: %v", err)
	}
	if err := addProject(projectB, "Project Beta"); err != nil {
		t.Fatalf("add project B: %v", err)
	}
	dirA := desktopSessionDir(projectA)
	dirB := desktopSessionDir(projectB)
	if err := os.MkdirAll(dirA, 0o755); err != nil {
		t.Fatalf("mkdir project A sessions: %v", err)
	}
	pathA := writeTopicSessionWithPrompt(t, dirA, "move-me.jsonl", "topic_move", "Move me", projectA, "move body", time.Now())

	app := NewApp()
	if err := app.DeleteSession(pathA); err != nil {
		t.Fatalf("delete project A session: %v", err)
	}
	trashed := app.ListTrashedSessions()
	if len(trashed) != 1 {
		t.Fatalf("trashed sessions = %+v, want one", trashed)
	}
	preview, err := app.PreviewTrashedSession(trashed[0].Path)
	if err != nil || len(preview) == 0 {
		t.Fatalf("preview trashed session: messages=%+v err=%v", preview, err)
	}
	unregistered := t.TempDir()
	if err := app.RestoreSessionToProject(trashed[0].Path, unregistered); err == nil {
		t.Fatal("restore to an unregistered project should fail")
	}
	if _, err := os.Stat(trashed[0].Path); err != nil {
		t.Fatalf("failed restore must preserve the trash entry: %v", err)
	}
	if err := app.RestoreSessionToProject(trashed[0].Path, projectB); err != nil {
		t.Fatalf("restore to project B: %v", err)
	}

	wantPath := filepath.Join(dirB, "move-me.jsonl")
	if _, err := os.Stat(wantPath); err != nil {
		t.Fatalf("selected project session missing at %q: %v", wantPath, err)
	}
	if _, err := os.Stat(pathA); !os.IsNotExist(err) {
		t.Fatalf("session should not restore to unavailable original project, stat err=%v", err)
	}
	all := app.ListAllSessions()
	var moved *SessionMeta
	for i := range all {
		if filepath.Clean(all[i].Path) == filepath.Clean(wantPath) {
			moved = &all[i]
			break
		}
	}
	if moved == nil || moved.Scope != "project" || filepath.Clean(moved.WorkspaceRoot) != filepath.Clean(projectB) {
		t.Fatalf("restored metadata should point to project B, got %+v", moved)
	}
}
