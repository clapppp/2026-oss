import { request } from "./client";
import type { Application, SubmitApplicationRequest } from "./types";

export async function getApplications(): Promise<Application[]> {
  return request<Application[]>("/api/applications");
}

export async function submitApplication(data: SubmitApplicationRequest): Promise<{ id: string }> {
  const form = new FormData();
  const meta = {
    type: data.type,
    categories: data.categories.map(({ name, entries }) => ({ name, entries })),
  };
  form.append("data", JSON.stringify(meta));
  data.categories.forEach(({ name, files }) =>
    files.forEach((fileSet, idx) => {
      Object.entries(fileSet).forEach(([key, file]) => {
        if (file) form.append(`${name}[${idx}].${key}`, file);
      });
    }),
  );
  return request<{ id: string }>("/api/applications", { method: "POST", body: form }, 120_000);
}

export async function reviewApplication(
  id: string,
  status: "승인" | "반려",
  reason?: string,
): Promise<void> {
  await request(`/api/applications/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}
