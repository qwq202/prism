import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useEffectAsync } from "@/utils/hook.ts";
import {
  Attachment,
  deleteAttachment,
  listAttachments,
} from "@/admin/api/attachment.ts";
import { getSizeUnit } from "@/utils/base.ts";
import { withNotify } from "@/api/common.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import { ExternalLink, RotateCcw, Trash2 } from "lucide-react";

function AttachmentItem({
  name,
  size,
  updated_at,
  storage_mode,
  public_url,
  referenced,
  reference_count,
  onUpdate,
}: Attachment & { onUpdate: () => Promise<void> }) {
  const { t } = useTranslation();

  const onDelete = async () => {
    const confirmed = window.confirm(
      referenced
        ? t("admin.attachment.delete-referenced-confirm", {
            name,
            count: reference_count,
          })
        : t("admin.attachment.delete-confirm", { name }),
    );
    if (!confirmed) return;

    const res = await deleteAttachment(name);
    withNotify(t, res, true);
    if (res.status) await onUpdate();
  };

  return (
    <div className="flex items-center gap-3 p-3 w-full max-w-full bg-background rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-2">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground break-all whitespace-pre-wrap">
          {name}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{getSizeUnit(size)}</span>
          <span>{new Date(updated_at).toLocaleString()}</span>
          <Badge variant="outline" className="uppercase">
            {storage_mode}
          </Badge>
          <Badge
            variant={referenced ? "default" : "secondary"}
            className={cn(!referenced && "text-muted-foreground")}
          >
            {referenced
              ? t("admin.attachment.referenced-count", { count: reference_count })
              : t("admin.attachment.orphan")}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(public_url, "_blank", "noopener,noreferrer")}
          title={t("admin.attachment.open")}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          title={t("delete")}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function AttachmentManager() {
  const { t } = useTranslation();
  const [data, setData] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const sync = async () => {
    if (loading) return;
    setLoading(true);
    setData(await listAttachments());
    setLoading(false);
  };

  useEffectAsync(async () => {
    await sync();
  }, []);

  return (
    <div className="attachment">
      <Card className="admin-card">
        <CardHeader className="select-none">
          <div className="flex items-center gap-2">
            <CardTitle>{t("admin.attachment.title")}</CardTitle>
            <div className="grow" />
            <Button onClick={sync} variant="outline" size="icon">
              <RotateCcw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-3">
            {t("admin.attachment.description")}
          </div>
          {data.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {t("admin.attachment.empty")}
            </div>
          ) : (
            <div className="attachment-list">
              {data.map((item) => (
                <AttachmentItem key={item.name} {...item} onUpdate={sync} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AttachmentManager;
