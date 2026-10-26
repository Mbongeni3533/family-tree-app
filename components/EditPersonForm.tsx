'use client'

import SpousePicker from '@/components/SpousePicker'
import DatePartsInput from '@/components/DatePartsInput'
import PlaceInput from '@/components/PlaceInput'
import { spouseMap, ownSpouses } from '@/services/relations'
import { knownPlaces } from '@/services/places'
import { fileToPhoto } from '@/services/photos'
import { composeDate, EMPTY_PARTS, parseDate, splitDate, yearOf } from '@/services/dates'
import type { DateParts } from '@/services/dates'
import { useState } from 'react'
import type { FamilyMember } from '@/types/family'

interface EditPersonFormProps {
  member: FamilyMember
  members: FamilyMember[]
  onUpdate: (member: FamilyMember) => void
  onCancel: () => void
}

const field = 'w-full px-3 py-2 border border-[#2a2418] rounded-md text-[#f5f0e1]'
const label = 'block text-sm font-medium text-[#e6dfc8] mb-1'

export default function EditPersonForm({ member, members, onUpdate, onCancel }: EditPersonFormProps) {
  const [formData, setFormData] = useState({
    name: member.name,
    gender: member.gender,
    notes: member.notes || '',
    parentId: member.parentId || '',
    parent2Id: member.parent2Id || '',
    spouseIds: (() => { const all = spouseMap(members).get(member.id) ?? []; return [...ownSpouses(member).filter(x => all.includes(x)), ...all.filter(x => !ownSpouses(member).includes(x))] })(),
  })
  const [birth, setBirth] = useState<DateParts>(() => splitDate(member.birthDate ?? (member.birthYear ? String(member.birthYear) : '')))
  const [death, setDeath] = useState<DateParts>(() => splitDate(member.deathDate))
  const [deceased, setDeceased] = useState(member.deceased ?? false)
  const [birthPlace, setBirthPlace] = useState(member.birthPlace ?? '')
  const [deathPlace, setDeathPlace] = useState(member.deathPlace ?? '')
  const [residence, setResidence] = useState(member.residence ?? '')
  const places = knownPlaces(members)

  const [photo, setPhoto] = useState<string | null>(member.photoUrl ?? null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const parents = members.filter(m => m.id !== member.id)

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

    const birthDate = composeDate(birth)
    const deathDate = deceased ? composeDate(death) : undefined

    const birthCheck = parseDate(birthDate ?? '')
    if (birthCheck.error) { setError(`Birth date: ${birthCheck.error}`); return }
    const deathCheck = parseDate(deathDate ?? '')
    if (deathCheck.error) { setError(`Death date: ${deathCheck.error}`); return }
    if (birthDate && deathDate && deathDate < birthDate) {
      setError('The death date is before the birth date.')
      return
    }
    setError(null)

    onUpdate({
      ...member,
      name: formData.name.trim(),
      birthDate,
      birthYear: yearOf(birthDate),
      deceased,
      deathDate,
      residence: residence.trim() || undefined,
      birthPlace: birthPlace.trim() || undefined,
      deathPlace: deceased ? deathPlace.trim() || undefined : undefined,
      gender: formData.gender,
      notes: formData.notes.trim() || undefined,
      parentId: formData.parentId || undefined,
      parent2Id: formData.parentId ? formData.parent2Id || undefined : undefined,
      spouseIds: formData.spouseIds.length ? formData.spouseIds : undefined,
      spouseId: formData.spouseIds[0],
      photoUrl: photo ?? undefined,
    })
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
        <DatePartsInput value={birth} onChange={setBirth} />
      </div>

      <div>
        <label className={label}>Birth area</label>
        <PlaceInput
          value={birthPlace}
          onChange={setBirthPlace}
          suggestions={places}
          className={field}
          placeholder="e.g. Manzini, Eswatini"
        />
      </div>

      <div className="rounded-lg border border-[#2a2418] p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm text-[#e6dfc8]">
          <input
            type="checkbox"
            className="accent-[#d4af37]"
            checked={deceased}
            onChange={(e) => { setDeceased(e.target.checked); if (!e.target.checked) setDeath({ ...EMPTY_PARTS }) }}
          />
          Deceased
        </label>
        {deceased && (
          <div className="space-y-3">
            <div>
              <label className={label}>Date of death</label>
              <DatePartsInput value={death} onChange={setDeath} />
            </div>
            <div>
              <label className={label}>Place of death</label>
              <PlaceInput
                value={deathPlace}
                onChange={setDeathPlace}
                suggestions={places}
                className={field}
                placeholder="e.g. Mbabane, Eswatini"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className={label}>Residential area</label>
        <PlaceInput
          value={residence}
          onChange={setResidence}
          suggestions={places}
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
            <div className="w-14 h-14 shrink-0 rounded-full bg-[#2a2418] flex items-center justify-center overflow-hidden">
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
              <button type="button" onClick={() => setPhoto(null)} className="text-xs text-[#ff8a8a] hover:underline">Remove</button>
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
          {parents.map(p => (
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
          {parents.filter(p => p.id !== formData.parentId).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <SpousePicker options={members.filter(m => m.id !== member.id)} value={formData.spouseIds} onChange={v => setFormData({ ...formData, spouseIds: v })} />

      <div>
        <label className={label}>Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className={field}
          placeholder="Add notes"
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-[#ff8a8a]">{error}</p>}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 bg-[#d4af37] !text-[#0b0b0c] hover:bg-[#f0cf65] font-semibold py-2 px-4 rounded-lg transition"
        >
          Update Member
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
