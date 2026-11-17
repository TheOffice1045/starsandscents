import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/admin';
import { restockOrder } from '@/lib/server/restock';

// Deleting an order is destructive and affects stock, so Owner/Admin only.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(['Owner', 'Admin']);
  if (!auth.ok) return auth.response;

  const supabase = createServiceClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, payment_status, fulfillment_status')
    .eq('id', params.id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Money was taken and not given back: deleting would hide it from the books.
  if (order.payment_status === 'paid' || order.payment_status === 'partially_refunded') {
    return NextResponse.json(
      { error: 'This order has been paid. Refund it in full before deleting it.' },
      { status: 400 }
    );
  }

  // Items that never shipped go back on the shelf.
  const restockFailures = order.fulfillment_status === 'unfulfilled'
    ? await restockOrder(supabase, order.id)
    : 0;

  const { error: deleteError } = await supabase.from('orders').delete().eq('id', order.id);
  if (deleteError) {
    console.error('Error deleting order:', deleteError);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }

  return NextResponse.json({ success: true, restockFailures });
}
