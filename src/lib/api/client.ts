export type ApiResult<T> = { ok: boolean; status: number; data?: T; error?: string };

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<ApiResult<T>> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
  try {
    const res = await fetch(path, {
      ...init,
      headers,
      credentials: "same-origin",
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    });
    const data = (await res.json().catch(() => undefined)) as (T & { error?: string }) | undefined;
    if (!res.ok) return { ok: false, status: res.status, data, error: data?.error || String(res.status) };
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, error: "network" };
  }
}

export function onceRetry(run: () => Promise<{ ok: boolean }>): void {
  void (async () => {
    const first = await run();
    if (!first.ok) await run();
  })();
}
