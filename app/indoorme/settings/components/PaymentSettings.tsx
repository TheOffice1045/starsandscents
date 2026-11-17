"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import {
  DEFAULT_PAYMENT_CONFIG,
  PaymentConfig,
  isUnconfigured,
  normalizePaymentConfig,
  validatePaymentConfig,
  venmoUrl,
} from "@/lib/payments";

interface PaymentSettingsProps {
  storeId: string | null;
}

export default function PaymentSettings({ storeId }: PaymentSettingsProps) {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [config, setConfig] = useState<PaymentConfig>(structuredClone(DEFAULT_PAYMENT_CONFIG));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [neverSaved, setNeverSaved] = useState(false);

  const update = <K extends keyof PaymentConfig>(method: K, changes: Partial<PaymentConfig[K]>) =>
    setConfig((c) => ({ ...c, [method]: { ...c[method], ...changes } }));

  // Load the saved payment settings
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("store_settings")
        .select("payment_methods")
        .eq("store_id", storeId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Error loading payment settings:", error);
        setLoadError(
          error.code === "42703"
            ? "The payment_methods column is missing. Run the latest Supabase migration, then reload this page."
            : `Couldn't load payment settings: ${error.message}`
        );
      } else {
        setNeverSaved(isUnconfigured(data?.payment_methods));
        setConfig(normalizePaymentConfig(data?.payment_methods));
      }
      setIsLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [storeId, supabase]);

  const handleSave = async () => {
    if (!storeId) {
      toast.error("Store ID is missing. Please refresh the page or contact support.");
      return;
    }
    if (loadError) {
      toast.error(loadError);
      return;
    }

    // Normalising trims the username and rejects non-https links before validating
    const cleaned = normalizePaymentConfig(config);
    if (config.zelle.enabled && config.zelle.link.trim() && !cleaned.zelle.link) {
      toast.error("The Zelle payment link must be a full https:// URL.");
      return;
    }
    const errors = validatePaymentConfig(cleaned);
    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("store_settings")
        .upsert(
          {
            store_id: storeId,
            payment_methods: cleaned,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );
      if (error) throw error;

      setConfig(cleaned);
      setNeverSaved(false);
      toast.success("Payment settings saved. The cart and checkout now show these options.");
    } catch (error: any) {
      console.error("Error saving payment settings:", error);
      toast.error(`Failed to save settings: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const checkbox = (id: string, checked: boolean, onChange: (v: boolean) => void, label: string) => (
    <div className="flex items-center space-x-3">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
        style={{ accentColor: "black" }}
      />
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
    </div>
  );

  if (!storeId || isLoading) {
    return <div className="max-w-2xl text-sm text-gray-500">Loading payment settings...</div>;
  }

  const cleanedUsername = config.venmo.username.trim().replace(/^@/, "");

  return (
    <div className="max-w-2xl space-y-8">
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
      )}
      {neverSaved && !loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          These options haven&apos;t been saved yet. The store is currently showing the values below; click Save
          changes to make them yours.
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-2">Payment Methods</h2>
        <p className="text-sm text-gray-500 mb-6">
          Choose which ways to pay appear in the cart and on the checkout page.
        </p>

        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            {checkbox("enable-stripe", config.stripe.enabled, (v) => update("stripe", { enabled: v }), "Card checkout (Stripe)")}
            <p className="ml-7 mt-2 text-sm text-gray-500">
              Customers pay by card on Stripe&apos;s secure page, and the order is created automatically. Live or
              test mode is decided by the <code>STRIPE_SECRET_KEY</code> server environment variable, not here.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            {checkbox("enable-venmo", config.venmo.enabled, (v) => update("venmo", { enabled: v }), "Venmo")}
            {config.venmo.enabled && (
              <div className="ml-7 mt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Venmo username</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">@</span>
                  <Input
                    placeholder="YourVenmoName"
                    value={config.venmo.username}
                    onChange={(e) => update("venmo", { username: e.target.value })}
                  />
                </div>
                {cleanedUsername && (
                  <a
                    href={venmoUrl({ ...config, venmo: { ...config.venmo, username: cleanedUsername } })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 underline"
                  >
                    Test this link
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4">
            {checkbox("enable-zelle", config.zelle.enabled, (v) => update("zelle", { enabled: v }), "Zelle")}
            {config.zelle.enabled && (
              <div className="ml-7 mt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Zelle payment link</label>
                <Input
                  type="url"
                  placeholder="https://enroll.zellepay.com/qr-codes?data=..."
                  value={config.zelle.link}
                  onChange={(e) => update("zelle", { link: e.target.value })}
                />
                <p className="text-sm text-gray-500">
                  In your banking app, open Zelle, choose to share your QR code, and copy the link.
                </p>
                {config.zelle.link.trim().startsWith("https://") && (
                  <a
                    href={config.zelle.link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 underline"
                  >
                    Test this link
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {(config.venmo.enabled || config.zelle.enabled) && (
          <p className="mt-6 text-sm text-gray-500">
            Venmo and Zelle payments happen outside the store, so no order is created for them. Match the payment to
            the customer and create the order from the Orders page.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <AdminButton onClick={handleSave} disabled={isSaving || !!loadError}>
          {isSaving ? "Saving..." : "Save changes"}
        </AdminButton>
      </div>
    </div>
  );
}
