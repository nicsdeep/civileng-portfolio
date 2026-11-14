/*
 * Turns a résumé file into plain text lines, in the browser. Nothing is
 * uploaded: the file is read locally and only the resulting portfolio is
 * saved, when the user chooses to.
 *
 * PDF:  text items are grouped into lines by position. Larger, short text in
 *       a left column (a common résumé layout) becomes its own heading line,
 *       and wrapped bullet lines are joined back together.
 * DOCX: paragraphs from word/document.xml (tables included, in reading order).
 * TXT:  as is.
 */

import { sectionFor } from './parse'

export class ImportError extends Error {}

const MAX_BYTES = 10 * 1024 * 1024

export async function extractText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new ImportError('That file is larger than 10 MB. Try a smaller PDF or paste the text instead.')
  const name = file.name.toLowerCase()
  const buffer = new Uint8Array(await file.arrayBuffer())
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return pdfToText(buffer)
  if (name.endsWith('.docx')) return docxToText(buffer)
  if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) return new TextDecoder().decode(buffer)
  if (name.endsWith('.doc')) throw new ImportError('Old Word files (.doc) are not supported. Save it as .docx or PDF, or paste the text.')
  throw new ImportError('Please choose a PDF, Word (.docx) or text file.')
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/** One piece of text on a PDF page, in PDF units (y grows upwards). */
export interface PdfItem {
  text: string
  x: number
  y: number
  width: number
  size: number
}

interface Segment {
  text: string
  x: number
  size: number
}

async function pdfToText(data: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  let doc
  try {
    doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise
  } catch {
    throw new ImportError('This PDF could not be opened. It may be damaged or password protected.')
  }
  const pages: PdfItem[][] = []
  for (let p = 1; p <= Math.min(doc.numPages, 10); p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const items: PdfItem[] = []
    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue
      items.push({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width, size: Math.abs(item.transform[3]) || item.height })
    }
    pages.push(items)
  }
  const text = pdfItemsToText(pages)
  if (text.replace(/\s/g, '').length < 40) {
    throw new ImportError('This PDF has no selectable text (it may be a scanned image). Try the Word version, or paste the text.')
  }
  return text
}

