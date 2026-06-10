import { CATEGORY_FORM_CONFIG, CATEGORY_META } from "../constants/categoryFormConfig";

// ─────────────────────────────────────────────────────────────────────────────
// 분야별 비율 기준표  (key: 폼 필드값, min: 기준 하한, unit: 단위, label: 표시명)
// ─────────────────────────────────────────────────────────────────────────────

type MinEntry = { min: number; unit: string; label?: string };

// 문학 — genre 필드 기준
const LIT_GENRE_MIN: Record<string, MinEntry> = {
  "시/시조":          { min: 5, unit: "편",  label: "시/시조" },
  "수필":             { min: 5, unit: "편",  label: "수필" },
  "소설 (단편)":      { min: 3, unit: "편",  label: "소설(단편)" },
  "소설 (장편·기타)": { min: 1, unit: "편",  label: "소설(장편·기타)" },
  "평전":             { min: 1, unit: "편",  label: "평전" },
  "희곡":             { min: 1, unit: "편",  label: "희곡" },
  "평론":             { min: 3, unit: "편",  label: "평론" },
  "문학작품집":       { min: 1, unit: "권",  label: "문학작품집" },
};

// 연극 — role 필드 기준
const THEATER_ROLE_MIN: Record<string, MinEntry> = {
  "출연":                  { min: 3, unit: "편" },
  "연출":                  { min: 1, unit: "회" },
  "희곡집필 (공연 통해)":  { min: 1, unit: "편" },
  "희곡집필 (잡지 등)":    { min: 1, unit: "편" },
  "비평":                  { min: 3, unit: "편" },
  "비평집 출간":           { min: 1, unit: "권" },
};

// 미술 계열(디자인/공예·일반미술·전통미술·사진·건축) — method 필드 기준
const ART_METHOD_MIN: Record<string, MinEntry> = {
  "매체발표 / 전시": { min: 5, unit: "회" },
  "개인전":          { min: 1, unit: "회" },
  "작품집 출간":     { min: 1, unit: "권" },
  "비평 발표":       { min: 5, unit: "편" },
  "비평집 출간":     { min: 1, unit: "권" },
};

// 무용 — role 필드 기준
const DANCE_ROLE_MIN: Record<string, MinEntry> = {
  "출연":        { min: 3, unit: "편" },
  "안무":        { min: 1, unit: "회" },
  "비평 발표":   { min: 3, unit: "편" },
  "비평집 출간": { min: 1, unit: "권" },
};

// 영화 — role 필드 기준
const FILM_ROLE_MIN: Record<string, MinEntry> = {
  "출연":            { min: 3, unit: "편" },
  "연출":            { min: 1, unit: "회" },
  "시나리오 집필":   { min: 1, unit: "편" },
  "비평 발표":       { min: 3, unit: "편" },
  "비평집 출간":     { min: 1, unit: "권" },
};

// 방송(연예) — role 필드 기준
const BROADCAST_ROLE_MIN: Record<string, MinEntry> = {
  "방송 출연":       { min: 3, unit: "편" },
  "방송 연출/진행":  { min: 1, unit: "편" },
  "패션쇼 출연":     { min: 3, unit: "회" },
  "광고 출연":       { min: 3, unit: "편" },
  "연예 공연 출연":  { min: 3, unit: "편" },
  "대본 발표":       { min: 1, unit: "편" },
  "비평 발표":       { min: 3, unit: "편" },
  "비평집 출간":     { min: 1, unit: "권" },
};

// 음악 계열(국악·대중음악·일반음악) — type 필드 기준
const MUSIC_TYPE_MIN: Record<string, MinEntry> = {
  "공연/방송 출연":       { min: 3, unit: "편" },
  "악곡 창작 발표":       { min: 3, unit: "곡" },
  "음반 발매":            { min: 1, unit: "장" },
  "지휘":                 { min: 3, unit: "회" },
  "비평 발표":            { min: 3, unit: "편" },
  "비평집/작품집 출간":   { min: 1, unit: "권" },
};

// 만화 — method 필드 기준
const MANHWA_METHOD_MIN: Record<string, MinEntry> = {
  "단편 발표":          { min: 5, unit: "편" },
  "연재 (6개월 이상)":  { min: 1, unit: "편" },
  "작품집 출간":        { min: 1, unit: "권" },
  "전시":               { min: 5, unit: "회" },
  "비평 발표":          { min: 5, unit: "편" },
  "비평집 출간":        { min: 1, unit: "권" },
};

// ─────────────────────────────────────────────────────────────────────────────
// 비율 기반 분야 설정 테이블
// ─────────────────────────────────────────────────────────────────────────────

const ART_CATS = new Set(["디자인 / 공예", "일반미술", "전통미술", "사진", "건축"]);
const MUSIC_CATS = new Set(["국악", "대중음악", "일반음악"]);

type RatioConfig = { minMap: Record<string, MinEntry>; fieldKey: string };

