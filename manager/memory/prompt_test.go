package memory

import (
	"strings"
	"testing"
)

func TestBuildMemoryPromptExplainsInjectedMemoryAccess(t *testing.T) {
	prompt := BuildMemoryPrompt([]Record{
		{
			ID:      1,
			Content: "User likes Genshin Impact.",
		},
	})

	if !strings.Contains(prompt, "These are memories stored via the memory tool") {
		t.Fatalf("expected memory tool explanation, got %q", prompt)
	}

	if !strings.Contains(prompt, "Do not claim to browse a separate memory database") {
		t.Fatalf("expected database browsing restriction, got %q", prompt)
	}

	if !strings.Contains(prompt, "## Memories") {
		t.Fatalf("expected memories section, got %q", prompt)
	}
}
