"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import {
  DEFAULT_SHIPPING_CONFIG,
  isUnconfigured,
  normalizeShippingConfig,
  validateShippingConfig,
  type PickupLocation,
  type ShippingConfig,
} from "@/lib/shipping";

interface ShippingSettingsProps {
  storeId: string | null;
}

// Number fields are edited as strings so the admin can clear and retype them;
// they're parsed and checked on save.
type FormState = {
  standardEnabled: boolean;
  standardCost: string;
  standardMinDays: string;
  standardMaxDays: string;
  expressEnabled: boolean;
  expressCost: string;
  expressMinDays: string;
  expressMaxDays: string;
  freeEnabled: boolean;
  freeMinOrderAmount: string;
  pickupEnabled: boolean;
  pickupCost: string;
  pickupLocations: PickupLocation[];
};

const toForm = (c: ShippingConfig): FormState => ({
  standardEnabled: c.standard.enabled,
  standardCost: c.standard.cost.toFixed(2),
  standardMinDays: String(c.standard.minDays),
  standardMaxDays: String(c.standard.maxDays),
  expressEnabled: c.express.enabled,
  expressCost: c.express.cost.toFixed(2),
  expressMinDays: String(c.express.minDays),
  expressMaxDays: String(c.express.maxDays),
  freeEnabled: c.freeShipping.enabled,
  freeMinOrderAmount: c.freeShipping.minOrderAmount.toFixed(2),
  pickupEnabled: c.localPickup.enabled,
  pickupCost: c.localPickup.cost.toFixed(2),
  pickupLocations: c.localPickup.locations,
});

const isMoney = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());
const isDays = (v: string) => /^\d+$/.test(v.trim());

