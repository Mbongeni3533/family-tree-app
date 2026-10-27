'use client'

import { useState } from 'react'
import { getClient } from '@/lib/supabase'
import { COUNTRIES, nationalIdEmail, nationalIdError, normaliseNationalId, pinError } from '@/lib/nid'

interface Props {
  title: string
  subtitle?: string
  onUseEmail?: () => void
}

const input = 'w-full rounded-md border border-[#2a2418] px-3 py-2 text-[#f5f0e1]'

export default function NidAuthForm({ title, subtitle, onUseEmail }: Props) {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [country, setCountry] = useState('SZ')
  const [nationalId, setNationalId] = useState('')
  const [pin, setPin] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviter, setInviter] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    const idError = nationalIdError(nationalId)
    if (idError) { setMsg(idError); return }
    const pError = pinError(pin)
    if (pError) { setMsg(pError); return }
    if (mode === 'up' && !fullName.trim()) { setMsg('Enter your full name.'); return }
    if (!inviter.trim()) { setMsg('Enter the name of the person who sent you the link.'); return }

    setBusy(true)
    const sb = getClient()
    const derived = nationalIdEmail(country, nationalId)

    if (mode === 'up') {
      const { data, error } = await sb.auth.signUp({ email: derived, password: pin })
      if (error) {
        setBusy(false)
        setMsg(/already|registered|exists/i.test(error.message)
          ? 'That country and national ID already has an account. Use “Sign in” instead.'
          : error.message)
        return
      }
      if (!data.session) {
        setBusy(false)
        setMsg('Account created, but this project still requires email confirmation, so no session was issued. The founder needs to switch off “Confirm email” in Supabase → Authentication → Providers → Email.')
        return
      }
      const { error: profileError } = await sb.rpc('save_profile', {
        p_country: country,
        p_national_id: normaliseNationalId(nationalId),
        p_full_name: fullName.trim(),
        p_invited_by: inviter.trim(),
        p_email: email.trim() || null,
      })
      setBusy(false)
      if (profileError) setMsg(profileError.message)
      return
    }

    const { data, error } = await sb.auth.signInWithPassword({ email: derived, password: pin })
    setBusy(false)
    if (error) { setMsg('Check your country, national ID and PIN.'); return }

    // The inviter is the extra check the founder asked for at every sign-in.
    const { data: profile } = await sb.from('profiles')
      .select('invited_by_name')
      .eq('user_id', data.user!.id)
      .maybeSingle()

    const stored = (profile?.invited_by_name ?? '').trim().toLowerCase()
    if (stored && stored !== inviter.trim().toLowerCase()) {
      await sb.auth.signOut()
      setMsg('That is not the person who invited you. Check the name and try again.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0c] p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-[#2a2418] bg-[#14110a] p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[#9a917c]">Link-Leverage</p>
        <h1 className="gold-text text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-[#9a917c]">{subtitle}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-[#e6dfc8]">Country</label>
          <select value={country} onChange={e => setCountry(e.target.value)} className={input}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#e6dfc8]">National ID</label>
          <input
            value={nationalId}
            onChange={e => setNationalId(e.target.value)}
            className={input}
            placeholder={COUNTRIES.find(c => c.code === country)?.example ?? 'your national ID'}
            autoComplete="username"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#e6dfc8]">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
            className={input}
            placeholder="6 to 12 digits"
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
          />
        </div>

        {mode === 'up' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[#e6dfc8]">Your full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className={input} placeholder="e.g. Sipho Shongwe" />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-[#e6dfc8]">Who sent you the link?</label>
          <input value={inviter} onChange={e => setInviter(e.target.value)} className={input} placeholder="Name of the relative who invited you" />
        </div>

        {mode === 'up' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[#e6dfc8]">Email <span className="text-[#7a725f]">(optional, for recovery)</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={input} placeholder="you@example.com" />
          </div>
        )}

        {msg && <p className="text-sm text-[#ff8a8a]">{msg}</p>}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-[#d4af37] py-2 font-semibold text-[#0b0b0c] hover:bg-[#f0cf65] disabled:opacity-40"
        >
          {busy ? 'Please wait…' : mode === 'up' ? 'Create account' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'up' ? 'in' : 'up'); setMsg(null) }}
          className="w-full text-sm text-[#d4af37] hover:underline"
        >
          {mode === 'up' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>

        {onUseEmail && (
          <button type="button" onClick={onUseEmail} className="w-full text-xs text-[#9a917c] hover:underline">
            Use an email and password instead
          </button>
        )}
      </form>
    </main>
  )
}
