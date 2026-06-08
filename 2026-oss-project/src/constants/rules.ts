// ── 신청 ──────────────────────────────────────
export const MAX_CATEGORIES = 3;
export const INITIAL_APPLICATION_STATUS = "심사중" as const;

// ── 계정 / 인증 ────────────────────────────────
export const MIN_PASSWORD_LENGTH = 10;

/**
 * 비밀번호 복잡도 검사.
 * 통과하면 null, 실패하면 사용자에게 보여줄 에러 문자열 반환.
 * 조건: 10자 이상 + 영문 + 숫자 + 특수문자
 */
export function getPasswordError(pw: string): string | null {
  if (pw.length < MIN_PASSWORD_LENGTH)
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  if (!/[a-zA-Z]/.test(pw))
    return "영문자(대소문자)를 포함해야 합니다.";
  if (!/[0-9]/.test(pw))
    return "숫자를 포함해야 합니다.";
  if (!/[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(pw))
    return "특수문자를 포함해야 합니다.";
  return null;
}
export const PHONE_DIGITS = 11;
export const BIRTH_DIGITS = 8;
export const AUTH_CODE_DIGITS = 6;
export const AUTH_CODE_TIMEOUT_SECONDS = 180;
export const MAX_PEN_NAME_LENGTH = 30;

// ── 문학 장르별 최소 실적 편수 ─────────────────
export const LITERATURE_GENRE_MIN: Record<string, number> = {
  "시/시조":              5,
  "수필":                5,
  "평론":                3,
  "소설/동화/청소년소설": 3,
  "평전":                1,
  "희곡":                1,
  "문학작품집":           1,
};

// 소설 분량 기준 (장편 1편, 단편·기타 3편)
export const NOVEL_LONGSERIES_MIN = 1;
export const NOVEL_SHORTSERIES_MIN = 3;

// ── 만화 ───────────────────────────────────────
export const MANHWA_SERIAL_MIN_MONTHS = 6;
