import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';
import { PAGES, getSection, sanitizeSection } from '@/lib/site-content';

// Save one Site Content section. Owner/Admin only (also enforced by RLS).
export async function PUT(req: Request) {
  const auth = await requireAdmin(['Owner', 'Admin']);
  if (!auth.ok) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const section = getSection(body?.key);
  const content = section ? sanitizeSection(section.key, body?.content) : null;
  if (!section || !content) {
    return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
  }

  const page = PAGES.find((p) => p.key === section.page)!;
  const supabase = createClient();
  const { error } = await supabase.from('site_content').upsert({
    id: section.key,
    title: `${page.label}: ${section.title}`,
    content,
    updated_at: new Date().toISOString(),
    updated_by: auth.admin.userId,
  });

  if (error) {
    console.error('Site content save failed', error);
    const missing = error.code === '42P01' || /site_content/.test(error.message ?? '');
    return NextResponse.json(
      { error: missing ? 'Site content table is missing: apply the site_content migration.' : 'Save failed' },
      { status: 500 }
    );
  }

  revalidatePath(page.path);
  return NextResponse.json({ ok: true, content });
}
