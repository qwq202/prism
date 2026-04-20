package openairesponses

type InputMessageContent struct {
	Type     string  `json:"type"`
	Text     *string `json:"text,omitempty"`
	ImageURL *string `json:"image_url,omitempty"`
}

type InputMessage struct {
	Role    string                `json:"role"`
	Content []InputMessageContent `json:"content"`
}

type ResponseTool struct {
	Type        string      `json:"type"`
	Name        string      `json:"name,omitempty"`
	Description string      `json:"description,omitempty"`
	Parameters  interface{} `json:"parameters,omitempty"`
}

type ResponseRequest struct {
	Model           string         `json:"model"`
	Instructions    *string        `json:"instructions,omitempty"`
	Input           []InputMessage `json:"input"`
	MaxOutputTokens *int           `json:"max_output_tokens,omitempty"`
	Temperature     *float32       `json:"temperature,omitempty"`
	TopP            *float32       `json:"top_p,omitempty"`
	Tools           []ResponseTool `json:"tools,omitempty"`
	ToolChoice      *interface{}   `json:"tool_choice,omitempty"`
	Stream          bool           `json:"stream,omitempty"`
}

type OutputContent struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

type OutputItem struct {
	Type    string          `json:"type"`
	Role    string          `json:"role,omitempty"`
	Content []OutputContent `json:"content,omitempty"`
}

type ResponseResponse struct {
	ID     string       `json:"id"`
	Object string       `json:"object"`
	Model  string       `json:"model"`
	Output []OutputItem `json:"output"`
	Error  struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}
