'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!error) {
        setUser(data.user)
      }
      setLoading(false)
    }

    loadUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="mb-12 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Family Tree</p>
            <h1 className="mt-2 text-3xl font-bold">Shared invite-only network</h1>
          </div>

          {user ? (
            <button
              onClick={handleSignOut}
              className="rounded-lg bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-200"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/auth/sign-in"
              className="rounded-lg bg-amber-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-amber-300"
            >
              Sign in
            </Link>
          )}
        </header>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">Foundation</p>
            <h2 className="mt-4 text-4xl font-bold">Supabase-backed family tree app</h2>
            <p className="mt-4 max-w-xl text-slate-300">
              This is the starting point for the invite-only family network described in the testing checklist.
              Authentication, session handling, and environment setup are now wired in.
            </p>

            {loading ? (
              <p className="mt-8 text-slate-300">Loading session…</p>
            ) : user ? (
              <div className="mt-8 space-y-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                <p className="text-lg font-semibold text-emerald-300">Signed in</p>
                <p className="text-slate-200">{user.email}</p>
                <p className="text-sm text-slate-300">Next step: create a tree, invite relatives, and enforce ownership rules.</p>
              </div>
            ) : (
              <div className="mt-8 space-y-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-lg font-semibold text-amber-300">Not signed in</p>
                <p className="text-slate-200">Create an account or sign in to continue.</p>
                <Link
                  href="/auth/sign-in"
                  className="inline-flex rounded-lg bg-amber-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-amber-300"
                >
                  Go to sign in
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Next implementation steps</p>
            <ul className="mt-6 space-y-4 text-slate-200">
              <li>1. Add Supabase schema for trees, members, invites, and ownership.</li>
              <li>2. Create founder and relative roles with creator-only edits.</li>
              <li>3. Add invite links and join flow for invited relatives.</li>
              <li>4. Add delete-account logic and hidden/restore behavior.</li>
              <li>5. Add GEDCOM export/import and legal pages.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}
