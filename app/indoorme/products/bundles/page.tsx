"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { AdminButton } from "@/components/ui/admin-button";
import { formatPrice, generateSKU } from "@/lib/utils";

type Bundle = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  status: string;
  items: { quantity: number; title: string; price: number }[];
};

const inputClass = "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

export default function BundlesPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const router = useRouter();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: links, error } = await supabase
        .from("product_bundle_items")
        .select("bundle_id, quantity, position, product:products!product_bundle_items_product_id_fkey (title, price)")
        .order("position");
      if (error) {
        setMissing(true);
        setLoading(false);
        return;
      }
      const ids = Array.from(new Set((links ?? []).map((l: any) => l.bundle_id)));
      const { data: products } = ids.length
        ? await supabase.from("products").select("id, title, price, quantity, status").in("id", ids).order("title")
        : { data: [] as any[] };
      setBundles(
        (products ?? []).map((p: any) => ({
          ...p,
          items: (links ?? [])
            .filter((l: any) => l.bundle_id === p.id && l.product)
            .map((l: any) => ({ quantity: l.quantity, title: l.product.title, price: Number(l.product.price) || 0 })),
        }))
      );
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create the bundle as a draft product, then add its candles on the edit page.
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(price);
    if (!title.trim() || !(amount > 0)) {
      toast.error("Enter a name and a price");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("products")
      .insert({
        title: title.trim(),
        price: amount,
        quantity: 0,
        status: "draft",
        sku: generateSKU(title.trim()),
        track_quantity: true,
        online_store: true,
        point_of_sale: true,
      })
      .select("id")
      .single();
    if (error || !data) {
      toast.error(`Could not create the bundle: ${error?.message ?? "unknown error"}`);
      setCreating(false);
      return;
    }
    toast.success("Bundle created. Now add its candles, photos and description.");
    router.push(`/indoorme/products/edit/${data.id}`);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Bundles</h1>
        <p className="text-sm text-gray-500">
          Sets of candles sold together at one price. Selling a bundle takes each candle out of stock, and a bundle shows
          sold out when any of its candles runs out.
        </p>
      </div>

      {missing ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Bundles aren&apos;t set up in the database yet. Apply the <code>product_bundles</code> migration, then reload.
        </div>
      ) : (
        <>
          <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="bundle-title" className="mb-1 block text-sm font-medium">New bundle name</label>
              <input id="bundle-title" className={`${inputClass} w-full`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Relax Trio" />
            </div>
            <div>
              <label htmlFor="bundle-price" className="mb-1 block text-sm font-medium">Bundle price ($)</label>
              <input id="bundle-price" type="number" min="0.01" step="0.01" className={`${inputClass} w-32`} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <AdminButton type="submit" disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create bundle
            </AdminButton>
            <p className="w-full text-xs text-gray-500">
              It starts as a draft (hidden from the shop). You&apos;ll add the candles, photos and description next, then set it to Active.
            </p>
          </form>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : bundles.length === 0 ? (
            <div className="rounded-lg border py-16 text-center text-sm text-gray-500">No bundles yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="p-3 font-medium">Bundle</th>
                    <th className="p-3 font-medium">Includes</th>
                    <th className="p-3 font-medium text-right">Price</th>
                    <th className="p-3 font-medium text-right">Separately</th>
                    <th className="p-3 font-medium text-right">Available</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bundles.map((b) => {
                    const separate = b.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <Link href={`/indoorme/products/edit/${b.id}`} className="font-medium hover:underline">{b.title}</Link>
                        </td>
                        <td className="p-3 text-gray-600">
                          {b.items.map((i) => `${i.quantity > 1 ? `${i.quantity} × ` : ""}${i.title}`).join(", ")}
                        </td>
                        <td className="p-3 text-right">{formatPrice(b.price)}</td>
                        <td className="p-3 text-right text-gray-500">{formatPrice(separate)}</td>
                        <td className={`p-3 text-right ${b.quantity <= 0 ? "text-red-600" : ""}`}>
                          {b.quantity <= 0 ? "Sold out" : b.quantity}
                        </td>
                        <td className="p-3 capitalize">{b.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
