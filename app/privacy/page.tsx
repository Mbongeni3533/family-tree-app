import Link from 'next/link'

export default function TreePage({ params }: { params: { treeId: string } }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Shared tree</p>
        <h1 className="mt-2 text-4xl font-bold">Tree: {params.treeId}</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          This is the next layer of the shared family network: founder ownership, relative invite links,
          permission checks, and hidden/restore behavior.
        </p>

        <div className="mt-8 flex gap-3">
          <Link href="/create-tree" className="rounded-lg border border-white/10 px-4 py-2 hover:bg-white/5">
            New tree
          </Link>
          <Link href="/" className="rounded-lg bg-amber-400 px-4 py-2 font-medium text-slate-950 hover:bg-amber-300">
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}
