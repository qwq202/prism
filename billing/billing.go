package billing

import (
	"chat/channel"
	"chat/globals"
	"chat/utils"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

const pageSize int64 = 20

type Record struct {
	Id              int64     `json:"id"`
	UserId          int64     `json:"user_id"`
	Username        string    `json:"username"`
	Type            string    `json:"type"`
	TokenName       string    `json:"token_name"`
	Model           string    `json:"model"`
	InputTokens     int64     `json:"input_tokens"`
	OutputTokens    int64     `json:"output_tokens"`
	Quota           float64   `json:"quota"`
	Duration        float32   `json:"duration"`
	Detail          string    `json:"detail"`
	Prompts         string    `json:"prompts"`
	ResponsePrompts string    `json:"response_prompts"`
	Channel         int64     `json:"channel"`
	ChannelName     string    `json:"channel_name"`
	CreatedAt       time.Time `json:"created_at"`
}

type RecordQuery struct {
	UserId      int64  `json:"user_id"`
	Username    string `json:"username"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	TokenName   string `json:"token_name"`
	Model       string `json:"model"`
	Type        string `json:"type"`
	ShowChannel bool   `json:"show_channel"`
}

type RecordData struct {
	Total   int64    `json:"total"`
	Records []Record `json:"records"`
}

type RecordStats struct {
	BillingToday float32 `json:"billing_today"`
	BillingMonth float32 `json:"billing_month"`
	RequestToday int64   `json:"request_today"`
	RequestMonth int64   `json:"request_month"`
	Rpm          int64   `json:"rpm"`
	Tpm          int64   `json:"tpm"`
}

func CreateRecord(db *sql.DB, userId int64, username string, recordType string,
	tokenName string, model string, inputTokens int64, outputTokens int64,
	quota float64, duration float32, detail string, prompts string, responsePrompts string,
	channelId int, channelName string) {

	go func() {
		_, err := globals.ExecDb(db, `
			INSERT INTO billing (user_id, username, type, token_name, model, input_tokens, output_tokens, quota, duration, detail, prompts, response_prompts, channel, channel_name)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, userId, username, recordType, tokenName, model, inputTokens, outputTokens, quota, duration, detail, prompts, responsePrompts, channelId, channelName)
		if err != nil {
			globals.Warn(fmt.Sprintf("[billing] failed to create record: %s", err.Error()))
		}
	}()
}

func resolveChannelNameByModel(model string) string {
	if len(strings.TrimSpace(model)) == 0 || channel.ConduitInstance == nil {
		return ""
	}

	names := make([]string, 0)
	for _, item := range channel.ConduitInstance.GetActiveSequence() {
		if item != nil && item.IsHit(model) && !utils.Contains(item.GetName(), names) {
			names = append(names, item.GetName())
		}
	}

	return strings.Join(names, ", ")
}

func ListRecords(db *sql.DB, isAdmin bool, userId int64, page int64, query RecordQuery) (RecordData, error) {
	var conditions []string
	var args []interface{}

	if !isAdmin {
		conditions = append(conditions, "b.user_id = ?")
		args = append(args, userId)
	} else if query.UserId > 0 {
		conditions = append(conditions, "b.user_id = ?")
		args = append(args, query.UserId)
	} else if query.Username != "" {
		conditions = append(conditions, "(a.username LIKE ? OR b.username LIKE ?)")
		args = append(args, "%"+query.Username+"%", "%"+query.Username+"%")
	}

	if query.StartTime != "" {
		conditions = append(conditions, "b.created_at >= ?")
		args = append(args, query.StartTime)
	}

	if query.EndTime != "" {
		conditions = append(conditions, "b.created_at <= ?")
		args = append(args, query.EndTime)
	}

	if query.TokenName != "" {
		conditions = append(conditions, "b.token_name = ?")
		args = append(args, query.TokenName)
	}

	if query.Model != "" {
		conditions = append(conditions, "b.model LIKE ?")
		args = append(args, "%"+query.Model+"%")
	}

	if query.Type != "" && query.Type != "all" {
		conditions = append(conditions, "b.type = ?")
		args = append(args, query.Type)
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int64
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)

	if err := globals.QueryRowDb(db, fmt.Sprintf("SELECT COUNT(*) FROM billing b %s", where), countArgs...).Scan(&total); err != nil {
		return RecordData{}, err
	}

	queryArgs := append(args, pageSize, page*pageSize)
	rows, err := globals.QueryDb(db, fmt.Sprintf(`
		SELECT b.id, b.user_id, COALESCE(a.username, b.username, ''), b.type, COALESCE(b.token_name, ''),
		       b.model, b.input_tokens, b.output_tokens, b.quota, b.duration,
		       COALESCE(b.detail, ''), COALESCE(b.prompts, ''), COALESCE(b.response_prompts, ''),
		       COALESCE(b.channel, 0), COALESCE(b.channel_name, ''), b.created_at
		FROM billing b
		LEFT JOIN auth a ON a.id = b.user_id
		%s
		ORDER BY b.id DESC
		LIMIT ? OFFSET ?
	`, where), queryArgs...)
	if err != nil {
		return RecordData{}, err
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		var r Record
		var createdAt []uint8
		if err := rows.Scan(
			&r.Id, &r.UserId, &r.Username, &r.Type, &r.TokenName,
			&r.Model, &r.InputTokens, &r.OutputTokens, &r.Quota, &r.Duration,
			&r.Detail, &r.Prompts, &r.ResponsePrompts,
			&r.Channel, &r.ChannelName, &createdAt,
		); err != nil {
			return RecordData{}, err
		}
		if t := utils.ConvertTime(createdAt); t != nil {
			r.CreatedAt = *t
		}
		if len(strings.TrimSpace(r.ChannelName)) == 0 {
			r.ChannelName = resolveChannelNameByModel(r.Model)
		}
		records = append(records, r)
	}

	if records == nil {
		records = []Record{}
	}

	pages := total / pageSize
	if total%pageSize != 0 {
		pages++
	}

	return RecordData{Total: pages, Records: records}, nil
}
