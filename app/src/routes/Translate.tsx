import "@/assets/pages/translate.less";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRight,
  Clipboard,
  Languages,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import { useClipboard } from "@/utils/dom.ts";
import { translateText } from "@/api/translate.ts";
import { withNotify } from "@/api/common.ts";
import { toast } from "sonner";

type LanguageOption = {
  value: string;
  label: string;
  short: string;
};

const languageOptions: LanguageOption[] = [
  { value: "cn", label: "🇨🇳 简体中文", short: "ZH" },
  { value: "tw", label: "🇭🇰 繁體中文", short: "TW" },
  { value: "en", label: "🇬🇧 English", short: "EN" },
  { value: "ja", label: "🇯🇵 日本語", short: "JA" },
  { value: "ru", label: "🇷🇺 Русский", short: "RU" },
  { value: "ko", label: "🇰🇷 한국어", short: "KO" },
  { value: "fr", label: "🇫🇷 Français", short: "FR" },
  { value: "de", label: "🇩🇪 Deutsch", short: "DE" },
  { value: "es", label: "🇪🇸 Español", short: "ES" },
  { value: "pt", label: "🇵🇹 Português", short: "PT" },
  { value: "it", label: "🇮🇹 Italiano", short: "IT" },
];

function Translate() {
  const { t } = useTranslation();
  const copy = useClipboard();

  const [sourceLanguage, setSourceLanguage] = React.useState("cn");
  const [targetLanguage, setTargetLanguage] = React.useState("en");
  const [sourceText, setSourceText] = React.useState("");
  const [translatedText, setTranslatedText] = React.useState("");
  const [translating, setTranslating] = React.useState(false);

  async function handleTranslate() {
    const value = sourceText.trim();
    if (!value) {
      toast.info(t("translate.empty"));
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setTranslatedText(sourceText);
      toast.info(t("translate.same-language"));
      return;
    }

    setTranslating(true);
    const response = await translateText({
      text: sourceText,
      source: sourceLanguage,
      target: targetLanguage,
    });
    setTranslating(false);

    if (!response.status) {
      withNotify(t, response);
      return;
    }

    setTranslatedText(response.data?.text ?? "");
  }

  function handleSwap() {
    const currentSource = sourceLanguage;
    const currentTarget = targetLanguage;
    const currentInput = sourceText;

    setSourceLanguage(currentTarget);
    setTargetLanguage(currentSource);

    if (translatedText.trim().length > 0) {
      setSourceText(translatedText);
      setTranslatedText(currentInput);
    }
  }

  function handleClear() {
    setSourceText("");
    setTranslatedText("");
  }

  async function handleCopy() {
    if (!translatedText.trim()) {
      return;
    }

    await copy(translatedText);
  }

  return (
    <ScrollArea className="w-full h-full flex flex-col p-2 pr-4 bg-muted/25">
      <div className="translate-page">
        <Card className="translate-card">
          <CardHeader className="translate-card-header">
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t("translate.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="translate-card-content">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                <SelectTrigger className="translate-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="icon-sm"
                variant="outline"
                onClick={handleSwap}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>

              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="translate-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button className="translate-submit" onClick={handleTranslate} loading>
                <Languages className="mr-2 h-4 w-4" />
                {t("translate.action")}
              </Button>

              <span className="translate-shortcut">
                {t("translate.shortcut")}
              </span>
            </div>

            <div className="translate-workspace">
              <div className="translate-panel">
                <div className="translate-panel-header">
                  <span className="translate-panel-label">
                    {t("translate.input")}
                  </span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={handleClear}
                    disabled={!sourceText.length && !translatedText.length}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder={t("translate.input-placeholder")}
                  className="translate-textarea"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleTranslate();
                    }
                  }}
                />

                <div className="translate-panel-footer">
                  <span>{t("translate.source-ready")}</span>
                  <span>
                    {sourceText.length} {t("translate.characters")}
                  </span>
                </div>
              </div>

              <div className="translate-panel">
                <div className="translate-panel-header">
                  <span className="translate-panel-label">
                    {t("translate.output")}
                  </span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={handleCopy}
                    disabled={!translatedText.trim().length}
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Textarea
                  readOnly
                  value={translatedText}
                  placeholder={
                    translating
                      ? t("translate.translating")
                      : t("translate.output-placeholder")
                  }
                  className={cn(
                    "translate-textarea",
                    "translate-textarea--output",
                  )}
                />

                <div className="translate-panel-footer">
                  <span>
                    {translating
                      ? t("translate.translating")
                      : t("translate.result-ready")}
                  </span>
                  <span>
                    {translatedText.length} {t("translate.characters")}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export default Translate;
