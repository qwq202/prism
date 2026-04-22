package memory

const (
	ScopeUser            = "user"
	SourceManual         = "manual"
	SourceToolAuto       = "tool:auto"
	MemoryToolName       = "memory_tool"
	DefaultMemoryLimit   = 24
	DefaultRecentChatNum = 6
	MaxToolRounds        = 3
)

type Record struct {
	ID         int64    `json:"id"`
	UserID     int64    `json:"user_id"`
	ScopeType  string   `json:"scope_type"`
	ScopeID    string   `json:"scope_id"`
	Content    string   `json:"content"`
	Source     string   `json:"source,omitempty"`
	Confidence *float64 `json:"confidence,omitempty"`
	Pinned     bool     `json:"pinned"`
	Category   string   `json:"category,omitempty"`
	LastUsedAt string   `json:"last_used_at,omitempty"`
	CreatedAt  string   `json:"created_at"`
	UpdatedAt  string   `json:"updated_at"`
	IsDeleted  bool     `json:"is_deleted"`
}

type RecentConversation struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	UpdatedAt string `json:"updated_at"`
}

type ToolInput struct {
	Action   string `json:"action"`
	MemoryID *int64 `json:"memory_id,omitempty"`
	Content  string `json:"content,omitempty"`
	Reason   string `json:"reason,omitempty"`
	Category string `json:"category,omitempty"`
}

type ToolResult struct {
	Status   string `json:"status"`
	Action   string `json:"action,omitempty"`
	MemoryID *int64 `json:"memory_id,omitempty"`
	Message  string `json:"message,omitempty"`
	Error    string `json:"error,omitempty"`
}
