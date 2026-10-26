'use client'

import type { FamilyMember } from '@/types/family'

export default function SpousePicker({ options, value, onChange }: { options: FamilyMember[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#e6dfc8] mb-1">Spouse(s) <span className="text-[#7a725f]">- tick all that apply</span></label>
      <div className="max-h-36 overflow-auto rounded-md border border-[#2a2418] p-2 space-y-1">
        {options.length === 0 && <p className="text-sm text-[#7a725f]">No one to link yet</p>}
        {options.map(o => (
          <label key={o.id} className="flex items-center gap-2 text-sm text-[#e6dfc8] cursor-pointer">
            <input type="checkbox" className="accent-[#d4af37]" checked={value.includes(o.id)}
              onChange={e => onChange(e.target.checked ? [...value, o.id] : value.filter(v => v !== o.id))} />
            {o.name}
          </label>
        ))}
      </div>
    </div>
  )
}
