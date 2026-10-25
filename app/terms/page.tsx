export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Privacy</p>
        <h1 className="mt-3 text-4xl font-bold">Privacy policy</h1>
        <div className="mt-6 space-y-4 text-slate-300">
          <p>This app is designed for invite-only family access and network-based collaboration.</p>
          <p>Only the information required to maintain a family network is stored, and access is limited to invited members.</p>
          <p>Users can also request account removal and network moderation through the management controls.</p>
        </div>
      </div>
    </main>
  )
}
