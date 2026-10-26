import type { FamilyMember } from '@/types/family'

const normalise = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Levenshtein distance with an early exit once the answer cannot beat `limit`. */
function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      best = Math.min(best, current[j])
    }
    if (best > limit) return limit + 1
    previous = current
  }
  return previous[b.length]
}

/**
 * Finds members whose name is close to what is being typed, so a relative who
 * already has a card is linked instead of entered twice.
 */
export function similarMembers(query: string, members: FamilyMember[], excludeIds: string[] = [], limit = 4): FamilyMember[] {
  const q = normalise(query)
  if (q.length < 2) return []

  const skip = new Set(excludeIds)
  const scored: { member: FamilyMember; score: number }[] = []

  for (const member of members) {
    if (skip.has(member.id)) continue
    const name = normalise(member.name)
    if (!name) continue

    let score = 0
    if (name === q) score = 100
    else if (name.startsWith(q) || q.startsWith(name)) score = 80
    else if (name.includes(q) || q.includes(name)) score = 60
    else {
      const allowed = Math.max(1, Math.floor(Math.max(q.length, name.length) * 0.25))
      const d = distance(q, name, allowed)
      if (d <= allowed) score = 40 - d
    }
    if (score > 0) scored.push({ member, score })
  }

  return scored.sort((a, b) => b.score - a.score || a.member.name.localeCompare(b.member.name)).slice(0, limit).map(s => s.member)
}
