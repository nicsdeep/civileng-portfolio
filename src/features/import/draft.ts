import { normalizeCv } from '../../content/normalize'
import type { Cv } from '../../content/types'

/*
 * A portfolio built from an uploaded résumé waits here until it is saved,
 * so it survives signing in or creating an account. It stays in this
 * browser only and is removed once saved or discarded.
 */

const KEY = 'pf-import-draft'

export interface Draft {
  cv: Cv
  source: string
  createdAt: string
}

export function saveDraft(cv: Cv, source: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ cv, source, createdAt: new Date().toISOString() }))
  } catch {
    // Private browsing or storage full: the editor will simply start empty.
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Draft>
    return { cv: normalizeCv(parsed.cv), source: String(parsed.source ?? 'your résumé'), createdAt: String(parsed.createdAt ?? '') }
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
