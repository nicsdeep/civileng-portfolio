import { useEffect } from 'react'

const SITE = 'Nicholas Kinyae Kioko · CivilEng Portfolio'

/** Sets the browser tab title, e.g. "Projects · Nicholas Kinyae Kioko · CivilEng Portfolio". */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE
  }, [title])
}
