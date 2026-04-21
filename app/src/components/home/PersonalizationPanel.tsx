import "@/assets/pages/personalization.less";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import * as settings from "@/store/settings.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  ArrowLeft,
  MessageSquare,
  Smile,
  List,
  Zap,
  Heart,
  User,
  FileText,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SelectOption = {
  value: string;
  label: string;
};

type TraitCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

function TraitCard({ icon, title, value, options, onChange }: TraitCardProps) {
  return (
    <div className="persona-trait-card">
      <div className="persona-trait-header">
        <span className="persona-trait-icon">{icon}</span>
        <span className="persona-trait-title">{title}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="persona-trait-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type StyleChipProps = {
  value: string;
  label: string;
  emoji: string;
  selected: boolean;
  onClick: () => void;
};

function StyleChip({ label, emoji, selected, onClick }: StyleChipProps) {
  return (
    <button
      className={`persona-style-chip${selected ? " selected" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className="persona-style-emoji">{emoji}</span>
      <span className="persona-style-label">{label}</span>
    </button>
  );
}

type PersonalizationPanelProps = {
  onClose: () => void;
};

const styleEmojis: Record<string, string> = {
  friendly: "😊",
  professional: "💼",
  concise: "⚡",
  direct: "🎯",
  playful: "🎉",
};

function PersonalizationPanel({ onClose }: PersonalizationPanelProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const personaStyle = useSelector(settings.personaStyleSelector);
  const personaWarmth = useSelector(settings.personaWarmthSelector);
  const personaEnthusiasm = useSelector(settings.personaEnthusiasmSelector);
  const personaLists = useSelector(settings.personaListsSelector);
  const personaEmoji = useSelector(settings.personaEmojiSelector);
  const personaCustomInstruction = useSelector(
    settings.personaCustomInstructionSelector,
  );
  const personaNickname = useSelector(settings.personaNicknameSelector);
  const personaAboutUser = useSelector(settings.personaAboutUserSelector);

  const baseStyleOptions: SelectOption[] = [
    {
      value: "friendly",
      label: t("settings.personalization.options.style.friendly"),
    },
    {
      value: "professional",
      label: t("settings.personalization.options.style.professional"),
    },
    {
      value: "concise",
      label: t("settings.personalization.options.style.concise"),
    },
    {
      value: "direct",
      label: t("settings.personalization.options.style.direct"),
    },
    {
      value: "playful",
      label: t("settings.personalization.options.style.playful"),
    },
  ];

  const levelOptions: SelectOption[] = [
    {
      value: "default",
      label: t("settings.personalization.options.level.default"),
    },
    {
      value: "low",
      label: t("settings.personalization.options.level.low"),
    },
    {
      value: "medium",
      label: t("settings.personalization.options.level.medium"),
    },
    {
      value: "high",
      label: t("settings.personalization.options.level.high"),
    },
  ];

  const listOptions: SelectOption[] = [
    {
      value: "default",
      label: t("settings.personalization.options.list.default"),
    },
    {
      value: "minimal",
      label: t("settings.personalization.options.list.minimal"),
    },
    {
      value: "balanced",
      label: t("settings.personalization.options.list.balanced"),
    },
    {
      value: "structured",
      label: t("settings.personalization.options.list.structured"),
    },
  ];

  const emojiOptions: SelectOption[] = [
    {
      value: "default",
      label: t("settings.personalization.options.emoji.default"),
    },
    {
      value: "none",
      label: t("settings.personalization.options.emoji.none"),
    },
    {
      value: "light",
      label: t("settings.personalization.options.emoji.light"),
    },
    {
      value: "expressive",
      label: t("settings.personalization.options.emoji.expressive"),
    },
  ];

  const avatarLetter = personaNickname
    ? personaNickname.charAt(0).toUpperCase()
    : null;

  return (
    <AnimatePresence>
      <motion.div
        className="persona-panel"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {/* 顶部导航栏 */}
        <div className="persona-panel-header">
          <Button
            variant="ghost"
            size="icon"
            className="persona-back-btn"
            onClick={onClose}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="persona-panel-title-wrap">
            <Sparkles className="h-3.5 w-3.5 persona-panel-title-icon" />
            <span className="persona-panel-title">
              {t("settings.personalization.title")}
            </span>
          </div>
        </div>

        <div className="persona-panel-body">
          {/* 用户身份卡片 */}
          <div className="persona-identity-card">
            <div className="persona-avatar">
              {avatarLetter ? (
                <span className="persona-avatar-letter">{avatarLetter}</span>
              ) : (
                <User className="h-5 w-5 persona-avatar-icon" />
              )}
            </div>
            <div className="persona-identity-fields">
              <Input
                value={personaNickname}
                placeholder={t(
                  "settings.personalization.nickname-placeholder",
                )}
                className="persona-nickname-input"
                onChange={(e) =>
                  dispatch(settings.setPersonaNickname(e.target.value))
                }
              />
              <p className="persona-identity-label">
                {t("settings.personalization.nickname")}
              </p>
            </div>
          </div>

          {/* 回复风格 */}
          <div className="persona-section">
            <div className="persona-section-header">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{t("settings.personalization.base-style")}</span>
            </div>
            <p className="persona-section-note">
              {t("settings.personalization.base-style-tip")}
            </p>
            <div className="persona-style-chips">
              {baseStyleOptions.map((opt) => (
                <StyleChip
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  emoji={styleEmojis[opt.value] ?? "✨"}
                  selected={personaStyle === opt.value}
                  onClick={() => dispatch(settings.setPersonaStyle(opt.value))}
                />
              ))}
            </div>
          </div>

          {/* 特征 */}
          <div className="persona-section">
            <div className="persona-section-header">
              <Zap className="h-3.5 w-3.5" />
              <span>{t("settings.personalization.traits")}</span>
            </div>
            <p className="persona-section-note">
              {t("settings.personalization.traits-tip")}
            </p>
            <div className="persona-traits-grid">
              <TraitCard
                icon={<Heart className="h-3.5 w-3.5" />}
                title={t("settings.personalization.warmth")}
                value={personaWarmth}
                options={levelOptions}
                onChange={(v) => dispatch(settings.setPersonaWarmth(v))}
              />
              <TraitCard
                icon={<Zap className="h-3.5 w-3.5" />}
                title={t("settings.personalization.enthusiasm")}
                value={personaEnthusiasm}
                options={levelOptions}
                onChange={(v) => dispatch(settings.setPersonaEnthusiasm(v))}
              />
              <TraitCard
                icon={<List className="h-3.5 w-3.5" />}
                title={t("settings.personalization.headings-lists")}
                value={personaLists}
                options={listOptions}
                onChange={(v) => dispatch(settings.setPersonaLists(v))}
              />
              <TraitCard
                icon={<Smile className="h-3.5 w-3.5" />}
                title={t("settings.personalization.emoji")}
                value={personaEmoji}
                options={emojiOptions}
                onChange={(v) => dispatch(settings.setPersonaEmoji(v))}
              />
            </div>
          </div>

          {/* 自定义指令 */}
          <div className="persona-section">
            <div className="persona-section-header">
              <FileText className="h-3.5 w-3.5" />
              <span>{t("settings.personalization.custom-instruction")}</span>
            </div>
            <Textarea
              rows={3}
              value={personaCustomInstruction}
              placeholder={t(
                "settings.personalization.custom-instruction-placeholder",
              )}
              className="persona-panel-textarea"
              onChange={(e) =>
                dispatch(settings.setPersonaCustomInstruction(e.target.value))
              }
            />
          </div>

          {/* 关于你 */}
          <div className="persona-section persona-section-last">
            <div className="persona-section-header">
              <User className="h-3.5 w-3.5" />
              <span>{t("settings.personalization.about-you")}</span>
            </div>
            <p className="persona-section-note">
              {t("settings.personalization.about-user-tip")}
            </p>
            <Textarea
              rows={4}
              value={personaAboutUser}
              placeholder={t(
                "settings.personalization.about-user-placeholder",
              )}
              className="persona-panel-textarea"
              onChange={(e) =>
                dispatch(settings.setPersonaAboutUser(e.target.value))
              }
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PersonalizationPanel;
