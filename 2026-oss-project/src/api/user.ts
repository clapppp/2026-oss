import { request } from "./client";
import type { User } from "./types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export type UpdateProfilePayload = Partial<Pick<User, "phone" | "email" | "nationality" | "penName">>;

export async function updateProfile(updates: UpdateProfilePayload): Promise<void> {
  if (USE_MOCK) return;
  await request("/api/user/profile", { method: "PATCH", body: JSON.stringify(updates) });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (USE_MOCK) return;
  await request("/api/auth/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function verifyIdentity(): Promise<void> {
  // TODO: PASS, 카카오 인증 등 외부 서비스 연동 후 구현
  throw new Error("본인인증 서비스가 아직 연동되지 않았습니다.");
}

export async function uploadPhoto(file: File): Promise<string> {
  if (USE_MOCK) return URL.createObjectURL(file);
  const form = new FormData();
  form.append("photo", file);
  return request<{ url: string }>("/api/user/photo", { method: "POST", body: form }).then((r) => r.url);
}
