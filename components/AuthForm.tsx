'use client'

import { useState } from 'react'
import { getClient } from '@/lib/supabase'

export default function AuthForm({ title, subtitle }: { title: string; subtitle?: string }) {
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const sb = getClient()

    if (mode === 'reset') {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset` : undefined
      const { error } = await sb.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined)
      setBusy(false)
      // Deliberately the same answer whether or not the address exists.
      setMsg(error ? error.message : 'If that address has an account, a reset link is on its way. Check the spam folder too.')
      return
    }

    // Keep the invite token: the confirmation email must come back to the page
    // the relative signed up from (e.g. /join?token=...), not the site root.
    const emailRedirectTo = typeof window !== 'undefined' ? window.location.href : undefined
    const { data, error } = mode === 'up'
      ? await sb.auth.signUp({ email, password, options: emailRedirectTo ? { emailRedirectTo } : undefined })
      : await sb.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Check your email and click the confirmation link, then sign in.')
  }

  const input = 'w-full rounded-md border border-[#2a2418] px-3 py-2 text-[#f5f0e1]'
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0c] p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-[#2a2418] bg-[#14110a] p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[#9a917c]">Link-Leverage</p>
        <h1 className="gold-text text-3xl font-bold">{mode === 'reset' ? 'Reset your password' : title}</h1>
        {mode === 'reset'
          ? <p className="text-[#9a917c]">Enter the email you signed up with and we will send a link to choose a new password.</p>
          : subtitle && <p className="text-[#9a917c]">{subtitle}</p>}

        <input className={input} type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        {mode !== 'reset' && (
          <input className={input} type="password" required minLength={8} placeholder="Password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} />
        )}

        {mode === 'up' && (
          <label className="flex items-start gap-2 text-sm text-[#9a917c]">
            <input type="checkbox" className="mt-1 accent-[#d4af37]" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>I am 18 or older and agree to the <a href="/terms" target="_blank" className="text-[#d4af37] underline">Terms</a> and <a href="/privacy" target="_blank" className="text-[#d4af37] underline">Privacy Policy</a>. I understand that what I enter is visible to everyone in this family tree.</span>
          </label>
        )}

        {msg && <p className="text-sm text-[#d4af37]">{msg}</p>}

        <button disabled={busy || (mode === 'up' && !consent)} className="w-full rounded-lg bg-[#d4af37] py-2 font-semibold text-[#0b0b0c] hover:bg-[#f0cf65] disabled:opacity-40">
          {mode === 'reset' ? 'Send reset link' : mode === 'up' ? 'Create account' : 'Sign in'}
        </button>

        {mode === 'reset' ? (
          <button type="button" onClick={() => { setMode('in'); setMsg(null) }} className="w-full text-sm text-[#d4af37] hover:underline">
            Back to sign in
          </button>
        ) : (
          <>
            <button type="button" onClick={() => { setMode(mode === 'up' ? 'in' : 'up'); setMsg(null) }} className="w-full text-sm text-[#d4af37] hover:underline">
              {mode === 'up' ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
            {mode === 'in' && (
              <button type="button" onClick={() => { setMode('reset'); setMsg(null) }} className="w-full text-xs text-[#9a917c] hover:underline">
                Forgot your password?
              </button>
            )}
          </>
        )}
      </form>
    </main>
  )
}
