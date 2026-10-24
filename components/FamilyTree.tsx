'use client'

import type { FamilyMember } from '@/types/family'

interface FamilyTreeProps {
  members: FamilyMember[]
  onDeleteMember: (id: string) => void
  onEditMember: (member: FamilyMember) => void
}

export default function FamilyTree({ members, onDeleteMember, onEditMember }: FamilyTreeProps) {
  if (members.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6-10.207v6.207"
          />
        </svg>
        <h3 className="text-2xl font-semibold text-gray-700 mb-2">No family members yet</h3>
        <p className="text-gray-500">Add your first family member to get started</p>
      </div>
    )
  }

  const getParent = (parentId: string | undefined) => {
    return parentId ? members.find(m => m.id === parentId) : null
  }

  const getSpouse = (spouseId: string | undefined) => {
    return spouseId ? members.find(m => m.id === spouseId) : null
  }

  const getChildren = (parentId: string | undefined) => {
    return parentId ? members.filter(m => m.parentId === parentId) : []
  }

  return (
    <div id="family-tree-content" className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-indigo-600 text-white">
          <h2 className="text-2xl font-bold">Family Tree ({members.length} members)</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {members.map((member) => (
            <div
              key={member.id}
              className="p-6 hover:bg-gray-50 transition"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold text-gray-500">
                      {member.gender === 'male' ? '♂' : member.gender === 'female' ? '♀' : '⚪'}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                    <span className="text-sm text-gray-400">
                      {member.gender === 'male' ? '♂' : member.gender === 'female' ? '♀' : '⚪'}
                    </span>
                  </div>

                  {member.birthYear && (
                    <p className="text-sm text-gray-600 mb-1">
                      Born {member.birthYear} (Age: {new Date().getFullYear() - member.birthYear})
                    </p>
                  )}

                  <div className="text-sm text-gray-500 mb-2 space-y-1">
                    {getParent(member.parentId) && (
                      <p>Parent: {getParent(member.parentId)!.name}</p>
                    )}
                    {getSpouse(member.spouseId) && (
                      <p>Spouse: {getSpouse(member.spouseId)!.name}</p>
                    )}
                    {getChildren(member.id).length > 0 && (
                      <p>Children: {getChildren(member.id).map(c => c.name).join(', ')}</p>
                    )}
                  </div>

                  {member.notes && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Notes:</span> {member.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEditMember(member)}
                    className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteMember(member.id)}
                    className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
