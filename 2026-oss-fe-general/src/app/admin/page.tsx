'use client'
import { useState, useEffect } from 'react'
import FileDropzone from '@/components/FileDropzone'
import { api, SchemaField, Schema } from '@/lib/api'

type Tab = 'register' | 'schemas'
type RegisterState = 'idle' | 'extracting' | 'review' | 'saving' | 'saved' | 'error'
type Engine = 'ocr' | 'vlm'

const FIELD_TYPES = ['string', 'number', 'date', 'array'] as const

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('register')

  // --- Register tab ---
  const [regState, setRegState] = useState<RegisterState>('idle')
  const [engine, setEngine] = useState<Engine>('ocr')
  const [fields, setFields] = useState<SchemaField[]>([])
  const [schemaName, setSchemaName] = useState('')
  const [extractId, setExtractId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const handleExampleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setRegState('extracting')
    setErrorMsg('')
    try {
      const res = await api.extractSchema(file, engine)
      setExtractId(res.extract_id)
      setFields(res.fields)
      setRegState('review')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '추출 실패')
      setRegState('error')
    }
  }

  const updateField = (i: number, patch: Partial<SchemaField>) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  }

  const addField = () => setFields(prev => [...prev, { name: '', type: 'string' }])
  const removeField = (i: number) => setFields(prev => prev.filter((_, idx) => idx !== i))

  const saveSchema = async () => {
    if (!schemaName.trim()) return alert('스키마 이름을 입력하세요.')
    if (fields.some(f => !f.name.trim())) return alert('모든 필드에 이름을 입력하세요.')
    setRegState('saving')
    try {
      await api.saveSchema(extractId, schemaName.trim(), fields)
      setRegState('saved')
      setSchemaName('')
      setFields([])
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '저장 실패')
      setRegState('error')
    }
  }

  const resetRegister = () => {
    setRegState('idle')
    setFields([])
    setSchemaName('')
    setExtractId('')
    setErrorMsg('')
    setPreview(null)
  }

  // --- Schemas tab ---
  const [schemas, setSchemas] = useState<Schema[]>([])
  const [schemasLoading, setSchemasLoading] = useState(false)

  const loadSchemas = async () => {
    setSchemasLoading(true)
    try {
      setSchemas(await api.getSchemas())
    } catch { /* ignore */ }
    setSchemasLoading(false)
  }

  useEffect(() => { if (tab === 'schemas') loadSchemas() }, [tab])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" 스키마를 삭제할까요?`)) return
    try {
      await api.deleteSchema(id)
      setSchemas(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">관리자 패널</h1>
        <p className="text-[var(--muted)] text-sm mt-1">스키마를 등록하고 관리합니다.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {([['register', '스키마 등록'], ['schemas', '스키마 목록']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm transition-colors -mb-px border-b-2 ${
              tab === key ? 'border-[var(--accent)] text-[var(--foreground)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Register Tab */}
      {tab === 'register' && (
        <div className="space-y-6">
          {(regState === 'idle' || regState === 'error') && (
            <>
              {/* 엔진 선택 */}
              <div className="flex gap-2">
                {(['ocr', 'vlm'] as const).map(e => (
                  <button
                    key={e}
                    onClick={() => setEngine(e)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      engine === e
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    {e === 'ocr' ? 'OCR + LLM' : 'VLM (Qwen2.5-VL)'}
                  </button>
                ))}
              </div>
              <FileDropzone
                onFile={handleExampleFile}
                label="모범 문서 이미지를 업로드하면 AI가 필드 스키마를 자동 추출합니다"
              />
              {regState === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
                  {errorMsg}
                  <p className="text-xs text-[var(--muted)] mt-1">백엔드가 실행 중인지 확인하세요 (localhost:8000)</p>
                  <button onClick={resetRegister} className="text-xs text-[var(--accent)] hover:underline mt-2 block">다시 시도</button>
                </div>
              )}
            </>
          )}

          {regState === 'extracting' && (
            <div className="text-center py-10 space-y-3">
              <div className="inline-block w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--muted)]">AI가 필드 스키마를 추출하는 중…</p>
            </div>
          )}

          {(regState === 'review' || regState === 'saving') && (
            <div className="space-y-5">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-400">
                {fields.length}개 필드가 추출되었습니다. 내용을 검토하고 수정 후 저장하세요.
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {/* 업로드 이미지 미리보기 */}
                {preview && (
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                    <p className="text-xs text-[var(--muted)] mb-2">업로드된 모범 문서</p>
                    <img src={preview} alt="preview" className="w-full rounded object-contain max-h-80" />
                  </div>
                )}

                {/* Schema name + Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">스키마 이름</label>
                    <input
                      value={schemaName}
                      onChange={e => setSchemaName(e.target.value)}
                      placeholder="예: 소득증명서"
                      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">필드 목록</p>
                      <button onClick={addField} className="text-xs text-[var(--accent)] hover:underline">+ 필드 추가</button>
                    </div>

                    {fields.map((field, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          value={field.name}
                          onChange={e => updateField(i, { name: e.target.value })}
                          placeholder="필드명"
                          className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                        />
                        <select
                          value={field.type}
                          onChange={e => updateField(i, { type: e.target.value as SchemaField['type'] })}
                          className="bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                        >
                          {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={() => removeField(i)} className="text-[var(--muted)] hover:text-red-400 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveSchema}
                  disabled={regState === 'saving'}
                  className="px-5 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 rounded-lg text-sm font-medium transition-opacity text-white"
                >
                  {regState === 'saving' ? '저장 중…' : '스키마 저장'}
                </button>
                <button onClick={resetRegister} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">취소</button>
              </div>
            </div>
          )}

          {regState === 'saved' && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 space-y-1">
                <p className="text-emerald-400 font-medium">✅ 스키마가 저장되었습니다.</p>
                <p className="text-sm text-[var(--muted)]">이제 사용자가 해당 문서를 제출하면 이 스키마로 판별합니다.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={resetRegister} className="text-sm text-[var(--accent)] hover:underline">새 스키마 등록</button>
                <button onClick={() => setTab('schemas')} className="text-sm text-[var(--muted)] hover:underline">스키마 목록 보기</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schemas Tab */}
      {tab === 'schemas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[var(--muted)]">{schemas.length}개 스키마 등록됨</p>
            <button onClick={loadSchemas} className="text-xs text-[var(--accent)] hover:underline">새로고침</button>
          </div>

          {schemasLoading && (
            <div className="text-center py-10">
              <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!schemasLoading && schemas.length === 0 && (
            <div className="text-center py-10 text-[var(--muted)] text-sm">
              <p>등록된 스키마가 없습니다.</p>
              <button onClick={() => setTab('register')} className="mt-2 text-[var(--accent)] hover:underline">스키마 등록하기</button>
            </div>
          )}

          {schemas.map(schema => (
            <div key={schema.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{schema.name}</p>
                  <p className="text-xs text-[var(--muted)]">ID: {schema.id} · 필드 {schema.fields.length}개</p>
                </div>
                <button
                  onClick={() => handleDelete(schema.id, schema.name)}
                  className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors"
                >
                  삭제
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {schema.fields.map(f => (
                  <span
                    key={f.name}
                    className={`px-2 py-0.5 text-xs rounded border ${
                      f.required ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' : 'border-[var(--border)] text-[var(--muted)]'
                    }`}
                  >
                    {f.name} <span className="opacity-60">({f.type})</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
