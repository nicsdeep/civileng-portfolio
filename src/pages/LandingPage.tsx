import { Link } from 'react-router'
import { usePageTitle } from '../lib/usePageTitle'
import { SectionTitle } from '../components/ui'

const STEPS = [
  { title: 'Upload your résumé', text: 'PDF, Word or plain text. We read it and fill in your portfolio; nothing is public until you publish.' },
  { title: 'Check and edit', text: 'Your experience, education, projects, skills and certifications are filled in. Fix anything, add what is missing and reorder.' },
  { title: 'Publish', text: 'Choose your address, like /p/your-name, and share one link instead of a PDF. Update it whenever you like.' },
]

export function LandingPage() {
  usePageTitle()
  return (
    <div className="container-page">
      <section className="py-14 sm:py-20" aria-labelledby="intro">
        <p className="eyebrow">For engineers, students and professionals</p>
        <h1 id="intro" className="display mt-3 text-6xl leading-[0.95] sm:text-8xl">
          Your résumé, as a <em className="text-brand-italic">portfolio.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          Upload the résumé you already have and get a clean portfolio website with your experience, projects, skills and
          certifications, ready to share with employers.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/create" className="btn-primary h-11 px-5 text-base">Upload your résumé</Link>
          <Link to="/example" className="btn-secondary h-11 px-5 text-base">See an example</Link>
        </div>
      </section>

      <section className="py-8" aria-labelledby="how">
        <SectionTitle id="how">How it <em className="text-brand-italic">works</em></SectionTitle>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="panel p-5">
              <p className="display text-4xl text-brand-italic">{i + 1}</p>
              <h3 className="mt-2 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-8" aria-labelledby="ways">
        <SectionTitle id="ways">Three ways to <em className="text-brand-italic">start</em></SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/create" className="panel block p-5 transition-colors hover:border-accent">
            <h3 className="font-semibold">Upload a file</h3>
            <p className="mt-1 text-sm text-muted">PDF or Word (.docx). Works best with text-based files, not scans.</p>
          </Link>
          <Link to="/create#paste" className="panel block p-5 transition-colors hover:border-accent">
            <h3 className="font-semibold">Paste your résumé</h3>
            <p className="mt-1 text-sm text-muted">Copy the text from any document or profile and paste it in.</p>
          </Link>
          <Link to="/editor?start=blank" className="panel block p-5 transition-colors hover:border-accent">
            <h3 className="font-semibold">Start from scratch</h3>
            <p className="mt-1 text-sm text-muted">Fill in a guided form, section by section.</p>
          </Link>
        </div>
      </section>
    </div>
  )
}
