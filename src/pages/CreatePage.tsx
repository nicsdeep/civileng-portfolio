import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { usePageTitle } from '../lib/usePageTitle'
import { PageHeading } from '../components/ui'
import { parseResume, type ParseResult } from '../features/import/parse'
import { clearDraft, loadDraft, saveDraft, type Draft } from '../features/import/draft'
import { ConfirmButton } from '../components/ConfirmButton'
import { useAuth } from '../features/auth/AuthProvider'
import { HistoryError, recordUpload } from '../features/import/history'

type Status = { kind: 'idle' } | { kind: 'reading'; name: string } | { kind: 'saving' } | { kind: 'error'; message: string } | { kind: 'done'; result: ParseResult; source: string }

const REMOVED = 'Résumé removed from this browser. A record of the upload is kept, as explained in the privacy notice.'

export function CreatePage() {
  usePageTitle('Create your portfolio')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pasted, setPasted] = useState('')
  const [dragging, setDragging] = useState(false)
  // A résumé read earlier in this browser and not yet saved.
  const [draft, setDraft] = useState<Draft | null>(() => loadDraft())
  const [notice, setNotice] = useState<string | null>(null)
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  // Agreement to keep the résumé on record; required before reading anything.
  const [consentAt, setConsentAt] = useState<Date | null>(null)
  const busy = status.kind === 'reading' || status.kind === 'saving'

  async function readFile(file: File) {
    if (!consentAt) return setStatus({ kind: 'error', message: 'Please tick the box to agree before uploading.' })
    setNotice(null)
    setStatus({ kind: 'reading', name: file.name })
    try {
      const { extractText } = await import('../features/import/extract')
      const text = await extractText(file)
      await finish(text, file.name, file)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setStatus({ kind: 'error', message: message || 'This file could not be read. Try another format, or paste the text.' })
    }
  }

  async function finish(text: string, source: string, file?: File) {
    const result = parseResume(text)
    if (!result.cv.name && result.cv.experience.length === 0 && result.cv.education.length === 0) {
      setStatus({ kind: 'error', message: 'We could not find résumé sections in this text. Check it is your résumé, or start from scratch.' })
      return
    }
    // Keep it on record before going on.
    setStatus({ kind: 'saving' })
    let upload
    try {
      upload = await recordUpload({ result, text, file, consentAt: consentAt ?? new Date(), signedIn: Boolean(user) })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof HistoryError ? error.message : 'Could not save your résumé. Check your connection and try again.' })
      return
    }
    saveDraft(result.cv, source, { uploadId: upload.id, claimToken: upload.claimToken })
    setDraft(loadDraft())
    setStatus({ kind: 'done', result, source })
    window.scrollTo({ top: 0 })
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) readFile(file)
  }

  function onPaste(event: FormEvent) {
    event.preventDefault()
    if (!consentAt) return setStatus({ kind: 'error', message: 'Please tick the box to agree before continuing.' })
    if (pasted.trim().length < 40) return setStatus({ kind: 'error', message: 'Paste the full text of your résumé.' })
    setNotice(null)
    void finish(pasted, 'pasted text')
  }

  /** Deletes the résumé read in this browser and goes back to the start. */
  function removeResume(message: string | null) {
    clearDraft()
    setDraft(null)
    setPasted('')
    setStatus({ kind: 'idle' })
    setNotice(message)
    window.scrollTo({ top: 0 }) // so the confirmation message is in view
  }

  if (status.kind === 'done') {
    return (
      <Result
        result={status.result}
        source={status.source}
        onReplace={() => removeResume(null)}
        onRemove={() => removeResume(REMOVED)}
      />
    )
  }

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeading eyebrow="Create" title="Start with your" accent="résumé.">
        We read it, keep a private copy on record, and fill in your portfolio for you to check before publishing.
      </PageHeading>

      {notice && (
        <p role="status" className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          {notice}
          <button type="button" className="btn-quiet" onClick={() => setNotice(null)} aria-label="Dismiss">✕</button>
        </p>
      )}

      {draft && !busy && (
        <section aria-labelledby="in-progress" className="panel mb-6 flex flex-wrap items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <h2 id="in-progress" className="label">Résumé in progress</h2>
            <p className="font-semibold">{draft.cv.name || 'Unnamed résumé'}</p>
            <p className="text-sm text-muted">
              From {draft.source}
              {draft.createdAt && ` · ${new Date(draft.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`}. Not saved yet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary" onClick={() => navigate('/editor')}>Continue</button>
            <ConfirmButton question="Remove this résumé from this browser?" confirmLabel="Remove" onConfirm={() => removeResume(REMOVED)}>
              Remove
            </ConfirmButton>
          </div>
        </section>
      )}

      <label className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${consentAt ? 'border-line bg-surface' : 'border-accent bg-accent-soft'}`}>
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
          checked={consentAt !== null}
          onChange={(e) => setConsentAt(e.target.checked ? new Date() : null)}
        />
        <span>
          I agree that CivilEng Portfolio keeps my résumé file and the details in it, including my phone number, in its private
          records, as described in the <Link to="/privacy" className="link font-semibold" target="_blank">privacy notice</Link>. Only
          what I publish appears on my public portfolio.
        </span>
      </label>

      <div
        className={`panel flex flex-col items-center justify-center gap-3 border-2 border-dashed p-8 text-center sm:p-12 ${dragging ? 'border-accent bg-accent-soft' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p className="display text-3xl">Upload a <em className="text-brand-italic">file</em></p>
        <p className="text-sm text-muted">
          PDF or Word (.docx), up to 10 MB. Drag it here or choose it.
          {draft && ' A new file replaces the résumé in progress.'}
        </p>
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          id="resume-file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) readFile(file)
            e.target.value = ''
          }}
        />
        <button type="button" className="btn-primary h-11 px-5 text-base" onClick={() => input.current?.click()} disabled={busy || !consentAt}>
          {status.kind === 'reading' ? `Reading ${status.name}…` : status.kind === 'saving' ? 'Saving…' : 'Choose résumé'}
        </button>
        {!consentAt && <p className="text-xs text-muted">Tick the box above first.</p>}
      </div>

      {status.kind === 'error' && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{status.message}</p>}

      <form id="paste" onSubmit={onPaste} className="panel mt-6 p-5 sm:p-6">
        <label htmlFor="pasted" className="display block text-2xl">Or paste the <em className="text-brand-italic">text</em></label>
        <p className="mt-1 text-sm text-muted">Copy everything from your résumé document and paste it here.</p>
        <textarea id="pasted" className="field mt-3 min-h-48 text-base sm:text-sm" value={pasted} onChange={(e) => setPasted(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" className="btn-secondary" disabled={!pasted.trim() || !consentAt || busy}>
            {status.kind === 'saving' ? 'Saving…' : 'Build my portfolio'}
          </button>
          {pasted && <button type="button" className="btn-quiet" onClick={() => setPasted('')}>Clear text</button>}
        </div>
      </form>

      <p className="mt-6 text-sm text-muted">
        No résumé to hand? <Link to="/editor?start=blank" className="link font-semibold">Start from scratch</Link>.
      </p>
    </div>
  )
}

