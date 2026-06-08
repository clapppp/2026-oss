import { CATEGORY_FORM_CONFIG, CATEGORY_META } from "../constants/categoryFormConfig";

// ── 연극: 역할별 최소 편수 ─────────────────────────────────────────────────────
const THEATER_ROLE_MIN: Record<string, { min: number; unit: string }> = {
  "출연":                { min: 3, unit: "편" },
  "연출":                { min: 1, unit: "회" },
  "희곡집필 (공연 통해)": { min: 1, unit: "편" },
  "희곡집필 (잡지 등)":   { min: 1, unit: "편" },
  "비평":                { min: 3, unit: "편" },
};

// ── 문학: 세부장르별 최소 편수 ────────────────────────────────────────────────
const LIT_GENRE_MIN: Record<string, { min: number; unit: string; label: string }> = {
  "시/시조":           { min: 5, unit: "편", label: "시/시조" },
  "수필":              { min: 5, unit: "편", label: "수필" },
  "소설 (단편)":       { min: 3, unit: "편", label: "소설(단편)" },
  "소설 (장편·기타)":  { min: 1, unit: "편", label: "소설(장편·기타)" },
  "동화/청소년소설":   { min: 1, unit: "편", label: "동화/청소년소설" },
  "평전":              { min: 1, unit: "편", label: "평전" },
  "희곡":              { min: 1, unit: "편", label: "희곡" },
  "평론":              { min: 3, unit: "편", label: "평론" },
  "문학작품집":        { min: 1, unit: "권", label: "문학작품집" },
};

/** 비율 합계 방식: 각 그룹의 (실제 수 / 최소 수) 합이 1 이상이면 통과 */
function ratioSum(counts: Record<string, number>, minMap: Record<string, number>): number {
  let total = 0;
  for (const [key, count] of Object.entries(counts)) {
    const min = minMap[key];
    if (min) total += count / min;
  }
  return total;
}

function validateTheater(entries: Record<string, string>[]): string | null {
  if (entries.length === 0 || entries.every((e) => !e.role)) {
    return "[연극] 실적을 1편 이상 입력해 주세요.";
  }

  const roleCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.role) roleCounts[e.role] = (roleCounts[e.role] ?? 0) + 1;
  }

  const minMap = Object.fromEntries(
    Object.entries(THEATER_ROLE_MIN).map(([k, v]) => [k, v.min]),
  );
  const ratio = ratioSum(roleCounts, minMap);

  if (ratio < 1) {
    const detail = Object.entries(roleCounts)
      .map(([role, cnt]) => {
        const min = THEATER_ROLE_MIN[role]?.min;
        return min ? `${role} ${cnt}/${min}` : null;
      })
      .filter(Boolean)
      .join(", ");
    return `[연극] 실적이 부족합니다. (비율 합계 ${ratio.toFixed(2)} / 1.00 필요 — ${detail})`;
  }

  return null;
}

function validateLiterature(entries: Record<string, string>[]): string | null {
  if (entries.length === 0 || entries.every((e) => !e.genre)) {
    return "[문학] 실적을 1편 이상 입력해 주세요.";
  }

  const counts: Record<string, number> = {};
  for (const e of entries) {
    if (e.genre) counts[e.genre] = (counts[e.genre] ?? 0) + 1;
  }

  const minMap = Object.fromEntries(
    Object.entries(LIT_GENRE_MIN).map(([k, v]) => [k, v.min]),
  );
  const ratio = ratioSum(counts, minMap);

  if (ratio < 1) {
    const detail = Object.entries(counts)
      .map(([key, cnt]) => {
        const cfg = LIT_GENRE_MIN[key];
        return cfg ? `${cfg.label} ${cnt}/${cfg.min}` : null;
      })
      .filter(Boolean)
      .join(", ");
    return `[문학] 실적이 부족합니다. (비율 합계 ${ratio.toFixed(2)} / 1.00 필요 — ${detail})`;
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
      // 만화 연재 특례
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

        // optional 필드는 빈 값 허용
        if (field.optional) {
          // ISBN: 입력된 경우에만 형식 검사
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
