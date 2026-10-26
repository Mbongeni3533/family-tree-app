'use client'

import { useMemo, useRef, useState } from 'react'
import type { FamilyMember } from '@/types/family'
import { computeLayout, CARD_W, CARD_H } from '@/services/treeLayout'
import { viewMembers } from '@/services/treeView'

interface VisualTreeProps {
  members: FamilyMember[]
  onDeleteMember: (id: string) => void
  onEditMember: (member: FamilyMember) => void
}

const ACCENT: Record<FamilyMember['gender'], string> = { male: '#7fb2ff', female: '#f0a0c8', other: '#d4af37' }

export default function VisualFamilyTree({ members, onDeleteMember, onEditMember }: VisualTreeProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const box = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const view = useMemo(() => viewMembers(members, collapsed, focusId), [members, collapsed, focusId])
  const layout = useMemo(() => computeLayout(view.visible), [view])
  const toggle = (id: string) => setCollapsed(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const focusName = focusId ? members.find(m => m.id === focusId)?.name : null

  if (members.length === 0) {
    return (
      <div className="bg-[#14110a] border border-[#2a2418] rounded-xl p-12 text-center">
        <h3 className="text-2xl font-semibold text-[#e6dfc8] mb-2">No family members yet</h3>
        <p className="text-[#9a917c]">Build your family tree starting with ancestors</p>
      </div>
    )
  }

  const clamp = (z: number) => Math.min(1.5, Math.max(0.25, Math.round(z * 100) / 100))
  const zoomBtn = 'min-w-9 rounded-lg border border-[#2a2418] px-3 py-1.5 text-[#d4af37] hover:bg-[#2a2310]'

  return (
    <div className="bg-[#14110a] border border-[#2a2418] rounded-xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#f5f0e1]">Family Tree</h2>
          <p className="text-sm text-[#9a917c]">{view.visible.length === members.length ? `${members.length} members` : `Showing ${view.visible.length} of ${members.length} members`} · {layout.generations} generation{layout.generations > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setZoom(clamp(zoom - 0.15))} className={zoomBtn} aria-label="Zoom out">−</button>
          <button onClick={() => setZoom(clamp(zoom + 0.15))} className={zoomBtn} aria-label="Zoom in">+</button>
          <button
            onClick={() => {
              const el = box.current
              if (el) setZoom(clamp((el.clientWidth - 8) / layout.width))
            }}
            className={zoomBtn}
          >
            Fit
          </button>
          <button onClick={() => setZoom(1)} className={zoomBtn}>100%</button>
          <button onClick={() => setCollapsed(new Set(members.filter(m => view.hasKids.has(m.id) || members.some(k => k.parentId === m.id || k.parent2Id === m.id)).filter(m => m.parentId || m.parent2Id).map(m => m.id)))} className="rounded-lg border border-[#2a2418] px-3 py-1.5 text-[#d4af37] hover:bg-[#2a2310]">Collapse all</button>
          <button onClick={() => setCollapsed(new Set())} className="rounded-lg border border-[#2a2418] px-3 py-1.5 text-[#d4af37] hover:bg-[#2a2310]">Expand all</button>
          <span className="w-12 text-right text-[#9a917c]">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {focusName && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[#d4af37] bg-[#2a2310] px-4 py-2 text-sm text-[#f5f0e1]">
          <span>Focus: direct ancestors and descendants of <b className="text-[#d4af37]">{focusName}</b></span>
          <button onClick={() => setFocusId(null)} className="text-[#d4af37] hover:underline">Show everyone ✕</button>
        </div>
      )}
      <div ref={box} className="max-h-[70vh] overflow-auto rounded-lg border border-[#2a2418] bg-[#0b0b0c]">
        <div style={{ width: layout.width * zoom, height: layout.height * zoom }}>
          <div id="family-tree-content" className="relative bg-[#0b0b0c]" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <svg className="pointer-events-none absolute inset-0" width={layout.width} height={layout.height}>
              {layout.edges.map((e, i) => e.kind === 'spouse' ? (
                <g key={i}>
                  <path d={e.d} stroke="#d4af37" strokeWidth={2} fill="none" />
                  <circle cx={e.mx} cy={e.my} r={4} fill="#d4af37" />
                </g>
              ) : (
                <path key={i} d={e.d} stroke="#6b5a2a" strokeWidth={2} fill="none" strokeLinejoin="round" />
              ))}
            </svg>

            {layout.nodes.map(({ member: m, x, y, badge }) => (
              <div
                key={m.id}
                onMouseEnter={() => setHovered(m.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onEditMember(m)}
                className={`absolute flex cursor-pointer items-center gap-3 rounded-xl border bg-[#14110a] px-3 transition-colors ${m.deceased ? 'opacity-75' : ''} ${hovered === m.id ? 'border-[#d4af37]' : 'border-[#2a2418]'}`}
                style={{ left: x, top: y, width: CARD_W, height: CARD_H, borderTop: `3px solid ${ACCENT[m.gender]}` }}
              >
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} className="h-12 w-12 shrink-0 rounded-full border border-[#d4af37] object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2a2310] text-lg font-bold text-[#d4af37]">{m.name.charAt(0).toUpperCase()}</span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#f5f0e1]" title={m.name}>{m.name}{m.deceased ? ' †' : ''}</span>
                  <span className="block text-xs text-[#9a917c]">
                    {m.birthYear ? `${m.birthYear}${m.deceased && m.deathDate ? `–${m.deathDate.slice(0, 4)}` : ''}` : (m.deceased ? '†' : '\u00a0')}
                  </span>
                  {badge && <span className="mt-0.5 inline-block rounded-full bg-[#2a2310] px-2 text-[10px] font-semibold text-[#d4af37]">{badge}</span>}
                </span>
                {hovered === m.id && (
                  <span className="absolute right-1 top-1 flex gap-1">
                    <button onClick={e => { e.stopPropagation(); setFocusId(focusId === m.id ? null : m.id) }} className="rounded bg-[#2a2310] px-1.5 text-xs text-[#d4af37] hover:bg-[#3a3220]" title="Focus on this person's line" aria-label={`Focus on ${m.name}`}>◎</button>
                    <button
                      onClick={e => { e.stopPropagation(); if (window.confirm(`Delete ${m.name}?`)) onDeleteMember(m.id) }}
                      className="rounded bg-[#3a1c1c] px-1.5 text-xs text-[#ff8a8a] hover:bg-[#4d2424]"
                      aria-label={`Delete ${m.name}`}
                    >✕</button>
                  </span>
                )}
                {view.hasKids.has(m.id) && (
                  <button
                    onClick={e => { e.stopPropagation(); toggle(m.id) }}
                    className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[#d4af37] bg-[#0b0b0c] px-2 text-xs font-semibold text-[#d4af37] hover:bg-[#2a2310]"
                    title={collapsed.has(m.id) ? 'Show descendants' : 'Hide descendants'}
                  >{collapsed.has(m.id) ? `+${view.hiddenCount.get(m.id) ?? 0}` : '−'}</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-5 text-xs text-[#9a917c]">
        <span><i className="mr-1 inline-block h-2 w-4 rounded-sm" style={{ background: ACCENT.male }} />Male</span>
        <span><i className="mr-1 inline-block h-2 w-4 rounded-sm" style={{ background: ACCENT.female }} />Female</span>
        <span><i className="mr-1 inline-block h-2 w-4 rounded-sm" style={{ background: ACCENT.other }} />Other</span>
        <span>● Gold = marriage · children hang from their parents&apos; marriage · ◎ focus · −/+ collapse a branch · click a card to edit</span>
      </div>
    </div>
  )
}
