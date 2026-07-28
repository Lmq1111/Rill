package skill_test

import (
	"testing"

	"reasonix/internal/skill"
)

func TestRillagentGuideIsTheOnlyBrandedBuiltinGuide(t *testing.T) {
	store := skill.New(skill.Options{HomeDir: t.TempDir(), DisableBuiltins: false})
	if _, ok := store.Read("rillagent-guide"); !ok {
		t.Fatal("rillagent-guide must be registered as a builtin")
	}
	if _, ok := store.Read("reasonix-guide"); ok {
		t.Fatal("reasonix-guide must not remain registered")
	}
}
