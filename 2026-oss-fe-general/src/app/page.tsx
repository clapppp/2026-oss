import Link from 'next/link'

const steps = [
  { icon: '📄', title: '문서 이미지', desc: 'jpg, png 등 문서 이미지를 업로드합니다.' },
  { icon: '👁️', title: 'ViT → 시각 임베딩', desc: '직접 구현한 Vision Transformer가 문서 종류를 분류하고 시각 특징을 추출합니다.' },
  { icon: '🔤', title: 'EasyOCR', desc: 'OCR 엔진이 이미지에서 텍스트를 추출합니다.' },
  { icon: '🧠', title: 'Qwen2.5-7B + LoRA', desc: '시각 임베딩 + OCR 텍스트를 종합해 JSON 필드를 출력합니다.' },
  { icon: '✅', title: 'Pydantic 검증', desc: '스키마 규칙에 따라 동적으로 검증하여 합격/불합격을 반환합니다.' },
]

const refs = [
  { title: 'LLaVA — Visual Instruction Tuning (NeurIPS 2023)', url: 'https://arxiv.org/abs/2304.08485' },
  { title: 'ViT — An Image is Worth 16×16 Words (ICLR 2021)', url: 'https://arxiv.org/abs/2010.11929' },
  { title: 'LoRA — Low-Rank Adaptation (ICLR 2022)', url: 'https://arxiv.org/abs/2106.09685' },
  { title: 'QLoRA — Efficient Finetuning (NeurIPS 2023)', url: 'https://arxiv.org/abs/2305.14314' },
  { title: 'Qwen2.5 Technical Report (2024)', url: 'https://arxiv.org/abs/2412.15115' },
]

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-20">
      {/* Hero */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--muted)]">
          공개소프트웨어 팀 프로젝트
        </div>
        <h1 className="text-4xl font-bold tracking-tight">AI 문서 판별 프레임워크</h1>
        <p className="text-[var(--muted)] max-w-xl mx-auto text-lg leading-relaxed">
          문서 이미지를 업로드하면 AI가 필드를 자동 추출하고 합격/불합격을 판별합니다.
          LLaVA 아키텍처(ViT + Linear Projection + LLM)를 직접 구현한 프로젝트입니다.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/demo" className="px-6 py-2.5 bg-[var(--accent)] hover:opacity-90 rounded-lg text-sm font-medium transition-opacity text-white">
            데모 체험하기
          </Link>
          <Link href="/admin" className="px-6 py-2.5 border border-[var(--border)] hover:bg-[var(--card)] rounded-lg text-sm font-medium transition-colors">
            관리자 패널
          </Link>
          <a href="https://github.com/clapppp/2026-oss-project-ai" target="_blank" rel="noopener noreferrer"
            className="px-6 py-2.5 border border-[var(--border)] hover:bg-[var(--card)] rounded-lg text-sm font-medium transition-colors">
            GitHub ↗
          </a>
        </div>
      </section>

      {/* Architecture Flow */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">추론 흐름</h2>
        <div className="grid gap-3 sm:grid-cols-5">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-2 h-full">
                <div className="text-2xl">{s.icon}</div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-[var(--muted)] leading-relaxed">{s.desc}</div>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[var(--muted)]">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Two flows */}
      <section className="grid sm:grid-cols-2 gap-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs rounded bg-indigo-500/20 text-indigo-400 font-medium">관리자</span>
            <h3 className="font-medium">스키마 등록</h3>
          </div>
          <ol className="space-y-2 text-sm text-[var(--muted)]">
            <li>1. 모범 문서 이미지 업로드</li>
            <li>2. AI가 필드 스키마 자동 추출</li>
            <li>3. 추출된 스키마 검토 및 수정</li>
            <li>4. 스키마 저장 → DB 등록</li>
          </ol>
          <Link href="/admin" className="inline-block text-sm text-[var(--accent)] hover:underline">관리자 패널 →</Link>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400 font-medium">사용자</span>
            <h3 className="font-medium">문서 제출</h3>
          </div>
          <ol className="space-y-2 text-sm text-[var(--muted)]">
            <li>1. 문서 이미지 제출</li>
            <li>2. AI가 문서 종류 자동 판단</li>
            <li>3. 해당 스키마로 필드 추출</li>
            <li>4. 합격 / 불합격 + 추출 데이터 반환</li>
          </ol>
          <Link href="/demo" className="inline-block text-sm text-[var(--accent)] hover:underline">데모 체험 →</Link>
        </div>
      </section>

      {/* Tech stack */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">기술 스택</h2>
        <div className="flex flex-wrap gap-2">
          {['FastAPI', 'SQLAlchemy', 'SQLite', 'PyTorch', 'PEFT', 'Transformers', 'EasyOCR', 'ViT (직접 구현)', 'Qwen2.5-7B', 'QLoRA', 'Pydantic'].map(t => (
            <span key={t} className="px-3 py-1 bg-[var(--card)] border border-[var(--border)] rounded-full text-xs text-[var(--muted)]">{t}</span>
          ))}
        </div>
      </section>

      {/* References */}
      <section className="space-y-4 pb-4">
        <h2 className="text-xl font-semibold">참고 문헌</h2>
        <ul className="space-y-2">
          {refs.map(({ title, url }) => (
            <li key={title}>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
                {title} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
