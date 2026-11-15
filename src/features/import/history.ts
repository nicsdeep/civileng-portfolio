import { supabase } from '../../lib/supabase'
import type { ParseResult } from './parse'

/*
 * Records every résumé read on the Create page in the private upload
 * history (public.pf_resume_uploads, files in the "pf-resumes" bucket).
 * Visitors agree to this on the Create page first. Nobody can read the
 * history through the app; the site owner sees it in the Supabase dashboard.
 */

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
}

export interface RecordedUpload {
  id: string
  /** Lets this browser attach an anonymous upload to an account after signing in. */
  claimToken: string | null
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export class HistoryError extends Error {}

/** Saves the upload (details, extracted text and, for files, the file itself). */
export async function recordUpload(input: {
  result: ParseResult
  text: string
  file?: File
  consentAt: Date
  signedIn: boolean
}): Promise<RecordedUpload> {
  const { result, text, file, consentAt, signedIn } = input
  const id = crypto.randomUUID()
  const claimToken = signedIn ? null : randomHex(32)
  const ext = file?.name.toLowerCase().match(/\.(pdf|docx|txt)$/)?.[1] ?? null
  const filePath = file && ext ? `uploads/${id}.${ext}` : null

  const { error } = await supabase.from('pf_resume_uploads').insert({
    id,
    source: file ? 'file' : 'paste',
    consent_at: consentAt.toISOString(),
    file_name: file ? file.name.slice(0, 255) : null,
    file_type: ext ? MIME[ext] : null,
    file_size: file ? file.size : null,
    file_path: filePath,
    name: result.cv.name || null,
    email: result.cv.email || null,
    phone: result.phone || null,
    location: result.cv.location || null,
    parsed: { ...result.cv, phone: result.phone, skipped: result.skipped },
    raw_text: text.slice(0, 100000),
    claim_token_hash: claimToken ? await sha256Hex(claimToken) : null,
  })
  if (error) throw new HistoryError(error.code === 'P0001' ? error.message : 'Could not save your résumé. Check your connection and try again.')

  if (file && filePath && ext) {
    const { error: uploadError } = await supabase.storage.from('pf-resumes').upload(filePath, file, { contentType: MIME[ext], upsert: false })
    if (uploadError) throw new HistoryError('Your details were saved, but the file itself could not be stored. Try uploading it again.')
  }
  return { id, claimToken }
}

/** Links an anonymous upload to the signed-in user. Returns true once linked. */
export async function claimUpload(id: string, claimToken: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('pf_claim_resume_upload', { upload_id: id, claim_token: claimToken })
  return !error && data === true
}
