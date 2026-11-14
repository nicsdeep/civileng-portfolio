import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { usePageTitle } from '../lib/usePageTitle'
import { PageHeading } from '../components/ui'
import { parseResume, type ParseResult } from '../features/import/parse'
import { saveDraft } from '../features/import/draft'
import { useAuth } from '../features/auth/AuthProvider'

type Status = { kind: 'idle' } | { kind: 'reading'; name: string } | { kind: 'error'; message: string } | { kind: 'done'; result: ParseResult; source: string }

export function CreatePage() {
  usePageTitle('Create your portfolio')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pasted, setPasted] = useState('')
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function readFile(file: File) {
    setStatus({ kind: 'reading', name: file.name })
    try {
      const { extractText } = await import('../features/import/extract')
      const text = await extractText(file)
      finish(text, file.name)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setStatus({ kind: 'error', message: message || 'This file could not be read. Try another format, or paste the text.' })
    }
  }

  function finish(text: string, source: string) {
    const result = parseResume(text)
    if (!result.cv.name && result.cv.experience.length === 0 && result.cv.education.length === 0) {
      setStatus({ kind: 'error', message: 'We could not find résumé sections in this text. Check it is your résumé, or start from scratch.' })
      return
    }
    saveDraft(result.cv, source)
    setStatus({ kind: 'done', result, source })
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) readFile(file)
  }

  function onPaste(event: FormEvent) {
    event.preventDefault()
    if (pasted.trim().length < 40) return setStatus({ kind: 'error', message: 'Paste the full text of your résumé.' })
    finish(pasted, 'pasted text')
  }

  if (status.kind === 'done') return <Result result={status.result} source={status.source} onRestart={() => setStatus({ kind: 'idle' })} />

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeading eyebrow="Create" title="Start with your" accent="résumé.">
        Your file is read in this browser. Nothing is uploaded or saved until you choose to publish.
      </PageHeading>

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
        <button type="button" className="btn-primary h-11 px-5 text-base" onClick={() => input.current?.click()} disabled={status.kind === 'reading'}>
          {status.kind === 'reading' ? `Reading ${status.name}…` : 'Choose résumé'}
        </button>
      </div>

      {status.kind === 'error' && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{status.message}</p>}

      <form id="paste" onSubmit={onPaste} className="panel mt-6 p-5 sm:p-6">
        <label htmlFor="pasted" className="display block text-2xl">Or paste the <em className="text-brand-italic">text</em></label>
        <p className="mt-1 text-sm text-muted">Copy everything from your résumé document and paste it here.</p>
        <textarea id="pasted" className="field mt-3 min-h-48 text-base sm:text-sm" value={pasted} onChange={(e) => setPasted(e.target.value)} />
        <button type="submit" className="btn-secondary mt-3">Build my portfolio</button>
      </form>

      <p className="mt-6 text-sm text-muted">
        No résumé to hand? <Link to="/editor?start=blank" className="link font-semibold">Start from scratch</Link>.
      </p>
    </div>
  )
}

function Result({ result, source, onRestart }: { result: ParseResult; source: string; onRestart: () => void }) {
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
        <button type="button" className="btn-quiet" onClick={onRestart}>Try another file</button>
      </div>
      {!user && (
        <p className="mt-3 text-sm text-muted">
          A free CivilEng account keeps your portfolio yours. Your résumé stays in this browser while you sign in.
        </p>
      )}
    </div>
  )
}
