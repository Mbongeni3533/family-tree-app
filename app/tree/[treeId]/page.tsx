'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CreateTreePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [treeName, setTreeName] = useState('The Smith Family')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || !data.user) {
        router.replace('/auth/sign-in')
        return
      }
      setUser(data.user)
      setLoading(false)
    }

    loadUser()
  }, [router])

  const handleCreate = async () => {
    if (!user) {
      router.replace('/auth/sign-in')
      return
    }

    const cleanName = treeName.trim()
    if (!cleanName) {
      setError('Please enter a tree name.')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('create_network', { p_name: cleanName })
      if (rpcError) {
        throw rpcError
      }

      const networkId = data as string
      router.push(`/tree/${networkId}`)
    } catch (createError: any) {
      setError(createError?.message ?? 'Could not create the network.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading…</main>
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Create tree</p>
            <h1 className="mt-2 text-3xl font-bold">New family network</h1>
          </div>
          <Link href="/" className="text-sm text-slate-300 hover:text-white">
            Home
          </Link>
        </div>

        <div className="space-y-4">
          <label className="block text-sm text-slate-200">
            Tree name
            <input
              value={treeName}
              onChange={(event) => setTreeName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
              placeholder="The Smith Family"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create tree'}
          </button>
        </div>
      </div>
    </main>
  )
}
