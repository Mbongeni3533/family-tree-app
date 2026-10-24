export interface FamilyMember {
  id: string
  name: string
  birthYear?: number
  gender: 'male' | 'female' | 'other'
  parentId?: string
  spouseId?: string
  notes?: string
  photoUrl?: string
}

export interface FamilyRelationship {
  memberId: string
  parentId?: string
  spouseId?: string
  childrenIds: string[]
}

export interface FamilyTree {
  id: string
  name: string
  rootId?: string
  createdAt: Date
}
