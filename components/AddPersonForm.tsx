'use client'

import SpousePicker from '@/components/SpousePicker'
import { fileToPhoto } from '@/services/photos'
import { DATE_HINT, parseDate, yearOf } from '@/services/dates'
import { useState } from 'react'
import type { FamilyMember } from '@/types/family'

interface AddPersonFormProps {
  members: FamilyMember[]
  onAdd: (member: Omit<FamilyMember, 'id'>, asParentOf?: string) => void
  onCancel: () => void
  /** Pre-wire the relationship when the form was opened from a card. */
  initialParentId?: string
  initialSpouseIds?: string[]
  /** The new card is the parent of this person. */
  asParentOf?: string
}

const field = 'w-full px-3 py-2 border border-[#2a2418] rounded-md text-[#f5f0e1]'
const label = 'block text-sm font-medium text-[#e6dfc8] mb-1'

export default function AddPersonForm({ members, onAdd, onCancel, initialParentId, initialSpouseIds, asParentOf }: AddPersonFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    deceased: false,
    deathDate: '',
    residence: '',
    gender: 'other' as FamilyMember['gender'],
    notes: '',
    parentId: initialParentId ?? '',
    parent2Id: '',
    spouseIds: initialSpouseIds ?? ([] as string[]),
  })

  const [photo, setPhoto] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

    const birth = parseDate(formData.birthDate)
    if (birth.error) { setError(`Birth date: ${birth.error}`); return }
    const death = parseDate(formData.deathDate)
    if (death.error) { setError(`Death date: ${death.error}`); return }
    if (formData.deceased && birth.value && death.value && death.value < birth.value) {
      setError('The death date is before the birth date.')
      return
    }
    setError(null)

    onAdd({
      name: formData.name.trim(),
      birthDate: birth.value,
      birthYear: yearOf(birth.value),
      deceased: formData.deceased,
      deathDate: formData.deceased ? death.value : undefined,
      residence: formData.residence.trim() || undefined,
      gender: formData.gender,
      notes: formData.notes.trim() || undefined,
      parentId: formData.parentId || undefined,
      parent2Id: formData.parentId ? formData.parent2Id || undefined : undefined,
      spouseIds: formData.spouseIds.length ? formData.spouseIds : undefined,
      spouseId: formData.spouseIds[0],
      photoUrl: photo ?? undefined,
    }, asParentOf)

    setFormData({
      name: '', birthDate: '', deceased: false, deathDate: '', residence: '',
      gender: 'other', notes: '', parentId: initialParentId ?? '', parent2Id: '', spouseIds: initialSpouseIds ?? [],
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

      <div>
        <label className={label}>Birth date</label>
        <input
          type="text"
          inputMode="numeric"
          value={formData.birthDate}
          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
          className={field}
          placeholder="1954 or 1954-06 or 1954-06-12"
        />
        <p className="mt-1 text-xs text-[#7a725f]">{DATE_HINT} — leave blank if unknown.</p>
      </div>

      <div className="rounded-lg border border-[#2a2418] p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm text-[#e6dfc8]">
          <input
            type="checkbox"
            className="accent-[#d4af37]"
            checked={formData.deceased}
            onChange={(e) => setFormData({ ...formData, deceased: e.target.checked, deathDate: e.target.checked ? formData.deathDate : '' })}
          />
          Deceased
        </label>
        {formData.deceased && (
          <div>
            <label className={label}>Date of death</label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.deathDate}
              onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
              className={field}
              placeholder="2019 or 2019-03 or 2019-03-04"
            />
          </div>
        )}
      </div>

      <div>
        <label className={label}>Residential area</label>
        <input
          type="text"
          value={formData.residence}
          onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
          className={field}
          placeholder="e.g. Mbabane, Eswatini"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div>
          <label className={label}>Photo</label>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#2a2418] flex items-center justify-center overflow-hidden">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-[#9a917c]">No Photo</span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              disabled={photoBusy}
              onChange={handlePhotoChange}
              className="text-xs text-[#9a917c] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#2a2310] file:text-[#d4af37] disabled:opacity-50"
            />
            {photo && !photoBusy && (
              <button type="button" onClick={() => setPhoto(null)} className="text-xs text-[#ff8a8a] hover:underline">Clear</button>
            )}
          </div>
          {photoBusy && <p className="mt-1 text-xs text-[#9a917c]">Resizing…</p>}
          {photoError && <p className="mt-1 text-xs text-[#ff8a8a]">{photoError}</p>}
        </div>
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

      {error && <p className="text-sm text-[#ff8a8a]">{error}</p>}

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
