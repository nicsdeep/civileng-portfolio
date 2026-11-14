import { useQuery } from '@tanstack/react-query'
import { portfolioOwnerId, supabase } from '../../lib/supabase'
import { bundledCv } from '../../content/cv'
import { normalizeCv } from '../../content/normalize'
import type { Cv } from '../../content/types'

export interface PortfolioRow {
  user_id: string
  published: boolean
  content: unknown
  updated_at: string
}

export interface PublicPortfolio {
  cv: Cv
  /** Where the content came from; "bundled" also covers database errors. */
  source: 'database' | 'bundled'
  updatedAt: string | null
}

const bundled: PublicPortfolio = { cv: bundledCv, source: 'bundled', updatedAt: null }

/** Fetches the owner's published portfolio, falling back to the bundled CV. */
export async function fetchPublicPortfolio(ownerId: string | null = portfolioOwnerId): Promise<PublicPortfolio> {
  if (!ownerId) return bundled
  const { data, error } = await supabase
    .from('pf_profiles')
    .select('content, updated_at')
    .eq('user_id', ownerId)
    .eq('published', true)
    .maybeSingle()
  if (error || !data) return bundled
  const cv = normalizeCv(data.content)
  // A published but empty document would blank the site; keep the CV instead.
  if (!cv.name) return bundled
  return { cv, source: 'database', updatedAt: data.updated_at as string }
}

export function usePublicPortfolio() {
  return useQuery({
    queryKey: ['portfolio', portfolioOwnerId],
    // Never leave the page empty: show the bundled CV if anything goes wrong.
    queryFn: () => fetchPublicPortfolio().catch(() => bundled),
  })
}

/** The signed-in user's own portfolio row (published or not), or null. */
export async function fetchMyPortfolio(userId: string): Promise<PortfolioRow | null> {
  const { data, error } = await supabase
    .from('pf_profiles')
    .select('user_id, published, content, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as PortfolioRow | null
}

export async function saveMyPortfolio(userId: string, cv: Cv, published: boolean): Promise<PortfolioRow> {
  const { data, error } = await supabase
    .from('pf_profiles')
    .upsert({ user_id: userId, content: normalizeCv(cv), published }, { onConflict: 'user_id' })
    .select('user_id, published, content, updated_at')
    .single()
  if (error) throw error
  return data as PortfolioRow
}
