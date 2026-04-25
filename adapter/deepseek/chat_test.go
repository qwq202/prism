package deepseek

import (
	adaptercommon "chat/adapter/common"
	"chat/globals"
	"chat/utils"
	"testing"
)

func TestGetChatBodyStripsUnsupportedParamsForDeepseekV4ThinkingByDefault(t *testing.T) {
	instance := NewChatInstance("https://api.deepseek.com", "secret")
	effort := "high"

	body, ok := instance.GetChatBody(&adaptercommon.ChatProps{
		Model:            globals.DeepseekV4Pro,
		Message:          []globals.Message{{Role: globals.User, Content: "hello"}},
		Temperature:      utils.ToPtr(float32(0.7)),
		TopP:             utils.ToPtr(float32(0.9)),
		PresencePenalty:  utils.ToPtr(float32(0.1)),
		FrequencyPenalty: utils.ToPtr(float32(0.2)),
		Logprobs:         utils.ToPtr(true),
		TopLogprobs:      utils.ToPtr(2),
		ReasoningEffort:  &effort,
	}, false).(ChatRequest)
	if !ok {
		t.Fatalf("expected ChatRequest body")
	}

	if body.Temperature != nil || body.TopP != nil || body.PresencePenalty != nil || body.FrequencyPenalty != nil {
		t.Fatalf("expected sampling parameters to be stripped in deepseek v4 thinking mode, got %#v", body)
	}
	if body.Logprobs != nil || body.TopLogprobs != nil {
		t.Fatalf("expected logprobs parameters to be stripped in deepseek v4 thinking mode, got %#v", body)
	}
	if body.ReasoningEffort == nil || *body.ReasoningEffort != "high" {
		t.Fatalf("expected reasoning_effort to be preserved in thinking mode, got %#v", body.ReasoningEffort)
	}
}

func TestGetChatBodyKeepsSamplingForDeepseekV4NonThinking(t *testing.T) {
	instance := NewChatInstance("https://api.deepseek.com", "secret")
	effort := "high"

	body, ok := instance.GetChatBody(&adaptercommon.ChatProps{
		Model:            globals.DeepseekV4Flash,
		Message:          []globals.Message{{Role: globals.User, Content: "hello"}},
		Temperature:      utils.ToPtr(float32(0.7)),
		TopP:             utils.ToPtr(float32(0.9)),
		PresencePenalty:  utils.ToPtr(float32(0.1)),
		FrequencyPenalty: utils.ToPtr(float32(0.2)),
		Logprobs:         utils.ToPtr(true),
		TopLogprobs:      utils.ToPtr(2),
		ReasoningEffort:  &effort,
		Thinking:         map[string]interface{}{"type": "disabled"},
	}, false).(ChatRequest)
	if !ok {
		t.Fatalf("expected ChatRequest body")
	}

	if body.Temperature == nil || body.TopP == nil || body.PresencePenalty == nil || body.FrequencyPenalty == nil {
		t.Fatalf("expected sampling parameters to remain in deepseek v4 non-thinking mode, got %#v", body)
	}
	if body.Logprobs == nil || body.TopLogprobs == nil {
		t.Fatalf("expected logprobs parameters to remain in deepseek v4 non-thinking mode, got %#v", body)
	}
	if body.ReasoningEffort != nil {
		t.Fatalf("expected reasoning_effort to be omitted outside thinking mode, got %#v", body.ReasoningEffort)
	}
}
