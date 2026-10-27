'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getClient, isCloudConfigured } from '@/lib/supabase'

const input = 'w-full rounded-md border border-[#2a2418] px-3 py-2 text-[#f5f0e1]'
const box = 'flex min-h-screen items-center justify-center bg-[#0b0b0c] p-6'

export default function ResetPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!isCloudConfigured) return
    const sb = getClient()
    sb.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); setReady(true) })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(!!s))
    return () => subscription.unsubscribe()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setMsg('Use at least 8 characters.'); return }
    if (password !== confirm) { setMsg('The two passwords do not match.'); return }
    setBusy(true); setMsg(null)
    const { error } = await getClient().auth.updateUser({ password })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/'), 1500)
  }

  if (!isCloudConfigured) return <main className={box}><p className="text-[#9a917c]">This app is not connected to the cloud yet.</p></main>

  if (!ready) return <main className={box}><p className="text-[#9a917c]">Checking your link…</p></main>

  if (done) {
    return (
      <main className={box}>
        <div className="max-w-md space-y-2 rounded-xl border border-[#2a2418] bg-[#14110a] p-8 text-center text-[#f5f0e1]">
          <h1 className="gold-text text-2xl font-bold">Password updated</h1>
          <p className="text-[#9a917c]">Taking you to the tree…</p>
        </div>
      </main>
    )
  }

  if (!signedIn) {
    return (
      <main className={box}>
        <div className="max-w-md space-y-3 rounded-xl border border-[#2a2418] bg-[#14110a] p-8 text-center text-[#f5f0e1]">
          <h1 className="gold-text text-2xl font-bold">This link has expired</h1>
          <p className="text-[#9a917c]">Reset links work once and expire after an hour. Request a fresh one — it has to be opened in the same browser.</p>
          <Link href="/" className="inline-block rounded-lg bg-[#d4af37] px-4 py-2 font-semibold text-[#0b0b0c]">Back to sign in</Link>
        </div>
      </main>
    )
  }

  return (
    <main className={box}>
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-[#2a2418] bg-[#14110a] p-8 text-[#f5f0e1]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#9a917c]">Link-Leverage</p>
        <h1 className="gold-text text-3xl font-bold">Choose a new password</h1>
        <input className={input} type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (8+ characters)" autoComplete="new-password" />
        <input className={input} type="password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat the password" autoComplete="new-password" />
        {msg && <p className="text-sm text-[#ff8a8a]">{msg}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-[#d4af37] py-2 font-semibold text-[#0b0b0c] hover:bg-[#f0cf65] disabled:opacity-40">
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </main>
  )
}
