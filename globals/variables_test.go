package globals

import "testing"

func TestIsOpenAIResponsesNativeWebModel(t *testing.T) {
	if !IsOpenAIResponsesNativeWebModel("gpt-5.3-chat-latest") {
		t.Fatalf("expected gpt-5.3-chat-latest to support native web")
	}

	if !IsOpenAIResponsesNativeWebModel("gpt-5.4-pro") {
		t.Fatalf("expected gpt-5.4-pro to support native web")
	}

	if IsOpenAIResponsesNativeWebModel("o1") {
		t.Fatalf("expected o1 to not support native web")
	}

	if IsOpenAIResponsesNativeWebModel("gpt-4.5-preview") {
		t.Fatalf("expected gpt-4.5-preview to not support native web")
	}
}

func TestNormalizeOpenAIResponsesReasoningEffort(t *testing.T) {
	if got := NormalizeOpenAIResponsesReasoningEffort("gpt-5.2", "xhigh", false); got != "xhigh" {
		t.Fatalf("expected xhigh for gpt-5.2, got %q", got)
	}

	if got := NormalizeOpenAIResponsesReasoningEffort("gpt-5.4-pro", "medium", false); got != "medium" {
		t.Fatalf("expected medium for gpt-5.4-pro, got %q", got)
	}

	if got := NormalizeOpenAIResponsesReasoningEffort("gpt-5-pro", "low", false); got != "" {
		t.Fatalf("expected low to be unsupported for gpt-5-pro, got %q", got)
	}

	if got := NormalizeOpenAIResponsesReasoningEffort("gpt-5.2-chat-latest", "medium", false); got != "" {
		t.Fatalf("expected gpt-5.2-chat-latest to not expose reasoning control, got %q", got)
	}

	if got := NormalizeOpenAIResponsesReasoningEffort("gpt-5", "minimal", true); got != "low" {
		t.Fatalf("expected minimal to downgrade to low when native web is enabled, got %q", got)
	}

	if got := NormalizeOpenAIResponsesReasoningEffort("o1", "none", false); got != "" {
		t.Fatalf("expected none to be unsupported for o1, got %q", got)
	}
}
