'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import AuthForm from '@/components/AuthForm'
import NidAuthForm from '@/components/NidAuthForm'
import { getClient, isCloudConfigured } from '@/lib/supabase'

function Join() {
  const token = useSearchParams().get('token') ?? ''
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [info, setInfo] = useState<{ network_name: string; person_name: string } | null | undefined>(undefined)
  const [err, setErr] = useState<string | null>(null)
  const [useEmail, setUseEmail] = useState(true)

  useEffect(() => {
    if (!isCloudConfigured) return
    const sb = getClient()
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    sb.rpc('invite_preview', { p_token: token }).then(({ data }) => setInfo((data as { network_name: string; person_name: string }[] | null)?.[0] ?? null))
    return () => subscription.unsubscribe()
  }, [token])

  const accept = async () => {
    const { error } = await getClient().rpc('accept_invite', { p_token: token })
    if (error) setErr(error.message); else window.location.href = '/'
  }
  const box = 'flex min-h-screen items-center justify-center bg-[#0b0b0c] p-6 text-[#f5f0e1]'
  if (!isCloudConfigured) return <main className={box}>This app is not connected to the cloud yet.</main>
  if (info === undefined || session === undefined) return <main className={box}>Loading…</main>
  if (!info) return <main className={box}>This invite link is invalid, already used, or expired. Ask your relative for a new one.</main>
  if (!session) {
    const title = `Join the ${info.network_name} family tree`
    const subtitle = `You were invited to claim the card “${info.person_name}” and add your own relatives.`
    return useEmail
      ? <AuthForm title={title} subtitle={subtitle} onUseNationalId={() => setUseEmail(false)} />
      : <NidAuthForm title={title} subtitle={subtitle} onUseEmail={() => setUseEmail(true)} />
  }
  return (
    <main className={box}>
      <div className="max-w-md space-y-4 rounded-xl border border-[#2a2418] bg-[#14110a] p-8">
        <h1 className="gold-text text-3xl font-bold">{info.network_name} family tree</h1>
        <p>You are about to claim the card <b className="text-[#d4af37]">{info.person_name}</b>. Only you will be able to edit it, and you can add your own relatives and invite them.</p>
        {err && <p className="text-[#ff8a8a]">{err}</p>}
        <button onClick={accept} className="w-full rounded-lg bg-[#d4af37] py-2 font-semibold text-[#0b0b0c] hover:bg-[#f0cf65]">This is me. Join the tree</button>
      </div>
    </main>
  )
}

export default function JoinPage() { return <Suspense fallback={null}><Join /></Suspense> }
