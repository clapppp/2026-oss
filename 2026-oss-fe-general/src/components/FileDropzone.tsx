'use client'
import { useRef, useState, useEffect, DragEvent, ChangeEvent } from 'react'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
  label?: string
}

export default function FileDropzone({ onFile, disabled, label = '문서 이미지를 여기에 드래그하거나 클릭하세요' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  const ALLOWED_EXTS = /\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?)$/i

  const handle = (file: File | undefined) => {
    if (!file || disabled) return
    const typeOk = file.type.startsWith('image/')
    const extOk = ALLOWED_EXTS.test(file.name)
    if (!typeOk && !extOk) return alert('이미지 파일만 업로드 가능합니다. (jpg, png, webp, heic 등)')
    onFile(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handle(e.dataTransfer.files[0])
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => handle(e.target.files?.[0])

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer select-none
        ${dragging ? 'border-[var(--accent)] bg-indigo-500/5' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="text-3xl mb-3">📁</div>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="text-xs text-[var(--muted)] mt-1">jpg, png, webp 지원</p>
      <input ref={inputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={onChange} disabled={disabled} onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
