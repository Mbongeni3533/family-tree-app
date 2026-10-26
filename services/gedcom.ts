import type { FamilyMember } from '@/types/family'
import { spouseMap } from '@/services/relations'
import { fromGedcomDate, toGedcomDate, yearOf } from '@/services/dates'

// ---------- EXPORT (GEDCOM 5.5.1, UTF-8) ----------

// Splits long/multi-line text into NOTE / CONT / CONC lines
function noteLines(level: number, tag: string, text: string): string[] {
  const out: string[] = []
  text.replace(/\r/g, '').split('\n').forEach((line, i) => {
    const chunks = line.match(/.{1,200}/gs) ?? ['']
    chunks.forEach((chunk, j) => {
      if (i === 0 && j === 0) out.push(`${level} ${tag} ${chunk}`)
      else out.push(`${level + 1} ${j === 0 ? 'CONT' : 'CONC'} ${chunk}`.replace(/^\d+/, String(level + 1)))
    })
  })
  return out
}

export function exportGedcom(members: FamilyMember[]): string {
  const ix = new Map(members.map((m, i) => [m.id, `@I${i + 1}@`]))
  const byId = new Map(members.map(m => [m.id, m]))

  // Families: one per couple (spouse link) and one per distinct set of parents of a child
  type Fam = { husb?: string; wife?: string; kids: string[] }
  const fams = new Map<string, Fam>()
  const slot = (ids: string[]) => {
    const key = [...ids].sort().join('|')
    if (!fams.has(key)) {
      const pair = ids.map(i => byId.get(i)!)
      const male = pair.find(p => p.gender === 'male')
      const rest = pair.filter(p => p !== male)
      const wife = rest.find(p => p.gender === 'female') ?? rest[0]
      fams.set(key, { husb: male?.id, wife: wife?.id, kids: [] })
    }
    return key
  }
  const spMap = spouseMap(members)
  for (const m of members) for (const sp of spMap.get(m.id) ?? []) slot([m.id, sp])
  const famOfChild = new Map<string, string>()
  for (const m of members) {
    const ps = [m.parentId, m.parent2Id].filter((p): p is string => !!p && byId.has(p) && p !== m.id)
    if (ps.length === 0) continue
    const key = slot([...new Set(ps)])
    fams.get(key)!.kids.push(m.id)
    famOfChild.set(m.id, key)
  }
  const famIx = new Map([...fams.keys()].map((k, i) => [k, `@F${i + 1}@`]))
  const spouseFams = (id: string) => [...fams].filter(([, f]) => f.husb === id || f.wife === id).map(([k]) => famIx.get(k)!)

  const L: string[] = ['0 HEAD', '1 SOUR FamilyTree', '2 NAME Family Tree (Link-Leverage)', '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8']
  for (const m of members) {
    L.push(`0 ${ix.get(m.id)} INDI`, `1 NAME ${m.name.replace(/\//g, '')}`)
    L.push(`1 SEX ${m.gender === 'male' ? 'M' : m.gender === 'female' ? 'F' : 'U'}`)
    if (m.birthYear || m.birthDate) {
      const birth = toGedcomDate(m.birthDate) ?? String(m.birthYear)
      L.push('1 BIRT', `2 DATE ${birth}`)
    }
    if (m.deceased) {
      const death = toGedcomDate(m.deathDate)
      L.push('1 DEAT')
      if (death) L.push(`2 DATE ${death}`)
    }
    if (m.residence) L.push('1 RESI', `2 ADDR ${m.residence}`)
    if (m.notes) L.push(...noteLines(1, 'NOTE', m.notes))
    spouseFams(m.id).forEach(f => L.push(`1 FAMS ${f}`))
    const fc = famOfChild.get(m.id)
    if (fc) L.push(`1 FAMC ${famIx.get(fc)}`)
  }
  for (const [key, f] of fams) {
    L.push(`0 ${famIx.get(key)} FAM`)
    if (f.husb) L.push(`1 HUSB ${ix.get(f.husb)}`)
    if (f.wife) L.push(`1 WIFE ${ix.get(f.wife)}`)
    f.kids.forEach(k => L.push(`1 CHIL ${ix.get(k)}`))
  }
  L.push('0 TRLR')
  return L.join('\r\n') + '\r\n'
}

