export type NetworkUserRole = 'founder' | 'member'

export type PersonPermissionTarget = {
  created_by: string | null
  claimed_by: string | null
  hidden: boolean
  network_id: string
}

export function canUserEditPerson(userId: string | null, role: NetworkUserRole | null, person: PersonPermissionTarget | null | undefined): boolean {
  if (!userId || !person) return false
  if (role === 'founder') return false
  return person.created_by === userId || person.claimed_by === userId
}

export function canUserDeletePerson(userId: string | null, person: PersonPermissionTarget | null | undefined): boolean {
  if (!userId || !person) return false
  return person.created_by === userId
}

export function canFounderHideEntry(role: NetworkUserRole | null): boolean {
  return role === 'founder'
}

export function canDeleteAccount(role: NetworkUserRole | null, remainingMembers: number): boolean {
  if (role === 'founder' && remainingMembers > 0) return false
  return true
}
