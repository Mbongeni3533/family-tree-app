'use client'

import { useState, useEffect } from 'react'
import FamilyTree from '@/components/FamilyTree'
import AddPersonForm from '@/components/AddPersonForm'
import EditPersonForm from '@/components/EditPersonForm'
import VisualFamilyTree from '@/components/VisualFamilyTree'
import SearchFilter from '@/components/SearchFilter'
import { ExportButton } from '@/components/ExportButton'
import type { FamilyMember } from '@/types/family'
import { familyTreeStorage } from '@/services/familyTreeStorage'

export default function Home() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editMember, setEditMember] = useState<FamilyMember | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGender, setSelectedGender] = useState('all')
  const [showVisualTree, setShowVisualTree] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const data = familyTreeStorage.load()
    setMembers(data.members)
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (members.length > 0) {
      const data = familyTreeStorage.load()
      familyTreeStorage.save({
        ...data,
        members
      })
    }
  }, [members])

  const addMember = (member: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = {
      ...member,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    }
    setMembers([...members, newMember])
    setShowForm(false)
  }

  const updateMember = (updatedMember: FamilyMember) => {
    setMembers(members.map(m => m.id === updatedMember.id ? updatedMember : m))
    setShowEdit(false)
    setEditMember(null)
  }

  const deleteMember = (id: string) => {
    const updatedMembers = members.filter(m =>
      m.id !== id && m.parentId !== id && m.spouseId !== id
    )

    // Remove spouse references
    updatedMembers.forEach(m => {
      if (m.spouseId === id) {
        m.spouseId = undefined
      }
    })

    setMembers(updatedMembers)
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Family Tree</h1>
          <p className="text-xl text-gray-600">Build and visualize your family connections</p>
          <div className="mt-4 text-sm text-gray-500">
            Total members: {members.length} | {showVisualTree ? 'Visual View' : 'List View'}
          </div>
        </div>

        {/* Search & Action Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <SearchFilter
              searchQuery={searchQuery}
              selectedGender={selectedGender}
              onSearchChange={setSearchQuery}
              onGenderChange={setSelectedGender}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowVisualTree(!showVisualTree)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
              >
                {showVisualTree ? 'List View' : 'Visual Tree'}
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
              >
                + Add Person
              </button>
            </div>
          </div>

          <ExportButton members={filteredMembers} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Family Members</h2>

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

              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Total Members:</strong> {members.length}</p>
                  <p><strong>Showing:</strong> {filteredMembers.length} of {members.length}</p>
                  {members.some(m => m.photoUrl) && (
                    <p className="text-green-600">Photos enabled</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Display */}
          <div className="lg:col-span-3">
            {showVisualTree ? (
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
