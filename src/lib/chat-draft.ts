/** One-time chat draft handed from a listing to the chat input (sessionStorage, same tab only). */
const KEY = "koshuna:chat-draft:";

export function saveChatDraft(scope: string, text: string): void {
  try {
    window.sessionStorage.setItem(KEY + scope, text);
  } catch {}
}

export function takeChatDraft(scope: string): string {
  try {
    const text = window.sessionStorage.getItem(KEY + scope) ?? "";
    window.sessionStorage.removeItem(KEY + scope);
    return text;
  } catch {
    return "";
  }
}

/** Service listings get «Записаться» instead of «Отложи мне». */
export function isServiceListing(listing: { section: string }): boolean {
  return listing.section === "services";
}
