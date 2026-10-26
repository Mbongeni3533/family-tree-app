'use client'

import { useEffect, useState } from 'react'
import { getClient } from '@/lib/supabase'
import * as cloud from '@/services/cloud'
import type { FamilyMember } from '@/types/family'

const btn = 'rounded-lg border border-[#ff8a8a] px-3 py-1.5 text-sm text-[#ff8a8a] hover:bg-[#3a1c1c] disabled:opacity-40'

export default function DeleteAccount({ network, uid, members }: { network: { id: string; name: string; role: string }; uid: string; members: FamilyMember[] }) {
  const founder = network.role === 'founder'
  const [open, setOpen] = useState(false)
  const [others, setOthers] = useState<string[]>([])
  const [choice, setChoice] = useState<'transfer' | 'tree'>('transfer')
  const [target, setTarget] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { if (open && founder) cloud.otherMemberIds(network.id, uid).then(setOthers).catch(e => setErr(e.message)) }, [open, founder, network.id, uid])

  const candidates = members.filter(m => m.claimedBy && others.includes(m.claimedBy))
  const needsChoice = founder && others.length > 0
  const word = needsChoice && choice === 'tree' ? network.name : 'DELETE'
  const ready = typed === word && (!needsChoice || choice === 'tree' || !!target)

  const go = async () => {
    setBusy(true); setErr(null)
    try {
      if (needsChoice) { if (choice === 'transfer') await cloud.transferFounder(network.id, target); else await cloud.deleteNetwork(network.id) }
      await cloud.deleteMyAccount()
      await getClient().auth.signOut()
      window.location.href = '/'
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete the account'); setBusy(false) }
  }

  return (
    <div className="rounded-lg border border-[#4d2424] p-4">
      <h3 className="mb-2 font-semibold text-[#ff8a8a]">Delete my account</h3>
      {!open ? <button className={btn} onClick={() => setOpen(true)}>Delete my account…</button> : (
        <div className="space-y-3 text-sm text-[#e6dfc8]">
          <p>This permanently deletes your login. What happens to your entries:</p>
          <ul className="list-disc space-y-1 pl-5 text-[#9a917c]">
            <li>Cards you entered are <b>deleted</b>, except where another member’s card or marriage depends on them: those are kept as “Removed person” with all details wiped.</li>
            <li>Cards you entered that the person has since claimed are handed over to that person.</li>
            <li>Your own card, if someone else entered it, stays for them but your details are wiped.</li>
            <li>Your flags and invite links are deleted. This cannot be undone. Export anything you want to keep first.</li>
          </ul>
          {needsChoice && (
            <div className="space-y-2 rounded-lg border border-[#d4af37] p-3">
              <p className="font-semibold text-[#d4af37]">You are the founder and others are in this tree. Choose:</p>
              <label className="flex gap-2"><input type="radio" className="accent-[#d4af37]" checked={choice === 'transfer'} onChange={() => { setChoice('transfer'); setTyped('') }} /> Hand the tree to another member</label>
              {choice === 'transfer' && (
                <select value={target} onChange={e => setTarget(e.target.value)} className="w-full rounded-md border border-[#2a2418] px-3 py-2">
                  <option value="">Choose the new founder…</option>
                  {candidates.map(m => <option key={m.id} value={m.claimedBy}>{m.name}</option>)}
                </select>
              )}
              <label className="flex gap-2"><input type="radio" className="accent-[#d4af37]" checked={choice === 'tree'} onChange={() => { setChoice('tree'); setTyped('') }} /> Delete the whole tree for everyone ({members.length} cards)</label>
            </div>
          )}
          <p>Type <b className="text-[#ff8a8a]">{word}</b> to confirm:</p>
          <input value={typed} onChange={e => setTyped(e.target.value)} className="w-full rounded-md border border-[#2a2418] px-3 py-2" />
          {err && <p className="text-[#ff8a8a]">{err}</p>}
          <div className="flex gap-2">
            <button className={btn} disabled={!ready || busy} onClick={go}>{busy ? 'Deleting…' : 'Permanently delete my account'}</button>
            <button className="rounded-lg border border-[#2a2418] px-3 py-1.5 text-sm text-[#9a917c]" onClick={() => { setOpen(false); setTyped(''); setErr(null) }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
