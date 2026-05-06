package middleware

import (
	"net"
	"strings"

	"github.com/gin-gonic/gin"
)

func requestRemoteIP(c *gin.Context) string {
	remote := strings.TrimSpace(c.Request.RemoteAddr)
	if remote == "" {
		return "unknown"
	}

	host, _, err := net.SplitHostPort(remote)
	if err == nil && host != "" {
		return host
	}

	return remote
}
