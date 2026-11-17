import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { fetchMovedSlug, fetchMyPortfolio, fetchPortfolioBySlug } from './api'

/** A portfolio by its public address (cached). */
export function usePortfolioBySlug(slug: string) {
  return useQuery({ queryKey: ['portfolio', slug], queryFn: () => fetchPortfolioBySlug(slug) })
}

/** The signed-in user's own portfolio (cached), or null when signed out or none yet. */
export function useMyPortfolio() {
  const { user } = useAuth()
  const userId = user?.id
  return useQuery({
    queryKey: ['my-portfolio', userId],
    queryFn: () => fetchMyPortfolio(userId!),
    enabled: Boolean(userId),
  })
}

/** For an address with no portfolio: the address it moved to, if any. */
export function useMovedSlug(slug: string, enabled: boolean) {
  return useQuery({ queryKey: ['moved', slug], queryFn: () => fetchMovedSlug(slug), enabled })
}
