'use client'

import { useRef, useState } from 'react'
import type { FamilyMember } from '@/types/family'
import { downloadBackup, parseBackup } from '@/services/backup'
import { downloadGedcom, parseGedcom } from '@/services/gedcom'

export default function BackupButtons({ members, onRestore }: { members: FamilyMember[]; onRestore: (m: FamilyMember[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const ged = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleFile = async (file?: File) => {
    if (!file) return
    try {
      const imported = parseBackup(await file.text())
      const warn = members.length > 0 ? `This will REPLACE your current ${members.length} member(s) with ${imported.length} from the backup. Continue?` : `Restore ${imported.length} member(s) from this backup?`
      if (!window.confirm(warn)) return
      onRestore(imported)
      setMsg({ ok: true, text: `Restored ${imported.length} member(s).` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Restore failed.' })
    }
    if (input.current) input.current.value = ''
  }

  const handleGedcom = async (file?: File) => {
    if (!file) return
    try {
      const { members: imported, warnings } = parseGedcom(await file.text())
      const warn = members.length > 0 ? `This will REPLACE your current ${members.length} member(s) with ${imported.length} from the GEDCOM file. Continue?` : `Import ${imported.length} person(s) from this GEDCOM file?`
      if (!window.confirm(warn)) return
      onRestore(imported)
      setMsg({ ok: true, text: `Imported ${imported.length} person(s). ${warnings.join(' ')}` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Import failed.' })
    }
    if (ged.current) ged.current.value = ''
  }

  const btn = 'px-4 py-2 rounded-lg border border-[#d4af37] text-[#d4af37] hover:bg-[#2a2310] text-sm font-medium transition disabled:opacity-40'
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#2a2418] pt-4">
      <button className={btn} disabled={members.length === 0} onClick={() => { downloadBackup(members); setMsg({ ok: true, text: 'Backup downloaded.' }) }}>Backup (JSON)</button>
      <button className={btn} onClick={() => input.current?.click()}>Restore from backup</button>
      <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      <button className={btn} disabled={members.length === 0} onClick={() => { downloadGedcom(members); setMsg({ ok: true, text: 'GEDCOM exported.' }) }}>Export GEDCOM</button>
      <button className={btn} onClick={() => ged.current?.click()}>Import GEDCOM</button>
      <input ref={ged} type="file" accept=".ged,.gedcom,text/plain" className="hidden" onChange={e => handleGedcom(e.target.files?.[0])} />
      {msg && <span className={`basis-full text-sm ${msg.ok ? 'text-[#d4af37]' : 'text-[#ff8a8a]'}`}>{msg.text}</span>}
    </div>
  )
}
