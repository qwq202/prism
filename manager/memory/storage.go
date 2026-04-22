package memory

import (
	"chat/globals"
	"database/sql"
	"fmt"
	"strings"
)

func normalizeOptionalText(value interface{}) string {
	switch v := value.(type) {
	case nil:
		return ""
	case []byte:
		return strings.TrimSpace(string(v))
	case string:
		return strings.TrimSpace(v)
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}
}

func scanRecord(rows *sql.Rows) (*Record, error) {
	var record Record
	var scopeID, source, category, lastUsedAt interface{}
	var confidence sql.NullFloat64

	if err := rows.Scan(
		&record.ID,
		&record.UserID,
		&record.ScopeType,
		&scopeID,
		&record.Content,
		&source,
		&confidence,
		&record.Pinned,
		&category,
		&lastUsedAt,
		&record.CreatedAt,
		&record.UpdatedAt,
		&record.IsDeleted,
	); err != nil {
		return nil, err
	}

	record.ScopeID = normalizeOptionalText(scopeID)
	record.Source = normalizeOptionalText(source)
	record.Category = normalizeOptionalText(category)
	record.LastUsedAt = normalizeOptionalText(lastUsedAt)
	record.Content = strings.TrimSpace(record.Content)

	if confidence.Valid {
		record.Confidence = &confidence.Float64
	}

	return &record, nil
}

func ListByUser(db *sql.DB, userID int64, query string, limit int) ([]Record, error) {
	if limit <= 0 {
		limit = DefaultMemoryLimit
	}

	query = strings.TrimSpace(query)
	pattern := "%"
	if query != "" {
		pattern = "%" + query + "%"
	}

	rows, err := globals.QueryDb(db, `
		SELECT id, user_id, scope_type, scope_id, content, source, confidence, pinned, category, last_used_at, created_at, updated_at, is_deleted
		FROM memories
		WHERE user_id = ? AND is_deleted = 0 AND (? = '%' OR content LIKE ?)
		ORDER BY pinned DESC, updated_at DESC, id DESC
		LIMIT ?
	`, userID, pattern, pattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	memories := make([]Record, 0)
	for rows.Next() {
		record, err := scanRecord(rows)
		if err != nil {
			return nil, err
		}

		memories = append(memories, *record)
	}

	return memories, rows.Err()
}

func FindByID(db *sql.DB, userID, id int64) (*Record, error) {
	rows, err := globals.QueryDb(db, `
		SELECT id, user_id, scope_type, scope_id, content, source, confidence, pinned, category, last_used_at, created_at, updated_at, is_deleted
		FROM memories
		WHERE id = ? AND user_id = ? AND is_deleted = 0
		LIMIT 1
	`, id, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, sql.ErrNoRows
	}

	record, err := scanRecord(rows)
	if err != nil {
		return nil, err
	}

	return record, rows.Err()
}

func FindDuplicate(db *sql.DB, userID int64, content string) (*Record, error) {
	rows, err := globals.QueryDb(db, `
		SELECT id, user_id, scope_type, scope_id, content, source, confidence, pinned, category, last_used_at, created_at, updated_at, is_deleted
		FROM memories
		WHERE user_id = ? AND is_deleted = 0 AND content = ?
		LIMIT 1
	`, userID, strings.TrimSpace(content))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, sql.ErrNoRows
	}

	record, err := scanRecord(rows)
	if err != nil {
		return nil, err
	}

	return record, rows.Err()
}

func Create(db *sql.DB, userID int64, content, source, category string) (*Record, error) {
	content = strings.TrimSpace(content)
	category = strings.TrimSpace(category)
	if category == "" {
		category = "preference"
	}

	res, err := globals.ExecDb(db, `
		INSERT INTO memories (user_id, scope_type, scope_id, content, source, category)
		VALUES (?, ?, ?, ?, ?, ?)
	`, userID, ScopeUser, fmt.Sprintf("%d", userID), content, strings.TrimSpace(source), category)
	if err != nil {
		return nil, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return FindByID(db, userID, id)
}

func Update(db *sql.DB, userID, id int64, content, category string) (*Record, error) {
	content = strings.TrimSpace(content)
	category = strings.TrimSpace(category)

	_, err := globals.ExecDb(db, `
		UPDATE memories
		SET content = ?, category = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND user_id = ? AND is_deleted = 0
	`, content, category, id, userID)
	if err != nil {
		return nil, err
	}

	return FindByID(db, userID, id)
}

func Delete(db *sql.DB, userID, id int64) error {
	_, err := globals.ExecDb(db, `
		UPDATE memories
		SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND user_id = ? AND is_deleted = 0
	`, id, userID)
	return err
}

func Touch(db *sql.DB, userID int64, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}

	placeholders := make([]string, 0, len(ids))
	args := make([]interface{}, 0, len(ids)+1)
	args = append(args, userID)

	for _, id := range ids {
		placeholders = append(placeholders, "?")
		args = append(args, id)
	}

	_, err := globals.ExecDb(db, fmt.Sprintf(`
		UPDATE memories
		SET last_used_at = CURRENT_TIMESTAMP
		WHERE user_id = ? AND id IN (%s) AND is_deleted = 0
	`, strings.Join(placeholders, ",")), args...)
	return err
}

func ListRecentConversations(db *sql.DB, userID, excludeConversationID int64, limit int) ([]RecentConversation, error) {
	if limit <= 0 {
		limit = DefaultRecentChatNum
	}

	rows, err := globals.QueryDb(db, `
		SELECT conversation_id, conversation_name, updated_at
		FROM conversation
		WHERE user_id = ? AND conversation_id <> ?
		ORDER BY updated_at DESC
		LIMIT ?
	`, userID, excludeConversationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	conversations := make([]RecentConversation, 0)
	for rows.Next() {
		var conversation RecentConversation
		var updatedAt interface{}
		if err := rows.Scan(&conversation.ID, &conversation.Name, &updatedAt); err != nil {
			return nil, err
		}

		conversation.Name = strings.TrimSpace(conversation.Name)
		conversation.UpdatedAt = normalizeOptionalText(updatedAt)
		if conversation.Name == "" {
			continue
		}

		conversations = append(conversations, conversation)
	}

	return conversations, rows.Err()
}
