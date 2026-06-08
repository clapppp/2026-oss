import { CATEGORY_FORM_CONFIG, CATEGORY_META } from "../constants/categoryFormConfig";

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

    // 만화 연재 특례: 연재 실적이 1개 이상 있으면 편수 요건 충족
    const isManhwaSerial =
      cat === "만화" && entries.some((e) => e.method === "연재");
    if (!isManhwaSerial && entries.length < meta.minCount) {
      return `[${cat}] 실적을 ${meta.minCount}${meta.unit} 이상 입력해 주세요. (현재 ${entries.length}${meta.unit})`;
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
