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
      if (!error && data.user) {
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
              type="button"
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
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">Founder flow</p>
            <h2 className="mt-4 text-4xl font-bold">Create a shared family network</h2>
            <p className="mt-4 max-w-xl text-slate-300">
              This version is built around Supabase-backed networks, single-use invites, founder ownership,
              and relative claiming. The founder creates the tree, adds a card, and sends an invite for one person.
            </p>

            {loading ? (
              <p className="mt-8 text-slate-300">Loading session…</p>
            ) : user ? (
              <div className="mt-8 space-y-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
                <p className="text-lg font-semibold text-emerald-300">Signed in</p>
                <p className="text-slate-200">{user.email}</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    href="/create-tree"
                    className="rounded-lg bg-emerald-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-300"
                  >
                    Create tree
                  </Link>
                  <Link
                    href="/privacy"
                    className="rounded-lg border border-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/5"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/terms"
                    className="rounded-lg border border-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/5"
                  >
                    Terms
                  </Link>
                </div>
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
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Network rules</p>
            <ul className="mt-6 space-y-4 text-slate-200">
              <li>✓ Founder creates the network and adds their own first card.</li>
              <li>✓ Invite links are created for one unclaimed card and are single-use.</li>
              <li>✓ A relative can claim the card, join the network, and add more people.</li>
              <li>✓ Creator-owned cards cannot be edited by other members.</li>
              <li>✓ The founder can hide or dismiss a reported card.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}
