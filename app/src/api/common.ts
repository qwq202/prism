import { toast } from "sonner";
import type { TFunction } from "i18next";

export type CommonResponse = {
  status: boolean;
  error?: string;
  reason?: string;
  message?: string;
  data?: unknown;
};

export function withNotify(
  t: TFunction,
  state: CommonResponse,
  toastSuccess?: boolean,
  toastSuccessMessage?: string,
) {
  if (state.status)
    toastSuccess &&
      toast.success(t("success"), {
        description: toastSuccessMessage || t("request-success"),
      });
  else
    toast.error(t("error"), {
      description:
        state.error ?? state.reason ?? state.message ?? "error occurred",
    });
}
