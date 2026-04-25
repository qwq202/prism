package fetch

import (
	"bufio"
	"bytes"
	"chat/globals"
	"context"
	"fmt"
	"html"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode"

	xhtml "golang.org/x/net/html"
	"golang.org/x/net/html/charset"
)

const (
	maxFetchURLs       = 3
	maxFetchBytes      = 768 * 1024
	maxPageTextRunes   = 12000
	maxTotalPromptRune = 24000
	fetchPromptPrefix  = "Fetched web page references:"
)

var urlPattern = regexp.MustCompile(`https?://[^\s<>"'` + "`" + `]+`)

type pageResult struct {
	URL     string
	Title   string
	Content string
	Error   string
}

func ToFetched(enable bool, messages []globals.Message) []globals.Message {
	if !enable || len(messages) == 0 {
		return messages
	}

	content, ok := latestUserContent(messages)
	if !ok {
		return messages
	}

	urls := extractURLs(content)
	if len(urls) == 0 {
		return messages
	}

	results := make([]pageResult, 0, len(urls))
	for _, rawURL := range urls {
		result := fetchURL(rawURL)
		results = append(results, result)
	}

	prompt := buildPrompt(results)
	if strings.TrimSpace(prompt) == "" {
		return messages
	}

	return append([]globals.Message{
		{
			Role:    globals.System,
			Content: prompt,
		},
	}, messages...)
}

func latestUserContent(messages []globals.Message) (string, bool) {
	for index := len(messages) - 1; index >= 0; index-- {
		if messages[index].Role == globals.User {
			return messages[index].Content, true
		}
	}
	return "", false
}

func extractURLs(text string) []string {
	matches := urlPattern.FindAllString(text, -1)
	if len(matches) == 0 {
		return nil
	}

	seen := map[string]struct{}{}
	urls := make([]string, 0, maxFetchURLs)
	for _, match := range matches {
		candidate := strings.TrimRight(match, ".,;:!?)]}")
		parsed, err := url.Parse(candidate)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			continue
		}
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			continue
		}

		normalized := parsed.String()
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		urls = append(urls, normalized)
		if len(urls) >= maxFetchURLs {
			break
		}
	}

	return urls
}

func fetchURL(rawURL string) pageResult {
	result := pageResult{URL: rawURL}
	if err := validateURL(rawURL); err != nil {
		result.Error = err.Error()
		return result
	}

	client := &http.Client{
		Timeout:   12 * time.Second,
		Transport: secureTransport(),
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return fmt.Errorf("too many redirects")
			}
			return validateURL(req.URL.String())
		},
	}

	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		result.Error = err.Error()
		return result
	}
	req.Header.Set("User-Agent", "coai-fetch/1.0")
	req.Header.Set("Accept", "text/html,text/plain;q=0.9,*/*;q=0.5")

	resp, err := client.Do(req)
	if err != nil {
		result.Error = err.Error()
		return result
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		result.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
		return result
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxFetchBytes+1))
	if err != nil {
		result.Error = err.Error()
		return result
	}
	if len(body) > maxFetchBytes {
		result.Error = "page is too large to fetch safely"
		return result
	}

	contentType := resp.Header.Get("Content-Type")
	utf8Body, err := decodeBody(body, contentType)
	if err != nil {
		result.Error = err.Error()
		return result
	}

	if strings.Contains(strings.ToLower(contentType), "html") || looksLikeHTML(utf8Body) {
		result.Title, result.Content = htmlToText(utf8Body)
	} else {
		result.Content = normalizeSpace(utf8Body)
	}
	result.Content = limitRunes(result.Content, maxPageTextRunes)
	if strings.TrimSpace(result.Content) == "" {
		result.Error = "no readable text content found"
	}

	return result
}

func validateURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("only http and https URLs are supported")
	}

	host := parsed.Hostname()
	if host == "" {
		return fmt.Errorf("URL host is empty")
	}
	if isBlockedHost(host) {
		return fmt.Errorf("local or private network URLs are not allowed")
	}

	return nil
}

func secureTransport() *http.Transport {
	dialer := &net.Dialer{Timeout: 8 * time.Second}
	return &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: func(ctx context.Context, network string, address string) (net.Conn, error) {
			host, _, err := net.SplitHostPort(address)
			if err != nil {
				host = address
			}
			if isBlockedHost(host) {
				return nil, fmt.Errorf("local or private network URLs are not allowed")
			}

			conn, err := dialer.DialContext(ctx, network, address)
			if err != nil {
				return nil, err
			}

			if tcpAddr, ok := conn.RemoteAddr().(*net.TCPAddr); ok && isBlockedIP(tcpAddr.IP) {
				_ = conn.Close()
				return nil, fmt.Errorf("local or private network URLs are not allowed")
			}

			return conn, nil
		},
	}
}

