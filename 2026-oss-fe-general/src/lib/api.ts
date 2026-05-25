const BASE = '/api/proxy'

export interface SchemaField {
  name: string
  type: 'string' | 'number' | 'date' | 'array'
  required?: boolean
  rule?: string
}

export interface Schema {
  id: number
  name: string
  fields: SchemaField[]
}

export interface TopKScore {
  schema_id: number
  schema_name: string
  score: number
}

export interface SubmitResult {
  schema_id: number
  schema_name: string
  similarity_score: number
  top_k_scores: TopKScore[]
  all_scores: TopKScore[]
  data: Record<string, unknown>
  missing_fields: string[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? '요청 실패')
  }
  return res.json()
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  // Admin
  extractSchema: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ extract_id: string; fields: SchemaField[] }>('/admin/extract-schema', { method: 'POST', body: form })
  },
  saveSchema: (extract_id: string, name: string, fields: SchemaField[]) =>
    request<Schema>('/admin/schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extract_id, name, fields }),
    }),
  getSchemas: () => request<Schema[]>('/admin/schemas'),
  deleteSchema: (id: number) =>
    request<{ detail: string }>(`/admin/schema/${id}`, { method: 'DELETE' }),

  // User
  submit: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<SubmitResult>('/user/submit', { method: 'POST', body: form })
  },
}
