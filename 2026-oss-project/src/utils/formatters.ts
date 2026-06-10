export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** "19900515" → "1990.05.15" */
export function formatBirth(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.length !== 8) return v;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}

export function formatGender(g: string): string {
  if (g === "M") return "남성";
  if (g === "F") return "여성";
  return g;
}
