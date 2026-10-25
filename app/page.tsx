import { supabase } from '@/lib/supabase'

export async function createNetwork(name: string) {
  const { data, error } = await supabase.rpc('create_network', { p_name: name })
  if (error) throw error
  return data as string
}

export async function createInviteForPerson(personId: string) {
  const { data, error } = await supabase.rpc('create_invite', { p_person: personId })
  if (error) throw error
  return data as string
}

export async function joinInvite(token: string) {
  const { data, error } = await supabase.rpc('accept_invite', { p_token: token })
  if (error) throw error
  return data as string
}

export async function previewInvite(token: string) {
  const { data, error } = await supabase.rpc('invite_preview', { p_token: token })
  if (error) throw error
  return Array.isArray(data) ? data[0] : null
}

export async function addPersonToTree(treeId: string, userId: string, name: string) {
  const { data, error } = await supabase
    .from('people')
    .insert([
      {
        network_id: treeId,
        created_by: userId,
        claimed_by: userId,
        name,
        gender: 'other',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTreePeople(treeId: string) {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('network_id', treeId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}
