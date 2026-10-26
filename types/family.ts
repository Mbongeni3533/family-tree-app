export interface FamilyMember {
  id: string
  name: string
  birthYear?: number
  gender: 'male' | 'female' | 'other'
  parentId?: string
  parent2Id?: string
  spouseId?: string // legacy / first spouse; kept for old saved data
  spouseIds?: string[] // all spouses (supports polygamous marriages)
  notes?: string
  photoUrl?: string
  addedAt?: number
  createdBy?: string // cloud: account that entered this card
  claimedBy?: string // cloud: account of the person this card is about
  hidden?: boolean // cloud: hidden by the founder after a flag
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
