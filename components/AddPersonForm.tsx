'use client'

import SpousePicker from '@/components/SpousePicker'
import { fileToPhoto } from '@/services/photos'
import { useState } from 'react'
import type { FamilyMember } from '@/types/family'

interface AddPersonFormProps {
  members: FamilyMember[]
  onAdd: (member: Omit<FamilyMember, 'id'>) => void
  onCancel: () => void
}

const field = 'w-full px-3 py-2 border border-[#2a2418] rounded-md text-[#f5f0e1]'
const label = 'block text-sm font-medium text-[#e6dfc8] mb-1'

export default function AddPersonForm({ members, onAdd, onCancel }: AddPersonFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    birthYear: '',
    gender: 'other' as FamilyMember['gender'],
    notes: '',
    parentId: '',
    parent2Id: '',
    spouseIds: [] as string[],
  })

  const [photo, setPhoto] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      setPhoto(await fileToPhoto(file))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'That image could not be used.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    const year = Number.parseInt(formData.birthYear, 10)

    onAdd({
      name: formData.name.trim(),
      birthYear: Number.isFinite(year) ? year : undefined,
      gender: formData.gender,
      notes: formData.notes.trim() || undefined,
      parentId: formData.parentId || undefined,
      parent2Id: formData.parentId ? formData.parent2Id || undefined : undefined,
      spouseIds: formData.spouseIds.length ? formData.spouseIds : undefined,
      spouseId: formData.spouseIds[0],
      photoUrl: photo ?? undefined,
    })

    setFormData({
      name: '',
      birthYear: '',
      gender: 'other',
      notes: '',
      parentId: '',
      parent2Id: '',
      spouseIds: [],
    })
    setPhoto(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={label}>Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={field}
          placeholder="Enter name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={label}>Birth Year</label>
          <input
            type="number"
            inputMode="numeric"
            min={1000}
            max={2200}
            value={formData.birthYear}
            onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
            className={field}
            placeholder="e.g. 1954"
          />
        </div>

        <div>
          <label className={label}>Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as FamilyMember['gender'] })}
            className={field}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Photo</label>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#2a2418] flex items-center justify-center overflow-hidden">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-[#9a917c]">No Photo</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            disabled={photoBusy}
            onChange={handlePhotoChange}
            className="text-sm text-[#9a917c] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#2a2310] file:text-[#d4af37] disabled:opacity-50"
          />
          {photo && !photoBusy && (
            <button type="button" onClick={() => setPhoto(null)} className="text-xs text-[#ff8a8a] hover:underline">
              Remove
            </button>
          )}
        </div>
        {photoBusy && <p className="mt-1 text-xs text-[#9a917c]">Resizing photo…</p>}
        {photoError && <p className="mt-1 text-xs text-[#ff8a8a]">{photoError}</p>}
      </div>

      <div>
        <label className={label}>Parent 1</label>
        <select
          value={formData.parentId}
          onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
          className={field}
        >
          <option value="">No parent</option>
          {members.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>Parent 2 (optional)</label>
        <select
          value={formData.parent2Id}
          onChange={(e) => setFormData({ ...formData, parent2Id: e.target.value })}
          className={field}
        >
          <option value="">No second parent</option>
          {members.filter(p => p.id !== formData.parentId).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <SpousePicker options={members} value={formData.spouseIds} onChange={v => setFormData({ ...formData, spouseIds: v })} />

      <div>
        <label className={label}>Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className={field}
          placeholder="Add any notes"
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 bg-[#d4af37] !text-[#0b0b0c] hover:bg-[#f0cf65] font-semibold py-2 px-4 rounded-lg transition"
        >
          Add Person
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-[#2a2418] hover:bg-[#3a3220] text-[#f5f0e1] font-semibold py-2 px-4 rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
