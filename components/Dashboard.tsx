import type { FamilyMember } from '@/types/family'
import { spouseMap } from '@/services/relations'
import { formatDate } from '@/services/dates'

const GOLD = '#d4af37'

function generations(members: FamilyMember[]): number {
  const byId = new Map(members.map(m => [m.id, m]))
  const memo = new Map<string, number>()
  const depth = (id: string, path: Set<string>): number => {
    if (memo.has(id)) return memo.get(id)!
    if (path.has(id)) return 1 // guard against loops in bad data
    path.add(id)
    const m = byId.get(id)!
    const ds = [m.parentId, m.parent2Id].filter((p): p is string => !!p && byId.has(p)).map(p => depth(p, path))
    path.delete(id)
    const d = 1 + (ds.length ? Math.max(...ds) : 0)
    memo.set(id, d)
    return d
  }
  return members.reduce((mx, m) => Math.max(mx, depth(m.id, new Set())), 0)
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#2a2418] bg-[#14110a] p-5">
      <p className="text-xs uppercase tracking-widest text-[#9a917c]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#d4af37]">{value}</p>
      {sub && <p className="mt-1 truncate text-sm text-[#9a917c]">{sub}</p>}
    </div>
  )
}

export default function Dashboard({ members, onOpen }: { members: FamilyMember[]; onOpen: (m: FamilyMember) => void }) {
  const total = members.length
  const count = (g: string) => members.filter(m => m.gender === g).length
  const split = [['Male', count('male')], ['Female', count('female')], ['Other', count('other')]] as const

  const deceased = members.filter(m => m.deceased).length
  const living = total - deceased
  const withYear = members.filter(m => m.birthYear)
  const oldest = withYear.length ? withYear.reduce((a, b) => (a.birthYear! <= b.birthYear! ? a : b)) : null
  const youngest = withYear.length ? withYear.reduce((a, b) => (a.birthYear! >= b.birthYear! ? a : b)) : null
  const photos = members.filter(m => m.photoUrl).length

  // polygamy / marriage statistics (a household can have several spouses)
  const sp = spouseMap(members)
  const counts = [...sp.values()].map(v => v.length)
  const marriages = counts.reduce((a, b) => a + b, 0) / 2
  const married = counts.filter(c => c > 0).length
  const multi = counts.filter(c => c > 1).length
  const mostSpouses = Math.max(0, ...counts)
  const mothers = new Set(
    members.flatMap(m => [m.parentId, m.parent2Id]).filter((p): p is string => !!p && members.find(x => x.id === p)?.gender === 'female')
  )
  const kidsOfMothers = members.filter(m => [m.parentId, m.parent2Id].some(p => p && mothers.has(p))).length

  const recent = [...members].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0) || members.indexOf(b) - members.indexOf(a)).slice(0, 5)

  return (
    <div id="family-tree-content" className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total members" value={total} sub={`${photos} with photos`} />
        <Stat label="Generations" value={generations(members)} />
        <Stat label="Living" value={living} sub={total ? `${Math.round((living / total) * 100)}% of tree` : undefined} />
        <Stat label="Deceased" value={deceased} sub={total ? `${Math.round((deceased / total) * 100)}% of tree` : undefined} />
        <Stat label="Oldest" value={oldest?.birthYear ?? '—'} sub={oldest?.name} />
        <Stat label="Youngest" value={youngest?.birthYear ?? '—'} sub={youngest?.name} />
      </div>

      {marriages > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
          <Stat label="Marriages" value={marriages} />
          <Stat label="Multi-spouse people" value={multi} sub={multi ? 'with 2+ spouses' : 'no polygamous marriages'} />
          <Stat label="Most spouses" value={mostSpouses} sub="one person" />
          <Stat label="Avg spouses" value={(counts.reduce((a, b) => a + b, 0) / Math.max(1, married)).toFixed(1)} sub="per married person" />
          <Stat label="Children per mother" value={mothers.size ? (kidsOfMothers / mothers.size).toFixed(1) : '—'} sub={mothers.size ? `${mothers.size} mothers recorded` : undefined} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#2a2418] bg-[#14110a] p-6">
          <h3 className="mb-5 text-lg font-semibold text-[#f5f0e1]">Gender split</h3>
          <div className="space-y-4">
            {split.map(([label, n], i) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm text-[#e6dfc8]"><span>{label}</span><span>{n} ({total ? Math.round((n / total) * 100) : 0}%)</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-[#2a2418]">
                  <div className="h-full rounded-full" style={{ width: `${total ? (n / total) * 100 : 0}%`, background: GOLD, opacity: 1 - i * 0.3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#2a2418] bg-[#14110a] p-6">
          <h3 className="mb-5 text-lg font-semibold text-[#f5f0e1]">Recently added</h3>
          {recent.length === 0 ? (
            <p className="text-[#9a917c]">No members yet. Click “+ Add Person” to start your tree.</p>
          ) : (
            <ul className="divide-y divide-[#2a2418]">
              {recent.map(m => (
                <li key={m.id}>
                  <button onClick={() => onOpen(m)} className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80">
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoUrl} alt={m.name} className="h-10 w-10 rounded-full border border-[#d4af37] object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a2310] font-bold text-[#d4af37]">{m.name.charAt(0).toUpperCase()}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[#f5f0e1]">{m.name}{m.deceased ? ' †' : ''}</span>
                      <span className="block truncate text-xs text-[#9a917c]">
                        {m.birthDate ? formatDate(m.birthDate) : (m.birthYear ?? '')}
                        {m.deceased && m.deathDate ? ` – ${formatDate(m.deathDate)}` : ''}
                        {m.residence ? ` · ${m.residence}` : ''}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.deceased ? 'bg-[#2a2418] text-[#9a917c]' : 'bg-[#1c2b1c] text-[#8fd18f]'}`}>
                      {m.deceased ? 'Deceased' : 'Living'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
