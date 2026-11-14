import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../features/auth/AuthProvider'
import { deleteMyPortfolio, fetchMyPortfolio, saveMyPortfolio, slugProblem, type PortfolioRow } from '../features/portfolio/api'
import { clearDraft, loadDraft, saveDraft, type Draft } from '../features/import/draft'
import { ConfirmButton } from '../components/ConfirmButton'
import { slugify } from '../features/import/parse'
import { usePageTitle } from '../lib/usePageTitle'
import { emptyCv } from '../content/cv'
import { normalizeCv } from '../content/normalize'
import type { Link as CvLink } from '../content/types'
import { StatusMessage } from '../components/ui'
import {
  PROFILE_FIELDS,
  SECTIONS,
  blankItem,
  fromForm,
  toForm,
  type CvForm,
  type FieldDef,
  type FormItem,
  type FormValue,
  type ListSection,
} from '../features/editor/form'

export function EditorPage() {
  usePageTitle('Edit portfolio')
  const { user } = useAuth()
  const userId = user!.id
  const mine = useQuery({ queryKey: ['my-portfolio', userId], queryFn: () => fetchMyPortfolio(userId) })

  if (mine.isPending) return <div className="container-page py-16 text-center text-muted" role="status">Loading your portfolio…</div>
  if (mine.isError) {
    return (
      <div className="container-page py-10">
        <StatusMessage title="Could not load your portfolio." tone="error" action={<button className="btn-secondary" onClick={() => mine.refetch()}>Try again</button>}>
          Check your connection. If this keeps happening, the database update for the portfolio may not have run yet.
        </StatusMessage>
      </div>
    )
  }
  return <Editor key={userId} userId={userId} row={mine.data} />
}

