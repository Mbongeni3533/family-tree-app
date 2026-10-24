'use client'

import { useState } from 'react'
import type { FamilyMember } from '@/types/family'

interface EditPersonFormProps {
  member: FamilyMember
  members: FamilyMember[]
  onUpdate: (member: FamilyMember) => void
  onCancel: () => void
}

export default function EditPersonForm({ member, members, onUpdate, onCancel }: EditPersonFormProps) {
  const [formData, setFormData] = useState({
    name: member.name,
    birthYear: member.birthYear || new Date().getFullYear(),
    gender: member.gender as any,
    notes: member.notes || '',
    parentId: member.parentId || '',
    spouseId: member.spouseId || '',
  })

  const [previewUrl, setPreviewUrl] = useState<string | null>(member.photoUrl || null)
  const parents = members.filter(m => m.id !== member.id)
  const spouses = members.filter(m => m.id !== member.id && m.id !== member.spouseId)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    const updatedMember: FamilyMember = {
      ...member,
      name: formData.name,
      birthYear: formData.birthYear,
      gender: formData.gender,
      notes: formData.notes,
      parentId: formData.parentId || undefined,
      spouseId: formData.spouseId || undefined,
      photoUrl: previewUrl && previewUrl.startsWith('blob:') ? undefined : previewUrl || member.photoUrl,
    }

    onUpdate(updatedMember)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          placeholder="Enter name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year</label>
          <input
            type="number"
            value={formData.birthYear}
            onChange={(e) => setFormData({ ...formData, birthYear: parseInt(e.target.value) || new Date().getFullYear() })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-gray-500">No\nPhoto</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
        <select
          value={formData.parentId}
          onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
        >
          <option value="">No parent</option>
          {parents.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Spouse</label>
        <select
          value={formData.spouseId}
          onChange={(e) => setFormData({ ...formData, spouseId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
        >
          <option value="">No spouse</option>
          {spouses.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          placeholder="Add notes"
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          Update Member
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}