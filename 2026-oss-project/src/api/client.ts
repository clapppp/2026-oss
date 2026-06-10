export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ── 유틸 ───────────────────────────────────────────────
function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => { result[key] = value; });
    return result;
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

// ── fetch 래퍼 ─────────────────────────────────────────
export async function request<T>(path: string, init?: RequestInit, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const isFormData = init?.body instanceof FormData;
  const normalized = normalizeHeaders(init?.headers);

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: isFormData
        ? { ...normalized }
        : { "Content-Type": "application/json", ...normalized },
    });

    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("artpass:unauthorized"));
      throw new ApiError(401, "인증이 만료되었습니다. 다시 로그인해 주세요.");
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message = res.statusText;
      try {
        const parsed = JSON.parse(body);
        message = parsed.detail ?? parsed.message ?? body;
      } catch {
        message = body || res.statusText;
      }
      throw new ApiError(res.status, message);
    }

    if (res.status === 204) return undefined as T;
    const json: unknown = await res.json();
    if (json && typeof json === "object" && "success" in json && typeof (json as Record<string, unknown>).success === "boolean") {
      const apiRes = json as { success: boolean; data: T; message: string | null };
      if (!apiRes.success) throw new ApiError(res.status, apiRes.message ?? res.statusText);
      return apiRes.data;
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

export const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
