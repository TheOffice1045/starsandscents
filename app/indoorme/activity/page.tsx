"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AdminButton } from "@/components/ui/admin-button";

type Activity = {
  id: number;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  table_name: string;
  record_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  label: string | null;
  changed_fields: string[] | null;
};

const PAGE_SIZE = 50;

const TABLE_LABELS: Record<string, string> = {
  orders: "Order",
  products: "Product",
  collections: "Collection",
  discounts: "Discount",
  customers: "Customer",
  store_settings: "Store settings",
  store_users: "Team member",
  store_roles: "Role",
};

const ACTION_LABELS = { INSERT: "created", UPDATE: "updated", DELETE: "deleted" };

const linkFor = (row: Activity) => {
  if (row.action === "DELETE" || !row.record_id) return null;
  if (row.table_name === "orders") return `/indoorme/orders/${row.record_id}`;
  if (row.table_name === "products") return `/indoorme/products/edit/${row.record_id}`;
  if (row.table_name === "customers") return `/indoorme/customers/${row.record_id}`;
  if (row.table_name === "discounts") return `/indoorme/discounts/${row.record_id}/edit`;
  return null;
};

// Written by database triggers (see 20261012000008_admin_activity_log.sql).
export default function ActivityPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [table, setTable] = useState<string>("all");

  const fetchPage = useCallback(
    async (offset: number) => {
      setLoading(true);
      let query = supabase
        .from("admin_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (table !== "all") query = query.eq("table_name", table);

      const { data, error } = await query;
      if (error) {
        console.error("Error loading activity:", error);
        toast.error("Failed to load activity");
      } else {
        setRows((current) => (offset === 0 ? (data as Activity[]) : [...current, ...(data as Activity[])]));
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
      }
      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table]
  );

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="mt-1 text-sm text-gray-500">Every change to orders, products, discounts, customers and settings, and who made it.</p>
        </div>
        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="all">Everything</option>
          {Object.entries(TABLE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 && !loading ? (
        <div className="rounded-lg border py-16 text-center text-sm text-gray-500">No activity recorded yet.</div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => {
            const href = linkFor(row);
            const what = `${TABLE_LABELS[row.table_name] ?? row.table_name}${row.label ? ` ${row.label}` : ""}`;
            return (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
                <div>
                  <span className="font-medium">{row.actor_email || (row.actor_id ? "A team member" : "System")}</span>{" "}
                  {ACTION_LABELS[row.action]}{" "}
                  {href ? (
                    <a href={href} className="underline">
                      {what}
                    </a>
                  ) : (
                    what
                  )}
                  {row.changed_fields && row.changed_fields.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">Changed: {row.changed_fields.join(", ")}</div>
                  )}
                </div>
                <time className="shrink-0 text-xs text-gray-500">{format(new Date(row.created_at), "MMM d, p")}</time>
              </li>
            );
          })}
        </ul>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : (
        hasMore && (
          <div className="flex justify-center">
            <AdminButton variant="outline" onClick={() => fetchPage(rows.length)}>
              Load more
            </AdminButton>
          </div>
        )
      )}
    </div>
  );
}
