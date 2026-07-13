import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// `supabase` is only ever null when env vars are missing; App.tsx gates all
// rendering that touches data behind `isSupabaseConfigured` first.
export const supabase = isSupabaseConfigured ? createClient<Database>(url as string, anonKey as string) : null;
