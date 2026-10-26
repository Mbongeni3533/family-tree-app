import type { FamilyMember } from '@/types/family'
import { yearOf } from '@/services/dates'

const GENDERS = ['male', 'female', 'other']
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined)
const DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/
const dateStr = (v: unknown) => (typeof v === 'string' && DATE_RE.test(v) ? v : undefined)

export function buildBackup(members: FamilyMember[]) {
  return { app: 'family-tree', version: 1, exportedAt: new Date().toISOString(), members }
}

export function downloadBackup(members: FamilyMember[]) {
  const blob = new Blob([JSON.stringify(buildBackup(members), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `family-tree-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Validates and cleans imported data. Throws an Error with a readable message on bad input.
export function parseBackup(text: string): FamilyMember[] {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error('This file is not valid JSON.') }
  const list = Array.isArray(raw) ? raw : (raw as { members?: unknown })?.members
  if (!Array.isArray(list)) throw new Error('No family members found in this file.')

  const seen = new Set<string>()
  const members: FamilyMember[] = []
  for (const item of list) {
    const m = item as Record<string, unknown>
    const id = str(m?.id), name = str(m?.name)
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    const photo = str(m.photoUrl)
    const birthDate = dateStr(m.birthDate)
    members.push({
      id,
      name,
      gender: GENDERS.includes(m.gender as string) ? (m.gender as FamilyMember['gender']) : 'other',
      birthDate,
      birthYear: typeof m.birthYear === 'number' && Number.isFinite(m.birthYear) ? m.birthYear : yearOf(birthDate),
      deceased: m.deceased === true,
      deathDate: dateStr(m.deathDate),
      residence: str(m.residence),
      birthPlace: str(m.birthPlace),
      deathPlace: str(m.deathPlace),
      parentId: str(m.parentId),
      parent2Id: str(m.parent2Id),
      spouseId: str(m.spouseId),
      spouseIds: Array.isArray(m.spouseIds) ? (m.spouseIds as unknown[]).filter((x): x is string => typeof x === 'string') : undefined,
      notes: str(m.notes),
      photoUrl: photo && /^(data:image\/|https?:\/\/)/.test(photo) ? photo : undefined,
      addedAt: typeof m.addedAt === 'number' ? m.addedAt : undefined,
    })
  }
  if (members.length === 0) throw new Error('No valid members found in this file.')
  // Drop references to people who are not in the file
  return members.map(m => ({
    ...m,
    parentId: m.parentId && seen.has(m.parentId) && m.parentId !== m.id ? m.parentId : undefined,
    parent2Id: m.parent2Id && seen.has(m.parent2Id) && m.parent2Id !== m.id && m.parent2Id !== m.parentId ? m.parent2Id : undefined,
    spouseId: m.spouseId && seen.has(m.spouseId) && m.spouseId !== m.id ? m.spouseId : undefined,
    spouseIds: m.spouseIds?.filter(x => seen.has(x) && x !== m.id),
  }))
}