function Editor({ userId, row }: { userId: string; row: PortfolioRow | null }) {
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [draft, setDraft] = useState<Draft | null>(() => (params.get('start') === 'blank' ? null : loadDraft()))
  const saved = row ? normalizeCv(row.content) : emptyCv
  const [form, setForm] = useState<CvForm>(() => toForm(draft?.cv ?? saved))
  const [slug, setSlug] = useState(row?.slug ?? '')
  const [published, setPublished] = useState(row?.published ?? false)
  const snapshot = (cv: unknown, s: string | null, p: boolean) => JSON.stringify([cv, s || null, p])
  const [savedSnapshot, setSavedSnapshot] = useState(() => (row ? snapshot(saved, row.slug, row.published) : ''))
  const [savedSlug, setSavedSlug] = useState(row?.published ? row.slug : null)
  const [tab, setTab] = useState<'profile' | ListSection>('profile')
  const [problem, setProblem] = useState<string | null>(null)
  // Last removal that can still be undone (removing the résumé, clearing all fields).
  const [undo, setUndo] = useState<{ message: string; form: CvForm; draft: Draft | null } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const current = useMemo(() => fromForm(form), [form])
  const dirty = snapshot(current, slug, published) !== savedSnapshot

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: (address: string | null) => saveMyPortfolio(userId, current, address, published),
    onSuccess: (row) => {
      setSavedSnapshot(snapshot(normalizeCv(row.content), row.slug, row.published))
      setSlug(row.slug ?? '')
      setSavedSlug(row.published ? row.slug : null)
      clearDraft()
      setDraft(null)
      queryClient.setQueryData(['my-portfolio', userId], row)
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setProblem(null)
    if (!current.name) return setProblem('Add your full name (Profile tab) before saving.')
    // Suggest an address from the name the first time.
    const address = slug.trim() || (published ? slugify(current.name) : '')
    if (address) {
      const issue = slugProblem(address)
      if (issue) return setProblem(`Public address: ${issue}`)
    }
    if (published && !address) return setProblem('Choose a public address before publishing.')
    setSlug(address)
    save.mutate(address || null)
  }

  /** Drops the uploaded résumé: back to the saved portfolio, or an empty one. */
  function removeResume() {
    setUndo({ message: row ? 'Résumé removed. Showing your saved portfolio.' : 'Résumé removed.', form, draft })
    setNotice(null)
    clearDraft()
    setDraft(null)
    setForm(toForm(saved))
  }

  /** Empties every field. Nothing changes online until Save. */
  function clearAll() {
    setUndo({ message: 'All fields cleared. Nothing changes on your public page until you press Save.', form, draft })
    setNotice(null)
    setForm(toForm(emptyCv))
  }

  function undoLast() {
    if (!undo) return
    setForm(undo.form)
    if (undo.draft) {
      saveDraft(undo.draft.cv, undo.draft.source)
      setDraft(undo.draft)
    }
    setUndo(null)
  }

  const remove = useMutation({
    mutationFn: () => deleteMyPortfolio(userId),
    onSuccess: () => {
      clearDraft()
      setDraft(null)
      setUndo(null)
      setForm(toForm(emptyCv))
      setSlug('')
      setPublished(false)
      setSavedSnapshot('')
      setSavedSlug(null)
      setTab('profile')
      setNotice('Your portfolio was deleted. Its public address no longer works and is free for anyone to use.')
      queryClient.setQueryData(['my-portfolio', userId], null)
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })
  const hasSaved = savedSnapshot !== ''

  const setProfile = (key: string, value: FormValue) => setForm((f) => ({ ...f, profile: { ...f.profile, [key]: value } }))
  const setList = (key: ListSection, items: FormItem[]) => setForm((f) => ({ ...f, lists: { ...f.lists, [key]: items } }))

  const tabs: { key: 'profile' | ListSection; label: string }[] = [{ key: 'profile', label: 'Profile' }, ...SECTIONS.map((s) => ({ key: s.key, label: s.label }))]
  const section = SECTIONS.find((s) => s.key === tab)
  const isEmpty = !current.name && current.experience.length === 0 && current.education.length === 0

  return (
    <form onSubmit={onSubmit} className="container-page max-w-5xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your portfolio · <Link to="/account" className="link normal-case tracking-normal">account</Link></p>
          <h1 className="display mt-1 text-5xl">Edit <em className="text-brand-italic">portfolio.</em></h1>
        </div>
        {savedSlug && <Link to={`/p/${savedSlug}`} className="link text-sm" target="_blank">View your portfolio ↗</Link>}
      </div>

      {draft && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          <p className="flex-1">
            <strong>Filled in from {draft.source}.</strong> Check each tab, then press Save.
            {row && ' Saving replaces your current portfolio.'}
          </p>
          <button type="button" className="btn-secondary h-9 py-0" onClick={removeResume}>Remove résumé</button>
        </div>
      )}
      {undo && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
          <p className="flex-1">{undo.message}</p>
          <button type="button" className="btn-secondary h-9 py-0" onClick={undoLast}>Undo</button>
          <button type="button" className="btn-quiet" aria-label="Dismiss" onClick={() => setUndo(null)}>✕</button>
        </div>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">{notice}</p>
      )}
      {!draft && !undo && isEmpty && (
        <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          Have a résumé? <Link to="/create" className="link font-semibold">Upload it</Link> and we will fill this in for you.
        </p>
      )}

      <div className="sticky top-16 z-10 -mx-4 mt-6 border-y border-line bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex min-w-0 flex-1 items-center gap-1 text-sm" htmlFor="slug">
            <span className="shrink-0 text-muted">Address: /p/</span>
            <input
              id="slug"
              className="field min-w-24 flex-1 py-1.5 text-base sm:text-sm"
              placeholder={slugify(current.name) || 'your-name'}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40))}
              autoCapitalize="off"
              spellCheck={false}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published
          </label>
          <span className="text-xs text-muted" role="status">
            {save.isPending ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <button type="submit" className="btn-primary" disabled={save.isPending || !dirty}>Save</button>
        </div>
        {problem && <p role="alert" className="mt-2 text-sm text-danger">{problem}</p>}
        {save.isError && <p role="alert" className="mt-2 text-sm text-danger">Could not save: {(save.error as Error).message}</p>}
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Sections">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${tab === t.key ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
            {t.key !== 'profile' && <span className="ml-1 text-xs opacity-70">{form.lists[t.key].length}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {tab === 'profile' ? (
          <div className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            {PROFILE_FIELDS.map((f) => (
              <FieldInput key={f.key} id={`profile-${f.key}`} field={f} value={form.profile[f.key]} onChange={(v) => setProfile(f.key, v)} />
            ))}
          </div>
        ) : (
          section && <ListEditor section={section} items={form.lists[section.key]} onChange={(items) => setList(section.key, items)} />
        )}
      </div>

      <section aria-labelledby="start-over" className="mt-12 border-t border-line pt-6">
        <h2 id="start-over" className="label">Start over</h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <div>
            <Link to="/create" className="btn-secondary">Upload a different résumé</Link>
            <p className="mt-1 text-xs text-muted">Fills the editor again. Your page only changes when you save.</p>
          </div>
          <div>
            <button type="button" className="btn-secondary" onClick={clearAll} disabled={isEmpty && !draft}>Clear all fields</button>
            <p className="mt-1 text-xs text-muted">Empties the editor. You can undo it.</p>
          </div>
          {hasSaved && (
            <div>
              <ConfirmButton
                className="btn border border-danger/40 bg-surface text-danger hover:bg-danger/10"
                question={<>Delete your portfolio{savedSlug ? <> and take <strong>/p/{savedSlug}</strong> offline</> : ''}? This cannot be undone.</>}
                confirmLabel="Delete for good"
                onConfirm={() => remove.mutate()}
                disabled={remove.isPending}
              >
                {remove.isPending ? 'Deleting…' : 'Delete portfolio'}
              </ConfirmButton>
              <p className="mt-1 text-xs text-muted">Removes it from the site and the database.</p>
              {remove.isError && <p role="alert" className="mt-1 text-sm text-danger">Could not delete: {(remove.error as Error).message}</p>}
            </div>
          )}
        </div>
      </section>
    </form>
  )
}

