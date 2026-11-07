const key = (threadId: string) => `konshu-chat-scroll:${threadId}`;

export type ChatScrollMark = {
  top: number;
  atBottom: boolean;
  anchorId: string;
  offset: number;
};

function write(storage: Storage, threadId: string, raw: string) {
  try {
    storage.setItem(key(threadId), raw);
  } catch {
    // Private mode or a full quota. The other store may still hold the mark.
  }
}

/** Remember where this conversation was left, in both stores so a reload can restore it. */
export function saveChatScroll(threadId: string, root: HTMLElement) {
  const top = root.scrollTop;
  const atBottom = root.scrollHeight - top - root.clientHeight < 48;
  const rootTop = root.getBoundingClientRect().top;
  let anchorId = "";
  let offset = 0;
  for (const node of root.querySelectorAll<HTMLElement>("[data-chat-line]")) {
    const delta = node.getBoundingClientRect().top - rootTop;
    if (delta >= -4) {
      anchorId = node.dataset.chatLine || "";
      offset = delta;
      break;
    }
  }
  const raw = JSON.stringify({ top, atBottom, anchorId, offset } satisfies ChatScrollMark);
  write(sessionStorage, threadId, raw);
  write(localStorage, threadId, raw);
}

export function readChatScroll(threadId: string): ChatScrollMark | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(key(threadId));
  } catch {
    raw = null;
  }
  if (!raw) {
    try {
      raw = localStorage.getItem(key(threadId));
    } catch {
      raw = null;
    }
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ChatScrollMark>;
    if (typeof parsed.top !== "number") return null;
    return {
      top: parsed.top,
      atBottom: Boolean(parsed.atBottom),
      anchorId: typeof parsed.anchorId === "string" ? parsed.anchorId : "",
      offset: typeof parsed.offset === "number" ? parsed.offset : 0,
    };
  } catch {
    return null;
  }
}

/** Content offset of a node inside a scroller, independent of offsetParent. */
export function lineTop(node: HTMLElement, root: HTMLElement) {
  return node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
}
