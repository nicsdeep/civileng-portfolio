import { normalizeCv } from '../../content/normalize'
import type { Cv } from '../../content/types'
import { claimUpload } from './history'

/*
 * A portfolio built from an uploaded résumé waits here until it is saved,
 * so it survives signing in or creating an account. It is removed from
 * this browser once saved or discarded. (The upload itself is also kept in
 * the private upload history; see history.ts.)
 */

const KEY = 'pf-import-draft'

export interface Draft {
  cv: Cv
  source: string
  createdAt: string
  /** The matching record in the upload history, and the token to link it to an account. */
  uploadId?: string
  claimToken?: string | null
}

export function saveDraft(cv: Cv, source: string, upload?: { uploadId: string; claimToken: string | null }) {
  writeDraft({ cv, source, createdAt: new Date().toISOString(), ...upload })
}

function writeDraft(draft: Draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // Private browsing or storage full: the editor will simply start empty.
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Draft>
    return {
      cv: normalizeCv(parsed.cv),
      source: String(parsed.source ?? 'your résumé'),
      createdAt: String(parsed.createdAt ?? ''),
      uploadId: typeof parsed.uploadId === 'string' ? parsed.uploadId : undefined,
      claimToken: typeof parsed.claimToken === 'string' ? parsed.claimToken : null,
    }
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

/** Puts a draft back exactly as it was (used by Undo). */
export function restoreDraft(draft: Draft) {
  writeDraft(draft)
}

/** After signing in: links the draft's anonymous upload to the account, once. */
export async function claimDraftUpload() {
  const draft = loadDraft()
  if (!draft?.uploadId || !draft.claimToken) return
  if (await claimUpload(draft.uploadId, draft.claimToken)) writeDraft({ ...draft, claimToken: null })
}
