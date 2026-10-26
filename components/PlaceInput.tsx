'use client'

import { useId } from 'react'

/**
 * Free-text place with suggestions from places already used in the tree, so
 * "Mbabane", "mbabane" and "Mbabane, Eswatini" do not all appear.
 */
export default function PlaceInput({ value, onChange, suggestions, placeholder, className }: {
  value: string
  onChange: (next: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
}) {
  const rawId = useId()
  const id = `places-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <>
      <input
        type="text"
        list={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={id}>
        {suggestions.map(place => <option key={place} value={place} />)}
      </datalist>
    </>
  )
}
