import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { User } from "../api/types";
import { login as apiLogin, logout as apiLogout, fetchMe } from "../api/auth";
import { updateProfile, type UpdateProfilePayload } from "../api/user";

export type { User } from "../api/types";

const USER_KEY = "artpass_user";

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadStoredUser);

  // 앱 초기 마운트 시 쿠키 유효성 검증 (서버에 /api/auth/me 호출)
  useEffect(() => {
    fetchMe().then((serverUser) => {
      if (serverUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(serverUser));
        setUser(serverUser);
      } else {
        localStorage.removeItem(USER_KEY);
        setUser(null);
      }
    });
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // 401 응답 시 client.ts가 발행하는 이벤트 수신 → 세션 초기화
  useEffect(() => {
    window.addEventListener("artpass:unauthorized", clearSession);
    return () => window.removeEventListener("artpass:unauthorized", clearSession);
  }, [clearSession]);

  const login = async (email: string, password: string): Promise<User> => {
    const userData = await apiLogin(email, password);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await apiLogout();
    clearSession();
  };

  const updateUser = async (updates: Partial<User>) => {
    const { phone, email, nationality, penName, profileImage } = updates;
    const profilePayload: UpdateProfilePayload = {};
    if (phone !== undefined) profilePayload.phone = phone;
    if (email !== undefined) profilePayload.email = email;
    if (nationality !== undefined) profilePayload.nationality = nationality;
    if (penName !== undefined) profilePayload.penName = penName;
    // profileImage는 /api/user/photo에서 이미 저장됨 — profile 엔드포인트 호출 불필요
    if (profileImage === undefined && Object.keys(profilePayload).length > 0) {
      await updateProfile(profilePayload); // 실패 시 예외를 호출자로 전파
    }
    // 로컬 상태 업데이트
    setUser((prev) => {
      const next = prev ? { ...prev, ...updates } : prev;
      if (next) localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, isAdmin: user?.role === "admin", login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
