import { getClient } from '@/lib/supabase'
import { shrinkPhoto } from '@/services/photos'
import type { FamilyMember } from '@/types/family'

export interface Flag { id: string; person_id: string; reason: string; status: string; flagged_by: string; created_at: string }
interface PersonRow { id: string; created_by: string; claimed_by: string | null; name: string; gender: FamilyMember['gender']; birth_year: number | null; notes: string | null; photo_url: string | null; parent_id: string | null; parent2_id: string | null; hidden: boolean; created_at: string }
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

const cols = async (m: Omit<FamilyMember, 'id'>) => ({
  name: m.name, gender: m.gender, birth_year: m.birthYear ?? null, notes: m.notes ?? null,
  photo_url: m.photoUrl ? (m.photoUrl.startsWith('data:') ? await shrinkPhoto(m.photoUrl) : m.photoUrl) : null,
  parent_id: m.parentId ?? null, parent2_id: m.parent2Id ?? null,
})

export async function addPerson(networkId: string, m: Omit<FamilyMember, 'id'>, claim: boolean): Promise<string> {
  const sb = getClient()
  const id = crypto.randomUUID()
  must(await sb.from('people').insert({ id, network_id: networkId, ...(await cols(m)) }))
  for (const s of m.spouseIds ?? []) must(await sb.from('marriages').insert({ network_id: networkId, person_a: id, person_b: s }))
  if (claim) must(await sb.rpc('claim_person', { p_person: id }))
  return id
}

export async function updatePerson(networkId: string, prev: FamilyMember, m: FamilyMember) {
  const sb = getClient()
  const { error } = await sb.from('people').update(await cols(m)).eq('id', m.id)
  if (error) throw new Error(error.message)
  const before = new Set(prev.spouseIds ?? []), after = new Set(m.spouseIds ?? [])
  for (const s of after) if (!before.has(s)) must(await sb.from('marriages').insert({ network_id: networkId, person_a: m.id, person_b: s }))
  for (const s of before) if (!after.has(s)) await sb.from('marriages').delete().or(`and(person_a.eq.${m.id},person_b.eq.${s}),and(person_a.eq.${s},person_b.eq.${m.id})`)
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
