export interface ApplyDraft {
  email: string;
  savedAt: string; // ISO string
  selectedCategories: string[];
  categoryForms: Record<string, Record<string, string>[]>;
}

const key = (email: string) => `artpass_draft_${email}`;

export function saveDraft(
  email: string,
  data: Pick<ApplyDraft, "selectedCategories" | "categoryForms">
): void {
  const draft: ApplyDraft = { email, savedAt: new Date().toISOString(), ...data };
  try { localStorage.setItem(key(email), JSON.stringify(draft)); } catch { /* noop */ }
}

export function loadDraft(email: string): ApplyDraft | null {
  try {
    const raw = localStorage.getItem(key(email));
    return raw ? (JSON.parse(raw) as ApplyDraft) : null;
  } catch { return null; }
}

export function clearDraft(email: string): void {
  try { localStorage.removeItem(key(email)); } catch { /* noop */ }
}

export function formatDraftDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
