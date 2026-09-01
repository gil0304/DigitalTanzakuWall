import type { Backend } from '../types';
import { createLocalBackend } from './local';
import { createSupabaseBackend } from './supabase';

export function createBackend(): Backend {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    return createSupabaseBackend(url, anonKey);
  }
  console.info(
    '[tanzaku] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が未設定のため、ローカルデモモードで動作します。',
  );
  return createLocalBackend();
}
