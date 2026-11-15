import { Link } from 'react-router'
import { usePortfolio } from '../../app/PortfolioLayout'
import { usePersonHead } from '../../lib/usePageTitle'
import { Chips, ExternalLinks, HostedLink, SectionTitle } from '../../components/ui'
import { WebImage } from '../../features/links/LinkFields'
import { dateRange } from '../../content/normalize'

/** "Jane Wanjiru Doe" → ["Jane Wanjiru", "Doe"], for the italic accent. */
function splitName(name: string): [string, string] {
  const i = name.lastIndexOf(' ')
  return i > 0 ? [name.slice(0, i), name.slice(i + 1)] : ['', name]
}

export function OverviewPage() {
  const { cv, basePath } = usePortfolio()
  usePersonHead(cv.name)
  const [first, last] = splitName(cv.name)
  const featured = cv.projects.filter((p) => p.featured).slice(0, 3)
  const recent = cv.experience.slice(0, 3)
  const topSkills = cv.skills.flatMap((s) => s.items).slice(0, 14)

  return (
    <div className="container-page">
      <section className="py-14 sm:py-20" aria-labelledby="intro">
        {cv.photo && (
          <WebImage src={cv.photo} alt={cv.name} className="mb-6 size-24 rounded-full border border-line object-cover sm:size-28" />
        )}
        {cv.status && <p className="eyebrow">{cv.status}</p>}
        <h1 id="intro" className="display mt-3 text-6xl leading-[0.95] sm:text-8xl">
          {first} <em className="text-brand-italic">{last}</em>
        </h1>
        <p className="mt-4 text-xl text-ink sm:text-2xl">
          {cv.headline}
          {cv.location && <span className="text-muted"> · {cv.location}</span>}
        </p>
        {cv.summary && <p className="mt-6 max-w-3xl text-lg text-muted">{cv.summary}</p>}
        <div className="no-print mt-8 flex flex-wrap gap-3">
          {cv.projects.length > 0 && <Link to={`${basePath}/projects`} className="btn-primary h-11 px-5 text-base">View projects</Link>}
          <Link to={`${basePath}/contact`} className={`${cv.projects.length > 0 ? 'btn-secondary' : 'btn-primary'} h-11 px-5 text-base`}>Get in touch</Link>
          <button type="button" className="btn-quiet h-11 px-3" onClick={() => window.print()}>Print / save as PDF</button>
        </div>
        <ExternalLinks links={cv.links} className="mt-6" />
      </section>

      {featured.length > 0 && (
        <section className="py-8" aria-labelledby="featured">
          <div className="flex items-baseline justify-between gap-4">
            <SectionTitle id="featured">Featured <em className="text-brand-italic">work</em></SectionTitle>
            <Link to={`${basePath}/projects`} className="link no-print text-sm">All projects →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((p) => (
              <article key={p.title} className="panel flex flex-col overflow-hidden">
                <WebImage src={p.image} alt="" className="aspect-video w-full border-b border-line object-cover" />
                <div className="flex flex-1 flex-col p-5">
                <h3 className="display text-2xl">{p.title}</h3>
                {p.subtitle && <p className="text-sm text-muted">{p.subtitle}</p>}
                <p className="mt-3 line-clamp-5 flex-1 text-sm">{p.description}</p>
                <div className="mt-4"><Chips items={p.tech.slice(0, 5)} label={`${p.title} technologies`} /></div>
                <HostedLink link={p.links[0]} className="mt-3" />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-10 py-8 md:grid-cols-2">
        {recent.length > 0 && (
          <section aria-labelledby="recent">
            <SectionTitle id="recent">Recent <em className="text-brand-italic">experience</em></SectionTitle>
            <ol className="space-y-4 border-l-2 border-accent-soft pl-5">
              {recent.map((e) => (
                <li key={`${e.role}-${e.org}`}>
                  <p className="text-xs text-muted">{dateRange(e.start, e.end)}</p>
                  <p className="font-semibold">{e.role}</p>
                  <p className="text-sm text-muted">{e.org}</p>
                </li>
              ))}
            </ol>
            <Link to={`${basePath}/experience`} className="link no-print mt-4 inline-block text-sm">Full experience & education →</Link>
          </section>
        )}
        {topSkills.length > 0 && (
          <section aria-labelledby="skills">
            <SectionTitle id="skills">Core <em className="text-brand-italic">skills</em></SectionTitle>
            <Chips items={topSkills} label="Core skills" />
            <Link to={`${basePath}/skills`} className="link no-print mt-4 inline-block text-sm">Skills & certifications →</Link>
          </section>
        )}
      </div>

      {cv.testimonials[0] && (
        <section className="py-8" aria-label="Recommendation">
          <figure className="panel p-6 sm:p-8">
            <blockquote className="display text-2xl leading-snug sm:text-3xl">“{cv.testimonials[0].quote}”</blockquote>
            <figcaption className="mt-4 text-sm text-muted">
              <span className="font-semibold text-ink">{cv.testimonials[0].name}</span>
              {cv.testimonials[0].title && `, ${cv.testimonials[0].title}`}
            </figcaption>
          </figure>
        </section>
      )}
    </div>
  )
}
