import type { DraftFileInfo } from "../api/draft";

export interface ApplyDraft {
  savedAt: string; // ISO string
  selectedCategories: string[];
  categoryForms: Record<string, Record<string, string>[]>;
  fileInfos: DraftFileInfo[];
}

export function formatDraftDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
