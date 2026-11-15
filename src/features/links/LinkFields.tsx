import { useState, type FormEvent } from 'react'
import { cleanUrl, fetchLinkPreview, findImage, hostOf, projectFromPreview, type ImageMode } from './preview'

/** A picture from the web, hidden quietly if it cannot be loaded. */
export function WebImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return null
  return <img src={src} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
}

/**
 * Picture field: paste a picture link, or a page link (profile, company
 * website, project page) and the right picture is found and shown at once.
 */
export function ImageInput({ id, value, mode, onChange }: { id: string; value: string; mode: ImageMode; onChange: (value: string) => void }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null)

  async function find(text: string) {
    if (!text.trim()) return
    setBusy(true)
    setNote(null)
    try {
      const { image, note } = await findImage(text, mode)
      onChange(image)
      setInput('')
      setNote({ text: note })
    } catch (error) {
      setNote({ text: (error as Error).message || 'That link could not be read.', error: true })
    } finally {
      setBusy(false)
    }
  }

  const shape = mode === 'cover' ? 'aspect-video w-40' : mode === 'photo' ? 'size-20 rounded-full' : 'size-16'
  return (
    <div className="flex flex-wrap items-start gap-3">
      {value && (
        <div className={`shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2 ${shape}`}>
          <WebImage src={value} alt="" className={`h-full w-full ${mode === 'logo' ? 'object-contain p-1' : 'object-cover'}`} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex gap-2">
          <input
            id={id}
            className="field min-w-0 flex-1 text-base sm:text-sm"
            placeholder={value ? 'Paste another link to change it' : 'Paste a link…'}
            value={input}
            inputMode="url"
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text')
              if (text) {
                e.preventDefault()
                setInput(text)
                void find(text)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void find(input)
              }
            }}
          />
          <button type="button" className="btn-secondary" onClick={() => void find(input)} disabled={busy || !input.trim()}>
            {busy ? 'Finding…' : 'Find'}
          </button>
        </div>
        {note && <p role={note.error ? 'alert' : 'status'} className={`mt-1 text-xs ${note.error ? 'text-danger' : 'text-ok'}`}>{note.text}</p>}
        {value && (
          <button type="button" className="btn-quiet mt-1 px-0 text-xs" onClick={() => { onChange(''); setNote(null) }}>
            Remove picture
          </button>
        )}
      </div>
    </div>
  )
}

export interface ProjectDraft {
  title: string
  subtitle: string
  description: string
  image: string
  links: { label: string; url: string }[]
}

/** "Add a project from a link": reads the page, shows it, adds it on confirm. */
export function AddProjectFromLink({ onAdd }: { onAdd: (project: ProjectDraft) => void }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<ProjectDraft | null>(null)

  async function read(event?: FormEvent, text = input) {
    event?.preventDefault()
    const url = cleanUrl(text)
    if (!url) return setError('Paste a full web address, e.g. https://my-project.vercel.app')
    setBusy(true)
    setError(null)
    setFound(null)
    try {
      setFound(projectFromPreview(await fetchLinkPreview(url), url))
    } catch (e) {
      // The page could not be read: still add it with its link and a screenshot.
      setFound(projectFromPreview({ url, finalUrl: url, kind: 'page', title: hostOf(url), description: '', siteName: '', image: '', logo: '' }, url))
      setError(`${(e as Error).message} You can still add it and fill in the details.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel border-dashed p-4 sm:p-5">
      <label htmlFor="project-link" className="font-semibold">Add a project from a link</label>
      <p className="text-sm text-muted">Paste a live site or a GitHub link. We fill in the title, description and picture.</p>
      <div className="mt-3 flex gap-2">
        <input
          id="project-link"
          className="field min-w-0 flex-1 text-base sm:text-sm"
          placeholder="https://…"
          inputMode="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (text) {
              e.preventDefault()
              setInput(text)
              void read(undefined, text)
            }
          }}
          onKeyDown={(e) => e.key === 'Enter' && void read(e)}
        />
        <button type="button" className="btn-secondary" onClick={() => void read()} disabled={busy || !input.trim()}>
          {busy ? 'Reading…' : 'Read link'}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {found && (
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
          {found.image && <WebImage src={found.image} alt="" className="aspect-video w-full object-cover" />}
          <div className="p-4">
            <p className="font-semibold">{found.title}</p>
            {found.subtitle && <p className="text-sm text-muted">{found.subtitle}</p>}
            {found.description && <p className="mt-2 text-sm">{found.description}</p>}
            <p className="mt-2 truncate text-sm text-accent">{found.links[0]?.url}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onAdd(found)
                  setFound(null)
                  setInput('')
                  setError(null)
                }}
              >
                Add this project
              </button>
              <button type="button" className="btn-quiet" onClick={() => setFound(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
