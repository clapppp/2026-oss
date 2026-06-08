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

export async function verifyUser(email: string, phone: string): Promise<void> {
  await request("/api/auth/verify-user", {
    method: "POST",
    body: JSON.stringify({ email, phone }),
  });
}

export async function resetPassword(email: string, phone: string, newPassword: string): Promise<void> {
  await request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, phone, new_password: newPassword }),
  });
}

export async function uploadPhoto(file: File): Promise<string> {
  if (USE_MOCK) return URL.createObjectURL(file);
  const form = new FormData();
  form.append("photo", file);
  return request<{ url: string }>("/api/user/photo", { method: "POST", body: form }).then((r) => r.url);
}

export async function deletePhoto(): Promise<void> {
  if (USE_MOCK) return;
  await request("/api/user/photo", { method: "DELETE" });
}
