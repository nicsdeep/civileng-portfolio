import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { usePageTitle } from '../lib/usePageTitle'
import { BackLink, PageHeading } from '../components/ui'
import { parseResume } from '../features/import/parse'
import { clearDraft, loadDraft, saveDraft, type Draft } from '../features/import/draft'
import { ConfirmButton } from '../components/ConfirmButton'
import { useAuth } from '../features/auth/AuthProvider'
import { HistoryError, recordUpload } from '../features/import/history'
import { useMyPortfolio } from '../features/portfolio/hooks'
import { publishResume } from '../features/portfolio/publish'
import { useQueryClient } from '@tanstack/react-query'

/*
 * Step 1 of the journey (see docs/PRD.md): résumé in, live portfolio out.
 * Signed in: publish now and open the portfolio. Not signed in: keep the
 * résumé in this browser and ask for a free account once (/finish publishes).
 */

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; step: string }
  | { kind: 'error'; message: string }

const REMOVED = 'Résumé removed from this browser.'

export function CreatePage() {
  usePageTitle('Create your portfolio')
  const { user } = useAuth()
  const mine = useMyPortfolio()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pasted, setPasted] = useState('')
  const [dragging, setDragging] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(() => loadDraft())
  const [params] = useSearchParams()
  const [notice, setNotice] = useState<string | null>(() => (params.get('deleted') ? 'Your portfolio was deleted. Its address is free again.' : null))
  const input = useRef<HTMLInputElement>(null)
  const busy = status.kind === 'working'
  const updating = Boolean(mine.data?.slug)

  async function readFile(file: File) {
    setNotice(null)
    setStatus({ kind: 'working', step: `Reading ${file.name}…` })
    try {
      const { extractText } = await import('../features/import/extract')
      await build(await extractText(file), file.name, file)
    } catch (error) {
      setStatus({ kind: 'error', message: (error instanceof Error && error.message) || 'This file could not be read. Try another format, or paste the text.' })
    }
  }

  async function build(text: string, source: string, file?: File) {
    const result = parseResume(text)
    if (!result.cv.name && result.cv.experience.length === 0 && result.cv.education.length === 0) {
      setStatus({ kind: 'error', message: 'We could not find résumé sections in this text. Check it is your résumé, or start from scratch.' })
      return
    }
    setStatus({ kind: 'working', step: 'Building your portfolio…' })
    let upload
    try {
      // Uploading means agreeing to the Privacy Policy shown next to the buttons.
      upload = await recordUpload({ result, text, file, consentAt: new Date(), signedIn: Boolean(user) })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof HistoryError ? error.message : 'Could not read your résumé. Check your connection and try again.' })
      return
    }
    saveDraft(result.cv, source, { uploadId: upload.id, claimToken: upload.claimToken })

    if (!user) {
      // One step left: an account, so the portfolio is theirs. /finish publishes it.
      navigate('/sign-up?next=/finish')
      return
    }
    await publishNow()
  }

  async function publishNow() {
    const current = loadDraft()
    if (!user || !current) return
    setStatus({ kind: 'working', step: updating ? 'Updating your portfolio…' : 'Publishing your portfolio…' })
    try {
      const { slug, replaced } = await publishResume(user.id, current.cv)
      clearDraft()
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', slug] })
      navigate(`/p/${slug}?status=${replaced ? 'updated' : 'new'}`)
    } catch (error) {
      setStatus({ kind: 'error', message: (error instanceof Error && error.message) || 'Could not publish. Try again.' })
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && !busy) readFile(file)
  }

  function onPaste(event: FormEvent) {
    event.preventDefault()
    if (pasted.trim().length < 40) return setStatus({ kind: 'error', message: 'Paste the full text of your résumé.' })
    setNotice(null)
    void build(pasted, 'pasted text')
  }

  function removeResume() {
    clearDraft()
    setDraft(null)
    setPasted('')
    setStatus({ kind: 'idle' })
    setNotice(REMOVED)
    window.scrollTo({ top: 0 })
  }

  if (busy) {
    return (
      <div className="container-page flex max-w-xl flex-col items-center py-24 text-center" role="status" aria-live="polite">
        <span className="size-10 animate-spin rounded-full border-4 border-accent-soft border-t-accent" aria-hidden="true" />
        <p className="display mt-6 text-3xl">{status.step}</p>
        <p className="mt-2 text-sm text-muted">This takes a few seconds.</p>
      </div>
    )
  }

  return (
    <div className="container-page max-w-4xl py-10">
      <BackLink fallback={updating ? `/p/${mine.data!.slug}` : '/'} label={updating ? 'Back to my portfolio' : 'Back'} />
      <PageHeading
        eyebrow={updating ? 'Update' : 'Create'}
        title={updating ? 'Upload your new' : 'Start with your'}
        accent="résumé."
      >
        {updating
          ? 'Your portfolio is updated in one go. Pictures and links you added are kept.'
          : 'Upload it and your portfolio goes live in seconds. You can change anything afterwards.'}
      </PageHeading>

      {notice && (
        <p role="status" className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          {notice}
          <button type="button" className="btn-quiet" onClick={() => setNotice(null)} aria-label="Dismiss">✕</button>
        </p>
      )}

      {draft && (
        <section aria-labelledby="in-progress" className="panel mb-6 flex flex-wrap items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <h2 id="in-progress" className="label">Almost done</h2>
            <p className="font-semibold">{draft.cv.name || 'Your résumé'}</p>
            <p className="text-sm text-muted">Read from {draft.source}. One step left: publish it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary" onClick={() => (user ? void publishNow() : navigate('/sign-up?next=/finish'))}>
              Publish
            </button>
            <ConfirmButton question="Remove this résumé from this browser?" confirmLabel="Remove" onConfirm={removeResume}>
              Remove
            </ConfirmButton>
          </div>
        </section>
      )}

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
        <p className="text-sm text-muted">PDF or Word (.docx), up to 10 MB. Drag it here or choose it.</p>
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
        <button type="button" className="btn-primary h-11 px-5 text-base" onClick={() => input.current?.click()}>
          Choose résumé
        </button>
        <PolicyNote />
      </div>

      {status.kind === 'error' && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{status.message}</p>}

      <form id="paste" onSubmit={onPaste} className="panel mt-6 p-5 sm:p-6">
        <label htmlFor="pasted" className="display block text-2xl">Or paste the <em className="text-brand-italic">text</em></label>
        <p className="mt-1 text-sm text-muted">Copy everything from your résumé document and paste it here.</p>
        <textarea id="pasted" className="field mt-3 min-h-48 text-base sm:text-sm" value={pasted} onChange={(e) => setPasted(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" className="btn-secondary" disabled={!pasted.trim()}>Build my portfolio</button>
          {pasted && <button type="button" className="btn-quiet" onClick={() => setPasted('')}>Clear text</button>}
        </div>
        <PolicyNote className="mt-2 text-left" />
      </form>

      <p className="mt-6 text-sm text-muted">
        {updating ? (
          <>Prefer small changes? <Link to="/editor" className="link font-semibold">Edit details instead</Link>.</>
        ) : (
          <>No résumé to hand? <Link to="/editor?start=blank" className="link font-semibold">Start from scratch</Link>.</>
        )}
      </p>
    </div>
  )
}

/** The standard one-line notice next to the upload buttons. */
function PolicyNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-muted ${className}`}>
      By uploading, you agree to our <Link to="/privacy" className="link">Privacy Policy</Link>.
    </p>
  )
}
