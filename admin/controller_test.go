package admin

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestWarmupAPIRejectsTooManyUrls(t *testing.T) {
	gin.SetMode(gin.TestMode)

	urls := make([]string, maxWarmupUrls+1)
	for i := range urls {
		urls[i] = "https://example.com"
	}
	payload, err := json.Marshal(WarmupForm{Urls: urls})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/warmup", bytes.NewReader(payload))
	c.Request.Header.Set("Content-Type", "application/json")

	WarmupAPI(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	var body struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Status || body.Message != "too many urls" {
		t.Fatalf("expected too many urls rejection, got %#v", body)
	}
}

func TestRedeemListAPIRejectsInvalidPage(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/redeem?page=invalid", nil)

	RedeemListAPI(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	var body struct {
		Status bool   `json:"status"`
		Error  string `json:"error"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Status || body.Error != "invalid page" {
		t.Fatalf("expected invalid page rejection, got %#v", body)
	}
}
