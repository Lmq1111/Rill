package skill_test

import (
	"strings"
	"testing"

	"reasonix/internal/skill"
)

func TestRillagentGuideBuiltinRegistered(t *testing.T) {
	store := skill.New(skill.Options{HomeDir: t.TempDir(), DisableBuiltins: false})
	sk, ok := store.Read("rillagent-guide")
	if !ok {
		t.Fatal("rillagent-guide must be registered as a builtin")
	}
	if sk.Scope != skill.ScopeBuiltin {
		t.Fatalf("scope = %s", sk.Scope)
	}
	if sk.RunAs != skill.RunInline {
		t.Fatalf("runAs = %s", sk.RunAs)
	}
	if sk.Description == "" {
		t.Fatal("description required for index line")
	}
	if !strings.Contains(sk.Body, "doctor capabilities") {
		t.Fatal("body missing doctor capabilities guidance")
	}
}

func TestRillagentGuideIndexLineOnly(t *testing.T) {
	store := skill.New(skill.Options{HomeDir: t.TempDir()})
	list := store.List()
	var guide skill.Skill
	found := false
	for _, s := range list {
		if s.Name == "rillagent-guide" {
			guide = s
			found = true
			break
		}
	}
	if !found {
		t.Fatal("rillagent-guide missing from List")
	}
	idx := skill.IndexBlock(list)
	if !strings.Contains(idx, "rillagent-guide") {
		t.Fatal("index missing rillagent-guide line")
	}
	// Body must not appear in the index block.
	if strings.Contains(idx, "First action") || strings.Contains(idx, skBodySnippet(guide)) {
		t.Fatal("skill body leaked into system-prompt index")
	}
	// Exactly one index line for the skill name.
	if c := strings.Count(idx, "- rillagent-guide"); c != 1 {
		t.Fatalf("index lines for rillagent-guide = %d, want 1", c)
	}
}

func skBodySnippet(sk skill.Skill) string {
	body := strings.TrimSpace(sk.Body)
	if len(body) > 40 {
		return body[:40]
	}
	return body
}

func TestRillagentGuideOverriddenByProject(t *testing.T) {
	home := t.TempDir()
	root := t.TempDir()
	store := skill.New(skill.Options{HomeDir: home, ProjectRoot: root})
	// Create project override.
	path, err := store.CreateWithContent("rillagent-guide", skill.ScopeProject, "---\ndescription: override\nrunAs: inline\n---\nproject body\n")
	if err != nil {
		t.Fatal(err)
	}
	_ = path
	store2 := skill.New(skill.Options{HomeDir: home, ProjectRoot: root})
	sk, ok := store2.Read("rillagent-guide")
	if !ok {
		t.Fatal("expected override")
	}
	if sk.Scope != skill.ScopeProject {
		t.Fatalf("scope = %s, want project", sk.Scope)
	}
	if !strings.Contains(sk.Body, "project body") {
		t.Fatalf("body = %q", sk.Body)
	}
}

func TestRillagentGuideDisabled(t *testing.T) {
	store := skill.New(skill.Options{
		HomeDir:       t.TempDir(),
		DisabledNames: []string{"rillagent-guide"},
	})
	if _, ok := store.Read("rillagent-guide"); ok {
		t.Fatal("disabled builtin should not be readable")
	}
	for _, s := range store.List() {
		if s.Name == "rillagent-guide" {
			t.Fatal("disabled builtin should not be listed")
		}
	}
}

func TestRillagentGuideIndexStableAcrossCalls(t *testing.T) {
	store := skill.New(skill.Options{HomeDir: t.TempDir()})
	a := skill.IndexBlock(store.List())
	b := skill.IndexBlock(store.List())
	if a != b {
		t.Fatal("skills index not byte-stable across List calls")
	}
}
