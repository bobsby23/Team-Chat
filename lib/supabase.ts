import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Returns a singleton Supabase client for client-side use,
 * or `null` if NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.
 */
let browserClient: SupabaseClient | null | undefined // undefined ⇒ not initialised

function initBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn(
      "[Supabase Client] Environment variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.\n" +
        "Realtime features (client-side) will be disabled until they are provided.",
    )
    return null
  }
  return createClient(url, key)
}

export function getSupabaseClient() {
  if (browserClient === undefined) browserClient = initBrowserClient()
  return browserClient
}

/**
 * Returns a singleton Supabase client for server-side use (API routes, Server Actions),
 * or `null` if SUPABASE_URL / SUPABASE_ANON_KEY are missing.
 */
let serverClient: SupabaseClient | null | undefined

function initServerClient() {
  const url = process.env.SUPABASE_URL // No NEXT_PUBLIC_ prefix for server-side
  const key = process.env.SUPABASE_ANON_KEY // No NEXT_PUBLIC_ prefix for server-side

  if (!url || !key) {
    console.error(
      "[Supabase Server Client] Environment variables SUPABASE_URL / SUPABASE_ANON_KEY are missing.\n" +
        "API routes interacting with Supabase will fail until they are provided.",
    )
    return null
  }
  return createClient(url, key)
}

export function getSupabaseServerClient() {
  if (serverClient === undefined) serverClient = initServerClient()
  return serverClient
}