function ListEditor({ section, items, onChange }: { section: (typeof SECTIONS)[number]; items: FormItem[]; onChange: (items: FormItem[]) => void }) {
  const [open, setOpen] = useState<string | null>(null)

  function move(index: number, by: number) {
    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item)
    onChange(next)
  }

  function add() {
    const item = blankItem(section)
    onChange([...items, item])
    setOpen(item._key)
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
      {items.map((item, index) => {
        const expanded = open === item._key
        return (
          <div key={item._key} className="panel">
            <div className="flex items-center gap-2 p-3 pl-4">
              <button type="button" className="flex-1 text-left font-medium" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item._key)}>
                <span aria-hidden="true" className="mr-2 inline-block w-3 text-muted">{expanded ? '▾' : '▸'}</span>
                {section.title(item)}
              </button>
              <button type="button" className="btn-quiet" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
              <button type="button" className="btn-quiet" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}>↓</button>
              <ConfirmButton className="btn-quiet hover:!text-danger" question="Remove?" confirmLabel="Remove" onConfirm={() => onChange(items.filter((i) => i._key !== item._key))}>
                Remove
              </ConfirmButton>
            </div>
            {expanded && (
              <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 sm:p-5">
                {section.fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    id={`${item._key}-${f.key}`}
                    field={f}
                    value={item[f.key]}
                    onChange={(v) => onChange(items.map((i) => (i._key === item._key ? { ...i, [f.key]: v } : i)))}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
      <button type="button" className="btn-secondary" onClick={add}>Add {section.itemLabel}</button>
    </div>
  )
}

function FieldInput({ id, field, value, onChange }: { id: string; field: FieldDef; value: FormValue; onChange: (value: FormValue) => void }) {
  const span = field.half ? '' : 'sm:col-span-2'
  const hint = field.hint && <p className="mt-1 text-xs text-muted">{field.hint}</p>

  if (field.kind === 'checkbox') {
    return (
      <label className={`inline-flex items-center gap-2 text-sm font-medium ${span}`}>
        <input id={id} type="checkbox" className="size-4 accent-[var(--accent)]" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    )
  }
  if (field.kind === 'links') {
    return (
      <fieldset className={span}>
        <legend className="mb-1 text-sm font-medium">{field.label}</legend>
        <LinksInput id={id} links={Array.isArray(value) ? value : []} onChange={onChange} />
        {hint}
      </fieldset>
    )
  }
  const multiline = field.kind === 'textarea' || field.kind === 'lines'
  return (
    <div className={span}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{field.label}</label>
      {multiline ? (
        <textarea id={id} className="field min-h-28 text-base sm:text-sm" rows={field.kind === 'lines' ? 5 : 6} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="field text-base sm:text-sm" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint}
    </div>
  )
}

function LinksInput({ id, links, onChange }: { id: string; links: CvLink[]; onChange: (links: CvLink[]) => void }) {
  const update = (index: number, patch: Partial<CvLink>) => onChange(links.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  return (
    <div className="space-y-2">
      {links.map((l, index) => (
        <div key={index} className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input aria-label="Link label" placeholder="Label" className="field text-base sm:w-40 sm:text-sm" value={l.label} onChange={(e) => update(index, { label: e.target.value })} />
          <input
            id={index === 0 ? id : undefined}
            aria-label="Link address"
            placeholder="https://…"
            type="url"
            className="field flex-1 text-base sm:text-sm"
            value={l.url}
            onChange={(e) => update(index, { url: e.target.value })}
          />
          <button type="button" className="btn-quiet" aria-label="Remove link" onClick={() => onChange(links.filter((_, i) => i !== index))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn-quiet" onClick={() => onChange([...links, { label: '', url: '' }])}>+ Add link</button>
      <p className="text-xs text-muted">Links need a full address starting with https://; others are not saved.</p>
    </div>
  )
}
