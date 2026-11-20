import type { ReactNode } from 'react'

/* Small line icons for the phone tab bars (24×24, current colour). */
const path = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
    {d}
  </svg>
)
export const Icons = {
  home: path(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>),
  person: path(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
  briefcase: path(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2M3 12h18" /></>),
  grid: path(<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>),
  star: path(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />),
  book: path(<><path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5z" /><path d="M12 6v14" /></>),
  mail: path(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  eye: path(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  plus: path(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>),
  pencil: path(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></>),
  upload: path(<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>),
  key: path(<><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3" /></>),
}

