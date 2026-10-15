/** Recovery after a client-side crash: drop disposable caches once and reload. Never touches drafts or login. */
const FLAG = "konshu-recovered-at";
const CACHE_KEYS = ["konshu-feed-cache-v1", "konshu-feed-cache-v2"];

export function recoverOnce(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(FLAG) || 0);
    if (last && Date.now() - last < 60_000) return false;
    sessionStorage.setItem(FLAG, String(Date.now()));
  } catch {
    return false;
  }
  try {
    for (const key of CACHE_KEYS) localStorage.removeItem(key);
  } catch {
    /* storage blocked */
  }
  const reload = () => window.location.reload();
  try {
    if ("caches" in window) {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .finally(reload);
      return true;
    }
  } catch {
    /* fall through */
  }
  reload();
  return true;
}
