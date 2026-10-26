import type { FamilyMember } from '@/types/family'
import { spouseMap } from '@/services/relations'

export interface ViewResult {
  visible: FamilyMember[]
  hiddenCount: Map<string, number> // collapsed person -> number of people hidden under them
  hasKids: Set<string> // visible people that have descendants (they get a collapse toggle)
}

/** Applies "focus on one person" and "collapsed branches" to the member list. */
export function viewMembers(members: FamilyMember[], collapsed: Set<string>, focusId: string | null): ViewResult {
  const byId = new Map(members.map(m => [m.id, m]))
  const sp = spouseMap(members)
  const parents = (m: FamilyMember) => [...new Set([m.parentId, m.parent2Id])].filter((p): p is string => !!p && byId.has(p) && p !== m.id)
  const kids = new Map<string, string[]>()
  for (const m of members) for (const p of parents(m)) kids.set(p, [...(kids.get(p) ?? []), m.id])

  let pool = members
  if (focusId && byId.has(focusId)) {
    const keep = new Set([focusId])
    const walk = (start: string, next: (id: string) => string[]) => {
      const q = [start]
      while (q.length) for (const n of next(q.shift()!)) if (!keep.has(n)) { keep.add(n); q.push(n) }
    }
    walk(focusId, id => parents(byId.get(id)!))
    walk(focusId, id => kids.get(id) ?? [])
    for (const id of [...keep]) for (const s of sp.get(id) ?? []) keep.add(s)
    pool = members.filter(m => keep.has(m.id))
  }
  const inPool = new Set(pool.map(m => m.id))
  const hidden = new Set<string>()
  for (let it = 0; it < pool.length + 2; it++) {
    let changed = false
    for (const m of pool) {
      if (hidden.has(m.id)) continue
      const ps = parents(m).filter(p => inPool.has(p))
      const sps = (sp.get(m.id) ?? []).filter(s => inPool.has(s))
      const hide = ps.length
        ? ps.some(p => collapsed.has(p) || hidden.has(p))
        : sps.length > 0 && sps.every(s => hidden.has(s)) // married-in spouse of a hidden person
      if (hide) { hidden.add(m.id); changed = true }
    }
    if (!changed) break
  }
  const visible = pool.filter(m => !hidden.has(m.id))
  const hiddenCount = new Map<string, number>()
  const hasKids = new Set<string>()
  for (const m of visible) {
    const direct = (kids.get(m.id) ?? []).filter(k => inPool.has(k))
    if (direct.length) hasKids.add(m.id)
    if (collapsed.has(m.id) && direct.length) {
      const seen = new Set<string>(), q = [...direct]
      while (q.length) { const n = q.shift()!; if (seen.has(n)) continue; seen.add(n); q.push(...(kids.get(n) ?? []).filter(k => inPool.has(k))) }
      hiddenCount.set(m.id, [...seen].filter(n => hidden.has(n)).length)
    }
  }
  return { visible, hiddenCount, hasKids }
}
