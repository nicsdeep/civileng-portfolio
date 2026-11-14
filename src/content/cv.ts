import type { Cv } from './types'

/**
 * Bundled CV, taken from Nicholas's résumé (November 2026).
 *
 * The public site shows this until a portfolio is published from /editor,
 * and falls back to it if the database cannot be reached. Editing in /editor
 * does not change this file.
 */
export const bundledCv: Cv = {
  name: 'Nicholas Kinyae Kioko',
  headline: 'Full-stack & AI engineer',
  location: 'Nairobi, Kenya',
  status: 'Final-year Applied Computer Science student · graduating November 2026',
  email: 'nicsdavid@gmail.com',
  phone: '',
  summary:
    'Full-stack developer and final-year Applied Computer Science student who builds end-to-end, AI-powered applications. ' +
    'I work in Python (FastAPI), TypeScript and JavaScript (Next.js, React) and PostgreSQL, and I use AI-assisted tools ' +
    'such as Cursor and GitHub Copilot to ship quality code efficiently. I built and deployed MedMatch AI, a healthcare ' +
    'provider–facility matching platform powered by Google Gemini. I am looking for full-stack AI engineering roles.',
  links: [
    { label: 'GitHub', url: 'https://github.com/nicsdee' },
    { label: 'MedMatch AI (live)', url: 'https://med-match-ai.vercel.app' },
  ],
  skills: [
    { group: 'Languages & back end', items: ['Python (FastAPI)', 'TypeScript / JavaScript', 'SQL', 'Node.js', 'REST APIs'] },
    { group: 'Front end', items: ['React', 'Next.js 14', 'Tailwind CSS'] },
    { group: 'AI & LLMs', items: ['Google Gemini / OpenAI APIs', 'Prompt engineering', 'Retrieval-augmented generation (RAG) concepts', 'AI-assisted development (Cursor, GitHub Copilot)'] },
    { group: 'Data, cloud & DevOps', items: ['PostgreSQL', 'AWS (EC2, RDS, S3)', 'Google Cloud Platform', 'Docker', 'CI/CD (GitHub Actions)', 'Git / GitHub'] },
    { group: 'Professional', items: ['Cross-functional teamwork', 'Problem-solving', 'Clear written and spoken English'] },
  ],
  experience: [
    {
      role: 'Freelance Full-Stack Developer',
      org: 'Self-employed / outsourced projects',
      location: 'Remote',
      start: '07/2022',
      end: '',
      bullets: [
        'Built full-stack web applications for outsourced client projects using Python (FastAPI) and TypeScript.',
        'Integrated LLM APIs into custom applications for AI-powered features.',
        'Deployed applications with Docker and CI/CD pipelines (GitHub Actions).',
        'Managed PostgreSQL databases for client projects.',
        'Designed and implemented REST APIs for front-end and back-end integration.',
        'Delivered projects independently, from requirements to deployment.',
      ],
    },
    {
      role: 'Competitor, International Quant Championship (IQC)',
      org: 'WorldQuant BRAIN',
      location: 'Remote',
      start: 'March 2026',
      end: 'May 2026',
      bullets: [
        'Developed predictive “alphas” (mathematical models) in Python to forecast financial market movements.',
        'Awarded Gold and Bronze certificates by WorldQuant for alpha performance.',
        'Built and tested models on the WorldQuant BRAIN platform, with access to more than 100,000 data fields.',
        'Chuka University team (2025) placed 2nd Runners Up, Best in Competition, among more than 80,000 participants worldwide.',
      ],
    },
    {
      role: 'Database Administration Trainee',
      org: 'Sideways Tours & Car Hire',
      location: 'Kenya',
      start: '08/2018',
      end: '10/2018',
      bullets: [
        'Assisted in the cloud migration of SQL databases to AWS RDS.',
        'Managed database backup, recovery and security operations.',
      ],
    },
    {
      role: 'Student Volunteer (part-time)',
      org: 'Government of Makueni County',
      location: 'Kenya',
      start: '05/2017',
      end: '07/2017',
      bullets: [
        'Supported cloud-based IT solutions for government services.',
        'Ran ICT training sessions and contributed to digital transformation.',
        'Developed internal databases and ensured compliance with data management standards.',
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor's degree, Applied Computer Science",
      school: 'Chuka University',
      location: 'Tharaka-Nithi County, Kenya',
      dates: 'Expected November 2026',
      bullets: [
        'University Mentorship Program: guided fellow students in technology and career development.',
        'Android Development Bootcamp Hackathon, Chuka University (June 2020): built innovative mobile applications.',
        'Represented Chuka University in the WorldQuant International Quant Championship (IQC) 2026.',
      ],
    },
  ],
  projects: [
    {
      title: 'MedMatch AI',
      subtitle: 'Healthcare provider–facility matching platform',
      description:
        'A production-ready healthcare staffing platform that matches healthcare providers with facility shifts using an ' +
        'AI-powered scoring algorithm based on skills, experience, role relevance and availability, achieving 85–95% match ' +
        'accuracy. Includes a real-time dashboard for managing providers, facilities and shifts, with live analytics. ' +
        'Back end on Render, front end on Vercel, with automated CI/CD through GitHub Actions.',
      tech: ['Next.js', 'TypeScript', 'FastAPI', 'PostgreSQL', 'Google Gemini', 'GitHub Actions'],
      links: [
        { label: 'Live demo', url: 'https://med-match-ai.vercel.app' },
        { label: 'Source', url: 'https://github.com/nicsdee/MedMatch-AI' },
        { label: 'API', url: 'https://medmatch-ai.onrender.com' },
      ],
      featured: true,
    },
    {
      title: 'LLM-powered alpha generation',
      subtitle: 'WorldQuant International Quant Championship 2026',
      description:
        'A system that uses large language models to generate predictive “alphas” (mathematical models that forecast ' +
        'stock market movements) in Python on the WorldQuant BRAIN platform, with access to more than 100,000 data fields. ' +
        'Earned Gold and Bronze certificates from WorldQuant for alpha performance.',
      tech: ['Python', 'LLMs', 'Quantitative finance'],
      links: [],
      featured: true,
    },
    {
      title: 'Cloud & automation projects',
      subtitle: 'Disaster recovery, multi-cloud and infrastructure as code',
      description:
        'Designed and tested a cloud disaster-recovery strategy using AWS Backup and S3 storage replication. Built a hybrid ' +
        'multi-cloud application using AWS EC2 and Google Cloud Functions for scalability and redundancy. Wrote Python ' +
        'scripts and Terraform templates to automate infrastructure provisioning, cutting setup time by 50%.',
      tech: ['AWS', 'Google Cloud', 'Terraform', 'Python'],
      links: [],
      featured: true,
    },
  ],
  certifications: [
    { name: 'Gold & Bronze certificates (alpha performance)', issuer: 'WorldQuant', date: '2026' },
    { name: 'Store Listing Certificate', issuer: 'Google Play Academy', date: '10/2024' },
    { name: 'SQL Certification', issuer: 'TestDome', date: '08/2023' },
    { name: 'Foundations of Cybersecurity', issuer: 'Google Career Certificates', date: '07/2023' },
    { name: 'Play It Safe: Manage Security Risks', issuer: 'Google Career Certificates', date: '07/2023' },
    { name: 'MongoDB Data Modeling', issuer: 'MongoDB University', date: '06/2023' },
    { name: 'MongoDB for SQL Experts', issuer: 'MongoDB University', date: '06/2023' },
    { name: 'Professional Program in Front-End Web Development', issuer: 'Microsoft', date: '10/2021' },
    { name: 'Google Ads Search Certification', issuer: 'Google', date: '' },
  ],
  interests: [
    'AI and machine learning in healthcare',
    'LLM integration for predictive modelling',
    'Full-stack development (Next.js, FastAPI, PostgreSQL)',
    'Quantitative finance and data science',
    'Cloud computing and DevOps automation',
  ],
  testimonials: [
    {
      quote:
        'Kioko is a determined young professional who undertook his assignments diligently and completed them within ' +
        'deadlines. He has strong leadership skills and contributed significantly to ICT adoption at the Government of ' +
        'Makueni County. I highly recommend him for any IT role, particularly in software development.',
      name: 'Steve Mbuvi',
      title: 'Senior System Administrator, Kenya Trade Network Agency',
    },
  ],
}

/** Empty document, used when someone other than the site owner opens the editor. */
export const emptyCv: Cv = {
  name: '',
  headline: '',
  location: '',
  status: '',
  email: '',
  phone: '',
  summary: '',
  links: [],
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  interests: [],
  testimonials: [],
}
