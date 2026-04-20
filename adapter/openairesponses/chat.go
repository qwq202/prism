package openairesponses

import (
	adaptercommon "chat/adapter/common"
	"chat/globals"
	"chat/utils"
	"errors"
	"fmt"
	"strings"
)

func (c *ChatInstance) GetChatEndpoint() string {
	return fmt.Sprintf("%s/v1/responses", c.GetEndpoint())
}

func normalizeRole(role string) string {
	switch role {
	case globals.User, globals.Assistant:
		return role
	default:
		return globals.User
	}
}

func getMessageText(message globals.Message) string {
	if message.Content != "" {
		return message.Content
	}

	if message.FunctionCall != nil {
		return utils.Marshal(*message.FunctionCall)
	}

	if message.ToolCalls != nil {
		return utils.Marshal(*message.ToolCalls)
	}

	return ""
}

func formatInputMessage(props *adaptercommon.ChatProps, message globals.Message) *InputMessage {
	text := getMessageText(message)

	if normalizeRole(message.Role) == globals.User {
		content, urls := utils.ExtractImages(text, true)
		items := []InputMessageContent{
			{
				Type: "input_text",
				Text: &content,
			},
		}

		for _, rawURL := range urls {
			url := rawURL
			if props.Buffer != nil {
				if obj, err := utils.NewImage(url); err == nil {
					props.Buffer.AddImage(obj)
				}
			}

			items = append(items, InputMessageContent{
				Type:     "input_image",
				ImageURL: &url,
			})
		}

		return &InputMessage{
			Role:    globals.User,
			Content: items,
		}
	}

	return &InputMessage{
		Role: normalizeRole(message.Role),
		Content: []InputMessageContent{
			{
				Type: "input_text",
				Text: &text,
			},
		},
	}
}

func formatMessages(props *adaptercommon.ChatProps) ([]InputMessage, *string) {
	input := make([]InputMessage, 0, len(props.Message))
	instructions := make([]string, 0)

	for _, message := range props.Message {
		if message.Role == globals.System {
			text := strings.TrimSpace(getMessageText(message))
			if text != "" {
				instructions = append(instructions, text)
			}
			continue
		}

		formatted := formatInputMessage(props, message)
		if formatted == nil {
			continue
		}

		input = append(input, *formatted)
	}

	var instructionText *string
	if len(instructions) > 0 {
		joined := strings.Join(instructions, "\n\n")
		instructionText = &joined
	}

	return input, instructionText
}

func (c *ChatInstance) GetChatBody(props *adaptercommon.ChatProps) ResponseRequest {
	input, instructions := formatMessages(props)

	return ResponseRequest{
		Model:           props.Model,
		Instructions:    instructions,
		Input:           input,
		MaxOutputTokens: props.MaxTokens,
		Temperature:     props.Temperature,
		TopP:            props.TopP,
		Tools:           props.Tools,
		Stream:          false,
	}
}

func extractOutputText(form *ResponseResponse) string {
	if form == nil {
		return ""
	}

	chunks := make([]string, 0)
	for _, item := range form.Output {
		if item.Type != "message" || item.Role != globals.Assistant {
			continue
		}

		for _, content := range item.Content {
			if content.Type == "output_text" && content.Text != "" {
				chunks = append(chunks, content.Text)
			}
		}
	}

	return strings.Join(chunks, "")
}

func parseResponse(data string) (*ResponseResponse, error) {
	form := utils.UnmarshalForm[ResponseResponse](data)
	if form == nil {
		return nil, errors.New("cannot parse response")
	}

	if form.Error.Message != "" {
		return nil, fmt.Errorf("%s", form.Error.Message)
	}

	return form, nil
}

func (c *ChatInstance) CreateStreamChatRequest(props *adaptercommon.ChatProps, callback globals.Hook) error {
	raw, err := utils.PostRaw(
		c.GetChatEndpoint(),
		c.GetHeader(),
		c.GetChatBody(props),
		props.Proxy,
	)
	if err != nil {
		return fmt.Errorf("openai responses error: %s", err.Error())
	}

	form, parseErr := parseResponse(raw)
	if parseErr != nil {
		return fmt.Errorf("openai responses error: %s", parseErr.Error())
	}

	content := extractOutputText(form)
	if content == "" {
		return errors.New("openai responses error: empty response")
	}

	return callback(&globals.Chunk{
		Content: content,
	})
}
