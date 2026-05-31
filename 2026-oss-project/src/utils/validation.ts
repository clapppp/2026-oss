import { CATEGORY_FORM_CONFIG, CATEGORY_META } from "../constants/categoryFormConfig";
import {
  LITERATURE_GENRE_MIN,
  MANHWA_SERIAL_MIN_MONTHS,
  NOVEL_LONGSERIES_MIN,
  NOVEL_SHORTSERIES_MIN,
} from "../constants/rules";

function calcSerialMonths(start: string, end: string): number {
  const s = start.split(".").map(Number);
  const e = end.split(".").map(Number);
  if (s.length !== 3 || e.length !== 3) return 0;
  const [sy, sm, sd] = s;
  const [ey, em, ed] = e;
  if ([sy, sm, sd, ey, em, ed].some(isNaN)) return 0;
  return (ey - sy) * 12 + (em - sm) + (ed >= sd ? 0 : -1);
}

function hasManhwaSerialException(entries: Record<string, string>[]): boolean {
  return entries.some(
    (e) =>
      e.method === "연재" &&
      calcSerialMonths(e.serialStart ?? "", e.serialEnd ?? "") >= MANHWA_SERIAL_MIN_MONTHS
  );
}

function getLiteratureRequiredCount(entries: Record<string, string>[]): number | null {
  const genres = entries.map((e) => e.genre).filter(Boolean);
  if (genres.length === 0) return null;
  const uniqueGenres = [...new Set(genres)];
  if (uniqueGenres.length > 1) return null;

  const genre = uniqueGenres[0];
  if (genre === "소설/동화/청소년소설") {
    const characters = entries.map((e) => e.character).filter(Boolean);
    const uniqueChars = [...new Set(characters)];
    if (uniqueChars.length > 1) return null;
    return uniqueChars[0] === "장편" ? NOVEL_LONGSERIES_MIN : NOVEL_SHORTSERIES_MIN;
  }
  return LITERATURE_GENRE_MIN[genre] ?? null;
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

    if (cat === "문학") {
      const required = getLiteratureRequiredCount(entries);
      if (required !== null && entries.length < required) {
        return `[문학] 실적을 ${required}편 이상 입력해 주세요. (현재 ${entries.length}편)`;
      }
    } else if (cat === "만화") {
      const required = hasManhwaSerialException(entries) ? 1 : meta.minCount;
      if (entries.length < required) {
        return required === 1
          ? `[만화] 연재 실적 1편을 입력해 주세요.`
          : `[만화] 실적을 ${meta.minCount}편 이상 입력해 주세요. (현재 ${entries.length}편)`;
      }
    } else {
      if (entries.length < meta.minCount) {
        return `[${cat}] 실적을 ${meta.minCount}${meta.unit} 이상 입력해 주세요. (현재 ${entries.length}${meta.unit})`;
      }
    }

    for (let i = 0; i < entries.length; i++) {
      for (const field of fields) {
        if (
          cat === "만화" &&
          (field.key === "serialStart" || field.key === "serialEnd") &&
          entries[i].method !== "연재"
        ) continue;
        if (!entries[i][field.key]?.trim()) {
          return `[${cat}] 실적 ${i + 1}의 "${field.label}" 항목을 입력해 주세요.`;
        }
      }
    }
  }

  return null;
}
