package manager

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestExtractClientContextForDesktopBrowser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36")
	ctx.Request = req

	got := extractClientContext(ctx)
	want := "Operating system: macOS; Browser/App: Chrome; Device type: computer."
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestExtractClientContextForMobileBrowser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1")
	ctx.Request = req

	got := extractClientContext(ctx)
	want := "Operating system: iOS; Browser/App: Safari; Device type: phone."
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}
