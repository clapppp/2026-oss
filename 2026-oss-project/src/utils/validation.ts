import { CATEGORY_FORM_CONFIG, CATEGORY_META } from "../constants/categoryFormConfig";

// ── 연극: 역할별 최소 편수 ─────────────────────────────────────────────────────
const THEATER_ROLE_MIN: Record<string, { min: number; unit: string }> = {
  "출연":               { min: 3, unit: "편" },
  "연출":               { min: 1, unit: "회" },
  "희곡집필 (공연 통해)": { min: 1, unit: "편" },
  "희곡집필 (잡지 등)":  { min: 1, unit: "편" },
  "비평":               { min: 3, unit: "편" },
};

// ── 문학: 세부장르별 최소 편수 ────────────────────────────────────────────────
const LIT_GENRE_MIN: Record<string, { min: number; unit: string }> = {
  "시/시조":               { min: 5, unit: "편" },
  "수필":                  { min: 5, unit: "편" },
  "소설/동화/청소년소설":  { min: 1, unit: "편" }, // 단편은 별도 3편 규칙 적용
  "평전":                  { min: 1, unit: "편" },
  "희곡":                  { min: 1, unit: "편" },
  "평론":                  { min: 3, unit: "편" },
  "문학작품집":            { min: 1, unit: "권" },
};

function validateTheater(
  entries: Record<string, string>[],
): string | null {
  if (entries.length === 0 || entries.every((e) => !e.role)) {
    return "[연극] 실적을 1편 이상 입력해 주세요.";
  }

  // 역할별 개수 집계
  const roleCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.role) roleCounts[e.role] = (roleCounts[e.role] ?? 0) + 1;
  }

  for (const [role, count] of Object.entries(roleCounts)) {
    const cfg = THEATER_ROLE_MIN[role];
    if (!cfg) continue;
    if (count < cfg.min) {
      return `[연극] "${role}" 실적을 ${cfg.min}${cfg.unit} 이상 입력해 주세요. (현재 ${count}${cfg.unit})`;
    }
  }

  return null;
}

function validateLiterature(
  entries: Record<string, string>[],
): string | null {
  if (entries.length === 0 || entries.every((e) => !e.genre)) {
    return "[문학] 실적을 1편 이상 입력해 주세요.";
  }

  // 세부장르별 전체 수 + 단편 수 집계
  const genreCounts: Record<string, { total: number; short: number }> = {};
  for (const e of entries) {
    if (!e.genre) continue;
    if (!genreCounts[e.genre]) genreCounts[e.genre] = { total: 0, short: 0 };
    genreCounts[e.genre].total++;
    if (e.character === "단편") genreCounts[e.genre].short++;
  }

  for (const [genre, counts] of Object.entries(genreCounts)) {
    const cfg = LIT_GENRE_MIN[genre];
    if (!cfg) continue;

    if (genre === "소설/동화/청소년소설") {
      const longCount = counts.total - counts.short; // 장편/기타
      // 단편만 있을 때: 3편 이상 필요
      if (longCount === 0 && counts.short < 3) {
        return `[문학] "소설(단편)" 실적을 3편 이상 입력해 주세요. (현재 ${counts.short}편)`;
      }
      // 단편·장편 혼재: 단편이 있다면 그 단편도 3편 이상이어야 함
      if (longCount > 0 && counts.short > 0 && counts.short < 3) {
        return `[문학] "소설(단편)" 실적을 3편 이상 입력해 주세요. (현재 ${counts.short}편)`;
      }
      // 장편/기타만 있거나, 단편 기준 충족 → 통과
      continue;
    }

    if (counts.total < cfg.min) {
      return `[문학] "${genre}" 실적을 ${cfg.min}${cfg.unit} 이상 입력해 주세요. (현재 ${counts.total}${cfg.unit})`;
    }
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

    // ── 분야별 편수 검사 ───────────────────────────────────────────────────────
    if (cat === "연극") {
      const err = validateTheater(entries);
      if (err) return err;
    } else if (cat === "문학") {
      const err = validateLiterature(entries);
      if (err) return err;
    } else {
      // 만화 연재 특례: 연재 실적이 1개 이상이면 편수 요건 충족
      const isManhwaSerial = cat === "만화" && entries.some((e) => e.method === "연재");
      if (!isManhwaSerial && entries.length < meta.minCount) {
        return `[${cat}] 실적을 ${meta.minCount}${meta.unit} 이상 입력해 주세요. (현재 ${entries.length}${meta.unit})`;
      }
    }

    // ── 필수 항목 입력 검사 ────────────────────────────────────────────────────
    for (let i = 0; i < entries.length; i++) {
      for (const field of fields) {
        // 만화: 연재 아닐 때 연재일 스킵
        if (
          cat === "만화" &&
          (field.key === "serialStart" || field.key === "serialEnd") &&
          entries[i].method !== "연재"
        ) continue;

        if (!entries[i][field.key]?.trim()) {
          return `[${cat}] 실적 ${i + 1}의 "${field.label}" 항목을 입력해 주세요.`;
        }

        // ISBN 13자리 검사
        if (field.key === "isbn") {
          const digits = (entries[i]["isbn"] ?? "").replace(/[^0-9]/g, "");
          if (digits.length !== 13) {
            return `[${cat}] 실적 ${i + 1}의 "ISBN"은 숫자 13자리여야 합니다. (현재 ${digits.length}자리)`;
          }
        }
      }
    }
  }

  return null;
}
