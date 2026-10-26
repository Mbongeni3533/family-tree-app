import type { FamilyMember } from '@/types/family'

// A person's own recorded spouses (new list + legacy single field)
export const ownSpouses = (m: FamilyMember): string[] =>
  [...new Set([...(m.spouseIds ?? []), m.spouseId].filter((s): s is string => !!s && s !== m.id))]

// Symmetric spouse map: if either side records the marriage, both sides see it
export function spouseMap(members: FamilyMember[]): Map<string, string[]> {
  const ids = new Set(members.map(m => m.id))
  const map = new Map<string, Set<string>>(members.map(m => [m.id, new Set<string>()]))
  for (const m of members) for (const s of ownSpouses(m)) {
    if (!ids.has(s)) continue
    map.get(m.id)!.add(s)
    map.get(s)!.add(m.id)
  }
  return new Map([...map].map(([k, v]) => [k, [...v]]))
}

// Sets one person's spouses and keeps the other side in sync (adds and removes)
export function setSpouses(members: FamilyMember[], id: string, spouses: string[]): FamilyMember[] {
  const want = new Set(spouses.filter(s => s !== id))
  return members.map(m => {
    const own = m.id === id ? [...want] : [...ownSpouses(m).filter(s => s !== id), ...(want.has(m.id) ? [id] : [])]
    return { ...m, spouseIds: own.length ? own : undefined, spouseId: own[0] }
  })
}

export const ordinal = (n: number) => {
  const v = n % 100
  return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th')
}
