import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Copy, Flame, Loader2 } from "lucide-react";
import { mobile } from "@/utils/device.ts";
import { cn } from "@/components/ui/lib/utils.ts";
import axios from "axios";
import { copyClipboard } from "@/utils/dom.ts";
import { toast } from "sonner";

type WarmupResult = {
  url: string;
  status: number;
  error?: string;
};

async function warmupUrls(urls: string[]): Promise<WarmupResult[]> {
  try {
    const resp = await axios.post("/admin/warmup", { urls });
    return resp.data?.results ?? [];
  } catch (e) {
    return [];
  }
}

function ResultBadge({ status, error }: { status: number; error?: string }) {
  if (error) {
    return <Badge variant="destructive">Error</Badge>;
  }
  if (status >= 200 && status < 300) {
    return <Badge variant="default">{status} OK</Badge>;
  }
  if (status >= 300 && status < 400) {
    return <Badge variant="secondary">{status} Redirect</Badge>;
  }
  return <Badge variant="destructive">{status || "—"}</Badge>;
}

function AdminWarmup() {
  const { t } = useTranslation();
  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WarmupResult[]>([]);

  const getUrls = (): string[] =>
    urlText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));

  const handleWarmup = async () => {
    const urls = getUrls();
    if (urls.length === 0) {
      toast.error("Please enter valid HTTP/HTTPS URLs.");
      return;
    }
    setLoading(true);
    setResults([]);
    const res = await warmupUrls(urls);
    setResults(res);
    setLoading(false);

    const success = res.filter((r) => !r.error && r.status >= 200 && r.status < 300).length;
    toast.success(`Warmup complete: ${success}/${res.length} succeeded`);
  };

  const handleCopyUrls = () => {
    copyClipboard(getUrls().join("\n"));
    toast.success(t("admin.cdn.copy-data"));
  };

  return (
    <div className={cn("user-interface", mobile && "mobile")}>
      <Card className="admin-card">
        <CardHeader className="select-none">
          <CardTitle>{t("admin.cdn.warmup")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed bg-muted/20 rounded-md p-4">
            {t("admin.cdn.warm-tip")}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="https://example.com/resource1.js&#10;https://example.com/resource2.css"
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {getUrls().length} URL(s) detected
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleWarmup} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Flame className="w-4 h-4 mr-2" />
              )}
              {loading ? "Warming up..." : t("admin.cdn.warmup")}
            </Button>
            <Button variant="outline" onClick={handleCopyUrls}>
              <Copy className="w-4 h-4 mr-2" />
              {t("admin.cdn.copy-data")}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Results</p>
              <div className="rounded-md border divide-y">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[70%]">
                      {r.url}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.error && (
                        <span className="text-xs text-destructive">{r.error}</span>
                      )}
                      <ResultBadge status={r.status} error={r.error} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminWarmup;
