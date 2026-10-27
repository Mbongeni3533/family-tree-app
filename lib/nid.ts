// National ID accounts.
//
// Supabase Auth is email/password only, so the national ID is mapped to a
// derived, non-deliverable address and the PIN is used as the password. The
// person never sees that address; profiles holds the real identity.

export interface Country { code: string; name: string; example: string }

export const COUNTRIES: Country[] = [
  { code: 'SZ', name: 'Eswatini', example: '13 digits' },
  { code: 'ZA', name: 'South Africa', example: '13 digits' },
  { code: 'LS', name: 'Lesotho', example: 'e.g. 123456789' },
  { code: 'BW', name: 'Botswana', example: 'e.g. 123456789' },
  { code: 'ZW', name: 'Zimbabwe', example: 'e.g. 63-123456 A 00' },
  { code: 'MZ', name: 'Mozambique', example: 'e.g. 1234567890123' },
  { code: 'NA', name: 'Namibia', example: 'e.g. 12345678901' },
  { code: 'ZM', name: 'Zambia', example: 'e.g. 123456/78/9' },
  { code: 'OTHER', name: 'Other country', example: 'your national ID' },
]

export const normaliseNationalId = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

export const isKnownCountry = (code: string) => COUNTRIES.some(c => c.code === code)

export function nationalIdError(nationalId: string): string | null {
  const id = normaliseNationalId(nationalId)
  if (id.length < 5) return 'That national ID looks too short.'
  if (id.length > 24) return 'That national ID looks too long.'
  return null
}

export function pinError(pin: string): string | null {
  if (!/^\d{6,12}$/.test(pin)) return 'Use 6 to 12 digits for your PIN.'
  return null
}

/** Deterministic, non-deliverable address used as the Supabase Auth identity. */
export function nationalIdEmail(country: string, nationalId: string): string {
  return `${country.toLowerCase()}.${normaliseNationalId(nationalId).toLowerCase()}@nid.familytree.local`
}
