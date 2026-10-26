'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import AuthForm from '@/components/AuthForm'
import Dashboard from '@/components/Dashboard'
import FamilyTree from '@/components/FamilyTree'
import VisualFamilyTree from '@/components/VisualFamilyTree'
import AddPersonForm from '@/components/AddPersonForm'
import EditPersonForm from '@/components/EditPersonForm'
import SearchFilter from '@/components/SearchFilter'
import DeleteAccount from '@/components/DeleteAccount'
import { ExportButton } from '@/components/ExportButton'
import { getClient } from '@/lib/supabase'
import { formatDate } from '@/services/dates'
import * as cloud from '@/services/cloud'
import type { Flag } from '@/services/cloud'
import type { FamilyMember } from '@/types/family'

const btn = 'rounded-lg border border-[#d4af37] px-3 py-1.5 text-sm text-[#d4af37] hover:bg-[#2a2310] disabled:opacity-40'
const gold = 'rounded-lg bg-[#d4af37] px-4 py-2 font-semibold text-[#0b0b0c] hover:bg-[#f0cf65]'

export default function CloudApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const sb = getClient()
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])
  if (!ready) return <main className="min-h-screen bg-[#0b0b0c] p-8 text-[#9a917c]">Loading…</main>
  if (!session) return <AuthForm title="Family Tree" subtitle="Sign in, or create an account to start your family's tree. Relatives join through an invite link from someone already in the tree." />
  return <Network session={session} />
}

