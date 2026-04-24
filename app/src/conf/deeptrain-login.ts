import {
  deeptrainAppName,
  deeptrainEndpoint,
} from "@/conf/env.ts";
import { dev } from "@/conf/bootstrap.ts";
import { getQueryParam } from "@/utils/path.ts";

export function goDeepLogin() {
  const appParam = dev ? "dev" : deeptrainAppName;
  const aff = getQueryParam("aff").trim();
  const affQuery = aff ? `&aff=${encodeURIComponent(aff)}` : "";
  location.href = `${deeptrainEndpoint}/login?app=${encodeURIComponent(appParam)}${affQuery}`;
}
