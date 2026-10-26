'use client'

import type { DateParts } from '@/services/dates'
import { formatDate, composeDate } from '@/services/dates'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const field = 'w-full px-3 py-2 border border-[#2a2418] rounded-md text-[#f5f0e1]'

/**
 * Year / Month / Day as three separate inputs: year-only and year+month are
 * normal cases, not a special syntax to remember.
 */
export default function DatePartsInput({ value, onChange }: { value: DateParts; onChange: (next: DateParts) => void }) {
  const month = value.month ? Number(value.month) : 0
  const year = value.year.length === 4 ? Number(value.year) : 0
  const maxDay = month ? new Date(Date.UTC(year || 2000, month, 0)).getUTCDate() : 31
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0'))
  const preview = formatDate(composeDate(value))

  const setYear = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, 4)
    // a leap-year change can invalidate the chosen day
    const nextYear = next.length === 4 ? Number(next) : 0
    const limit = value.month ? new Date(Date.UTC(nextYear || 2000, Number(value.month), 0)).getUTCDate() : 31
    onChange({ ...value, year: next, day: value.day && Number(value.day) > limit ? '' : value.day })
  }

  const setMonth = (next: string) => {
    if (!next) { onChange({ ...value, month: '', day: '' }); return }
    const limit = new Date(Date.UTC(year || 2000, Number(next), 0)).getUTCDate()
    onChange({ ...value, month: next, day: value.day && Number(value.day) > limit ? '' : value.day })
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={value.year}
          onChange={e => setYear(e.target.value)}
          className={field}
          placeholder="Year"
          aria-label="Year"
        />
        <select value={value.month} onChange={e => setMonth(e.target.value)} className={field} aria-label="Month">
          <option value="">Month</option>
          {MONTH_LABELS.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>
        <select
          value={value.day}
          onChange={e => onChange({ ...value, day: e.target.value })}
          className={`${field} disabled:opacity-40`}
          disabled={!value.month}
          aria-label="Day"
        >
          <option value="">Day</option>
          {days.map(d => (
            <option key={d} value={d}>{Number(d)}</option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-[#7a725f]">
        {preview ? `Recorded as ${preview}` : 'Leave the year blank if unknown — month and day are optional.'}
      </p>
    </div>
  )
}
