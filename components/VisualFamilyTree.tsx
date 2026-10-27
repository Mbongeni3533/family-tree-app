'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FamilyMember } from '@/types/family'
import { computeLayout, edgesFromPositions, CARD_W, CARD_H } from '@/services/treeLayout'
import type { PlacedNode } from '@/services/treeLayout'
import { viewMembers } from '@/services/treeView'

interface VisualTreeProps {
  members: FamilyMember[]
  onDeleteMember: (id: string) => void
  onEditMember: (member: FamilyMember) => void
}

const ACCENT: Record<FamilyMember['gender'], string> = { male: '#7fb2ff', female: '#f0a0c8', other: '#d4af37' }
const POSITIONS_KEY = 'family-tree-manual-positions'
const LOCKS_KEY = 'family-tree-locked-cards'

type Offsets = Record<string, { dx: number; dy: number }>

function loadOffsets(): Offsets {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(POSITIONS_KEY) ?? '{}') as Offsets
  } catch {
    return {}
  }
}

function loadLocks(): Record<string, { x: number; y: number }> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(LOCKS_KEY) ?? '{}') as Record<string, { x: number; y: number }>
  } catch {
    return {}
  }
}

export default function VisualFamilyTree({ members, onDeleteMember, onEditMember }: VisualTreeProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const box = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const [offsets, setOffsets] = useState<Offsets>(() => loadOffsets())
  const [locked, setLocked] = useState<Record<string, { x: number; y: number }>>(() => loadLocks())
  const dragRef = useRef<{ id: string; startX: number; startY: number; dx: number; dy: number } | null>(null)
  const movedRef = useRef(false)

  const view = useMemo(() => viewMembers(members, collapsed, focusId), [members, collapsed, focusId])
  const layout = useMemo(() => computeLayout(view.visible), [view])
  const toggle = (id: string) => setCollapsed(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const focusName = focusId ? members.find(m => m.id === focusId)?.name : null

  // hand-placed cards keep an offset from their computed position; locked
  // cards keep an absolute position, so later layout changes cannot move them
  const placed: PlacedNode[] = useMemo(
    () => layout.nodes.map(n => {
      const pin = locked[n.member.id]
      if (pin) return { ...n, x: pin.x, y: pin.y }
      const o = offsets[n.member.id]
      return o ? { ...n, x: n.x + o.dx, y: n.y + o.dy } : n
    }),
    [layout, offsets, locked]
  )
  const hasManual = placed.some(n => offsets[n.member.id] || locked[n.member.id])
  const edges = useMemo(
    () => (hasManual ? edgesFromPositions(placed, view.visible) : layout.edges),
    [hasManual, placed, layout.edges, view.visible]
  )

  const width = Math.max(layout.width, ...placed.map(n => n.x + CARD_W), 0) + 32
  const height = Math.max(layout.height, ...placed.map(n => n.y + CARD_H), 0) + 32

  useEffect(() => {
    try { window.localStorage.setItem(POSITIONS_KEY, JSON.stringify(offsets)) } catch { /* storage may be full */ }
  }, [offsets])

  useEffect(() => {
    try { window.localStorage.setItem(LOCKS_KEY, JSON.stringify(locked)) } catch { /* storage may be full */ }
  }, [locked])

  const toggleLock = (id: string, x: number, y: number) => setLocked(prev => {
    const next = { ...prev }
    if (next[id]) delete next[id]
    else next[id] = { x, y }
    return next
  })

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

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    const o = offsets[id] ?? { dx: 0, dy: 0 }
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, dx: o.dx, dy: o.dy }
    movedRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = d.dx + (e.clientX - d.startX) / zoom
    const dy = d.dy + (e.clientY - d.startY) / zoom
    if (Math.abs(dx - d.dx) > 3 || Math.abs(dy - d.dy) > 3) movedRef.current = true
    setOffsets(prev => ({ ...prev, [d.id]: { dx, dy } }))
  }

  const endDrag = () => { dragRef.current = null }

  return (
    <div className="bg-[#14110a] border border-[#2a2418] rounded-xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#f5f0e1]">Family Tree</h2>
          <p className="text-sm text-[#9a917c]">{view.visible.length === members.length ? `${members.length} members` : `Showing ${view.visible.length} of ${members.length} members`} · {layout.generations} generation{layout.generations > 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button onClick={() => setZoom(clamp(zoom - 0.15))} className={zoomBtn} aria-label="Zoom out">−</button>
          <button onClick={() => setZoom(clamp(zoom + 0.15))} className={zoomBtn} aria-label="Zoom in">+</button>
          <button
            onClick={() => {
              const el = box.current
              if (el) setZoom(clamp((el.clientWidth - 8) / width))
            }}
            className={zoomBtn}
          >
            Fit
          </button>
          <button onClick={() => setZoom(1)} className={zoomBtn}>100%</button>
          {hasManual && (
            <button onClick={() => { setOffsets({}); setLocked({}) }} className={zoomBtn} title="Put every card back where the layout puts it, and unlock them">
              Reset positions
            </button>
          )}
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
        <div style={{ width: width * zoom, height: height * zoom }}>
          <div id="family-tree-content" className="relative select-none bg-[#0b0b0c]" style={{ width, height, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
              {edges.map((e, i) => e.kind === 'spouse' ? (
                <g key={i}>
                  <path d={e.d} stroke="#d4af37" strokeWidth={2} fill="none" />
                  <circle cx={e.mx} cy={e.my} r={4} fill="#d4af37" />
                </g>
              ) : (
                <path key={i} d={e.d} stroke="#6b5a2a" strokeWidth={2} fill="none" strokeLinejoin="round" />
              ))}
            </svg>

            {placed.map(({ member: m, x, y, badge }) => (
              <div
                key={m.id}
                onMouseEnter={() => setHovered(m.id)}
                onMouseLeave={() => setHovered(null)}
                onPointerDown={e => { if (!locked[m.id]) onPointerDown(e, m.id) }}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={() => {
                  if (movedRef.current) { movedRef.current = false; return }
                  onEditMember(m)
                }}
                className={`absolute flex touch-none items-center gap-3 rounded-xl border bg-[#14110a] px-3 transition-colors ${locked[m.id] ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${m.deceased ? 'opacity-75' : ''} ${hovered === m.id ? 'border-[#d4af37]' : 'border-[#2a2418]'}`}
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
                {locked[m.id] && hovered !== m.id && (
                  <span className="pointer-events-none absolute right-1 top-1 text-xs text-[#d4af37]" title="Position locked">🔒</span>
                )}
                {hovered === m.id && (
                  <span className="absolute right-1 top-1 flex gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); toggleLock(m.id, x, y) }}
                      className={`rounded px-1.5 text-xs hover:bg-[#3a3220] ${locked[m.id] ? 'bg-[#3a3220] text-[#d4af37]' : 'bg-[#2a2310] text-[#d4af37]'}`}
                      title={locked[m.id] ? 'Unlock this card (allow dragging)' : 'Lock this card in place'}
                      aria-label={locked[m.id] ? `Unlock ${m.name}` : `Lock ${m.name}`}
                    >{locked[m.id] ? '🔒' : '🔓'}</button>
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
        <span>● Gold = marriage · drag a card to place it · 🔒 locks a card in place · ◎ focus · −/+ collapse a branch</span>
      </div>
    </div>
  )
}
