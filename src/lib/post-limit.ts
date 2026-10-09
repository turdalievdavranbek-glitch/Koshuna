import { api } from "./api/client";

/** Server hint before publish. The listing insert enforces the same limit. */
export async function personalPostLimited(): Promise<boolean> {
  const res = await api<{ limited?: boolean }>("/api/me/post-limit");
  return Boolean(res.ok && res.data?.limited);
}
