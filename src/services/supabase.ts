import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://phiboawjlfnzlrdcsddv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__YBsSRjB6iQMqGZKEfhAeA_WLMzObDU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    console.error('Supabase Google OAuth error:', error.message);
  }
  return { data, error };
}

export async function signOutSupabase() {
  await supabase.auth.signOut();
}
