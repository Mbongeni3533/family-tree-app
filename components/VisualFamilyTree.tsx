'use client'

import { useState } from 'react'
import type { FamilyMember } from '@/types/family'

interface VisualTreeProps {
  members: FamilyMember[]
  onDeleteMember: (id: string) => void
  onEditMember: (member: FamilyMember) => void
}

export default function VisualFamilyTree({ members, onDeleteMember, onEditMember }: VisualTreeProps) {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null)

  const getChildren = (parentId: string | undefined) => {
    return members.filter(m => m.parentId === parentId)
  }

  const getSpouse = (spouseId: string | undefined) => {
    return spouseId ? members.find(m => m.id === spouseId) : null
  }

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <h3 className="text-2xl font-semibold text-gray-700 mb-2">No family members yet</h3>
        <p className="text-gray-500">Build your family tree starting with ancestors</p>
      </div>
    )
  }

  const rootMembers = members.filter(m => !m.parentId)

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 overflow-auto">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Family Tree ({members.length} members)</h2>
        <div className="text-sm text-gray-600">
          Showing {rootMembers.length} root ancestor(s)
        </div>
      </div>

      <div className="space-y-8">
        {rootMembers.map((rootMember) => {
          const spouse = rootMember.spouseId ? getSpouse(rootMember.spouseId) : null
          const children = getChildren(rootMember.id)

          return (
            <div key={rootMember.id} className="relative">
              <div className="flex justify-center items-end gap-8 mb-12">
                <div
                  className="relative w-48 p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow"
                  onMouseEnter={() => setHoveredMember(rootMember.id)}
                  onMouseLeave={() => setHoveredMember(null)}
                >
                  <div className="text-center">
                    {rootMember.photoUrl ? (
                      <img src={rootMember.photoUrl} alt={rootMember.name} className="w-20 h-20 rounded-full mx-auto mb-2 object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center mx-auto mb-2 text-white text-2xl font-bold">
                        {rootMember.name.charAt(0)}
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-900">{rootMember.name}</h3>
                    <p className="text-xs text-gray-500">
                      {rootMember.birthYear ? `Born ${rootMember.birthYear}` : ''}
                    </p>
                    <span className="text-xs px-2 py-1 rounded-full mt-1" style={{ backgroundColor: rootMember.gender === 'male' ? '#DBEAFE' : rootMember.gender === 'female' ? '#FCE7F3' : '#E5E7EB' }}>
                      {rootMember.gender === 'male' ? '♂' : rootMember.gender === 'female' ? '♀' : '⚪'}
                    </span>
                  </div>

                  {hoveredMember === rootMember.id && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => onEditMember(rootMember)}
                        className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteMember(rootMember.id)}
                        className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {spouse && (
                  <>
                    <div className="absolute top-48 left-1/2 -translate-x-1/2 w-48 p-4 bg-gradient-to-br from-pink-50 to-rose-100 rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow">
                      <div className="text-center">
                        {spouse.photoUrl ? (
                          <img src={spouse.photoUrl} alt={spouse.name} className="w-20 h-20 rounded-full mx-auto mb-2 object-cover" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center mx-auto mb-2 text-white text-2xl font-bold">
                            {spouse.name.charAt(0)}
                          </div>
                        )}
                        <h3 className="font-semibold text-gray-900">{spouse.name}</h3>
                        <p className="text-xs text-gray-500">
                          {spouse.birthYear ? `Born ${spouse.birthYear}` : ''}
                        </p>
                      </div>
                    </div>

                    <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-full pointer-events-none">
                      <line x1="0" y1="0" x2="0" y2="80" stroke="#9ca3af" strokeWidth="2" />
                    </svg>
                  </>
                )}
              </div>

              {children.length > 0 && (
                <div className="flex justify-center items-start gap-6">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 text-gray-400 text-sm">
                    ↓ {children.length} child{children.length > 1 ? 'ren' : 'en'}
                  </div>

                  {children.map((child) => {
                    return (
                      <div
                        key={child.id}
                        className="w-32 p-3 bg-gray-50 rounded-lg shadow border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="text-center">
                          {child.photoUrl ? (
                            <img src={child.photoUrl} alt={child.name} className="w-12 h-12 rounded-full mx-auto mb-1 object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center mx-auto mb-1 text-gray-600">
                              {child.name.charAt(0)}
                            </div>
                          )}
                          <h4 className="font-medium text-sm text-gray-900">{child.name}</h4>
                          <p className="text-xs text-gray-500">
                            {child.birthYear ? `Age ${new Date().getFullYear() - child.birthYear}` : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Family Tree Legend</h4>
        <div className="flex gap-6 text-sm text-gray-600">
          <div><strong>♂</strong> Male</div>
          <div><strong>♀</strong> Female</div>
          <div><strong>⚪</strong> Non-binary/Other</div>
        </div>
      </div>
    </div>
  )
}