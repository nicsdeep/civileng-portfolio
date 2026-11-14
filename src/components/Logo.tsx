import { Link } from 'react-router'

/** Official CivilEng mark (arch bridge over an open book), shared with ResearchHub. */
export function BrandMark({ className = '' }: { className?: string }) {
  return <img src="/logo-mark.svg" alt="" width={1116} height={707} className={`brand-mark h-auto ${className}`} />
}

export function Logo() {
  return (
    <Link to="/" aria-label="CivilEng Portfolio, home" className="inline-flex items-center gap-2 text-ink">
      <BrandMark className="w-11 sm:w-12" />
      <span className="display text-[1.4rem] leading-none whitespace-nowrap sm:text-2xl">
        <span className="text-brand-navy">CivilEng</span> <em className="text-brand-italic">Portfolio</em>
      </span>
    </Link>
  )
}