/** Exported for tests: positioned PDF text → lines. */
export function pdfItemsToText(pages: PdfItem[][]): string {
  const all = pages.flat().filter((i) => i.text.trim())
  if (all.length === 0) return ''
  const body = median(all.map((i) => i.size))
  const out: string[] = []

  let columns: { x: number; index: number }[] = [] // bullet text columns still open for wrapped lines (across pages)
  for (const items of pages) {
    let headingIndex = -1 // heading built from the previous line, still open for continuation

    /** Adds a left-column heading fragment, joining "Professional" + "Summary" across lines. */
    const addHeading = (fragment: string) => {
      if (headingIndex >= 0) {
        const joined = `${out[headingIndex]} ${fragment}`
        // Join only if it still reads as one heading (not two headings in a row).
        if (!sectionFor(out[headingIndex]) || sectionFor(joined)) {
          out[headingIndex] = joined
          return
        }
      }
      out.push(fragment)
      headingIndex = out.length - 1
    }

    for (const segments of groupLines(items.filter((i) => i.text.trim()))) {
      const first = segments[0]
      const short = first.text.split(/\s+/).length <= 4 && !/[.:;,]$/.test(first.text)
      const large = first.size > body * 1.12
      let rest = segments

      if (large && short && segments.length > 1 && segments[1].x - first.x > body * 4) {
        addHeading(first.text) // heading in a left column, content to its right
        rest = segments.slice(1)
      } else if (large && short && segments.length === 1 && out.length > 0 && (headingIndex >= 0 || sectionFor(first.text) || out.length > 1)) {
        addHeading(first.text)
        columns = []
        continue
      } else {
        headingIndex = -1
      }

      // Bullet columns (side-by-side skill lists) and wrapped bullet lines.
      const aligned = (x: number) => columns.find((c) => Math.abs(c.x - x) < body * 0.6)
      const multiColumn = rest.length > 1 && (rest.slice(1).some((seg) => isBulletText(seg.text)) || rest.some((seg) => !isBulletText(seg.text) && aligned(seg.x)))
      const pieces = multiColumn ? rest : [{ ...rest[0], text: rest.map((seg) => seg.text).join('  ') }]
      if (!multiColumn) columns = columns.filter(() => isBulletText(pieces[0].text) || aligned(pieces[0].x))
      for (const piece of pieces) {
        const text = piece.text.trim()
        if (!text) continue
        if (isBulletText(text)) {
          out.push(text)
          // Wrapped lines line up with the text after the bullet.
          const textX = piece.x + body
          columns = columns.filter((c) => Math.abs(c.x - textX) >= body * 0.6)
          columns.push({ x: textX, index: out.length - 1 })
        } else {
          const column = aligned(piece.x)
          if (column) out[column.index] += ' ' + text
          else {
            out.push(text)
            if (!multiColumn) columns = []
          }
        }
      }
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const isBulletText = (text: string) => /^[•▪●◦‣∙·*]/.test(text)

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] || 10
}

/** Groups items into lines (top to bottom), each a list of segments (left to right). */
function groupLines(items: PdfItem[]): Segment[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: PdfItem[][] = []
  for (const item of sorted) {
    const row = rows.find((r) => Math.abs(r[0].y - item.y) <= Math.max(2, Math.min(r[0].size, item.size) * 0.5))
    if (row) row.push(item)
    else rows.push([item])
  }
  rows.sort((a, b) => b[0].y - a[0].y)
  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x)
    const segments: Segment[] = []
    let prev: PdfItem | null = null
    for (const item of row) {
      const gap = prev ? item.x - (prev.x + prev.width) : Infinity
      const current = segments[segments.length - 1]
      const sizeJump = Math.max(prev?.size ?? 0, item.size) / Math.max(1, Math.min(prev?.size ?? item.size, item.size)) > 1.2
      if (prev && current && gap < Math.max(prev.size, item.size) * 2.5 && !(sizeJump && gap > item.size * 0.3)) {
        // Same phrase: add a space only where there is visible spacing.
        const needsSpace = gap > item.size * 0.12 && !current.text.endsWith(' ') && !item.text.startsWith(' ')
        current.text += (needsSpace ? ' ' : '') + item.text
        current.size = Math.max(current.size, item.size)
      } else {
        segments.push({ text: item.text, x: item.x, size: item.size })
      }
      prev = item
    }
    return segments.map((s) => ({ ...s, text: s.text.replace(/\s+/g, ' ').trim() })).filter((s) => s.text)
  })
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

async function docxToText(data: Uint8Array): Promise<string> {
  const { unzipSync, strFromU8 } = await import('fflate')
  let xml: string
  try {
    const files = unzipSync(data, { filter: (f) => f.name === 'word/document.xml' })
    xml = strFromU8(files['word/document.xml'])
  } catch {
    throw new ImportError('This Word file could not be opened. Try saving it again as .docx or PDF.')
  }
  const text = docxXmlToText(xml)
  if (!text.trim()) throw new ImportError('No text was found in this Word file.')
  return text
}

/** Exported for tests: word/document.xml → one line per paragraph. */
export function docxXmlToText(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const lines: string[] = []
  for (const p of Array.from(doc.getElementsByTagNameNS(W, 'p'))) {
    let line = ''
    const walk = (node: Element) => {
      for (const child of Array.from(node.children)) {
        if (child.namespaceURI === W && child.localName === 't') line += child.textContent ?? ''
        else if (child.namespaceURI === W && child.localName === 'tab') line += '  '
        else if (child.namespaceURI === W && (child.localName === 'br' || child.localName === 'cr')) line += '\n'
        else walk(child)
      }
    }
    walk(p)
    // Word list items carry numbering properties instead of a bullet character.
    const isList = p.getElementsByTagNameNS(W, 'numPr').length > 0
    for (const part of line.split('\n')) lines.push(isList && part.trim() ? `• ${part.trim()}` : part.trim())
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
