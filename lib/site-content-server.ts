import { createClient } from '@/lib/supabase/server';
import { withDefaults, type SectionKey } from '@/lib/site-content';

/**
 * Load sections for a public page, merged over their defaults. Never throws:
 * if the table is missing or the query fails, the page renders its original copy.
 */
export async function getSiteContent<K extends SectionKey>(keys: K[]): Promise<Record<K, any>> {
  const saved: Record<string, unknown> = {};
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('site_content').select('id, content').in('id', keys);
    if (error) {
      console.error('getSiteContent:', error.message);
    } else {
      for (const row of data ?? []) saved[row.id] = row.content;
    }
  } catch (err) {
    console.error('getSiteContent failed', err);
  }
  const out = {} as Record<K, any>;
  for (const key of keys) out[key] = withDefaults(key, saved[key]);
  return out;
}
