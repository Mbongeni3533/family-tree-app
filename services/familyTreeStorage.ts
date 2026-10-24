import type { FamilyMember, FamilyTree } from '@/types/family'

const STORAGE_KEY = 'family-tree-data'

export interface FamilyTreeData {
  trees: FamilyTree[]
  members: FamilyMember[]
  activeTreeId: string | null
}

export const familyTreeStorage = {
  load(): FamilyTreeData {
    if (typeof window === 'undefined') return this.getDefault()
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : this.getDefault()
    } catch {
      return this.getDefault()
    }
  },

  save(data: FamilyTreeData) {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  },

  getDefault(): FamilyTreeData {
    return {
      trees: [{
        id: 'default',
        name: 'My Family Tree',
        createdAt: new Date()
      }],
      members: [],
      activeTreeId: 'default'
    }
  },

  getCurrentTree(data: FamilyTreeData): FamilyTree | undefined {
    if (!data.activeTreeId) return undefined
    return data.trees.find(t => t.id === data.activeTreeId)
  }
}