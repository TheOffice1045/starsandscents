// Shared by the admin dashboard and finance page so both report the same number.

/** Payment statuses where money was actually collected (refunds are netted out). */
export const PAID_STATUSES = ['paid', 'partially_refunded', 'refunded'];

/** Revenue an order contributes: nothing until paid, minus anything refunded. */
export function netRevenue(order: { payment_status?: string | null; total?: number | null; refunded_amount?: number | null }) {
  if (!order.payment_status || !PAID_STATUSES.includes(order.payment_status)) return 0;
  return Number(order.total || 0) - Number(order.refunded_amount || 0);
}
