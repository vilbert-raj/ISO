import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Shared team database. When the two environment variables are not set
 * (e.g. running locally without a .env file) the app falls back to
 * browser-only storage with demo data.
 */
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;

export const TEAM_MODE = supabase !== null;

/** Email sign-in. Off for now (VITE_REQUIRE_LOGIN=false): anyone with the link can use the app.
 *  To switch it back on, set VITE_REQUIRE_LOGIN=true and run supabase/restore-login.sql. */
export const REQUIRE_LOGIN = TEAM_MODE && import.meta.env.VITE_REQUIRE_LOGIN === 'true';
