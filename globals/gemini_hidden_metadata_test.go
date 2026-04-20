package globals

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestGeminiHiddenMetadataUnmarshalLegacyThoughtSignature(t *testing.T) {
	raw := `{"thought_signature":" legacy-signature "}`

	var metadata GeminiHiddenMetadata
	if err := json.Unmarshal([]byte(raw), &metadata); err != nil {
		t.Fatalf("unexpected unmarshal error: %v", err)
	}

	if len(metadata.ThoughtSignatures) != 1 {
		t.Fatalf("expected 1 signature, got %d", len(metadata.ThoughtSignatures))
	}

	if metadata.ThoughtSignatures[0] != "legacy-signature" {
		t.Fatalf("unexpected signature value: %q", metadata.ThoughtSignatures[0])
	}
}

func TestNormalizeGeminiThoughtSignaturesBoundsAndDedupe(t *testing.T) {
	overLimit := strings.Repeat("x", GeminiThoughtSignatureMaxBytes+1)
	input := []string{
		" a ",
		"a",
		"",
		"b",
		overLimit,
		" c ",
	}

	result := NormalizeGeminiThoughtSignatures(input, 2)
	if len(result) != 2 {
		t.Fatalf("expected 2 signatures after limit, got %d", len(result))
	}

	if result[0] != "a" || result[1] != "b" {
		t.Fatalf("unexpected normalized signatures: %#v", result)
	}
}
