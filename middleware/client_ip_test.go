package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestRemoteIPIgnoresForwardedHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest("GET", "/login", nil)
	req.RemoteAddr = "203.0.113.10:4321"
	req.Header.Set("X-Forwarded-For", "198.51.100.1")
	req.Header.Set("X-Real-IP", "198.51.100.2")
	c.Request = req

	if got := requestRemoteIP(c); got != "203.0.113.10" {
		t.Fatalf("expected remote address IP, got %q", got)
	}
}

func TestRequestRemoteIPHandlesIPv6RemoteAddress(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest("GET", "/login", nil)
	req.RemoteAddr = "[2001:db8::1]:4321"
	c.Request = req

	if got := requestRemoteIP(c); got != "2001:db8::1" {
		t.Fatalf("expected IPv6 remote address, got %q", got)
	}
}
