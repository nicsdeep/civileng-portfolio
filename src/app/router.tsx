import { createBrowserRouter } from 'react-router'
import { Layout } from './Layout'
import { ExampleLayout, PortfolioLayout } from './PortfolioLayout'
import { LandingPage } from '../pages/LandingPage'
import { CreatePage } from '../pages/CreatePage'
import { OverviewPage } from '../pages/portfolio/OverviewPage'
import { ExperiencePage } from '../pages/portfolio/ExperiencePage'
import { ProjectsPage } from '../pages/portfolio/ProjectsPage'
import { SkillsPage } from '../pages/portfolio/SkillsPage'
import { ContactPage } from '../pages/portfolio/ContactPage'
import { EditorPage } from '../pages/EditorPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PrivacyPage } from '../pages/PrivacyPage'
import { FinishPage, MePage } from '../pages/FinishPage'
import { SignInPage } from '../pages/auth/SignInPage'
import { SignUpPage } from '../pages/auth/SignUpPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { AccountPage } from '../pages/auth/AccountPage'
import { RequireAuth } from '../features/auth/RequireAuth'

/** The pages of one portfolio, shared by /p/:slug and /example. */
const portfolioPages = [
  { index: true, element: <OverviewPage /> },
  { path: 'experience', element: <ExperiencePage /> },
  { path: 'projects', element: <ProjectsPage /> },
  { path: 'skills', element: <SkillsPage /> },
  { path: 'contact', element: <ContactPage /> },
]

export const router = createBrowserRouter([
  // Shared portfolios stand alone: no platform header, footer or menus.
  { path: '/p/:slug', element: <PortfolioLayout />, children: portfolioPages },
  { path: '/example', element: <ExampleLayout />, children: portfolioPages },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/create', element: <CreatePage /> },
      { path: '/finish', element: <RequireAuth><FinishPage /></RequireAuth> },
      { path: '/me', element: <RequireAuth><MePage /></RequireAuth> },
      { path: '/editor', element: <RequireAuth><EditorPage /></RequireAuth> },
      { path: '/account', element: <RequireAuth><AccountPage /></RequireAuth> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-up', element: <SignUpPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
