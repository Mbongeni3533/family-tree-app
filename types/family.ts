export interface FamilyMember {
  id: string
  name: string
  birthYear?: number // derived from birthDate; kept for old saved data and GEDCOM
  birthDate?: string // "1954", "1954-06" or "1954-06-12"
  deathDate?: string // same format; only meaningful when deceased is true
  deceased?: boolean
  residence?: string // residential area / village / town
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
  updatedAt?: string // cloud: server timestamp, sent back so concurrent edits are detected
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
