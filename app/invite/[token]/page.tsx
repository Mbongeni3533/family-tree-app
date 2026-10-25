'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PersonRow = {
  id: string
  name: string
  created_by: string | null
  claimed_by: string | null
  network_id: string
  gender: string
  birth_year: number | null
  notes: string | null
  photo_url: string | null
  parent_id: string | null
  parent2_id: string | null
  hidden: boolean
}

export default function TreePage() {
  const params = useParams()
  const router = useRouter()
  const treeId = useMemo(() => (typeof params?.treeId === 'string' ? params.treeId : ''), [params])

  const [user, setUser] = useState<any>(null)
  const [people, setPeople] = useState<PersonRow[]>([])
  const [personName, setPersonName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [invitePersonId, setInvitePersonId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || !data.user) {
        router.replace('/auth/sign-in')
        return
      }

      setUser(data.user)
      await loadPeople(data.user.id)
    }

    const loadPeople = async (currentUserId: string) => {
      if (!treeId) {
        setLoading(false)
        return
      }

      const { data, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .eq('network_id', treeId)
        .order('created_at', { ascending: true })

      if (peopleError) {
        setError(peopleError.message)
        setLoading(false)
        return
      }

      setPeople((data ?? []) as PersonRow[])
      const firstSelectable = (data ?? []).find((p) => p.created_by === currentUserId && p.claimed_by === currentUserId)
      if (firstSelectable) {
        setInvitePersonId(firstSelectable.id)
      }
      setLoading(false)
    }

    loadSession()
  }, [router, treeId])

  const handleAddSelf = async () => {
    if (!user || !treeId) return

    const cleanName = personName.trim()
    if (!cleanName) {
      setError('Please enter a name for the first card.')
      return
    }

    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('people')
        .insert([
          {
            network_id: treeId,
            created_by: user.id,
            claimed_by: user.id,
            name: cleanName,
            gender: 'other',
          },
        ])
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      setPeople((current) => [...current, data as PersonRow])
      setPersonName('')
      setInvitePersonId((data as PersonRow).id)
    } catch (insertError: any) {
      setError(insertError?.message ?? 'Could not add the person.')
    }
  }

  const handleCreateInvite = async () => {
    if (!invitePersonId) {
      setError('Add a person first before creating an invite.')
      return
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('create_invite', { p_person: invitePersonId })
      if (rpcError) {
        throw rpcError
      }

      const token = data as string
      setInviteToken(token)
      setError(null)
    } catch (inviteError: any) {
      setError(inviteError?.message ?? 'Could not create the invite.')
    }
  }

  if (!treeId) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Missing tree id.</main>
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading tree…</main>
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Shared tree</p>
            <h1 className="mt-2 text-3xl font-bold">Tree: {treeId}</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/create-tree" className="rounded-lg border border-white/10 px-4 py-2 hover:bg-white/5">
              New tree
            </Link>
            <Link href="/" className="rounded-lg bg-amber-400 px-4 py-2 font-medium text-slate-950 hover:bg-amber-300">
              Home
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">Add yourself</h2>
            <div className="mt-4 space-y-4">
              <input
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                placeholder="Enter a family member name"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleAddSelf}
                className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Add me to this tree
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">Invite a relative</h2>
            <div className="mt-4 space-y-4">
              <select
                value={invitePersonId}
                onChange={(event) => setInvitePersonId(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
              >
                <option value="">Select a person</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleCreateInvite}
                className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Create invite link
              </button>

              {inviteToken && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  <p className="font-semibold">Invite link</p>
                  <p className="mt-2 break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/invite/${inviteToken}` : `/invite/${inviteToken}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">People in this network</h2>
          <div className="mt-4 space-y-3">
            {people.length === 0 ? (
              <p className="text-slate-300">No people yet. Add yourself first.</p>
            ) : (
              people.map((person) => (
                <div key={person.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{person.name}</p>
                      <p className="text-sm text-slate-300">
                        {person.claimed_by === person.created_by ? 'Claimed by creator' : 'Invited member'}
                      </p>
                    </div>
                    {person.hidden && <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-200">Hidden</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