/** Turns the form into a config, or returns the list of field errors. */
function fromForm(f: FormState): { config?: ShippingConfig; errors: string[] } {
  const errors: string[] = [];
  const money = (label: string, v: string, needed: boolean) => {
    if (needed && !isMoney(v)) errors.push(`${label} must be a dollar amount like 5.99.`);
    return isMoney(v) ? parseFloat(v) : 0;
  };
  const days = (label: string, min: string, max: string, needed: boolean) => {
    if (!needed) return [isDays(min) ? +min : 0, isDays(max) ? +max : 0];
    if (!isDays(min) || !isDays(max) || +min < 1 || +max < 1) {
      errors.push(`${label} delivery days must be whole numbers of at least 1.`);
    } else if (+min > +max) {
      errors.push(`${label} minimum delivery days can't be more than the maximum.`);
    }
    return [parseInt(min, 10) || 1, parseInt(max, 10) || 1];
  };

  const standardCost = money("Standard Shipping cost", f.standardCost, f.standardEnabled);
  const [sMin, sMax] = days("Standard Shipping", f.standardMinDays, f.standardMaxDays, f.standardEnabled);
  const expressCost = money("Express Shipping cost", f.expressCost, f.expressEnabled);
  const [eMin, eMax] = days("Express Shipping", f.expressMinDays, f.expressMaxDays, f.expressEnabled);
  const freeMin = money("Free shipping minimum order amount", f.freeMinOrderAmount, f.freeEnabled);
  const pickupCost = money("Local Pickup cost", f.pickupCost, f.pickupEnabled);

  if (errors.length) return { errors };

  const config: ShippingConfig = {
    standard: { enabled: f.standardEnabled, cost: standardCost, minDays: sMin, maxDays: sMax },
    express: { enabled: f.expressEnabled, cost: expressCost, minDays: eMin, maxDays: eMax },
    freeShipping: { enabled: f.freeEnabled, minOrderAmount: freeMin },
    localPickup: { enabled: f.pickupEnabled, cost: pickupCost, locations: f.pickupLocations },
  };
  const problems = validateShippingConfig(config);
  return problems.length ? { errors: problems } : { config, errors: [] };
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

export default function ShippingSettings({ storeId }: ShippingSettingsProps) {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [form, setForm] = useState<FormState>(toForm(DEFAULT_SHIPPING_CONFIG));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [neverSaved, setNeverSaved] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: "", address: "", details: "" });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Load the saved shipping settings
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("store_settings")
        .select("shipping_methods")
        .eq("store_id", storeId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Error loading shipping settings:", error);
        setLoadError(
          error.code === "42703"
            ? "The shipping_methods column is missing. Run the latest Supabase migration, then reload this page."
            : `Couldn't load shipping settings: ${error.message}`
        );
      } else {
        setNeverSaved(isUnconfigured(data?.shipping_methods));
        setForm(toForm(normalizeShippingConfig(data?.shipping_methods)));
      }
      setIsLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [storeId, supabase]);

  const handleAddLocation = () => {
    if (!newLocation.name.trim() || !newLocation.address.trim()) return;
    set("pickupLocations", [
      ...form.pickupLocations,
      {
        id: Date.now(),
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
        details: newLocation.details.trim(),
      },
    ]);
    setNewLocation({ name: "", address: "", details: "" });
    setIsAddingLocation(false);
  };

  const handleSave = async () => {
    if (!storeId) {
      toast.error("Store ID is missing. Please refresh the page or contact support.");
      return;
    }
    if (loadError) {
      toast.error(loadError);
      return;
    }

    const { config, errors } = fromForm(form);
    if (!config) {
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
            shipping_methods: config,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );
      if (error) throw error;

      setForm(toForm(config));
      setNeverSaved(false);
      toast.success("Shipping settings saved. Checkout now uses these rates.");
    } catch (error: any) {
      console.error("Error saving shipping settings:", error);
      toast.error(`Failed to save settings: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Plain-English summary of what customers will be offered
  const preview = useMemo(() => {
    const { config } = fromForm(form);
    if (!config) return null;
    const lines: string[] = [];
    if (config.standard.enabled) {
      let line = `Standard Shipping: ${fmt(config.standard.cost)} (${config.standard.minDays}-${config.standard.maxDays} business days)`;
      if (config.freeShipping.enabled) {
        line +=
          config.freeShipping.minOrderAmount > 0
            ? `, free on orders of ${fmt(config.freeShipping.minOrderAmount)} or more after discounts`
            : ", free on every order";
      }
      lines.push(line);
    }
    if (config.express.enabled) {
      lines.push(
        `Express Shipping: ${fmt(config.express.cost)} (${config.express.minDays}-${config.express.maxDays} business days)`
      );
    }
    if (config.localPickup.enabled) {
      config.localPickup.locations.forEach((l) =>
        lines.push(`Local Pickup at ${l.name}: ${config.localPickup.cost === 0 ? "free" : fmt(config.localPickup.cost)}`)
      );
    }
    return lines;
  }, [form]);

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

  const field = (label: string, value: string, onChange: (v: string) => void, opts: { prefix?: string; step?: string } = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        {opts.prefix && <span className="text-gray-500">{opts.prefix}</span>}
        <Input
          type="number"
          min="0"
          step={opts.step || "0.01"}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );

  if (!storeId || isLoading) {
    return <div className="max-w-2xl text-sm text-gray-500">Loading shipping settings...</div>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
      )}
      {neverSaved && !loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          These shipping settings haven&apos;t been saved with the new settings page yet. Checkout is already using the
          values shown below. Review them and click Save changes to confirm.
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <h2 className="text-lg font-medium">Shipping Methods</h2>
          <p className="text-sm text-gray-500 mt-1">
            These rates are charged at checkout. Orders ship to US addresses only.
          </p>
        </div>

        {/* Standard */}
        <div className="border rounded-lg p-4 space-y-4">
          {checkbox("enable-standard", form.standardEnabled, (v) => set("standardEnabled", v), "Standard Shipping")}
          {form.standardEnabled && (
            <div className="ml-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {field("Cost", form.standardCost, (v) => set("standardCost", v), { prefix: "$" })}
              {field("Min. business days", form.standardMinDays, (v) => set("standardMinDays", v), { step: "1" })}
              {field("Max. business days", form.standardMaxDays, (v) => set("standardMaxDays", v), { step: "1" })}
            </div>
          )}
        </div>

        {/* Free shipping */}
        <div className="border rounded-lg p-4 space-y-4">
          {checkbox("enable-free", form.freeEnabled, (v) => set("freeEnabled", v), "Free Standard Shipping")}
          {form.freeEnabled && (
            <div className="ml-7 space-y-2">
              {field("Minimum order amount (after discounts)", form.freeMinOrderAmount, (v) => set("freeMinOrderAmount", v), {
                prefix: "$",
              })}
              <p className="text-xs text-gray-500">
                Standard Shipping becomes free once the order reaches this amount. Set 0 to make it always free.
              </p>
            </div>
          )}
        </div>

        {/* Express */}
        <div className="border rounded-lg p-4 space-y-4">
          {checkbox("enable-express", form.expressEnabled, (v) => set("expressEnabled", v), "Express Shipping")}
          {form.expressEnabled && (
            <div className="ml-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {field("Cost", form.expressCost, (v) => set("expressCost", v), { prefix: "$" })}
              {field("Min. business days", form.expressMinDays, (v) => set("expressMinDays", v), { step: "1" })}
              {field("Max. business days", form.expressMaxDays, (v) => set("expressMaxDays", v), { step: "1" })}
            </div>
          )}
        </div>

        {/* Local pickup */}
        <div className="border rounded-lg p-4 space-y-4">
          {checkbox("enable-pickup", form.pickupEnabled, (v) => set("pickupEnabled", v), "Local Pickup")}
          {form.pickupEnabled && (
            <div className="ml-7 space-y-4">
              {field("Cost", form.pickupCost, (v) => set("pickupCost", v), { prefix: "$" })}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Pickup Locations</label>
                  <Button variant="outline" size="sm" onClick={() => setIsAddingLocation(true)}>
                    Add Pickup Location
                  </Button>
                </div>

                {form.pickupLocations.length > 0 ? (
                  <div className="space-y-3 mt-3">
                    {form.pickupLocations.map((location) => (
                      <div key={location.id} className="border rounded p-3 bg-gray-50">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium">{location.name}</h4>
                            <p className="text-sm text-gray-600">{location.address}</p>
                            {location.details && <p className="text-sm text-gray-500 mt-1">{location.details}</p>}
                          </div>
                          <button
                            onClick={() =>
                              set(
                                "pickupLocations",
                                form.pickupLocations.filter((l) => l.id !== location.id)
                              )
                            }
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No pickup locations added yet.</p>
                )}

                {isAddingLocation && (
                  <div className="border rounded p-4 mt-3 bg-gray-50">
                    <h4 className="font-medium mb-3">Add New Location</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                        <Input
                          placeholder="e.g., Main Store"
                          value={newLocation.name}
                          onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <Input
                          placeholder="Full address"
                          value={newLocation.address}
                          onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Details (optional)</label>
                        <Input
                          placeholder="e.g., Opening hours, instructions"
                          value={newLocation.details}
                          onChange={(e) => setNewLocation({ ...newLocation, details: e.target.value })}
                        />
                      </div>
                      <div className="flex justify-end space-x-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsAddingLocation(false);
                            setNewLocation({ name: "", address: "", details: "" });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddLocation}
                          disabled={!newLocation.name.trim() || !newLocation.address.trim()}
                        >
                          Add Location
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-2">What customers will see at checkout</h2>
        {preview && preview.length > 0 ? (
          <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
            {preview.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Some values above are invalid. Click Save changes to see what needs fixing.</p>
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
