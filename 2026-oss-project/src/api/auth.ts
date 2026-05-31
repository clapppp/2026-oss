import { request, tokenStore } from "./client";
import type { User, SignupRequest } from "./types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// 개발용 mock 계정 (VITE_USE_MOCK=true 일 때만 사용)
const MOCK_ACCOUNTS: (User & { password: string })[] = [
  {
    name: "홍길동", birth: "1990.05.15", gender: "M", phone: "010-1234-5678",
    email: "demo@artpass.kr", isVerified: false, nationality: "korean",
    penName: "", role: "user", password: "password1!",
  },
  {
    name: "관리자", birth: "1985.01.01", gender: "M", phone: "010-0000-0000",
    email: "admin@artpass.kr", isVerified: true, nationality: "korean",
    penName: "", role: "admin", password: "admin1!",
  },
];

export async function login(email: string, password: string): Promise<User> {
  if (USE_MOCK) {
    const found = MOCK_ACCOUNTS.find((u) => u.email === email && u.password === password);
    if (!found) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    const { password: _, ...user } = found;
    tokenStore.set("mock-token");
    return user;
  }
  const { user, token } = await request<{ user: User; token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  tokenStore.set(token);
  return user;
}

export async function logout(): Promise<void> {
  if (USE_MOCK) { tokenStore.clear(); return; }
  try { await request("/api/auth/logout", { method: "POST" }); }
  finally { tokenStore.clear(); }
}

export async function signup(data: SignupRequest): Promise<User> {
  if (USE_MOCK) {
    const user: User = {
      name: data.name, birth: data.birth, gender: data.gender,
      phone: data.phone, email: data.email, isVerified: false,
      nationality: "korean", penName: "", role: "user",
    };
    tokenStore.set("mock-token");
    return user;
  }
  const { user } = await request<{ user: User }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return user;
}
