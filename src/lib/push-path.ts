import { isDbUserId } from "./phone";

/** Must match the Android channel created in KoshunaApp and strings.xml. */
export const PUSH_CHANNEL_ID = "messages";

const LISTING_ID = /^[A-Za-z0-9_-]{1,80}$/;

/** In-app path for a notice tap. Same targets as the notifications list. */
export function pushPathForNotice(input: {
  threadId?: string | null;
  requestId?: string | null;
  listingId?: string | null;
}): string {
  if (input.threadId && isDbUserId(input.threadId)) return `/chat/${input.threadId}`;
  if (input.requestId && isDbUserId(input.requestId)) return "/requests";
  if (input.listingId && LISTING_ID.test(input.listingId)) return `/listing/${input.listingId}`;
  return "/notifications";
}

/** Paths we will open from a notification tap. No external URLs. */
export function isSafePushPath(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !path.includes("://") &&
    !/\s/.test(path) &&
    path.length <= 200
  );
}
