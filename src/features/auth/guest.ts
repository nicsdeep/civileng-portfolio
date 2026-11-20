import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

/*
 * Guest publishing, for a limited time (owner's request, 2026-11-20):
 * until GUEST_UNTIL, people publish and edit without signing up. A guest is
 * a Supabase anonymous user, kept in this browser. After GUEST_UNTIL the
 * normal email sign-in returns; guests keep their portfolio and can add an
 * email on the Account page to keep it on other devices.
 */
export const GUEST_UNTIL = new Date('2026-11-27T05:30:00Z')

export function guestMode(now: number = Date.now()): boolean {
  return now < GUEST_UNTIL.getTime()
}

/** A user who has not given an email (an anonymous guest). */
export function isGuest(user: User | null | undefined): boolean {
  return Boolean(user?.is_anonymous)
}

/** Starts a guest session in this browser. Returns null if guests are not allowed. */
export async function startGuestSession(): Promise<User | null> {
  if (!guestMode()) return null
  const { data, error } = await supabase.auth.signInAnonymously()
  return error ? null : data.user
}
