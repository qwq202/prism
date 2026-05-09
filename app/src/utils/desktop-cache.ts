import {
  getDesktopStoreValue,
  setDesktopStoreValue,
} from "@/utils/desktop-store.ts";

type CacheEnvelope<T> = {
  version: 1;
  updatedAt: number;
  data: T;
};

const cachePrefix = "api-cache:";

function getCacheKey(key: string): string {
  return `${cachePrefix}${key}`;
}

export async function getDesktopCache<T>(
  key: string,
  maxAgeMs?: number,
): Promise<T | undefined> {
  const cached = await getDesktopStoreValue<CacheEnvelope<T>>(getCacheKey(key));
  if (!cached || cached.version !== 1) return undefined;

  if (maxAgeMs && Date.now() - cached.updatedAt > maxAgeMs) {
    return undefined;
  }

  return cached.data;
}

export async function setDesktopCache<T>(key: string, data: T): Promise<void> {
  await setDesktopStoreValue<CacheEnvelope<T>>(getCacheKey(key), {
    version: 1,
    updatedAt: Date.now(),
    data,
  });
}

