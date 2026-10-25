'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = typeof params?.token === 'string' ? params.token : ''

  const [preview, setPreview] = useState<{ network_name: string; person_name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPreview = async () => {
      if (!token) {
        setLoading(false)
        setError('Invite token is missing.')
        return
      }

      const { data, error: previewError } = await supabase.rpc('invite_preview', { p_token: token })
      if (previewError) {
        setError(previewError.message)
        setLoading(false)
        return
      }

      const result = Array.isArray(data) ? data[0] : null
      setPreview(result ?? null)
      setLoading(false)
    }

    loadPreview()
  }, [token])

  const handleAcceptInvite = async () => {
    if (!token) return
    setAccepting(true)
    setError(null)

    try {
      const { data, error: acceptError } = await supabase.rpc('accept_invite', { p_token: token })
      if (acceptError) {
        throw acceptError
      }

      const networkId = data as string
      router.push(`/tree/${networkId}`)
    } catch (acceptError: any) {
      setError(acceptError?.message ?? 'This invite is invalid or has already been used.')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading invite…</main>
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Invite</p>
        <h1 className="mt-2 text-3xl font-bold">Join the family tree</h1>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        ) : preview ? (
          <div className="mt-6 space-y-5">
            <p className="text-slate-200">
              You have been invited to join <span className="font-semibold text-white">{preview.network_name}</span>.
            </p>
            <p className="text-slate-300">
              This invite is for <span className="font-semibold text-white">{preview.person_name}</span>.
            </p>

            <button
              type="button"
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {accepting ? 'Joining…' : 'This is me. Join the tree'}
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">
            This invite is unavailable.
          </div>
        )}
      </div>
    </main>
  )
}
