package memory

import (
	"chat/utils"
	"fmt"
	"strings"
)

type promptMemory struct {
	ID       int64  `json:"id"`
	Content  string `json:"content"`
	Category string `json:"category,omitempty"`
}

type promptConversation struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	UpdatedAt string `json:"updated_at"`
}

func BuildMemoryPrompt(memories []Record) string {
	if len(memories) == 0 {
		return ""
	}

	payload := make([]promptMemory, 0, len(memories))
	for _, memory := range memories {
		content := strings.TrimSpace(memory.Content)
		if content == "" {
			continue
		}

		payload = append(payload, promptMemory{
			ID:       memory.ID,
			Content:  content,
			Category: memory.Category,
		})
	}

	if len(payload) == 0 {
		return ""
	}

	return fmt.Sprintf(
		"These are memories stored via the memory tool that you can reference in future conversations. Use them only when they clearly help with the current reply. The user's latest request always has higher priority than older memory. Do not claim to browse a separate memory database, and do not expose memory content unless the user explicitly asks about it.\n\n## Memories\n%s",
		utils.Marshal(payload),
	)
}

func BuildRecentChatsPrompt(chats []RecentConversation) string {
	if len(chats) == 0 {
		return ""
	}

	payload := make([]promptConversation, 0, len(chats))
	for _, chat := range chats {
		title := strings.TrimSpace(chat.Name)
		if title == "" {
			continue
		}

		payload = append(payload, promptConversation{
			ID:        chat.ID,
			Title:     title,
			UpdatedAt: strings.TrimSpace(chat.UpdatedAt),
		})
	}

	if len(payload) == 0 {
		return ""
	}

	return fmt.Sprintf(
		"These are recent chat references for continuity only. Use them as weak background hints and never claim to remember full hidden transcripts from them.\n\n## Recent Chats\n%s",
		utils.Marshal(payload),
	)
}
