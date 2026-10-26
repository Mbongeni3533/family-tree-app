'use client'

import { spouseMap } from '@/services/relations'
import { formatDate } from '@/services/dates'
import type { FamilyMember } from '@/types/family'

interface FamilyTreeProps {
  members: FamilyMember[]
  onDeleteMember: (id: string) => void
  onEditMember: (member: FamilyMember) => void
}

export default function FamilyTree({ members, onDeleteMember, onEditMember }: FamilyTreeProps) {
  if (members.length === 0) {
    return (
      <div className="bg-[#14110a] rounded-lg shadow-lg p-12 text-center">
        <svg
          className="w-16 h-16 mx-auto text-[#7a725f] mb-4"
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
        <h3 className="text-2xl font-semibold text-[#e6dfc8] mb-2">No family members yet</h3>
        <p className="text-[#9a917c]">Add your first family member to get started</p>
      </div>
    )
  }

  const spouses = spouseMap(members)

  const getParent = (parentId: string | undefined) => {
    return parentId ? members.find(m => m.id === parentId) : null
  }

  const getChildren = (parentId: string | undefined) => {
    return parentId ? members.filter(m => m.parentId === parentId || m.parent2Id === parentId) : []
  }

  return (
    <div id="family-tree-content" className="space-y-4">
      <div className="bg-[#14110a] rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-[#d4af37] !text-[#0b0b0c] text-white">
          <h2 className="text-2xl font-bold">Family Tree ({members.length} members)</h2>
        </div>

        <div className="divide-y divide-[#2a2418]">
          {members.map((member) => (
            <div
              key={member.id}
              className="p-6 hover:bg-[#1b1710] transition"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[#2a2418] flex items-center justify-center overflow-hidden">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold text-[#9a917c]">
                      {member.gender === 'male' ? '♂' : member.gender === 'female' ? '♀' : '⚪'}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-[#f5f0e1]">{member.name}{member.deceased ? ' †' : ''}</h3>
                    <span className="text-sm text-[#7a725f]">
                      {member.gender === 'male' ? '♂' : member.gender === 'female' ? '♀' : '⚪'}
                    </span>
                  </div>

                  <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#9a917c]">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${member.deceased ? 'bg-[#2a2418] text-[#9a917c]' : 'bg-[#1c2b1c] text-[#8fd18f]'}`}>
                      {member.deceased ? 'Deceased' : 'Living'}
                    </span>
                    {(member.birthDate || member.birthYear) && (
                      <span>
                        Born {member.birthDate ? formatDate(member.birthDate) : member.birthYear}
                        {member.birthPlace ? ` in ${member.birthPlace}` : ''}
                        {!member.deceased && member.birthYear ? ` (age ${new Date().getFullYear() - member.birthYear})` : ''}
                      </span>
                    )}
                    {member.deceased && member.deathDate && <span>· Died {formatDate(member.deathDate)}</span>}
                    {member.residence && <span>· {member.residence}</span>}
                  </div>

                  <div className="text-sm text-[#9a917c] mb-2 space-y-1">
                    {(getParent(member.parentId) || getParent(member.parent2Id)) && (
                      <p>Parents: {[getParent(member.parentId), getParent(member.parent2Id)].filter(Boolean).map(p => p!.name).join(' & ')}</p>
                    )}
                    {(spouses.get(member.id) ?? []).length > 0 && (
                      <p>{(spouses.get(member.id) ?? []).length > 1 ? 'Spouses' : 'Spouse'}: {(spouses.get(member.id) ?? []).map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(', ')}</p>
                    )}
                    {getChildren(member.id).length > 0 && (
                      <p>Children: {getChildren(member.id).map(c => c.name).join(', ')}</p>
                    )}
                  </div>

                  {member.notes && (
                    <p className="text-sm text-[#9a917c] mt-2">
                      <span className="font-medium">Notes:</span> {member.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEditMember(member)}
                    className="px-3 py-1 text-sm bg-[#1c2636] hover:bg-[#25344a] text-[#7fb2ff] rounded font-medium transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteMember(member.id)}
                    className="px-3 py-1 text-sm bg-[#3a1c1c] hover:bg-[#4d2424] text-[#ff8a8a] rounded font-medium transition"
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
