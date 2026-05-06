package manager

import (
	"chat/globals"
	"chat/manager/conversation"
	"testing"
	"time"
)

func TestLatestMessageContentHandlesEmptySegment(t *testing.T) {
	if content, ok := latestMessageContent(nil); ok || content != "" {
		t.Fatalf("expected empty segment to be rejected, got content=%q ok=%v", content, ok)
	}

	content, ok := latestMessageContent([]globals.Message{
		{Role: globals.User, Content: "first"},
		{Role: globals.User, Content: "latest"},
	})
	if !ok || content != "latest" {
		t.Fatalf("expected latest message content, got content=%q ok=%v", content, ok)
	}
}

func TestCreateStopSignalEmitsStopAndCancelsPolling(t *testing.T) {
	conn := NewConnection(nil, false, "", 2)
	conn.Write(&conversation.FormMessage{Type: StopType})

	stopSignal, cancel := createStopSignal(conn)
	defer cancel()

	select {
	case stopped := <-stopSignal:
		if !stopped {
			t.Fatalf("expected stop signal")
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("timed out waiting for stop signal")
	}

	cancel()
}
