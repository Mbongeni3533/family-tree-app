import type { FamilyMember } from '@/types/family'
import { spouseMap, ownSpouses, ordinal } from '@/services/relations'

export const CARD_W = 164
export const CARD_H = 92
export const SPOUSE_GAP = 30
export const UNIT_GAP = 44
export const ROW_GAP = 140
const PAD = 32

export const FAN_MIN = 5 // households with this many spouses or more use the fan layout

export interface PlacedNode { member: FamilyMember; x: number; y: number; rank: number; badge?: string }
export interface PlacedEdge { d: string; kind: 'parent' | 'spouse'; mx?: number; my?: number }
export interface TreeLayout { nodes: PlacedNode[]; edges: PlacedEdge[]; width: number; height: number; generations: number }

interface Unit { members: FamilyMember[]; rank: number; x: number; order: number }

/**
 * Layered family-tree layout with support for polygamous households:
 *  1. rank = generation (children below both parents; every spouse of a person shares their row)
 *  2. a household (a person + all their spouses) is one "unit" drawn side by side;
 *     a one-spouse household uses a gold link, a multi-spouse household draws one
 *     gold bracket per marriage below the cards
 *  3. units are positioned under their parents' cards, nudged toward their children, never overlapping
 *  4. children hang from their own parents' marriage point, so each wife's children stay with her
 */
