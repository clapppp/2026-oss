'use client'
import { useState } from 'react'
import FileDropzone from '@/components/FileDropzone'
import { api, SubmitResult } from '@/lib/api'

type State = 'idle' | 'loading' | 'done' | 'error'

export default function DemoPage() {
  const [state, setState] = useState<State>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setState('loading')
    setResult(null)
    setErrorMsg('')
    try {
      const res = await api.submit(file)
      setResult(res)
      setState('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '알 수 없는 오류')
      setState('error')
    }
  }

  const reset = () => {
    setState('idle')
    setPreview(null)
    setResult(null)
    setErrorMsg('')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">문서 판별 데모</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          문서 이미지를 업로드하면 AI가 스키마를 자동 선택하고 필드를 추출합니다.
        </p>
      </div>

      {state === 'idle' || state === 'loading' ? (
        <FileDropzone onFile={handleFile} disabled={state === 'loading'} />
      ) : null}

      {state === 'loading' && (
        <div className="text-center py-8 space-y-3">
          <div className="inline-block w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--muted)]">AI가 문서를 분석하는 중입니다…</p>
        </div>
      )}

      {state === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2">
          <p className="text-red-400 text-sm font-medium">오류 발생</p>
          <p className="text-red-300 text-sm">{errorMsg}</p>
          <p className="text-[var(--muted)] text-xs">백엔드가 실행 중인지 확인하세요 (localhost:8000)</p>
          <button onClick={reset} className="text-xs text-[var(--accent)] hover:underline">다시 시도</button>
        </div>
      )}

      {state === 'done' && result && (() => {
        const passed = result.missing_fields.length === 0
        return (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Preview */}
              {preview && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-xs text-[var(--muted)] mb-2">업로드된 문서</p>
                  <img src={preview} alt="preview" className="w-full rounded object-contain max-h-64" />
                </div>
              )}

              {/* Result card */}
              <div className={`border rounded-xl p-5 space-y-3 ${passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{passed ? '✅' : '❌'}</span>
                  <div>
                    <p className={`text-lg font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                      {passed ? '합격' : '불합격'}
                    </p>
                    <p className="text-xs text-[var(--muted)]">스키마: {result.schema_name}</p>
                    <p className="text-xs text-[var(--muted)]">유사도: {(result.similarity_score * 100).toFixed(1)}%</p>
                  </div>
                </div>
                {!passed && result.missing_fields.length > 0 && (
                  <div>
                    <p className="text-xs text-red-400 font-medium mb-1">누락된 필수 필드</p>
                    <div className="flex flex-wrap gap-1">
                      {result.missing_fields.map(f => (
                        <span key={f} className="px-2 py-0.5 text-xs bg-red-500/20 text-red-300 rounded">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted data */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <p className="text-sm font-medium mb-3">추출된 필드</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted)] text-xs border-b border-[var(--border)]">
                    <th className="pb-2 w-1/3">필드명</th>
                    <th className="pb-2">추출값</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.data).map(([k, v]) => (
                    <tr key={k} className="border-b border-[var(--border)]/50">
                      <td className="py-2 text-[var(--muted)]">{k}</td>
                      <td className={`py-2 ${v == null ? 'text-red-400 italic' : ''}`}>
                        {Array.isArray(v) ? v.join(', ') : v != null ? String(v) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* All scores */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <p className="text-sm font-medium mb-3">전체 스키마 유사도</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted)] text-xs border-b border-[var(--border)]">
                    <th className="pb-2 w-1/2">스키마</th>
                    <th className="pb-2 w-1/4">유사도</th>
                    <th className="pb-2">바</th>
                  </tr>
                </thead>
                <tbody>
                  {result.all_scores.map(s => (
                    <tr key={s.schema_id} className={`border-b border-[var(--border)]/50 ${s.schema_id === result.schema_id ? 'text-[var(--accent)]' : ''}`}>
                      <td className="py-2">
                        {s.schema_name}
                        {s.schema_id === result.schema_id && <span className="ml-1.5 text-xs opacity-60">← 선택됨</span>}
                      </td>
                      <td className="py-2">{(s.score * 100).toFixed(1)}%</td>
                      <td className="py-2 w-1/3">
                        <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--accent)]"
                            style={{ width: `${Math.max(0, s.score * 100).toFixed(1)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={reset} className="text-sm text-[var(--accent)] hover:underline">
              ← 다른 문서 판별하기
            </button>
          </div>
        )
      })()}
    </div>
  )
}
