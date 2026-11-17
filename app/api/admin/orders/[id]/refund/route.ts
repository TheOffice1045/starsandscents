import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/admin';
import { restockOrder } from '@/lib/server/restock';

// Moves money, so Managers are excluded.
const REFUND_ROLES = ['Owner', 'Admin'] as const;
const REFUNDABLE = ['paid', 'partially_refunded'];

const toCents = (amount: number) => Math.round(amount * 100);

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin([...REFUND_ROLES]);
  if (!auth.ok) return auth.response;

  let body: { amount?: number; restock?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const supabase = createServiceClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, total, payment_status, payment_intent_id, refunded_amount')
    .eq('id', params.id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!REFUNDABLE.includes(order.payment_status)) {
    return NextResponse.json(
      { error: `Only paid orders can be refunded (this order is "${order.payment_status}").` },
      { status: 400 }
    );
  }

  const totalCents = toCents(Number(order.total));
  const alreadyRefundedCents = toCents(Number(order.refunded_amount ?? 0));
  const remainingCents = totalCents - alreadyRefundedCents;

  const amountCents = body.amount === undefined ? remainingCents : toCents(Number(body.amount));

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Refund amount must be greater than zero.' }, { status: 400 });
  }
  if (amountCents > remainingCents) {
    return NextResponse.json(
      { error: `Refund exceeds what is left to refund ($${(remainingCents / 100).toFixed(2)}).` },
      { status: 400 }
    );
  }

  // Orders paid outside Stripe (Venmo/Zelle/cash) have no payment intent: we can
  // only record the refund; the money has to be sent back by hand.
  let stripeRefundId: string | null = null;
  if (order.payment_intent_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
      const refund = await stripe.refunds.create(
        {
          payment_intent: order.payment_intent_id,
          amount: amountCents,
          reason: 'requested_by_customer',
          metadata: { order_id: order.id, refunded_by: auth.admin.userId },
        },
        // Same order + same prior total + same amount = same refund, so a double-click
        // or retry can't refund twice.
        { idempotencyKey: `refund_${order.id}_${alreadyRefundedCents}_${amountCents}` }
      );
      stripeRefundId = refund.id;
    } catch (error: any) {
      console.error('Stripe refund failed:', error);
      return NextResponse.json(
        { error: `Stripe refused the refund: ${error.message ?? 'unknown error'}` },
        { status: 502 }
      );
    }
  }

  const newRefundedCents = alreadyRefundedCents + amountCents;
  const isFull = newRefundedCents >= totalCents;
  const newPaymentStatus = isFull ? 'refunded' : 'partially_refunded';

  // Optimistic lock on refunded_amount so two concurrent refunds can't both
  // record against the same starting balance.
  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      refunded_amount: newRefundedCents / 100,
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('refunded_amount', order.refunded_amount ?? 0)
    .select('id');

  if (updateError || !updated || updated.length === 0) {
    console.error('Refund issued but order update failed', { orderId: order.id, stripeRefundId, updateError });
    return NextResponse.json(
      {
        error: stripeRefundId
          ? `The Stripe refund (${stripeRefundId}) went through, but the order could not be updated. Do NOT retry; update the order manually.`
          : 'The order changed while refunding. Reload and try again.',
      },
      { status: stripeRefundId ? 500 : 409 }
    );
  }

  await supabase.from('order_history').insert({
    order_id: order.id,
    status_from: order.payment_status,
    status_to: newPaymentStatus,
    notes: `Refunded $${(amountCents / 100).toFixed(2)}${stripeRefundId ? ` via Stripe (${stripeRefundId})` : ' (recorded manually; no Stripe payment on file)'}`,
    created_by: auth.admin.userId,
  });

  // Put stock back only on a full refund (partial refunds aren't tied to items).
  const restockFailures = body.restock && isFull ? await restockOrder(supabase, order.id) : 0;

  return NextResponse.json({
    success: true,
    paymentStatus: newPaymentStatus,
    refundedAmount: newRefundedCents / 100,
    stripeRefundId,
    manual: !stripeRefundId,
    restockFailures,
  });
}
