import { Store } from "@tauri-apps/plugin-store";
import { isDesktopRuntime } from "@/conf/env.ts";

const storePath = "prism-desktop.json";
const localStoragePrefix = "desktop-store:";

let storePromise: Promise<Store | null> | null = null;

async function loadDesktopStore(): Promise<Store | null> {
  if (!isDesktopRuntime()) return null;

  if (!storePromise) {
    storePromise = Store.load(storePath, {
      defaults: {},
      autoSave: 100,
      overrideDefaults: true,
    }).catch((error) => {
      console.debug("[desktop-store] failed to load store:", error);
      storePromise = null;
      return null;
    });
  }

  return storePromise;
}

function getFallbackKey(key: string): string {
  return `${localStoragePrefix}${key}`;
}

export async function getDesktopStoreValue<T>(
  key: string,
): Promise<T | undefined> {
  const store = await loadDesktopStore();
  if (store) {
    const value = await store.get<T>(key);
    if (value !== undefined) return value;
  }

  const fallback = localStorage.getItem(getFallbackKey(key));
  if (!fallback) return undefined;

  try {
    return JSON.parse(fallback) as T;
  } catch {
    return undefined;
  }
}

export async function setDesktopStoreValue<T>(
  key: string,
  value: T,
): Promise<void> {
  localStorage.setItem(getFallbackKey(key), JSON.stringify(value));

  const store = await loadDesktopStore();
  if (!store) return;

  await store.set(key, value);
  await store.save();
}

export function setDesktopStoreValueLater<T>(key: string, value: T): void {
  void setDesktopStoreValue(key, value);
}

