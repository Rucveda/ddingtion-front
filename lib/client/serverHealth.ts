import { API_BASE_URL } from "@/lib/client/runtimeConfig";

export function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("timeout")
  );
}

/** Render 슬립 등으로 API가 잠깐 죽었을 때 깨어날 때까지 폴링 */
export async function pingServer(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

export async function waitForServerReady(options?: {
  intervalMs?: number;
  maxAttempts?: number;
}): Promise<boolean> {
  const intervalMs = options?.intervalMs ?? 2500;
  const maxAttempts = options?.maxAttempts ?? 48;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await pingServer()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
