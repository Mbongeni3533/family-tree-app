// Dates are stored as text so a partial date is still a date:
//   "1954"          year only (all we know for many ancestors)
//   "1954-06"       month + year
//   "1954-06-12"    exact day
// ISO ordering means string comparison and sorting still work.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const DATE_HINT = 'YYYY, YYYY-MM or YYYY-MM-DD'

export interface DateParts {
  year: string // '' or four digits
  month: string // '' or 01–12
  day: string // '' or 01–31
}

export const EMPTY_PARTS: DateParts = { year: '', month: '', day: '' }

/** Splits "1954-06-12" into the three fields the inputs use. */
export function splitDate(value?: string): DateParts {
  if (!value) return { ...EMPTY_PARTS }
  return {
    year: value.slice(0, 4),
    month: value.length >= 7 ? value.slice(5, 7) : '',
    day: value.length >= 10 ? value.slice(8, 10) : '',
  }
}

/** Takes whatever the three fields hold and builds the stored form. */
export function composeDate({ year, month, day }: DateParts): string | undefined {
  if (!year || year.length !== 4) return undefined
  if (!month) return year
  if (!day) return `${year}-${month}`
  return `${year}-${month}-${day}`
}

export function parseDate(input: string): { value?: string; error?: string } {
  const raw = input.trim()
  if (!raw) return {}

  const m = raw.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/)
  if (!m) return { error: `Use ${DATE_HINT}.` }

  const year = Number(m[1])
  const month = m[2] === undefined ? undefined : Number(m[2])
  const day = m[3] === undefined ? undefined : Number(m[3])

  if (year < 1000 || year > 2200) return { error: 'Year must be between 1000 and 2200.' }
  if (month !== undefined && (month < 1 || month > 12)) return { error: 'Month must be 01–12.' }
  if (day !== undefined) {
    if (month === undefined) return { error: 'Add a month before the day.' }
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    if (day < 1 || day > daysInMonth) return { error: 'That day does not exist in that month.' }
  }

  const value = [
    m[1],
    month === undefined ? null : String(month).padStart(2, '0'),
    day === undefined ? null : String(day).padStart(2, '0'),
  ].filter(Boolean).join('-')

  return { value }
}

export function yearOf(value?: string): number | undefined {
  if (!value) return undefined
  const year = Number(value.slice(0, 4))
  return Number.isFinite(year) ? year : undefined
}

/** "12 Jun 1954", "Jun 1954" or "1954" — whatever precision was recorded. */
export function formatDate(value?: string): string {
  if (!value) return ''
  const year = value.slice(0, 4)
  const month = value.length >= 7 ? Number(value.slice(5, 7)) : undefined
  const day = value.length >= 10 ? Number(value.slice(8, 10)) : undefined
  if (month === undefined || !MONTH_NAMES[month - 1]) return year
  if (day === undefined) return `${MONTH_NAMES[month - 1]} ${year}`
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`
}

/** "1954–2019", "1954–", "–2019" or "" when nothing is known. */
export function lifeSpan(birthDate?: string, deathDate?: string): string {
  const birth = yearOf(birthDate)
  const death = yearOf(deathDate)
  if (birth === undefined && death === undefined) return ''
  return `${birth ?? ''}–${death ?? ''}`
}

/** GEDCOM wants "12 JUN 1954", "JUN 1954" or "1954" — all of which are valid. */
export function toGedcomDate(value?: string): string | undefined {
  if (!value) return undefined
  const year = value.slice(0, 4)
  const month = value.length >= 7 ? MONTHS[Number(value.slice(5, 7)) - 1] : undefined
  const day = value.length >= 10 ? Number(value.slice(8, 10)) : undefined
  if (!month) return year
  return day === undefined ? `${month} ${year}` : `${day} ${month} ${year}`
}

export function fromGedcomDate(text: string): string | undefined {
  const clean = text.replace(/\s+/g, ' ').trim().toUpperCase()
  const parts = clean.split(' ')
  const yearIndex = parts.findIndex(p => /^\d{4}$/.test(p))
  if (yearIndex === -1) return undefined
  const year = parts[yearIndex]

  const monthIndex = parts.findIndex(p => MONTHS.includes(p))
  if (monthIndex === -1) return year
  const month = String(MONTHS.indexOf(parts[monthIndex]) + 1).padStart(2, '0')

  const dayToken = parts.slice(0, yearIndex).find(p => /^\d{1,2}$/.test(p))
  if (!dayToken) return `${year}-${month}`
  const day = Number(dayToken)
  const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()
  if (day < 1 || day > daysInMonth) return `${year}-${month}`
  return `${year}-${month}-${String(day).padStart(2, '0')}`
}
