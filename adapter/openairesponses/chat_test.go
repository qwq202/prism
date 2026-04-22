package openairesponses

import (
	adaptercommon "chat/adapter/common"
	"chat/globals"
	"testing"
)

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

func TestGetChatBodyDisablesStoreForXAIImageRequests(t *testing.T) {
	instance := &ChatInstance{}
	props := &adaptercommon.ChatProps{
		Model:       "grok-4-1-fast-reasoning",
		ChannelType: globals.XAIChannelType,
		Message: []globals.Message{
			{
				Role:    globals.User,
				Content: "![image](https://example.com/test.png)\n这是什么",
			},
		},
	}

	body := instance.GetChatBody(props, false)
	if body.Store == nil || *body.Store {
		t.Fatalf("expected xai image requests to set store=false")
	}
	if len(body.Input) != 1 || len(body.Input[0].Content) != 2 {
		t.Fatalf("unexpected input payload shape: %#v", body.Input)
	}
	if body.Input[0].Content[1].Detail != nil {
		t.Fatalf("expected xai input image detail to be omitted")
	}
}

func TestGetChatBodyLeavesStoreUnsetForTextOnlyXAIRequests(t *testing.T) {
	instance := &ChatInstance{}
	props := &adaptercommon.ChatProps{
		Model:       "grok-4-1-fast-reasoning",
		ChannelType: globals.XAIChannelType,
		Message: []globals.Message{
			{
				Role:    globals.User,
				Content: "你好",
			},
		},
	}

	body := instance.GetChatBody(props, false)
	if body.Store != nil {
		t.Fatalf("expected text-only xai requests to leave store unset")
	}
}

func TestGetChatBodyKeepsDetailForNonXAIImageRequests(t *testing.T) {
	instance := &ChatInstance{}
	props := &adaptercommon.ChatProps{
		Model:       "gpt-4.1",
		ChannelType: globals.OpenAIResponsesChannelType,
		Message: []globals.Message{
			{
				Role:    globals.User,
				Content: "![image](https://example.com/test.png)\n这是什么",
			},
		},
	}

	body := instance.GetChatBody(props, false)
	if len(body.Input) != 1 || len(body.Input[0].Content) != 2 {
		t.Fatalf("unexpected input payload shape: %#v", body.Input)
	}
	if body.Input[0].Content[1].Detail == nil || *body.Input[0].Content[1].Detail != "high" {
		t.Fatalf("expected non-xai input image detail to stay high")
	}
}

func TestGetChatBodyKeepsSystemMessagesInXAIInput(t *testing.T) {
	instance := &ChatInstance{}
	props := &adaptercommon.ChatProps{
		Model:       "grok-4-1-fast-reasoning",
		ChannelType: globals.XAIChannelType,
		Message: []globals.Message{
			{
				Role:    globals.System,
				Content: "你是一个有帮助的助手",
			},
			{
				Role:    globals.User,
				Content: "你好",
			},
		},
	}

	body := instance.GetChatBody(props, false)
	if body.Instructions != nil {
		t.Fatalf("expected xai requests not to use instructions, got %#v", body.Instructions)
	}
	if len(body.Input) != 2 {
		t.Fatalf("expected system+user input messages, got %#v", body.Input)
	}
	if body.Input[0].Role != globals.System {
		t.Fatalf("expected first xai input role to stay system, got %q", body.Input[0].Role)
	}
	if body.Input[0].Content[0].Text == nil || *body.Input[0].Content[0].Text != "你是一个有帮助的助手" {
		t.Fatalf("expected system prompt to stay in input, got %#v", body.Input[0].Content)
	}
}

func TestGetChatBodyAddsXAIImageAndVideoUnderstandingTools(t *testing.T) {
	instance := &ChatInstance{}
	props := &adaptercommon.ChatProps{
		Model:           "grok-4-1-fast-reasoning",
		ChannelType:     globals.XAIChannelType,
		EnableWebSearch: true,
		EnableXSearch:   true,
		ResponseFormat:  map[string]interface{}{"type": "json_object"},
		Message: []globals.Message{
			{
				Role:    globals.User,
				Content: "帮我搜一下",
			},
		},
	}

	body := instance.GetChatBody(props, true)
	if len(body.Tools) != 2 {
		t.Fatalf("expected 2 builtin xai tools, got %#v", body.Tools)
	}
	if body.Tools[0].Type != "web_search" || body.Tools[0].EnableImageUnderstanding == nil || !*body.Tools[0].EnableImageUnderstanding {
		t.Fatalf("expected web_search to enable image understanding, got %#v", body.Tools[0])
	}
	if body.Tools[1].Type != "x_search" || body.Tools[1].EnableVideoUnderstanding == nil || !*body.Tools[1].EnableVideoUnderstanding {
		t.Fatalf("expected x_search to enable video understanding, got %#v", body.Tools[1])
	}
	if len(body.Include) != 1 || body.Include[0] != "verbose_streaming" {
		t.Fatalf("expected xai stream body to request verbose streaming, got %#v", body.Include)
	}
	if body.ResponseFormat == nil {
		t.Fatalf("expected response format to pass through")
	}
}
