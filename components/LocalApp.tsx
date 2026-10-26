'use client'

import { useState, useEffect } from 'react'
import FamilyTree from '@/components/FamilyTree'
import AddPersonForm from '@/components/AddPersonForm'
import EditPersonForm from '@/components/EditPersonForm'
import VisualFamilyTree from '@/components/VisualFamilyTree'
import SearchFilter from '@/components/SearchFilter'
import BackupButtons from '@/components/BackupButtons'
import { setSpouses } from '@/services/relations'
import Dashboard from '@/components/Dashboard'
import { ExportButton } from '@/components/ExportButton'
import type { FamilyMember } from '@/types/family'
import { familyTreeStorage } from '@/services/familyTreeStorage'

export default function LocalApp() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editMember, setEditMember] = useState<FamilyMember | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGender, setSelectedGender] = useState('all')
  const [view, setView] = useState<'dashboard' | 'list' | 'tree'>('dashboard')
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount. localStorage is a browser-only external
  // store, so this one-off update after mount is intentional.
  /* eslint-disable react-hooks/set-state-in-effect -- reading a browser-only store after mount */
  useEffect(() => {
    const data = familyTreeStorage.load()
    setMembers(data.members)
    setHydrated(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Save to localStorage on change
  useEffect(() => {
    if (!hydrated) return
    const data = familyTreeStorage.load()
    familyTreeStorage.save({ ...data, members })
  }, [members, hydrated])

  const addMember = (member: Omit<FamilyMember, 'id'>, asParentOf?: string) => {
    const newMember: FamilyMember = {
      ...member,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      addedAt: Date.now(),
    }
    let next = setSpouses([...members, newMember], newMember.id, newMember.spouseIds ?? [])
    if (asParentOf) {
      // The new card is the parent of the selected person.
      next = next.map(m => m.id !== asParentOf ? m : {
        ...m,
        parentId: m.parentId ?? newMember.id,
        parent2Id: m.parentId ? (m.parent2Id ?? newMember.id) : m.parent2Id,
      })
    }
    setMembers(next)
    setShowForm(false)
  }

  const updateMember = (updatedMember: FamilyMember) => {
    setMembers(setSpouses(members.map(m => m.id === updatedMember.id ? updatedMember : m), updatedMember.id, updatedMember.spouseIds ?? []))
    setShowEdit(false)
    setEditMember(null)
  }

  // Deletes only the selected person; children become roots, spouse link is cleared
  const deleteMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id).map(m => ({
      ...m,
      parentId: m.parentId === id ? m.parent2Id : m.parentId,
      parent2Id: m.parentId === id || m.parent2Id === id ? undefined : m.parent2Id,
      spouseIds: m.spouseIds?.filter(s => s !== id),
      spouseId: m.spouseId === id ? m.spouseIds?.find(s => s !== id) : m.spouseId,
    })))
  }

  const openEdit = (member: FamilyMember) => {
    setEditMember(member)
    setShowEdit(true)
  }

  const closeEdit = () => {
    setShowEdit(false)
    setEditMember(null)
  }

  // Filter members based on search and gender
  const filteredMembers = members.filter(m => {
    const matchesSearch = searchQuery === '' || m.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGender = selectedGender === 'all' || m.gender === selectedGender
    return matchesSearch && matchesGender
  })

  return (
    <main className="min-h-screen bg-[#0b0b0c] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[#2a2418] pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a917c]">Link-Leverage</p>
            <h1 className="gold-text text-4xl font-bold sm:text-5xl">Family Tree</h1>
            <p className="mt-1 text-[#9a917c]">Build and visualize your family connections</p>
          </div>
          <div className="flex gap-1 rounded-xl border border-[#2a2418] bg-[#14110a] p-1">
            {([['dashboard', 'Dashboard'], ['list', 'List'], ['tree', 'Visual Tree']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setView(k)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${view === k ? 'bg-[#d4af37] text-[#0b0b0c]' : 'text-[#9a917c] hover:text-[#f5f0e1]'}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Search & Action Bar */}
        <div className="bg-[#14110a] border border-[#2a2418] rounded-xl p-6 mb-8">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <SearchFilter searchQuery={searchQuery} selectedGender={selectedGender} onSearchChange={setSearchQuery} onGenderChange={setSelectedGender} />
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-[#d4af37] hover:bg-[#f0cf65] text-[#0b0b0c] font-semibold rounded-lg transition">+ Add Person</button>
          </div>
          <ExportButton members={filteredMembers} />
          <BackupButtons members={members} onRestore={setMembers} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#14110a] border border-[#2a2418] rounded-xl p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-[#f5f0e1] mb-6">Family Members</h2>

              {showForm && (
                <AddPersonForm
                  members={members}
                  onAdd={addMember}
                  onCancel={() => setShowForm(false)}
                />
              )}

              {showEdit && editMember && (
                <EditPersonForm
                  member={editMember}
                  members={members}
                  onUpdate={updateMember}
                  onCancel={closeEdit}
                />
              )}

              <div className="mt-8 pt-8 border-t border-[#2a2418]">
                <div className="text-sm text-[#9a917c] space-y-2">
                  <p><strong>Total Members:</strong> {members.length}</p>
                  <p><strong>Showing:</strong> {filteredMembers.length} of {members.length}</p>
                  {members.some(m => m.photoUrl) && (
                    <p className="text-[#d4af37]">Photos enabled</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Display */}
          <div className="lg:col-span-3">
            {view === 'dashboard' ? (
              <Dashboard members={filteredMembers} onOpen={openEdit} />
            ) : view === 'tree' ? (
              <VisualFamilyTree
                members={filteredMembers}
                onDeleteMember={deleteMember}
                onEditMember={openEdit}
              />
            ) : (
              <FamilyTree
                members={filteredMembers}
                onDeleteMember={deleteMember}
                onEditMember={openEdit}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
