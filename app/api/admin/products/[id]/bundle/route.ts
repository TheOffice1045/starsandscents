import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Replace a bundle's contents. An empty list makes it a normal product again.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!UUID.test(params.id)) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const raw: unknown[] = Array.isArray(body?.items) ? body.items : [];
  if (raw.length > 20) {
    return NextResponse.json({ error: 'A bundle can hold at most 20 different candles' }, { status: 400 });
  }

  const merged = new Map<string, number>();
  for (const entry of raw as any[]) {
    const productId = String(entry?.product_id ?? '');
    const quantity = Math.floor(Number(entry?.quantity));
    if (!UUID.test(productId) || !(quantity >= 1 && quantity <= 100)) {
      return NextResponse.json({ error: 'Each candle needs a product and a quantity from 1 to 100' }, { status: 400 });
    }
    if (productId === params.id) {
      return NextResponse.json({ error: 'A bundle cannot contain itself' }, { status: 400 });
    }
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  const items = Array.from(merged, ([product_id, quantity]) => ({ product_id, quantity }));

  const supabase = createClient();
  const { error } = await supabase.rpc('set_bundle_items', { p_bundle_id: params.id, p_items: items });
  if (error) {
    console.error('Saving bundle failed', error);
    const message = /bundle/i.test(error.message ?? '') && error.code === 'P0001'
      ? error.message
      : error.code === '42883' || error.code === 'PGRST202'
        ? 'Bundles are not set up in the database yet: apply the product_bundles migration.'
        : 'Saving the bundle failed';
    return NextResponse.json({ error: message }, { status: error.code === 'P0001' ? 400 : 500 });
  }

  const { data: product } = await supabase.from('products').select('quantity').eq('id', params.id).maybeSingle();
  return NextResponse.json({ ok: true, items, available: product?.quantity ?? 0 });
}
