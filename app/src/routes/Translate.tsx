import "@/assets/pages/translate.less";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRight,
  Clipboard,
  Languages,
  Sparkles,
  Wand2,
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

  const sourceMeta =
    languageOptions.find((item) => item.value === sourceLanguage) ??
    languageOptions[0];
  const targetMeta =
    languageOptions.find((item) => item.value === targetLanguage) ??
    languageOptions[2];

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
    <div className="translate-page">
      <div className="translate-shell">
        <div className="translate-shell__glow translate-shell__glow--left" />
        <div className="translate-shell__glow translate-shell__glow--right" />

        <div className="translate-header">
          <div>
            <div className="translate-eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              {t("translate.title")}
            </div>
            <h1 className="translate-title">{t("translate.subtitle")}</h1>
          </div>
          <div className="translate-badge">
            <Wand2 className="h-3.5 w-3.5" />
            {t("translate.detected")}
          </div>
        </div>

        <div className="translate-toolbar">
          <div className="translate-toolbar__control">
            <span className="translate-toolbar__meta">{sourceMeta.short}</span>
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
          </div>

          <Button
            size="icon"
            variant="outline"
            className="translate-toolbar__swap"
            onClick={handleSwap}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          <div className="translate-toolbar__control">
            <span className="translate-toolbar__meta">{targetMeta.short}</span>
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
          </div>

          <Button
            className="translate-toolbar__submit"
            onClick={handleTranslate}
            loading
          >
            <Languages className="mr-2 h-4 w-4" />
            {t("translate.action")}
          </Button>

          <div className="translate-toolbar__aside">
            <span>{t("translate.shortcut")}</span>
          </div>
        </div>

        <div className="translate-workspace">
          <section className="translate-panel">
            <div className="translate-panel__header">
              <div>
                <p className="translate-panel__label">{t("translate.input")}</p>
                <p className="translate-panel__hint">{t("translate.source")}</p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={handleClear}
                disabled={!sourceText.length && !translatedText.length}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder={t("translate.input-placeholder")}
              className="translate-textarea"
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  handleTranslate();
                }
              }}
            />

            <div className="translate-panel__footer">
              <span>{t("translate.source-ready")}</span>
              <span>{sourceText.length} {t("translate.characters")}</span>
            </div>
          </section>

          <section className={cn("translate-panel", "translate-panel--result")}>
            <div className="translate-panel__header">
              <div>
                <p className="translate-panel__label">{t("translate.output")}</p>
                <p className="translate-panel__hint">{t("translate.target")}</p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={handleCopy}
                disabled={!translatedText.trim().length}
              >
                <Clipboard className="h-4 w-4" />
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
              className={cn("translate-textarea", "translate-textarea--output")}
            />

            <div className="translate-panel__footer">
              <span>
                {translating
                  ? t("translate.translating")
                  : t("translate.result-ready")}
              </span>
              <span>{translatedText.length} {t("translate.characters")}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Translate;
