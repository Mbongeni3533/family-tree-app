'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function NetworkPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [networks, setNetworks] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || !sessionData.user) {
        setLoading(false)
        return
      }

      setUser(sessionData.user)

      const { data, error: networkError } = await supabase
        .from('network_members')
        .select('network_id, role')
        .eq('user_id', sessionData.user.id)

      if (networkError) {
        setError(networkError.message)
        setLoading(false)
        return
      }

      setNetworks(data ?? [])
      setLoading(false)
    }

    load()
  }, [])

  const handleDeleteAccount = async () => {
    setError(null)
    setMessage(null)

    try {
      const { error: deleteError } = await supabase.rpc('delete_my_account')
      if (deleteError) {
        throw deleteError
      }

      setMessage('Account deletion request completed. You can now sign out or create a fresh account.')
    } catch (deleteAccountError: any) {
      setError(deleteAccountError?.message ?? 'Could not delete the account.')
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading network…</main>
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Network</p>
          <h1 className="mt-3 text-3xl font-bold">Sign in required</h1>
          <Link href="/auth/sign-in" className="mt-6 inline-block rounded-xl bg-amber-400 px-4 py-2 font-medium text-slate-950">
            Sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Network</p>
            <h1 className="mt-2 text-4xl font-bold">Your family networks</h1>
          </div>
          <Link href="/" className="rounded-lg border border-white/10 px-4 py-2 hover:bg-white/5">
            Home
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {networks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
              You have not joined any networks yet.
            </div>
          ) : (
            networks.map((network) => (
              <div key={network.network_id} className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Network id</p>
                    <p className="mt-1 font-semibold text-white">{network.network_id}</p>
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-200">{network.role}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-10 rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
          <h2 className="text-2xl font-bold text-red-200">Delete my account</h2>
          <p className="mt-3 text-sm text-red-100">
            This permanently removes the account and applies the database rules for founder transfer or whole-tree deletion.
          </p>

          <button
            type="button"
            onClick={handleDeleteAccount}
            className="mt-5 rounded-xl bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-400"
          >
            Delete my account
          </button>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
