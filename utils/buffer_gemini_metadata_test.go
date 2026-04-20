package utils

import (
	"chat/globals"
	"fmt"
	"strings"
	"testing"
)

func TestBufferGeminiMetadataAccumulationIsBoundedAndDeduped(t *testing.T) {
	buffer := &Buffer{}
	overLimit := strings.Repeat("y", globals.GeminiThoughtSignatureMaxBytes+1)

	buffer.SetGeminiHiddenMetadata(&globals.GeminiHiddenMetadata{
		ThoughtSignatures: []string{" a ", "a", "", overLimit, "b"},
	})

	signatures := []string{"b", " c "}
	for i := 0; i < globals.GeminiThoughtSignatureLimit+10; i++ {
		signatures = append(signatures, fmt.Sprintf("sig-%02d", i))
	}
	buffer.SetGeminiHiddenMetadata(&globals.GeminiHiddenMetadata{
		ThoughtSignatures: signatures,
	})

	metadata := buffer.GetGeminiHiddenMetadata()
	if metadata == nil {
		t.Fatalf("expected metadata to be present")
	}

	if len(metadata.ThoughtSignatures) != globals.GeminiThoughtSignatureLimit {
		t.Fatalf("expected %d signatures, got %d", globals.GeminiThoughtSignatureLimit, len(metadata.ThoughtSignatures))
	}

	if metadata.ThoughtSignatures[0] != "a" || metadata.ThoughtSignatures[1] != "b" || metadata.ThoughtSignatures[2] != "c" {
		t.Fatalf("unexpected leading signatures order: %#v", metadata.ThoughtSignatures[:3])
	}
}

func TestBufferMetadataOnlyDoesNotCountAsVisiblePayload(t *testing.T) {
	buffer := &Buffer{}
	buffer.SetGeminiHiddenMetadata(&globals.GeminiHiddenMetadata{
		ThoughtSignatures: []string{"sig-1"},
	})

	if !buffer.IsEmpty() {
		t.Fatalf("expected metadata-only buffer to remain empty for visible payload semantics")
	}

	if !buffer.HasHiddenMetadataOnly() {
		t.Fatalf("expected hidden metadata-only state to be detected")
	}

	if got := buffer.ReadWithDefault("fallback"); got != "fallback" {
		t.Fatalf("expected fallback output, got %q", got)
	}
}
