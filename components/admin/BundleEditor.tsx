"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AdminButton } from "@/components/ui/admin-button";
import { formatPrice } from "@/lib/utils";

type Candidate = { id: string; title: string; price: number; quantity: number; status: string };
type Row = { product_id: string; quantity: number };

const inputClass = "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

/**
 * "Bundle contents" panel on the product edit page. Turning a product into a
 * bundle means listing the candles inside; its stock then follows theirs.
 */
export function BundleEditor({
  productId,
  bundlePrice,
  onBundleChange,
}: {
  productId: string;
  bundlePrice: number;
  onBundleChange?: (isBundle: boolean, available: number | null) => void;
}) {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [isComponent, setIsComponent] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [saved, setSaved] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: links, error }, { data: products }] = await Promise.all([
        supabase.from("product_bundle_items").select("bundle_id, product_id, quantity, position"),
        supabase.from("products").select("id, title, price, quantity, status").order("title"),
      ]);
      if (error) {
        setMissing(true);
        setLoading(false);
        return;
      }
      const bundleIds = new Set((links ?? []).map((l) => l.bundle_id));
      const mine = (links ?? [])
        .filter((l) => l.bundle_id === productId)
        .sort((a, b) => a.position - b.position)
        .map((l) => ({ product_id: l.product_id, quantity: l.quantity }));
      setIsComponent((links ?? []).some((l) => l.product_id === productId));
      setCandidates(
        ((products as Candidate[]) ?? []).filter((p) => p.id !== productId && !bundleIds.has(p.id) && p.status !== "archived")
      );
      setSaved(mine);
      setRows(mine);
      setLoading(false);
      onBundleChange?.(mine.length > 0, null);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const complete = rows.filter((r) => r.product_id);
  const separateTotal = complete.reduce((sum, r) => sum + (Number(byId.get(r.product_id)?.price) || 0) * r.quantity, 0);
  const sets = complete.length
    ? Math.min(...complete.map((r) => Math.floor(Math.max(byId.get(r.product_id)?.quantity ?? 0, 0) / r.quantity)))
    : null;
  const dirty = JSON.stringify(complete) !== JSON.stringify(saved);

  const update = (i: number, change: Partial<Row>) =>
    setRows((prev) => prev.map((row, j) => (j === i ? { ...row, ...change } : row)));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/bundle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: complete }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Saving the bundle failed");
      setSaved(body.items);
      setRows(body.items);
      onBundleChange?.(body.items.length > 0, body.available);
      toast.success(body.items.length > 0 ? "Bundle saved" : "Bundle removed; this is a normal product again");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-base font-medium mb-1">Bundle</h2>
      <p className="text-sm text-gray-500 mb-4">
        Make this product a bundle by adding the candles inside it. Selling one takes those candles out of stock, and the
        bundle shows sold out when any of them runs out.
      </p>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      ) : missing ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Bundles aren&apos;t set up in the database yet. Apply the <code>product_bundles</code> migration, then reload.
        </p>
      ) : isComponent ? (
        <p className="text-sm text-gray-600">This candle is part of a bundle, so it can&apos;t be a bundle itself.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                className={`${inputClass} flex-1`}
                value={row.product_id}
                onChange={(e) => update(i, { product_id: e.target.value })}
              >
                <option value="">Choose a candle…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id !== row.product_id && rows.some((r) => r.product_id === c.id)}>
                    {c.title}
                    {c.status !== "active" ? ` (${c.status})` : ""} · {c.quantity ?? 0} in stock
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={100}
                className={`${inputClass} w-20`}
                value={row.quantity}
                onChange={(e) => update(i, { quantity: Math.max(1, Math.min(100, Math.floor(Number(e.target.value) || 1))) })}
                aria-label="Quantity in bundle"
              />
              <AdminButton
                size="icon"
                variant="ghost"
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remove candle"
              >
                <Trash2 className="h-4 w-4" />
              </AdminButton>
            </div>
          ))}

          <AdminButton
            size="sm"
            variant="outline"
            type="button"
            onClick={() => setRows((prev) => [...prev, { product_id: "", quantity: 1 }])}
          >
            <Plus className="mr-2 h-4 w-4" /> Add candle
          </AdminButton>

          {complete.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Bought separately</span>
                <span>{formatPrice(separateTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bundle price (from Pricing)</span>
                <span>{formatPrice(bundlePrice || 0)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>{separateTotal > bundlePrice ? "Customer saves" : "Customer saves nothing"}</span>
                <span>{formatPrice(Math.max(separateTotal - (bundlePrice || 0), 0))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Bundles available from current stock</span>
                <span>{sets}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {dirty && (
              <AdminButton size="sm" variant="outline" type="button" onClick={() => setRows(saved)} disabled={saving}>
                Discard
              </AdminButton>
            )}
            <AdminButton size="sm" type="button" onClick={save} disabled={!dirty || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save bundle
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  );
}
