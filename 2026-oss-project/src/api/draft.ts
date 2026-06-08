import { request } from "./client";
import type { EvidenceSlot } from "./types";

export interface DraftFileInfo {
  cat: string;
  idx: number;
  slot: string;
  filename: string;
  mimeType: string;
  url: string;
}

export interface DraftApiResponse {
  savedAt: string;
  selectedCategories: string[];
  categoryForms: Record<string, Record<string, string>[]>;
  fileInfos: DraftFileInfo[];
}

export async function getDraft(): Promise<DraftApiResponse> {
  return request<DraftApiResponse>("/api/drafts");
}

export async function saveDraftApi(
  selectedCategories: string[],
  categoryForms: Record<string, Record<string, string>[]>,
  entryFiles: Record<string, Record<number, Partial<Record<EvidenceSlot, File>>>>,
): Promise<{ savedAt: string; fileInfos: DraftFileInfo[] }> {
  const form = new FormData();
  form.append("data", JSON.stringify({ selectedCategories, categoryForms }));

  selectedCategories.forEach((cat) => {
    const catFiles = entryFiles[cat] ?? {};
    Object.entries(catFiles).forEach(([idxStr, fileSet]) => {
      const idx = parseInt(idxStr, 10);
      Object.entries(fileSet).forEach(([slot, file]) => {
        if (file) form.append(`${cat}[${idx}].${slot}`, file);
      });
    });
  });

  return request<{ savedAt: string; fileInfos: DraftFileInfo[] }>(
    "/api/drafts",
    { method: "POST", body: form },
  );
}

export async function deleteDraft(): Promise<void> {
  await request("/api/drafts", { method: "DELETE" });
}
