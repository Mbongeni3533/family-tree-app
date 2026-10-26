import type { FamilyMember } from '@/types/family'

/** Every distinct place already used in the tree, for the suggestion lists. */
export function knownPlaces(members: FamilyMember[]): string[] {
  const seen = new Set<string>()
  for (const m of members) {
    for (const raw of [m.birthPlace, m.residence, m.deathPlace]) {
      const place = raw?.trim()
      if (place) seen.add(place)
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}
