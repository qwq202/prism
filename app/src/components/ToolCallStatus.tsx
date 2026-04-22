import { MessageToolCall } from "@/api/types.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import { formatToolCallResult } from "@/api/plugin.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Wrench,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type ToolCallStatusProps = {
  toolCalls: MessageToolCall[];
  className?: string;
};

function getPrettyJson(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return trimmed;
  }
}

type ToolCallRowProps = {
  toolCall: MessageToolCall;
};

function ToolCallRow({ toolCall }: ToolCallRowProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const getStatusMeta = (toolCall: MessageToolCall) => {
    switch (toolCall.status) {
      case "executing":
        return {
          label: t("plugin.mcp.status-executing"),
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />,
          tone: "text-blue-600 dark:text-blue-400",
        };
      case "success":
        return {
          label: t("plugin.mcp.status-success"),
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
          tone: "text-green-600 dark:text-green-400",
        };
      case "error":
        return {
          label: t("plugin.mcp.status-error"),
          icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
          tone: "text-red-600 dark:text-red-400",
        };
      default:
        return {
          label: t("plugin.mcp.status-prepare"),
          icon: (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ),
          tone: "text-muted-foreground",
        };
    }
  };

  const status = getStatusMeta(toolCall);
  const argumentsText = getPrettyJson(toolCall.function.arguments);
  const resultText = toolCall.result
    ? getPrettyJson(formatToolCallResult(toolCall.result))
    : "";
  const errorText = toolCall.error ? toolCall.error.trim() : "";
  const hasDetails = Boolean(argumentsText || resultText || errorText);

  return (
    <>
      <button
        type="button"
        disabled={!hasDetails}
        onClick={() => hasDetails && setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/5 px-2 py-1.5 text-left transition-colors",
          hasDetails
            ? "hover:bg-muted/10 cursor-pointer"
            : "cursor-default opacity-95",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80">
            <Wrench className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="truncate text-[12px] font-medium leading-none">
              {toolCall.function.name}
            </div>
            <div
              className={cn(
                "flex items-center gap-1 text-[10px] leading-none",
                status.tone,
              )}
            >
              {status.icon}
              <span>{status.label}</span>
            </div>
          </div>
        </div>
        {hasDetails && (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </button>

      {hasDetails && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <span>{toolCall.function.name}</span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-normal",
                    status.tone,
                  )}
                >
                  {status.icon}
                  {status.label}
                </span>
              </DialogTitle>
              <DialogDescription>
                {toolCall.id || t("plugin.mcp.tool-arguments")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {argumentsText && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("plugin.mcp.tool-arguments")}
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-md bg-background/80 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
                    {argumentsText}
                  </pre>
                </div>
              )}
              {resultText && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("plugin.mcp.result")}
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-md bg-background/80 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
                    {resultText}
                  </pre>
                </div>
              )}
              {errorText && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-red-500">
                    {t("plugin.mcp.error")}
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-md bg-red-500/10 p-3 text-xs leading-relaxed text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
                    {errorText}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function ToolCallStatus({ toolCalls, className }: ToolCallStatusProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className={cn("mt-1.5 space-y-1", className)}>
      {toolCalls.map((toolCall, index) => (
        <ToolCallRow
          key={toolCall.id || `${toolCall.function.name}-${index}`}
          toolCall={toolCall}
        />
      ))}
    </div>
  );
}
