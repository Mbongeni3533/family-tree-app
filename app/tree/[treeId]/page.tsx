'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function CreateTreePage() {
  const [treeName, setTreeName] = useState('The Smith Family')
  const [created, setCreated] = useState(false)

  const handleCreate = () => {
    setCreated(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Create tree</p>
        <h1 className="mt-2 text-3xl font-bold">New family network</h1>

        <div className="mt-6 space-y-4">
          <label className="block text-sm text-slate-200">
            Tree name
            <input
              value={treeName}
              onChange={(event) => setTreeName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
            />
          </label>

          <button
            onClick={handleCreate}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Create tree
          </button>
        </div>

        {created && (
          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200">
            <p className="font-semibold">Tree created</p>
            <p className="mt-1 text-sm">This is the foundation for the founder-owned shared tree flow.</p>
            <div className="mt-4 flex gap-3">
              <Link href="/" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5">
                Back home
              </Link>
              <Link href="/tree/demo" className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-300">
                Open tree
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
