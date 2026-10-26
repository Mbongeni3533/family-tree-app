import { getClient } from '@/lib/supabase'
import { shrinkPhoto } from '@/services/photos'
import type { FamilyMember } from '@/types/family'

export interface Flag { id: string; person_id: string; reason: string; status: string; flagged_by: string; created_at: string }
interface PersonRow { id: string; created_by: string; claimed_by: string | null; name: string; gender: FamilyMember['gender']; birth_year: number | null; notes: string | null; photo_url: string | null; parent_id: string | null; parent2_id: string | null; hidden: boolean; created_at: string; updated_at: string }
interface MarriageRow { person_a: string; person_b: string; created_at: string }

export function rowsToMembers(people: PersonRow[], marriages: MarriageRow[]): FamilyMember[] {
  const ids = new Set(people.map(p => p.id))
  const sp = new Map<string, string[]>()
  for (const m of [...marriages].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!ids.has(m.person_a) || !ids.has(m.person_b)) continue
    sp.set(m.person_a, [...(sp.get(m.person_a) ?? []), m.person_b])
    sp.set(m.person_b, [...(sp.get(m.person_b) ?? []), m.person_a])
  }
  return people.map(p => ({
    id: p.id, name: p.name, gender: p.gender,
    birthYear: p.birth_year ?? undefined, notes: p.notes ?? undefined, photoUrl: p.photo_url ?? undefined,
    parentId: p.parent_id && ids.has(p.parent_id) ? p.parent_id : undefined,
    parent2Id: p.parent2_id && ids.has(p.parent2_id) ? p.parent2_id : undefined,
    spouseIds: sp.get(p.id), spouseId: sp.get(p.id)?.[0],
    addedAt: Date.parse(p.created_at), createdBy: p.created_by, claimedBy: p.claimed_by ?? undefined, hidden: p.hidden,
    updatedAt: p.updated_at,
  }))
}

const must = <T,>(r: { data: T; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data }

export async function myNetwork(): Promise<{ id: string; name: string; role: string } | null> {
  const rows = must(await getClient().from('network_members').select('role, networks(id, name)')) as unknown as { role: string; networks: { id: string; name: string } }[]
  return rows[0] ? { id: rows[0].networks.id, name: rows[0].networks.name, role: rows[0].role } : null
}
export async function createNetwork(name: string): Promise<string> { return must(await getClient().rpc('create_network', { p_name: name })) as string }

export async function fetchTree(networkId: string): Promise<{ members: FamilyMember[]; flags: Flag[] }> {
  const sb = getClient()
  const [p, m, f] = await Promise.all([
    sb.from('people').select('*').eq('network_id', networkId).order('created_at'),
    sb.from('marriages').select('person_a, person_b, created_at').eq('network_id', networkId),
    sb.from('flags').select('*').eq('network_id', networkId).eq('status', 'open'),
  ])
  return { members: rowsToMembers(must(p) as PersonRow[], must(m) as MarriageRow[]), flags: must(f) as Flag[] }
}

// Photos are shrunk once, here, so a multi-megabyte phone picture never reaches the database.
const photoValue = async (url?: string) => {
  if (!url) return null
  return url.startsWith('data:') ? await shrinkPhoto(url) : url
}

// One call = one transaction: the card and its marriages are written together,
// so a failure cannot leave half a person behind.
export async function addPerson(networkId: string, m: Omit<FamilyMember, 'id'>, claim: boolean): Promise<string> {
  const id = crypto.randomUUID()
  must(await getClient().rpc('add_person', {
    p_network: networkId,
    p_id: id,
    p_name: m.name,
    p_gender: m.gender,
    p_birth_year: m.birthYear ?? null,
    p_notes: m.notes ?? null,
    p_photo: await photoValue(m.photoUrl),
    p_parent: m.parentId ?? null,
    p_parent2: m.parent2Id ?? null,
    p_spouses: m.spouseIds ?? [],
    p_claim: claim,
  }))
  return id
}

// Optimistic concurrency: the database refuses the write when the card changed
// since `prev` was loaded, instead of silently replacing the other person's edit.
export async function updatePerson(prev: FamilyMember, m: FamilyMember) {
  const { error } = await getClient().rpc('update_person', {
    p_id: m.id,
    p_expected: prev.updatedAt ?? null,
    p_name: m.name,
    p_gender: m.gender,
    p_birth_year: m.birthYear ?? null,
    p_notes: m.notes ?? null,
    p_photo: await photoValue(m.photoUrl),
    p_parent: m.parentId ?? null,
    p_parent2: m.parent2Id ?? null,
    p_spouses: m.spouseIds ?? [],
  })
  if (error) throw new Error(error.message.replace(/^CONFLICT:\s*/, ''))
}

export const deletePerson = async (id: string) => { const { error } = await getClient().from('people').delete().eq('id', id); if (error) throw new Error(error.message) }
export const createInvite = async (personId: string) => must(await getClient().rpc('create_invite', { p_person: personId })) as string
export const flagPerson = async (networkId: string, personId: string, reason: string) => { must(await getClient().from('flags').insert({ network_id: networkId, person_id: personId, reason })) }
export const resolveFlag = async (flagId: string, action: 'hide' | 'dismiss') => { must(await getClient().rpc('resolve_flag', { p_flag: flagId, p_action: action })) }
export const setHidden = async (personId: string, hidden: boolean) => { must(await getClient().rpc('set_hidden', { p_person: personId, p_hidden: hidden })) }
export const claimPerson = async (personId: string) => { must(await getClient().rpc('claim_person', { p_person: personId })) }

export const otherMemberIds = async (networkId: string, uid: string): Promise<string[]> =>
  (must(await getClient().from('network_members').select('user_id').eq('network_id', networkId)) as { user_id: string }[]).map(r => r.user_id).filter(id => id !== uid)
export const transferFounder = async (networkId: string, userId: string) => { must(await getClient().rpc('transfer_founder', { p_network: networkId, p_user: userId })) }
export const deleteNetwork = async (networkId: string) => { must(await getClient().rpc('delete_network', { p_network: networkId })) }
export const deleteMyAccount = async () => { must(await getClient().rpc('delete_my_account')) }
