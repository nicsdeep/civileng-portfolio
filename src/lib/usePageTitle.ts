import { useEffect } from 'react'

const SITE = 'CivilEng Portfolio'

/** Sets the browser tab title, e.g. "Projects · Jane Doe · CivilEng Portfolio". */
export function usePageTitle(...parts: (string | undefined)[]) {
  const title = [...parts.filter(Boolean), SITE].join(' · ')
  useEffect(() => {
    document.title = title
  }, [title])
}
