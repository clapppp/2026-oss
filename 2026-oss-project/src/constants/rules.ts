// ── 신청 ──────────────────────────────────────
export const MAX_CATEGORIES = 3;
export const INITIAL_APPLICATION_STATUS = "심사중" as const;

// ── 계정 / 인증 ────────────────────────────────
export const MIN_PASSWORD_LENGTH = 8;
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
