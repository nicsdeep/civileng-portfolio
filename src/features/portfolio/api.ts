import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { normalizeCv } from '../../content/normalize'
import type { Cv } from '../../content/types'

export interface PortfolioRow {
  user_id: string
  slug: string | null
  published: boolean
  content: unknown
  updated_at: string
}

export interface PublicPortfolio {
  cv: Cv
  /** Base path of this portfolio's pages, e.g. "/p/jane-doe" or "/example". */
  basePath: string
  updatedAt: string | null
}

/** Public addresses: lowercase letters, digits and single hyphens, 3–40 characters (mirrors the database rule). */
export function slugProblem(slug: string): string | null {
  if (slug.length < 3) return 'Use at least 3 characters.'
  if (slug.length > 40) return 'Use at most 40 characters.'
  if (!/^[a-z0-9-]+$/.test(slug)) return 'Use only lowercase letters, numbers and hyphens.'
  if (/^-|-$/.test(slug) || slug.includes('--')) return 'Hyphens go between words only.'
  return null
}

/** A published portfolio by its public address, or null if there is none. */
export async function fetchPortfolioBySlug(slug: string): Promise<PublicPortfolio | null> {
  if (slugProblem(slug)) return null
  const { data, error } = await supabase
    .from('pf_profiles')
    .select('content, updated_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { cv: normalizeCv(data.content), basePath: `/p/${slug}`, updatedAt: data.updated_at as string }
}

export function usePortfolioBySlug(slug: string) {
  return useQuery({ queryKey: ['portfolio', slug], queryFn: () => fetchPortfolioBySlug(slug) })
}

const COLUMNS = 'user_id, slug, published, content, updated_at'

/** The signed-in user's own portfolio row (published or not), or null. */
export async function fetchMyPortfolio(userId: string): Promise<PortfolioRow | null> {
  const { data, error } = await supabase.from('pf_profiles').select(COLUMNS).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as PortfolioRow | null
}

export class SaveError extends Error {}

export async function saveMyPortfolio(userId: string, cv: Cv, slug: string | null, published: boolean): Promise<PortfolioRow> {
  const { data, error } = await supabase
    .from('pf_profiles')
    .upsert({ user_id: userId, content: normalizeCv(cv), slug, published }, { onConflict: 'user_id' })
    .select(COLUMNS)
    .single()
  if (error) {
    if (error.code === '23505') throw new SaveError('That public address is already taken. Try another one.')
    if (error.code === '23514') throw new SaveError('Check the public address: use 3–40 lowercase letters, numbers and hyphens.')
    throw new SaveError(error.message)
  }
  return data as PortfolioRow
}
