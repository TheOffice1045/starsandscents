import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/admin';

const BUCKET = 'site-content';
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// Upload an image for Site Content. Owner/Admin only; returns its public URL.
export async function POST(req: Request) {
  const auth = await requireAdmin(['Owner', 'Admin']);
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Use a JPG, PNG, WebP or GIF image' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be 5 MB or smaller' }, { status: 400 });
  }

  const path = `${new Date().getFullYear()}/${randomUUID()}.${ext}`;
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });

  if (error) {
    console.error('Site content upload failed', error);
    const missing = /bucket/i.test(error.message ?? '');
    return NextResponse.json(
      { error: missing ? 'Image storage is missing: apply the site_content migration.' : 'Upload failed' },
      { status: 500 }
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
