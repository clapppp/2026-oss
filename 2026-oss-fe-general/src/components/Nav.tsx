'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: '홈' },
  { href: '/demo', label: '데모' },
  { href: '/admin', label: '관리자' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-8">
        <Link href="/" className="font-semibold text-[var(--accent)] text-sm tracking-wide">
          DocAI
        </Link>
        <div className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                pathname === href
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