function Network({ session }: { session: Session }) {
  const uid = session.user.id
  const [net, setNet] = useState<{ id: string; name: string; role: string } | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [view, setView] = useState<'dashboard' | 'list' | 'tree' | 'network'>('dashboard')
  const [selected, setSelected] = useState<FamilyMember | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'add' | 'addSelf'>('view')
  const [q, setQ] = useState('')
  const [gender, setGender] = useState('all')
  const [link, setLink] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<{ asParentOf?: string; parentId?: string; spouseIds?: string[] } | null>(null)

  const run = async (fn: () => Promise<void>) => { try { setErr(null); await fn() } catch (e) { setErr(e instanceof Error ? e.message : 'Something went wrong') } }
  const reload = useCallback(async (id?: string) => {
    const nid = id ?? net?.id
    if (!nid) return
    const t = await cloud.fetchTree(nid)
    setMembers(t.members); setFlags(t.flags)
    setSelected(s => (s ? t.members.find(m => m.id === s.id) ?? null : null))
  }, [net?.id])

  // One-time network lookup on mount; the state updates happen in the async
  // callback, not during the effect body itself.
  /* eslint-disable react-hooks/set-state-in-effect -- mount-time data fetch */
  useEffect(() => { run(async () => { const n = await cloud.myNetwork(); setNet(n); if (n) await reload(n.id) }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const isFounder = net?.role === 'founder'
  const me = members.find(m => m.claimedBy === uid)
  const mine = (m: FamilyMember) => m.createdBy === uid
  const canEdit = (m: FamilyMember) => m.createdBy === uid || m.claimedBy === uid
  const filtered = useMemo(() => members.filter(m => !m.hidden && m.name.toLowerCase().includes(q.toLowerCase()) && (gender === 'all' || m.gender === gender)), [members, q, gender])

  if (net === undefined) return <main className="min-h-screen bg-[#0b0b0c] p-8 text-[#9a917c]">{err ?? 'Loading…'}</main>
  if (net === null) return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0c] p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-[#2a2418] bg-[#14110a] p-8 text-[#f5f0e1]">
        <h1 className="gold-text text-3xl font-bold">Start your family tree</h1>
        <p className="text-[#9a917c]">You will be the founder. Give the tree a name (usually your family name). Then add yourself and invite relatives.</p>
        <input className="w-full rounded-md border border-[#2a2418] px-3 py-2" placeholder="e.g. Shongwe family" value={name} onChange={e => setName(e.target.value)} />
        {err && <p className="text-sm text-[#ff8a8a]">{err}</p>}
        <button className={gold + ' w-full'} disabled={!name.trim()} onClick={() => run(async () => { const id = await cloud.createNetwork(name.trim()); setNet({ id, name: name.trim(), role: 'founder' }); await reload(id) })}>Create tree</button>
        <button className="text-sm text-[#9a917c] hover:underline" onClick={() => getClient().auth.signOut()}>Sign out</button>
      </div>
    </main>
  )

  const add = (self: boolean) => async (m: Omit<FamilyMember, 'id'>, asParentOf?: string) => {
    if (members.some(x => x.name.trim().toLowerCase() === m.name.trim().toLowerCase()) && !window.confirm(`Someone named “${m.name}” is already in this tree. Add another card anyway? (If it is the same person, cancel and link to the existing card.)`)) return
    await run(async () => { await cloud.addPerson(net.id, m, self, asParentOf); setMode('view'); setPrefill(null); await reload() })
  }

  // Opens the add form with the relationship already pointing the right way.
  const startAdd = (p: { asParentOf?: string; parentId?: string; spouseIds?: string[] }) => { setPrefill(p); setMode('add') }
  const prefillTitle = prefill?.asParentOf ? 'Add a parent' : prefill?.parentId ? 'Add a child' : prefill?.spouseIds ? 'Add a partner' : 'Add a person'
  const detail = selected
  const creatorLabel = detail ? (mine(detail) ? 'you' : 'another relative') : ''

  return (
    <main className="min-h-screen bg-[#0b0b0c] p-6 text-[#f5f0e1] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#2a2418] pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a917c]">Link-Leverage · {isFounder ? 'Founder' : 'Member'}</p>
            <h1 className="gold-text text-4xl font-bold">{net.name} family tree</h1>
            <p className="mt-1 text-sm text-[#9a917c]">{session.user.email} · {members.filter(m => !m.hidden).length} people · <button className="text-[#d4af37] hover:underline" onClick={() => run(() => reload())}>Refresh</button> · <button className="text-[#d4af37] hover:underline" onClick={() => getClient().auth.signOut()}>Sign out</button></p>
          </div>
          <div className="flex gap-1 rounded-xl border border-[#2a2418] bg-[#14110a] p-1">
            {([['dashboard', 'Dashboard'], ['list', 'List'], ['tree', 'Visual Tree'], ['network', `Network${flags.length && isFounder ? ` (${flags.length})` : ''}`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} className={`rounded-lg px-4 py-2 text-sm font-medium ${view === k ? 'bg-[#d4af37] text-[#0b0b0c]' : 'text-[#9a917c] hover:text-[#f5f0e1]'}`}>{l}</button>
            ))}
          </div>
        </div>

        {err && <p className="mb-4 rounded-lg border border-[#4d2424] bg-[#3a1c1c] px-4 py-2 text-[#ff8a8a]">{err}</p>}
        {!me && members.length >= 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d4af37] bg-[#2a2310] p-4">
            <span>You are not in the tree yet. Add your own card first, then your parents, partner(s) and children.</span>
            <button className={gold} onClick={() => { setSelected(null); setMode('addSelf') }}>Add myself</button>
          </div>
        )}

        <div className="mb-8 rounded-xl border border-[#2a2418] bg-[#14110a] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SearchFilter searchQuery={q} selectedGender={gender} onSearchChange={setQ} onGenderChange={setGender} />
            <button className={gold} onClick={() => { setSelected(null); setMode('add') }}>+ Add Person</button>
          </div>
          <div className="mt-4"><ExportButton members={filtered} /></div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="sticky top-6 rounded-xl border border-[#2a2418] bg-[#14110a] p-5">
              {mode === 'add' || mode === 'addSelf' ? (
                <>
                  <h2 className="mb-4 text-xl font-bold">{mode === 'addSelf' ? 'Add yourself' : prefillTitle}</h2>
                  <AddPersonForm
                    members={members.filter(m => !m.hidden)}
                    onAdd={add(mode === 'addSelf')}
                    onCancel={() => { setMode('view'); setPrefill(null) }}
                    initialParentId={prefill?.parentId}
                    initialSpouseIds={prefill?.spouseIds}
                    asParentOf={prefill?.asParentOf}
                  />
                </>
              ) : mode === 'edit' && detail ? (
                <>
                  <h2 className="mb-4 text-xl font-bold">Edit {detail.name}</h2>
                  <EditPersonForm member={detail} members={members.filter(m => !m.hidden)} onCancel={() => setMode('view')}
                    onUpdate={m => run(async () => { await cloud.updatePerson(detail, m); setMode('view'); await reload() })} />
                </>
              ) : detail ? (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-[#d4af37]">{detail.name}{detail.deceased ? ' †' : ''}</h2>
                  <p className="text-sm text-[#9a917c]">
                    {detail.gender}
                    {detail.birthDate || detail.birthYear ? ` · born ${detail.birthDate ? formatDate(detail.birthDate) : detail.birthYear}` : ''}
                    {detail.deceased ? ` · died ${detail.deathDate ? formatDate(detail.deathDate) : '(date unknown)'}` : ' · living'}
                  </p>
                  {detail.residence && <p className="text-sm text-[#9a917c]">Residential area: {detail.residence}</p>}
                  {detail.notes && <p className="text-sm text-[#e6dfc8]">{detail.notes}</p>}
                  <p className="text-xs text-[#7a725f]">Entered by {creatorLabel} · {detail.claimedBy ? (detail.claimedBy === uid ? 'this is you' : 'claimed by the person themselves') : 'not yet claimed'}{detail.hidden ? ' · HIDDEN' : ''}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {canEdit(detail) && <button className={btn} onClick={() => setMode('edit')}>Edit</button>}
                    {mine(detail) && <button className={btn} onClick={() => { if (window.confirm(`Delete ${detail.name}? This cannot be undone.`)) run(async () => { await cloud.deletePerson(detail.id); setSelected(null); await reload() }) }}>Delete</button>}
                    {mine(detail) && !detail.claimedBy && <button className={btn} onClick={() => run(async () => { setLink(`${window.location.origin}/join?token=${await cloud.createInvite(detail.id)}`) })}>Invite link</button>}
                    {mine(detail) && !detail.claimedBy && !me && <button className={btn} onClick={() => run(async () => { await cloud.claimPerson(detail.id); await reload() })}>This is me</button>}
                    {!mine(detail) && <button className={btn} onClick={() => { const r = window.prompt('Why are you flagging this entry? (the founder will review it)'); if (r && r.trim().length >= 3) run(async () => { await cloud.flagPerson(net.id, detail.id, r.trim()); window.alert('Flag sent to the founder.') }) }}>Flag</button>}
                  </div>

                  <div className="space-y-2 border-t border-[#2a2418] pt-3">
                    <p className="text-xs uppercase tracking-widest text-[#7a725f]">Grow this branch</p>
                    <div className="flex flex-wrap gap-2">
                      <button className={btn} onClick={() => startAdd({ asParentOf: detail.id })}>+ Parent</button>
                      <button className={btn} onClick={() => startAdd({ spouseIds: [detail.id] })}>+ Partner</button>
                      <button className={btn} onClick={() => startAdd({ parentId: detail.id })}>+ Child</button>
                    </div>
                    <p className="text-xs text-[#7a725f]">Creates a card for the relative and links it to {detail.name}. They do not need an account.</p>
                  </div>
                  {!canEdit(detail) && <p className="text-xs text-[#7a725f]">Only the person who entered this card can edit it.</p>}
                  {link && (
                    <div className="rounded-lg border border-[#d4af37] p-3 text-sm">
                      <p className="mb-1 text-[#e6dfc8]">One-time link for {detail.name} (valid 14 days):</p>
                      <input readOnly value={link} onFocus={e => e.target.select()} className="w-full rounded border border-[#2a2418] px-2 py-1 text-xs" />
                      <button className={btn + ' mt-2'} onClick={() => navigator.clipboard.writeText(link)}>Copy</button>
                    </div>
                  )}
                </div>
              ) : <p className="text-[#9a917c]">Click a person to see details. You can edit only the cards you entered or that are about you.</p>}
            </div>
          </aside>

          <section className="lg:col-span-3">
            {view === 'dashboard' && <Dashboard members={filtered} onOpen={m => { setLink(null); setSelected(m); setMode('view') }} />}
            {view === 'list' && <FamilyTree members={filtered} onEditMember={m => { setLink(null); setSelected(m); setMode('view') }} onDeleteMember={id => { const m = members.find(x => x.id === id); if (m && mine(m)) { setSelected(m); setMode('view') } else window.alert('Only the person who entered this card can delete it.') }} />}
            {view === 'tree' && <VisualFamilyTree members={filtered} onEditMember={m => { setLink(null); setSelected(m); setMode('view') }} onDeleteMember={id => { const m = members.find(x => x.id === id); if (m && mine(m)) { setSelected(m); setMode('view') } else window.alert('Only the person who entered this card can delete it.') }} />}
            {view === 'network' && (
              <div className="space-y-6 rounded-xl border border-[#2a2418] bg-[#14110a] p-6">
                <div>
                  <h2 className="mb-2 text-xl font-bold">How to grow the tree</h2>
                  <p className="text-[#9a917c]">Add a relative’s card, open it, press “Invite link” and send it to them. They create an account, claim that card, add their own family and invite the next relatives.</p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Cards you can still invite ({members.filter(m => mine(m) && !m.claimedBy).length})</h3>
                  {members.filter(m => mine(m) && !m.claimedBy).map(m => <button key={m.id} className={btn + ' mr-2 mb-2'} onClick={() => { setLink(null); setSelected(m); setMode('view'); setView('tree') }}>{m.name}</button>)}
                </div>
                {isFounder ? (
                  <div>
                    <h3 className="mb-2 font-semibold">Flagged entries ({flags.length})</h3>
                    {flags.length === 0 && <p className="text-[#9a917c]">No open flags.</p>}
                    {flags.map(f => (
                      <div key={f.id} className="mb-2 rounded-lg border border-[#2a2418] p-3">
                        <p><b className="text-[#d4af37]">{members.find(m => m.id === f.person_id)?.name ?? 'Unknown'}</b>: {f.reason}</p>
                        <div className="mt-2 flex gap-2">
                          <button className={btn} onClick={() => run(async () => { await cloud.resolveFlag(f.id, 'hide'); await reload() })}>Hide entry</button>
                          <button className={btn} onClick={() => run(async () => { await cloud.resolveFlag(f.id, 'dismiss'); await reload() })}>Dismiss</button>
                        </div>
                      </div>
                    ))}
                    <h3 className="mb-2 mt-6 font-semibold">Hidden entries</h3>
                    {members.filter(m => m.hidden).length === 0 && <p className="text-[#9a917c]">None.</p>}
                    {members.filter(m => m.hidden).map(m => <button key={m.id} className={btn + ' mr-2'} onClick={() => run(async () => { await cloud.setHidden(m.id, false); await reload() })}>Restore {m.name}</button>)}
                    <p className="mt-4 text-xs text-[#7a725f]">As founder you can hide or restore an entry, but you cannot edit or delete other people’s entries.</p>
                  </div>
                ) : <p className="text-[#9a917c]">Flags you raise are reviewed by the founder.</p>}
                <DeleteAccount network={net} uid={uid} members={members.filter(m => !m.hidden)} />
              </div>
            )}
          </section>
        </div>
        <footer className="mt-12 flex gap-4 border-t border-[#2a2418] pt-4 text-xs text-[#9a917c]">
          <a href="/privacy" className="hover:text-[#d4af37]">Privacy Policy</a>
          <a href="/terms" className="hover:text-[#d4af37]">Terms of Service</a>
        </footer>
      </div>
    </main>
  )
}