func isBlockedHost(host string) bool {
	host = strings.TrimSpace(strings.TrimSuffix(strings.ToLower(host), "."))
	if host == "" || host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return true
	}

	if ip := net.ParseIP(host); ip != nil {
		return isBlockedIP(ip)
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return false
	}
	for _, ip := range ips {
		if isBlockedIP(ip) {
			return true
		}
	}
	return false
}

func isBlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	return ip.IsLoopback() ||
		ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() ||
		ip.IsUnspecified() ||
		ip.IsMulticast()
}

func decodeBody(body []byte, contentType string) (string, error) {
	reader, err := charset.NewReader(bytes.NewReader(body), contentType)
	if err != nil {
		return "", err
	}
	decoded, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}
	return string(decoded), nil
}

func looksLikeHTML(content string) bool {
	content = strings.ToLower(content)
	return strings.Contains(content, "<html") ||
		strings.Contains(content, "<body") ||
		strings.Contains(content, "<!doctype html")
}

func htmlToText(content string) (string, string) {
	tokenizer := xhtml.NewTokenizer(strings.NewReader(content))
	var text strings.Builder
	var title strings.Builder
	stack := make([]string, 0)

	for {
		tokenType := tokenizer.Next()
		switch tokenType {
		case xhtml.ErrorToken:
			if tokenizer.Err() == io.EOF {
				return normalizeSpace(title.String()), normalizeSpace(text.String())
			}
			return normalizeSpace(title.String()), normalizeSpace(text.String())
		case xhtml.StartTagToken:
			name, _ := tokenizer.TagName()
			stack = append(stack, string(name))
		case xhtml.EndTagToken:
			if len(stack) > 0 {
				stack = stack[:len(stack)-1]
			}
		case xhtml.TextToken:
			if shouldSkipText(stack) {
				continue
			}
			value := html.UnescapeString(string(tokenizer.Text()))
			if len(stack) > 0 && stack[len(stack)-1] == "title" {
				title.WriteString(value)
				title.WriteByte(' ')
				continue
			}
			text.WriteString(value)
			text.WriteByte(' ')
		}
	}
}

func shouldSkipText(stack []string) bool {
	for _, tag := range stack {
		switch tag {
		case "script", "style", "noscript", "svg", "canvas":
			return true
		}
	}
	return false
}

func normalizeSpace(content string) string {
	var builder strings.Builder
	scanner := bufio.NewScanner(strings.NewReader(content))
	scanner.Buffer(make([]byte, 1024), maxFetchBytes)
	for scanner.Scan() {
		line := strings.TrimSpace(strings.Map(func(r rune) rune {
			if unicode.IsSpace(r) {
				return ' '
			}
			return r
		}, scanner.Text()))
		if line == "" {
			continue
		}
		if builder.Len() > 0 {
			builder.WriteByte('\n')
		}
		builder.WriteString(line)
	}
	return builder.String()
}

func limitRunes(content string, limit int) string {
	runes := []rune(strings.TrimSpace(content))
	if len(runes) <= limit {
		return string(runes)
	}
	return string(runes[:limit]) + "\n...[truncated]"
}

func buildPrompt(results []pageResult) string {
	var builder strings.Builder
	builder.WriteString(fetchPromptPrefix)
	builder.WriteString("\nThe user enabled the app Fetch tool. Use the fetched page content below when it is relevant. If a page failed to fetch, say so instead of pretending you read it.")

	total := 0
	for index, result := range results {
		builder.WriteString(fmt.Sprintf("\n\n[%d] URL: %s", index+1, result.URL))
		if result.Error != "" {
			builder.WriteString("\nStatus: fetch failed")
			builder.WriteString("\nError: ")
			builder.WriteString(result.Error)
			continue
		}
		if result.Title != "" {
			builder.WriteString("\nTitle: ")
			builder.WriteString(result.Title)
		}

		content := result.Content
		remaining := maxTotalPromptRune - total
		if remaining <= 0 {
			builder.WriteString("\nContent: [omitted because fetched content limit was reached]")
			continue
		}
		content = limitRunes(content, remaining)
		total += len([]rune(content))
		builder.WriteString("\nContent:\n")
		builder.WriteString(content)
	}

	return builder.String()
}