function Result({ result, source, onReplace, onRemove }: { result: ParseResult; source: string; onReplace: () => void; onRemove: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { cv } = result
  const rows: [string, number][] = [
    ['Roles', cv.experience.length],
    ['Qualifications', cv.education.length],
    ['Projects', cv.projects.length],
    ['Skills', cv.skills.reduce((n, g) => n + g.items.length, 0)],
    ['Certifications', cv.certifications.length],
    ['Links', cv.links.length],
  ]
  const missing = rows.filter(([, n]) => n === 0).map(([label]) => label.toLowerCase())

  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeading eyebrow="Step 2 of 3" title="Here is what we" accent="found.">
        From {source}. Next, check everything in the editor: résumés come in many layouts, so a few things may need fixing.
      </PageHeading>

      <div className="panel p-6 sm:p-8">
        <p className="label">Name</p>
        <p className="display text-4xl">{cv.name || <span className="text-muted">Not found, add it in the editor</span>}</p>
        {cv.headline && <p className="mt-1 text-muted">{cv.headline}</p>}
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map(([label, n]) => (
            <div key={label} className="rounded-xl bg-surface-2 p-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="display text-3xl">{n}</dd>
            </div>
          ))}
        </dl>
        {missing.length > 0 && <p className="mt-4 text-sm text-muted">Nothing found for {missing.join(', ')}. You can add them in the editor.</p>}
        {result.skipped.length > 0 && <p className="mt-2 text-sm text-muted">Left out (not shown on portfolios): {result.skipped.join(', ')}.</p>}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary h-11 px-5 text-base" onClick={() => navigate('/editor')}>
          {user ? 'Review and edit' : 'Sign in to review and publish'}
        </button>
        <button type="button" className="btn-secondary h-11 px-5" onClick={onReplace}>Use a different file</button>
        <ConfirmButton question="Remove this résumé? Nothing is kept." confirmLabel="Remove résumé" onConfirm={onRemove}>
          Remove résumé
        </ConfirmButton>
      </div>
      {!user && (
        <p className="mt-3 text-sm text-muted">
          A free CivilEng account keeps your portfolio yours. Your résumé stays in this browser while you sign in.
        </p>
      )}
    </div>
  )
}