function getRatioConfig(cat: string): RatioConfig | null {
  if (cat === "문학")  return { minMap: LIT_GENRE_MIN,       fieldKey: "genre" };
  if (cat === "연극")  return { minMap: THEATER_ROLE_MIN,    fieldKey: "role" };
  if (cat === "무용")  return { minMap: DANCE_ROLE_MIN,      fieldKey: "role" };
  if (cat === "영화")  return { minMap: FILM_ROLE_MIN,       fieldKey: "role" };
  if (cat === "방송")  return { minMap: BROADCAST_ROLE_MIN,  fieldKey: "role" };
  if (cat === "만화")  return { minMap: MANHWA_METHOD_MIN,   fieldKey: "method" };
  if (ART_CATS.has(cat))   return { minMap: ART_METHOD_MIN,  fieldKey: "method" };
  if (MUSIC_CATS.has(cat)) return { minMap: MUSIC_TYPE_MIN,  fieldKey: "type" };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 공통 유틸
// ─────────────────────────────────────────────────────────────────────────────

function ratioSum(counts: Record<string, number>, minMap: Record<string, MinEntry>): number {
  let total = 0;
  for (const [key, count] of Object.entries(counts)) {
    const m = minMap[key];
    if (m) total += count / m.min;
  }
  return total;
}

function countsByField(entries: Record<string, string>[], fieldKey: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    const v = e[fieldKey];
    if (v) counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 진행 현황 (ApplyPage 표시용)
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryProgress {
  isRatioBased: boolean;
  ratio: number;
  meetsMin: boolean;
  maxEntries: number;
  tags: { label: string; count: number; min: number }[];
}

export function getCategoryProgress(
  cat: string,
  entries: Record<string, string>[],
): CategoryProgress {
  const cfg = getRatioConfig(cat);
  if (!cfg) {
    return { isRatioBased: false, ratio: 0, meetsMin: false, maxEntries: 0, tags: [] };
  }

  const counts = countsByField(entries, cfg.fieldKey);
  const ratio = ratioSum(counts, cfg.minMap);
  const tags = Object.entries(counts)
    .filter(([k]) => cfg.minMap[k])
    .map(([k, count]) => ({
      label: cfg.minMap[k].label ?? k,
      count,
      min: cfg.minMap[k].min,
    }));

  return { isRatioBased: true, ratio, meetsMin: ratio >= 1, maxEntries: 20, tags };
}

// ─────────────────────────────────────────────────────────────────────────────
// 유효성 검사
// ─────────────────────────────────────────────────────────────────────────────

function validateRatioCat(cat: string, entries: Record<string, string>[]): string | null {
  const cfg = getRatioConfig(cat)!;
  const counts = countsByField(entries, cfg.fieldKey);

  if (Object.keys(counts).length === 0) {
    return `[${cat}] 실적을 1편 이상 입력해 주세요.`;
  }

  const ratio = ratioSum(counts, cfg.minMap);
  if (ratio < 1) {
    const detail = Object.entries(counts)
      .filter(([k]) => cfg.minMap[k])
      .map(([k, cnt]) => `${cfg.minMap[k].label ?? k} ${cnt}/${cfg.minMap[k].min}`)
      .join(", ");
    return `[${cat}] 실적이 부족합니다. (비율 합계 ${ratio.toFixed(2)} / 1.00 필요${detail ? ` — ${detail}` : ""})`;
  }

  return null;
}

export function validateApplicationStep2(
  selectedCategories: string[],
  categoryForms: Record<string, Record<string, string>[]>,
): string | null {
  if (selectedCategories.length === 0) return "신청 분야를 1개 이상 선택해 주세요.";

  for (const cat of selectedCategories) {
    const fields = CATEGORY_FORM_CONFIG[cat];
    const meta = CATEGORY_META[cat];
    if (!fields || !meta) continue;
    const entries = categoryForms[cat] ?? [{}];

    // ── 편수 검사 ─────────────────────────────────────────────────────────────
    if (getRatioConfig(cat)) {
      const err = validateRatioCat(cat, entries);
      if (err) return err;
    } else {
      // 단순 카운트 분야 (공연 등)
      if (entries.length < meta.minCount) {
        return `[${cat}] 실적을 ${meta.minCount}${meta.unit} 이상 입력해 주세요. (현재 ${entries.length}${meta.unit})`;
      }
    }

    // ── 필수 항목 입력 검사 ───────────────────────────────────────────────────
    for (let i = 0; i < entries.length; i++) {
      for (const field of fields) {
        // 만화: 연재 아닐 때 연재일 스킵
        if (
          cat === "만화" &&
          (field.key === "serialStart" || field.key === "serialEnd")
        ) continue;

        // optional 필드
        if (field.optional) {
          if (field.key === "isbn" && entries[i]["isbn"]?.trim()) {
            const digits = entries[i]["isbn"].replace(/[^0-9]/g, "");
            if (digits.length !== 13) {
              return `[${cat}] 실적 ${i + 1}의 "ISBN"은 숫자 13자리여야 합니다. (현재 ${digits.length}자리)`;
            }
          }
          continue;
        }

        if (!entries[i][field.key]?.trim()) {
          return `[${cat}] 실적 ${i + 1}의 "${field.label}" 항목을 입력해 주세요.`;
        }
      }
    }
  }

  return null;
}
