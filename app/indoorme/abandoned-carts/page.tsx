"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Mail, EyeOff } from "lucide-react";
import { AdminButton } from "@/components/ui/admin-button";
import { formatPrice } from "@/lib/utils";

type AbandonedCheckout = {
  id: string;
  stripe_session_id: string;
  customer_email: string | null;
  customer_name: string | null;
  amount_total: number;
  items: { name: string; quantity: number; amount: number }[];
  started_at: string | null;
  expired_at: string;
  contacted_at: string | null;
  dismissed: boolean;
};

// Filled by the Stripe webhook when a checkout session expires unpaid.
export default function AbandonedCartsPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [rows, setRows] = useState<AbandonedCheckout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("abandoned_checkouts")
      .select("*")
      .eq("dismissed", false)
      .order("expired_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Error loading abandoned checkouts:", error);
      toast.error("Failed to load abandoned carts");
    } else {
      setRows(data as AbandonedCheckout[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const update = async (id: string, changes: Partial<AbandonedCheckout>) => {
    const { error } = await supabase.from("abandoned_checkouts").update(changes).eq("id", id);
    if (error) {
      toast.error("Failed to update");
      return false;
    }
    return true;
  };

  const contact = async (row: AbandonedCheckout) => {
    if (!row.customer_email) return;
    const contactedAt = new Date().toISOString();
    if (await update(row.id, { contacted_at: contactedAt })) {
      setRows((current) => current.map((r) => (r.id === row.id ? { ...r, contacted_at: contactedAt } : r)));
    }
    const subject = "You left something in your cart";
    const body = `Hi${row.customer_name ? ` ${row.customer_name}` : ""},\n\nWe noticed you didn't finish checking out:\n${row.items
      .map((item) => `- ${item.name} x${item.quantity}`)
      .join("\n")}\n\nYour items are still available if you'd like to complete your order.\n`;
    window.location.href = `mailto:${encodeURIComponent(row.customer_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const dismiss = async (row: AbandonedCheckout) => {
    if (await update(row.id, { dismissed: true })) {
      setRows((current) => current.filter((r) => r.id !== row.id));
    }
  };

  const recoverable = rows.filter((r) => r.customer_email).reduce((sum, r) => sum + Number(r.amount_total || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Abandoned Carts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Card checkouts that were started but never paid. Stripe reports them when the checkout expires (after 24 hours).
          {rows.length > 0 && ` ${formatPrice(recoverable)} is recoverable from customers who left an email.`}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-sm text-gray-500">No abandoned checkouts.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Expired</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">{format(new Date(row.expired_at), "MMM d, p")}</td>
                  <td className="px-4 py-3">
                    <div>{row.customer_name || "Unknown"}</div>
                    <div className="text-xs text-gray-500">{row.customer_email || "No email entered"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {row.items.map((item, i) => (
                      <div key={i} className="text-gray-700">
                        {item.name} × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatPrice(Number(row.amount_total))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <AdminButton size="sm" variant="outline" disabled={!row.customer_email} onClick={() => contact(row)}>
                        <Mail className="mr-2 h-4 w-4" />
                        {row.contacted_at ? "Email again" : "Email"}
                      </AdminButton>
                      <AdminButton size="sm" variant="ghost" onClick={() => dismiss(row)} aria-label="Dismiss">
                        <EyeOff className="h-4 w-4" />
                      </AdminButton>
                    </div>
                    {row.contacted_at && (
                      <div className="mt-1 text-xs text-gray-500">Contacted {format(new Date(row.contacted_at), "MMM d")}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
