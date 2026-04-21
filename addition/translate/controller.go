package translate

import (
	"chat/utils"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

type TranslateForm struct {
	Text   string `json:"text" binding:"required"`
	Source string `json:"source" binding:"required"`
	Target string `json:"target" binding:"required"`
}

type translationResponse struct {
	ResponseData struct {
		TranslatedText string `json:"translatedText"`
	} `json:"responseData"`
	ResponseStatus  int    `json:"responseStatus"`
	ResponseDetails string `json:"responseDetails"`
}

var languageTranslatorMap = map[string]string{
	"cn": "zh-CN",
	"tw": "zh-TW",
	"en": "en",
	"ru": "ru",
	"ja": "ja",
	"ko": "ko",
	"fr": "fr",
	"de": "de",
	"es": "es",
	"pt": "pt",
	"it": "it",
}

func formatLanguage(lang string) string {
	lang = strings.ToLower(strings.TrimSpace(lang))
	if value, ok := languageTranslatorMap[lang]; ok {
		return value
	}

	return lang
}

func translateText(content, from, to string) (string, error) {
	content = strings.TrimSpace(content)
	if len(content) == 0 {
		return "", fmt.Errorf("text is empty")
	}

	from = formatLanguage(from)
	to = formatLanguage(to)

	if from == to {
		return content, nil
	}

	uri := fmt.Sprintf(
		"https://api.mymemory.translated.net/get?q=%s&langpair=%s|%s",
		url.QueryEscape(content),
		url.QueryEscape(from),
		url.QueryEscape(to),
	)

	var response translationResponse
	if err := utils.Http(uri, "GET", &response, nil, nil, nil); err != nil {
		return "", err
	}

	result := strings.TrimSpace(response.ResponseData.TranslatedText)
	if len(result) == 0 {
		if len(response.ResponseDetails) > 0 {
			return "", errors.New(response.ResponseDetails)
		}
		return "", fmt.Errorf("translation unavailable")
	}

	return result, nil
}

func TranslateAPI(c *gin.Context) {
	var form TranslateForm
	if err := c.ShouldBindJSON(&form); err != nil {
		c.JSON(400, gin.H{
			"status": false,
			"error":  err.Error(),
		})
		return
	}

	result, err := translateText(form.Text, form.Source, form.Target)
	c.JSON(200, gin.H{
		"status": err == nil,
		"error":  utils.GetError(err),
		"data": gin.H{
			"text": result,
		},
	})
}
