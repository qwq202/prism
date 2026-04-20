package openairesponses

import "testing"

func TestEmitReasoningSummaryStartsThinkBlock(t *testing.T) {
	started := false

	chunk := emitReasoningSummary("step 1", &started)
	if chunk == nil {
		t.Fatalf("expected reasoning chunk")
	}
	if chunk.Content != "<think>\nstep 1" {
		t.Fatalf("unexpected reasoning chunk content: %q", chunk.Content)
	}
	if !started {
		t.Fatalf("expected reasoning block to be marked as started")
	}
}

func TestEmitOutputTextClosesThinkBlockBeforeAnswer(t *testing.T) {
	reasoningStarted := true
	reasoningClosed := false

	chunk := emitOutputText("final answer", &reasoningStarted, &reasoningClosed)
	if chunk == nil {
		t.Fatalf("expected output chunk")
	}
	if chunk.Content != "\n</think>\n\nfinal answer" {
		t.Fatalf("unexpected output chunk content: %q", chunk.Content)
	}
	if !reasoningClosed {
		t.Fatalf("expected reasoning block to be closed")
	}
}

func TestEmitOutputTextWithoutReasoningLeavesAnswerUntouched(t *testing.T) {
	reasoningStarted := false
	reasoningClosed := false

	chunk := emitOutputText("final answer", &reasoningStarted, &reasoningClosed)
	if chunk == nil {
		t.Fatalf("expected output chunk")
	}
	if chunk.Content != "final answer" {
		t.Fatalf("unexpected output chunk content: %q", chunk.Content)
	}
}
