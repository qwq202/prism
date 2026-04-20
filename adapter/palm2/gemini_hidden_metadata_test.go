package palm2

import (
	"chat/globals"
	"testing"
)

func ptrString(value string) *string {
	return &value
}

func TestGetGeminiContentsReplaySignaturesOnFunctionCalls(t *testing.T) {
	instance := &ChatInstance{}
	toolCalls := globals.ToolCalls{
		{
			Type: "function",
			Id:   "call-1",
			Function: globals.ToolCallFunction{
				Name:      "lookup_weather",
				Arguments: `{"city":"shanghai"}`,
			},
		},
		{
			Type: "function",
			Id:   "call-2",
			Function: globals.ToolCallFunction{
				Name:      "lookup_air_quality",
				Arguments: `{"city":"shanghai"}`,
			},
		},
	}

	messages := []globals.Message{
		{
			Role:    globals.User,
			Content: "Need weather and AQI",
		},
		{
			Role:      globals.Assistant,
			ToolCalls: &toolCalls,
			GeminiHiddenMetadata: &globals.GeminiHiddenMetadata{
				ThoughtSignatures: []string{" sig-first ", "sig-second", "sig-overflow"},
			},
		},
	}

	contents := instance.GetGeminiContents("gemini-3.0-flash", messages)
	if len(contents) != 2 {
		t.Fatalf("expected 2 gemini contents, got %d", len(contents))
	}

	parts := contents[1].Parts
	if len(parts) != 3 {
		t.Fatalf("expected 3 parts (2 function calls + 1 metadata-only), got %d", len(parts))
	}

	if parts[0].FunctionCall == nil || parts[0].FunctionCall.Name != "lookup_weather" {
		t.Fatalf("expected first part to keep first function call, got %#v", parts[0].FunctionCall)
	}
	if parts[0].ThoughtSignature == nil || *parts[0].ThoughtSignature != "sig-first" {
		t.Fatalf("expected first function call to carry first signature, got %#v", parts[0].ThoughtSignature)
	}

	if parts[1].FunctionCall == nil || parts[1].FunctionCall.Name != "lookup_air_quality" {
		t.Fatalf("expected second part to keep second function call, got %#v", parts[1].FunctionCall)
	}
	if parts[1].ThoughtSignature == nil || *parts[1].ThoughtSignature != "sig-second" {
		t.Fatalf("expected second function call to carry second signature, got %#v", parts[1].ThoughtSignature)
	}

	if parts[2].ThoughtSignature == nil || *parts[2].ThoughtSignature != "sig-overflow" {
		t.Fatalf("expected overflow signature to be preserved, got %#v", parts[2].ThoughtSignature)
	}
	if !parts[2].Thought || parts[2].Text != nil || parts[2].FunctionCall != nil || parts[2].FunctionResponse != nil {
		t.Fatalf("expected overflow signature part to be metadata-only thought part, got %#v", parts[2])
	}
}

func TestGetGeminiContentsKeepsSignatureBoundariesAcrossSameRoleMessages(t *testing.T) {
	instance := &ChatInstance{}
	messages := []globals.Message{
		{
			Role:    globals.User,
			Content: "start",
		},
		{
			Role:    globals.Assistant,
			Content: "first",
			GeminiHiddenMetadata: &globals.GeminiHiddenMetadata{
				ThoughtSignatures: []string{"sig-first"},
			},
		},
		{
			Role:    globals.Assistant,
			Content: "second",
		},
	}

	contents := instance.GetGeminiContents("gemini-3.0-flash", messages)
	if len(contents) != 3 {
		t.Fatalf("expected signature-bearing assistant content to keep a boundary, got %d contents", len(contents))
	}

	if contents[1].Role != GeminiModelType || contents[2].Role != GeminiModelType {
		t.Fatalf("expected both assistant messages to map to model role, got %#v", contents)
	}
}

func TestGetGeminiChunkCapturesThoughtSignatures(t *testing.T) {
	instance := &ChatInstance{}
	response := GeminiChatResponse{
		Candidates: []GeminiCandidate{
			{
				Content: GeminiContent{
					Parts: []GeminiChatPart{
						{Text: ptrString("hello ")},
						{Text: ptrString("world")},
						{ThoughtSignature: ptrString(" sig-a ")},
						{ThoughtSignature: ptrString("sig-a")},
						{ThoughtSignature: ptrString("sig-b")},
					},
				},
			},
		},
	}

	chunk, err := instance.GetGeminiChunk(response)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if chunk.Content != "hello world" {
		t.Fatalf("expected visible content to stay unchanged, got %q", chunk.Content)
	}

	if chunk.GeminiHiddenMetadata == nil {
		t.Fatalf("expected hidden metadata to be captured")
	}
	if len(chunk.GeminiHiddenMetadata.ThoughtSignatures) != 2 {
		t.Fatalf("expected deduped signatures, got %#v", chunk.GeminiHiddenMetadata.ThoughtSignatures)
	}
	if chunk.GeminiHiddenMetadata.ThoughtSignatures[0] != "sig-a" || chunk.GeminiHiddenMetadata.ThoughtSignatures[1] != "sig-b" {
		t.Fatalf("unexpected signature order/content: %#v", chunk.GeminiHiddenMetadata.ThoughtSignatures)
	}
}

func TestBuildGeminiChunkStreamMetadataOnly(t *testing.T) {
	instance := &ChatInstance{
		isFirstReasoning: true,
	}

	chunk := instance.buildGeminiChunk([]GeminiChatPart{
		{
			Thought:          true,
			ThoughtSignature: ptrString("sig-final"),
		},
	}, true)

	if chunk.Content != "" {
		t.Fatalf("expected metadata-only stream part to keep empty visible content, got %q", chunk.Content)
	}

	if chunk.GeminiHiddenMetadata == nil || len(chunk.GeminiHiddenMetadata.ThoughtSignatures) != 1 {
		t.Fatalf("expected metadata-only stream chunk to keep signature, got %#v", chunk.GeminiHiddenMetadata)
	}
	if chunk.GeminiHiddenMetadata.ThoughtSignatures[0] != "sig-final" {
		t.Fatalf("unexpected stream signature value: %#v", chunk.GeminiHiddenMetadata.ThoughtSignatures)
	}

	if chunk.IsEmpty() {
		t.Fatalf("metadata-only stream chunk must be non-empty for forwarding")
	}
}
