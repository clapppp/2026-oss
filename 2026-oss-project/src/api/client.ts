export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ── 토큰 관리 ──────────────────────────────────────────
const TOKEN_KEY = "artpass_token";

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => { localStorage.setItem(TOKEN_KEY, token); },
  clear: (): void => { localStorage.removeItem(TOKEN_KEY); },
};

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

  const token = tokenStore.get();
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: isFormData
        ? { ...authHeader, ...normalized }
        : { "Content-Type": "application/json", ...authHeader, ...normalized },
    });

    if (res.status === 401) {
      tokenStore.clear();
      // AuthContext가 이 이벤트를 수신해 세션을 초기화함
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
