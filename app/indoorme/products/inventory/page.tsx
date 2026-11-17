"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";

type InventoryProduct = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  status: string;
};

const THRESHOLD_KEY = "inventory-low-stock-threshold";
const FILTERS = ["Low stock", "Out of stock", "All"] as const;

export default function InventoryPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Low stock");
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState(5);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Per-browser preference; falls back to 5 when storage is unavailable.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(THRESHOLD_KEY));
      if (saved > 0) setThreshold(saved);
    } catch {}
  }, []);

  const updateThreshold = (value: number) => {
    const next = Math.max(1, Math.floor(value) || 1);
    setThreshold(next);
    try {
      localStorage.setItem(THRESHOLD_KEY, String(next));
    } catch {}
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, title, sku, quantity, status")
      .order("quantity", { ascending: true });
    if (error) {
      console.error("Error loading inventory:", error);
      toast.error("Failed to load inventory");
    } else {
      setProducts((data as InventoryProduct[]) ?? []);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const saveQuantity = async (product: InventoryProduct) => {
    const value = Number(edits[product.id]);
    if (!Number.isInteger(value) || value < 0) {
      toast.error("Stock must be a whole number, 0 or more");
      return;
    }
    setSavingId(product.id);
    const { error } = await supabase
      .from("products")
      .update({ quantity: value, updated_at: new Date().toISOString() })
      .eq("id", product.id);
    setSavingId(null);
    if (error) {
      toast.error("Failed to update stock");
      return;
    }
    setProducts((current) => current.map((p) => (p.id === product.id ? { ...p, quantity: value } : p)));
    setEdits(({ [product.id]: _removed, ...rest }) => rest);
    toast.success(`${product.title}: stock set to ${value}`);
  };

  const outOfStock = products.filter((p) => p.quantity <= 0);
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= threshold);

  const visible = useMemo(() => {
    const base =
      filter === "Out of stock" ? outOfStock : filter === "Low stock" ? [...outOfStock, ...lowStock] : products;
    const query = search.trim().toLowerCase();
    return query
      ? base.filter((p) => p.title?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query))
      : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, filter, search, threshold]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            {outOfStock.length} out of stock · {lowStock.length} running low (at or below {threshold})
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Low-stock threshold
          <Input
            type="number"
            min={1}
            className="h-9 w-20"
            value={threshold}
            onChange={(e) => updateThreshold(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((name) => (
          <AdminButton key={name} size="sm" variant={filter === name ? "default" : "outline"} onClick={() => setFilter(name)}>
            {name}
          </AdminButton>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder="Search by name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-sm text-gray-500">
          {filter === "All" ? "No products found." : "Nothing is running low. 🎉"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">In stock</th>
                <th className="px-4 py-3 text-right font-medium">Set stock</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((product) => {
                const isOut = product.quantity <= 0;
                const isLow = !isOut && product.quantity <= threshold;
                const editing = edits[product.id] !== undefined;
                return (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <Link href={`/indoorme/products/edit/${product.id}`} className="hover:underline">
                        {product.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{product.sku || "—"}</td>
                    <td className="px-4 py-3 capitalize text-gray-500">{product.status}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                          isOut ? "bg-red-100 text-red-800" : isLow ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {(isOut || isLow) && <AlertTriangle className="h-3 w-3" />}
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-24"
                          value={editing ? edits[product.id] : product.quantity}
                          onChange={(e) => setEdits({ ...edits, [product.id]: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && editing && saveQuantity(product)}
                        />
                        <AdminButton
                          size="sm"
                          variant="outline"
                          disabled={!editing || savingId === product.id}
                          onClick={() => saveQuantity(product)}
                        >
                          {savingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