export function computeLayout(members: FamilyMember[]): TreeLayout {
  if (members.length === 0) return { nodes: [], edges: [], width: 0, height: 0, generations: 0 }
  const byId = new Map(members.map(m => [m.id, m]))
  const index = new Map(members.map((m, i) => [m.id, i]))
  const sp = spouseMap(members)

  // Fan layout: a person with FAN_MIN+ spouses sits on a row above; each spouse hangs below on her own line
  const fanOf = new Map<string, string>() // spouse id -> hub id
  const fanHubs = new Map<string, string[]>()
  for (const m of members) {
    const ws = (sp.get(m.id) ?? []).filter(w => !fanOf.has(w) && !fanHubs.has(w) && !fanOf.has(m.id))
    if ((sp.get(m.id) ?? []).length >= FAN_MIN && ws.length >= FAN_MIN) { fanHubs.set(m.id, ws); ws.forEach(w => fanOf.set(w, m.id)) }
  }
  const isFan = (a: string, b: string) => fanOf.get(a) === b || fanOf.get(b) === a
  const sq = new Map([...sp].map(([k, v]) => [k, v.filter(s => !isFan(k, s))]))
  const parentsOf = (m: FamilyMember) =>
    [...new Set([m.parentId, m.parent2Id])].filter((p): p is string => !!p && byId.has(p) && p !== m.id)

  // 1. ranks (fixpoint, capped so looping data cannot hang the UI)
  const rank = new Map(members.map(m => [m.id, 0]))
  const cap = members.length + 2
  for (let it = 0; it < cap; it++) {
    let changed = false
    for (const m of members) {
      let r = rank.get(m.id)!
      for (const p of parentsOf(m)) r = Math.max(r, Math.min(rank.get(p)! + 1, cap))
      for (const s of sq.get(m.id) ?? []) r = Math.max(r, rank.get(s)!)
      if (fanOf.has(m.id)) r = Math.max(r, Math.min(rank.get(fanOf.get(m.id)!)! + 1, cap))
      if (r !== rank.get(m.id)) { rank.set(m.id, r); changed = true }
    }
    if (!changed) break
  }

  // 2. households = connected groups of spouses
  const order = (comp: FamilyMember[]): FamilyMember[] => {
    if (comp.length < 2) return comp
    if (comp.length === 2) return [...comp].sort((a, b) => (a.gender === 'male' ? 0 : 1) - (b.gender === 'male' ? 0 : 1))
    const hub = [...comp].sort((a, b) => (sq.get(b.id)!.length - sq.get(a.id)!.length) || ((a.gender === 'male' ? 0 : 1) - (b.gender === 'male' ? 0 : 1)))[0]
    const others = comp.filter(m => m !== hub).sort((a, b) => (a.birthYear ?? Infinity) - (b.birthYear ?? Infinity) || index.get(a.id)! - index.get(b.id)!)
    const mid = Math.floor(others.length / 2)
    return [...others.slice(0, mid), hub, ...others.slice(mid)]
  }
  const unitOf = new Map<string, Unit>()
  const units: Unit[] = []
  for (const m of members) {
    if (unitOf.has(m.id)) continue
    const comp: FamilyMember[] = []
    const queue = [m]
    const seen = new Set([m.id])
    while (queue.length) {
      const cur = queue.shift()!
      comp.push(cur)
      for (const s of sq.get(cur.id) ?? []) if (!seen.has(s)) { seen.add(s); queue.push(byId.get(s)!) }
    }
    const ms = order(comp)
    const u: Unit = { members: ms, rank: Math.max(...ms.map(x => rank.get(x.id)!)), x: 0, order: units.length }
    ms.forEach(x => unitOf.set(x.id, u))
    units.push(u)
  }
  const width = (u: Unit) => u.members.length * CARD_W + (u.members.length - 1) * SPOUSE_GAP
  const center = (u: Unit) => u.x + width(u) / 2
  const cardX = (id: string) => { const u = unitOf.get(id)!; return u.x + u.members.findIndex(x => x.id === id) * (CARD_W + SPOUSE_GAP) }
  const cx = (id: string) => cardX(id) + CARD_W / 2
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  // card centres of this unit's parents / children (member level, so each wife's kids stay with her)
  const parentXs = (u: Unit) => [...u.members.flatMap(parentsOf).filter(p => unitOf.get(p) !== u), ...u.members.filter(m => fanOf.has(m.id)).map(m => fanOf.get(m.id)!)].map(cx)
  const childXs = (u: Unit) => [...members.filter(c => unitOf.get(c.id) !== u && parentsOf(c).some(p => unitOf.get(p) === u)).map(c => c.id), ...u.members.flatMap(m => (fanHubs.get(m.id) ?? []))].map(cx)

  const maxRank = Math.max(...units.map(u => u.rank))
  const rows: Unit[][] = Array.from({ length: maxRank + 1 }, () => [])
  units.forEach(u => rows[u.rank].push(u))

  const pack = (row: Unit[], target: (u: Unit) => number) => {
    let cursor = -Infinity
    for (const u of row) {
      const t = target(u) - width(u) / 2
      u.x = cursor === -Infinity ? (Number.isFinite(t) ? t : 0) : Math.max(Number.isFinite(t) ? t : cursor, cursor)
      cursor = u.x + width(u) + UNIT_GAP
    }
  }

  // 3a. initial placement, top-down
  pack(rows[0], () => NaN)
  for (let r = 1; r <= maxRank; r++) {
    const key = (u: Unit) => { const xs = parentXs(u); return xs.length ? mean(xs) : Infinity }
    const by = (u: Unit) => Math.min(...u.members.map(m => m.birthYear ?? Infinity))
    rows[r].sort((a, b) => key(a) - key(b) || by(a) - by(b) || a.order - b.order)
    let last = 0
    pack(rows[r], u => { const k = key(u); last = Number.isFinite(k) ? k : last + width(u) + UNIT_GAP; return last })
  }
  // 3b. refinement: pull toward parents and children
  for (let pass = 0; pass < 6; pass++) {
    for (let r = 1; r <= maxRank; r++) {
      pack(rows[r], u => {
        const p = parentXs(u), c = pass % 2 ? childXs(u) : []
        const t = [...(p.length ? [mean(p)] : []), ...(c.length ? [mean(c)] : [])]
        return t.length ? mean(t) : center(u)
      })
    }
    for (let r = maxRank - 1; r >= 0; r--) pack(rows[r], u => { const c = childXs(u); return c.length ? mean(c) : center(u) })
  }
  const minX = Math.min(...units.map(u => u.x))
  units.forEach(u => { u.x = u.x - minX + PAD })

  // 4. nodes + edges
  const rowY = (r: number) => PAD + r * (CARD_H + ROW_GAP)
  // "1st wife", "2nd wife"... for people married to someone with several spouses (order = order ticked)
  const badge = new Map<string, string>()
  for (const h of members) {
    const ws = sp.get(h.id) ?? []
    if (ws.length < 2) continue
    const own = ownSpouses(h)
    const ordered = [...own.filter(w => ws.includes(w)), ...ws.filter(w => !own.includes(w)).sort((a, b) => (byId.get(a)!.birthYear ?? Infinity) - (byId.get(b)!.birthYear ?? Infinity))]
    ordered.forEach((w, i) => {
      const W = byId.get(w)!
      if ((sp.get(w) ?? []).length === 1) badge.set(w, `${ordinal(i + 1)} ${W.gender === 'female' ? 'wife' : W.gender === 'male' ? 'husband' : 'spouse'}`)
    })
  }
  const nodes: PlacedNode[] = []
  for (const u of units) u.members.forEach(m => nodes.push({ member: m, x: cardX(m.id), y: rowY(u.rank), rank: u.rank, badge: badge.get(m.id) }))
  const posY = (id: string) => rowY(unitOf.get(id)!.rank)

  // marriages: gap link for a couple, one bracket per marriage in larger households
  const edges: PlacedEdge[] = []
  const marriagePoint = new Map<string, [number, number]>()
  for (const u of units) {
    if (u.members.length < 2) continue
    const y = rowY(u.rank)
    if (u.members.length === 2) {
      const x1 = cardX(u.members[0].id) + CARD_W, x2 = cardX(u.members[1].id)
      edges.push({ d: `M${x1} ${y + CARD_H / 2} H${x2}`, kind: 'spouse', mx: (x1 + x2) / 2, my: y + CARD_H / 2 })
      marriagePoint.set([u.members[0].id, u.members[1].id].sort().join('|'), [(x1 + x2) / 2, y + CARD_H / 2])
      continue
    }
    const pairs: [string, string][] = []
    for (const a of u.members) for (const b of sq.get(a.id) ?? []) if (a.id < b) pairs.push([a.id, b])
    pairs.sort((p, q) => Math.abs(cx(p[0]) - cx(p[1])) - Math.abs(cx(q[0]) - cx(q[1])))
    pairs.forEach(([a, b], k) => {
      const depth = 14 + 10 * k, yb = y + CARD_H + depth
      const xa = cx(a), xb = cx(b)
      edges.push({ d: `M${xa} ${y + CARD_H} V${yb} H${xb} V${y + CARD_H}`, kind: 'spouse', mx: (xa + xb) / 2, my: yb })
      marriagePoint.set([a, b].sort().join('|'), [(xa + xb) / 2, yb])
    })
  }

  // fan households: one bus under the husband, a drop to each wife; her children hang from her
  for (const [hub, ws] of fanHubs) {
    const y = posY(hub) + CARD_H, busY = y + ROW_GAP / 2
    for (const w of ws) {
      const wx = cx(w), wy = posY(w)
      edges.push({ d: `M${cx(hub)} ${y} V${busY} H${wx} V${wy}`, kind: 'spouse' })
      edges.push({ d: `M${wx} ${wy + CARD_H} h0`, kind: 'spouse', mx: wx, my: wy + CARD_H })
      marriagePoint.set([hub, w].sort().join('|'), [wx, wy + CARD_H])
    }
  }

  // each distinct set of parents gets its own horizontal bus height
  const groupKey = (m: FamilyMember) => parentsOf(m).sort().join('|')
  const groups = new Map<number, Map<string, number[]>>()
  for (const m of members) {
    if (!parentsOf(m).length) continue
    const r = unitOf.get(m.id)!.rank
    const g = groups.get(r) ?? new Map<string, number[]>()
    g.set(groupKey(m), [...(g.get(groupKey(m)) ?? []), cardX(m.id)])
    groups.set(r, g)
  }
  const busOffset = (m: FamilyMember) => {
    const g = groups.get(unitOf.get(m.id)!.rank)!
    const keys = [...g.keys()].sort((a, b) => mean(g.get(a)!) - mean(g.get(b)!))
    const step = Math.min(14, (ROW_GAP - 80) / Math.max(1, keys.length - 1))
    return (keys.indexOf(groupKey(m)) - (keys.length - 1) / 2) * step
  }
  for (const m of members) {
    const ps = parentsOf(m)
    if (!ps.length) continue
    const tx = cx(m.id), ty = posY(m.id)
    const sources: [number, number][] = []
    const mp = ps.length === 2 ? marriagePoint.get([...ps].sort().join('|')) : undefined
    if (mp) sources.push(mp)
    else ps.forEach(p => sources.push([cx(p), posY(p) + CARD_H]))
    for (const [sx, sy] of sources) {
      if (ty <= sy) continue
      const midY = ty - ROW_GAP / 2 + busOffset(m)
      edges.push({ d: `M${sx} ${sy} V${Math.max(midY, sy + 6)} H${tx} V${ty}`, kind: 'parent' })
    }
  }
  const w = Math.max(...nodes.map(n => n.x + CARD_W)) + PAD
  return { nodes, edges, width: w, height: rowY(maxRank) + CARD_H + PAD, generations: maxRank + 1 }
}
