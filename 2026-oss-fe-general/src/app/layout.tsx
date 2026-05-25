import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'AI 문서 판별 프레임워크',
  description: 'ViT + EasyOCR + Qwen2.5-7B + LoRA 기반 문서 필드 추출 및 합격/불합격 판별 데모',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {/* 브라우저가 드래그 앤 드롭으로 파일을 직접 열어버리는 기본 동작 차단 */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('dragover', function(e){e.preventDefault();}, false);
          window.addEventListener('drop', function(e){e.preventDefault();}, false);
        `}} />
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