export function downloadGedcom(members: FamilyMember[]) {
  const blob = new Blob([exportGedcom(members)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.ged`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------- IMPORT ----------

interface Node { level: number; xref?: string; tag: string; value: string; kids: Node[] }

function parseNodes(text: string): Node[] {
  const roots: Node[] = []
  const stack: Node[] = []
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)) {
    const m = raw.trim().match(/^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/)
    if (!m) continue
    const node: Node = { level: +m[1], xref: m[2], tag: m[3].toUpperCase(), value: m[4] ?? '', kids: [] }
    // CONT / CONC continue the parent's value
    if ((node.tag === 'CONT' || node.tag === 'CONC') && stack.length) {
      const parent = stack[node.level - 1] ?? stack[stack.length - 1]
      parent.value += (node.tag === 'CONT' ? '\n' : '') + node.value
      continue
    }
    stack.length = node.level
    if (node.level === 0) roots.push(node)
    else stack[node.level - 1]?.kids.push(node)
    stack[node.level] = node
  }
  return roots
}

const child = (n: Node, tag: string) => n.kids.find(k => k.tag === tag)

export function parseGedcom(text: string): { members: FamilyMember[]; warnings: string[] } {
  if (!/^\s*0\s+HEAD/im.test(text.replace(/^\uFEFF/, ''))) throw new Error('This does not look like a GEDCOM (.ged) file.')
  const roots = parseNodes(text)
  const warnings: string[] = []
  const indis = roots.filter(r => r.tag === 'INDI' && r.xref)
  if (indis.length === 0) throw new Error('No people found in this GEDCOM file.')

  const idOf = new Map<string, string>()
  const members = new Map<string, FamilyMember>()
  const now = Date.now()
  indis.forEach((n, i) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${now}-${i}`
    idOf.set(n.xref!, id)
    const name = (child(n, 'NAME')?.value ?? '').replace(/\//g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown'
    const sex = child(n, 'SEX')?.value.trim().toUpperCase()
    const birthText = child(n, 'BIRT')?.kids.find(k => k.tag === 'DATE')?.value
    const deathText = child(n, 'DEAT')?.kids.find(k => k.tag === 'DATE')?.value
    const birthDate = birthText ? fromGedcomDate(birthText) : undefined
    const deathDate = deathText ? fromGedcomDate(deathText) : undefined
    const residence = (child(n, 'RESI')?.kids.find(k => k.tag === 'ADDR')?.value ?? child(n, 'RESI')?.value ?? '').trim()
    const notes = n.kids.filter(k => k.tag === 'NOTE' && !k.value.startsWith('@')).map(k => k.value).join('\n\n')
    members.set(id, {
      id, name,
      gender: sex === 'M' ? 'male' : sex === 'F' ? 'female' : 'other',
      birthDate,
      birthYear: yearOf(birthDate),
      deceased: Boolean(child(n, 'DEAT')),
      deathDate,
      residence: residence || undefined,
      notes: notes || undefined,
      addedAt: now + i,
    })
  })

  const link = (a: string, b: string) => {
    const A = members.get(a)!, B = members.get(b)!
    for (const [x, y] of [[A, b], [B, a]] as const) x.spouseIds = [...new Set([...(x.spouseIds ?? []), y])]
  }
  for (const fam of roots.filter(r => r.tag === 'FAM')) {
    const h = idOf.get(child(fam, 'HUSB')?.value.trim() ?? '')
    const w = idOf.get(child(fam, 'WIFE')?.value.trim() ?? '')
    if (h && w) link(h, w)
    for (const c of fam.kids.filter(k => k.tag === 'CHIL')) {
      const kid = members.get(idOf.get(c.value.trim()) ?? '')
      if (!kid || kid.parentId) continue // keep the first family if a child appears in several
      kid.parentId = h ?? w
      if (h && w) kid.parent2Id = w
    }
  }
  members.forEach(m => { m.spouseId = m.spouseIds?.[0] })
  warnings.push('Photos, places, events other than birth year, and sources are not imported.')
  return { members: [...members.values()], warnings }
}
