export type Page = "main" | "apply" | "status" | "signup" | "login" | "mypage" | "admin" | "findPassword" | "guide";

export const PROTECTED_PAGES: Page[] = ["apply", "status", "mypage", "admin"];
export const ADMIN_PAGES: Page[] = ["admin"];
export const USER_PAGES: Page[] = ["apply", "status", "mypage"];

export const NAV_ITEMS_CONFIG: { label: string; page: Page | null }[] = [
  { label: "예술활동증명 신청", page: "apply" },
  { label: "신청 현황 조회",   page: "status" },
  { label: "이용안내",        page: "guide" },
];

export const ADMIN_NAV_ITEMS_CONFIG: { label: string; page: Page | null }[] = [
  { label: "신청 관리", page: "admin" },
];

export const POLICY_LINKS: { label: string; href: string; highlight?: boolean }[] = [
  { label: "개인정보처리방침", href: "#", highlight: true },
  { label: "이용약관", href: "#" },
  { label: "저작권정책", href: "#" },
];

export const FAMILY_SITES: { label: string; href: string }[] = [
  { label: "한국예술인복지재단", href: "https://www.kawf.kr" },
  { label: "문화체육관광부", href: "http://www.mcst.go.kr" },
];
