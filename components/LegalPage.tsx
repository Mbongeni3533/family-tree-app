import type { ReactNode } from 'react'
import Link from 'next/link'
import { LEGAL } from '@/lib/legal'

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0b0b0c] px-6 py-12 text-[#e6dfc8]">
      <article className="mx-auto max-w-3xl space-y-6 leading-relaxed">
        <Link href="/" className="text-sm text-[#d4af37] hover:underline">← Back to {LEGAL.service}</Link>
        <p className="text-xs uppercase tracking-[0.3em] text-[#9a917c]">{LEGAL.operator}</p>
        <h1 className="gold-text text-4xl font-bold">{title}</h1>
        <p className="text-sm text-[#9a917c]">Last updated: {LEGAL.updated}</p>
        {children}
        <div className="flex gap-4 border-t border-[#2a2418] pt-6 text-sm text-[#d4af37]">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </div>
      </article>
    </main>
  )
}

export const H = ({ children }: { children: ReactNode }) => <h2 className="pt-4 text-xl font-semibold text-[#f5f0e1]">{children}</h2>
export const UL = ({ children }: { children: ReactNode }) => <ul className="list-disc space-y-2 pl-6">{children}</ul>
