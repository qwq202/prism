package web

import (
	"chat/globals"
	"chat/manager/conversation"
	"chat/utils"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type Hook func(message []globals.Message, token int) (string, error)

func toWebSearchingMessage(message []globals.Message, group string, cache *redis.Client) []globals.Message {
	query := message[len(message)-1].Content
	extracted := ExtractSearchQuery(group, query, cache)
	data, _ := GenerateSearchResult(extracted)

	return utils.Insert(message, 0, globals.Message{
		Role: globals.System,
		Content: fmt.Sprintf("You will play the role of an AI Q&A assistant, where your knowledge base is not offline, but can be networked in real time, and you can provide real-time networked information with links to networked search sources."+
			"Current time: %s, Search query used: %s, Real-time internet search results: %s",
			time.Now().Format("2006-01-02 15:04:05"), extracted, data,
		),
	})
}

func ToChatSearched(instance *conversation.Conversation, restart bool, group string, cache *redis.Client) []globals.Message {
	segment := conversation.CopyMessage(instance.GetChatMessage(restart))

	if instance.IsEnableWeb() &&
		!globals.IsGeminiModel(instance.GetModel()) &&
		!globals.IsXAIModel(instance.GetModel()) &&
		!globals.IsOpenAIResponsesNativeWebModel(instance.GetModel()) {
		segment = toWebSearchingMessage(segment, group, cache)
	}

	return segment
}

func ToSearched(enable bool, model string, message []globals.Message, group string, cache *redis.Client) []globals.Message {
	if enable &&
		!globals.IsGeminiModel(model) &&
		!globals.IsXAIModel(model) &&
		!globals.IsOpenAIResponsesNativeWebModel(model) {
		return toWebSearchingMessage(message, group, cache)
	}

	return message
}
