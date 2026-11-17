import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Put an order's items back into stock, once. Only items with a product_id were
 * taken out of stock in the first place (Stripe checkout). Marks the order
 * stock_restored so a later refund or delete can't restock it again.
 * Returns the number of items that failed to restock.
 */
export async function restockOrder(supabase: SupabaseClient, orderId: string): Promise<number> {
  const { data: claimed, error: claimError } = await supabase
    .from('orders')
    .update({ stock_restored: true })
    .eq('id', orderId)
    .eq('stock_restored', false)
    .select('id');

  // Already restored (or the order vanished): nothing to do.
  if (claimError || !claimed || claimed.length === 0) {
    if (claimError) console.error('restockOrder: could not claim order', claimError);
    return 0;
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId)
    .neq('status', 'cancelled')
    .not('product_id', 'is', null);

  let failures = 0;
  for (const item of items ?? []) {
    // update_product_stock subtracts, so a negative quantity adds stock back.
    const { error } = await supabase.rpc('update_product_stock', {
      p_product_id: item.product_id,
      p_quantity: -(item.quantity || 1),
    });
    if (error) {
      failures++;
      console.error('Restock failed', { productId: item.product_id, error });
    }
  }
  return failures;
}
