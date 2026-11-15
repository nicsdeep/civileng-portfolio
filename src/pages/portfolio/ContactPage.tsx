import { usePortfolio } from '../../app/PortfolioLayout'
import { usePersonHead } from '../../lib/usePageTitle'
import { ExternalLinks, PageHeading } from '../../components/ui'

export function ContactPage() {
  const { cv } = usePortfolio()
  usePersonHead(cv.name, 'Contact')
  const tel = cv.phone.replace(/[^\d+]/g, '')

  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeading eyebrow="Contact" title="Let's" accent="talk.">
        {cv.status || 'Get in touch about roles, projects and collaborations.'}
      </PageHeading>

      <div className="panel space-y-5 p-6 sm:p-8">
        {cv.email && (
          <div>
            <p className="label">Email</p>
            <a href={`mailto:${cv.email}`} className="link text-xl font-medium break-all">{cv.email}</a>
          </div>
        )}
        {tel && (
          <div>
            <p className="label">Phone</p>
            <a href={`tel:${tel}`} className="link text-lg">{cv.phone}</a>
          </div>
        )}
        {cv.location && (
          <div>
            <p className="label">Based in</p>
            <p className="text-lg">{cv.location}</p>
          </div>
        )}
        {cv.links.length > 0 && (
          <div>
            <p className="label">Elsewhere</p>
            <ExternalLinks links={cv.links} />
          </div>
        )}
        {cv.email && (
          <a href={`mailto:${cv.email}?subject=${encodeURIComponent('Hello from your portfolio')}`} className="btn-primary no-print h-11 px-5 text-base">
            Send an email
          </a>
        )}
      </div>
    </div>
  )
}
