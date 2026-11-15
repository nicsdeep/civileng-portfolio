import { useEffect } from 'react'

const SITE = 'CivilEng Portfolio'

/** Sets the browser tab title, e.g. "Projects · Jane Doe · CivilEng Portfolio". */
export function usePageTitle(...parts: (string | undefined)[]) {
  const title = [...parts.filter(Boolean), SITE].join(' · ')
  useEffect(() => {
    document.title = title
  }, [title])
}

/**
 * For shared portfolios: the browser tab shows only the person ("Projects · Jane Doe")
 * and their initials as the tab icon, never the platform.
 */
export function usePersonHead(name: string, section?: string) {
  const title = [section, name].filter(Boolean).join(' · ')
  useEffect(() => {
    if (!name) return
    const previousTitle = document.title
    document.title = title
    const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#072c58"/><text x="32" y="41" font-family="Georgia,serif" font-size="26" fill="#ffffff" text-anchor="middle">${initials.replace(/[<&>"]/g, '')}</text></svg>`
    const icons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'))
    const saved = icons.map((l) => l.href)
    icons.forEach((l) => (l.href = `data:image/svg+xml,${encodeURIComponent(svg)}`))
    return () => {
      document.title = previousTitle
      icons.forEach((l, i) => (l.href = saved[i]))
    }
  }, [name, title])
}
