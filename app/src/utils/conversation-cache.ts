import type { ConversationInstance } from "@/api/types.tsx";
import { apiEndpoint, tokenField } from "@/conf/bootstrap.ts";
import { getDesktopCache, setDesktopCache } from "@/utils/desktop-cache.ts";

type ConversationSerializedCache = {
  model?: string;
  messages: ConversationInstance["message"];
};

function hashCacheScope(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function getCacheScope(): string {
  const token = localStorage.getItem(tokenField) || "anonymous";
  return `${apiEndpoint}:${hashCacheScope(token)}`;
}

function getConversationListCacheKey(): string {
  return `conversation-list:${getCacheScope()}`;
}

function getConversationCacheKey(id: number): string {
  return `conversation:${getCacheScope()}:${id}`;
}

export async function getCachedConversationList(): Promise<
  ConversationInstance[] | undefined
> {
  return await getDesktopCache<ConversationInstance[]>(
    getConversationListCacheKey(),
  );
}

export async function setCachedConversationList(
  conversations: ConversationInstance[],
): Promise<void> {
  await setDesktopCache(getConversationListCacheKey(), conversations);
}

export async function getCachedConversation(
  id: number,
): Promise<ConversationSerializedCache | undefined> {
  if (id === -1) return undefined;
  return await getDesktopCache<ConversationSerializedCache>(
    getConversationCacheKey(id),
  );
}

export async function setCachedConversation(
  id: number,
  conversation: ConversationSerializedCache,
): Promise<void> {
  if (id === -1) return;
  await setDesktopCache(getConversationCacheKey(id), conversation);
}
