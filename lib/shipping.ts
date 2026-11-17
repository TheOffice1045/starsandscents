// Shipping configuration shared by the admin settings page (which edits it) and
// the checkout API (which turns it into Stripe shipping options). Stored as JSON
// in store_settings.shipping_methods.

export type PickupLocation = {
  id: number;
  name: string;
  address: string;
  details?: string;
};

export type ShippingConfig = {
  standard: {
    enabled: boolean;
    cost: number;
    minDays: number;
    maxDays: number;
  };
  express: {
    enabled: boolean;
    cost: number;
    minDays: number;
    maxDays: number;
  };
  freeShipping: {
    enabled: boolean;
    /** Order subtotal (after discounts) at which standard shipping becomes free. 0 = always free. */
    minOrderAmount: number;
  };
  localPickup: {
    enabled: boolean;
    cost: number;
    locations: PickupLocation[];
  };
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  standard: { enabled: true, cost: 5.99, minDays: 5, maxDays: 7 },
  express: { enabled: false, cost: 14.99, minDays: 2, maxDays: 3 },
  freeShipping: { enabled: true, minOrderAmount: 150 },
  localPickup: { enabled: false, cost: 0, locations: [] },
};

// Stripe Checkout accepts at most 5 shipping options per session.
export const MAX_SHIPPING_OPTIONS = 5;

const toMoney = (value: unknown, fallback: number) => {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback;
};

const toDays = (value: unknown, fallback: number) => {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

/** True when the value is missing or still in the old pre-rebuild array format. */
export function isUnconfigured(raw: unknown) {
  return !raw || typeof raw !== 'object' || Array.isArray(raw);
}

/**
 * Converts the array the previous settings page saved
 * ([{ id: 'flat-rate' | 'free-shipping' | 'local-pickup' | 'calculated', enabled, settings }])
 * into the current shape. "Calculated" shipping was never implemented, and pickup
 * without locations can't be offered, so both are dropped.
 */
function fromLegacy(raw: any[]): any {
  const byId = Object.fromEntries(raw.filter(Boolean).map((m: any) => [m.id, m]));
  const flat = byId['flat-rate'];
  const free = byId['free-shipping'];
  const pickup = byId['local-pickup'];
  const locations = Array.isArray(pickup?.settings?.locations) ? pickup.settings.locations : [];
  const standardEnabled = !!flat?.enabled;
  return {
    standard: { enabled: standardEnabled, cost: flat?.settings?.cost },
    freeShipping: {
      enabled: standardEnabled && !!free?.enabled,
      minOrderAmount: free?.settings?.requires === 'min_amount' ? free?.settings?.minOrderAmount : 0,
    },
    express: { enabled: false },
    localPickup: { enabled: !!pickup?.enabled && locations.length > 0, cost: pickup?.settings?.cost, locations },
  };
}

/**
 * Parse whatever is stored in store_settings.shipping_methods into a complete,
 * sanitised ShippingConfig. Missing values fall back to the defaults, as does an
 * old-format value that wouldn't give checkout any usable shipping option.
 */
export function normalizeShippingConfig(raw: unknown): ShippingConfig {
  const d = DEFAULT_SHIPPING_CONFIG;
  if (!raw || typeof raw !== 'object') return structuredClone(d);
  if (Array.isArray(raw)) {
    const converted = normalizeShippingConfig(fromLegacy(raw));
    return validateShippingConfig(converted).length === 0 ? converted : structuredClone(d);
  }
  const src = raw as any;

  const std = src.standard || {};
  const exp = src.express || {};
  const free = src.freeShipping || {};
  const pickup = src.localPickup || {};

  const range = (min: unknown, max: unknown, defMin: number, defMax: number) => {
    const lo = toDays(min, defMin);
    const hi = toDays(max, defMax);
    return lo <= hi ? [lo, hi] : [hi, lo];
  };
  const [stdMin, stdMax] = range(std.minDays, std.maxDays, d.standard.minDays, d.standard.maxDays);
  const [expMin, expMax] = range(exp.minDays, exp.maxDays, d.express.minDays, d.express.maxDays);

  const locations: PickupLocation[] = Array.isArray(pickup.locations)
    ? pickup.locations
        .filter((l: any) => l && typeof l.name === 'string' && l.name.trim() && typeof l.address === 'string')
        .map((l: any, i: number) => ({
          id: typeof l.id === 'number' ? l.id : Date.now() + i,
          name: l.name.trim(),
          address: l.address.trim(),
          details: typeof l.details === 'string' ? l.details.trim() : '',
        }))
    : [];

  return {
    standard: {
      enabled: typeof std.enabled === 'boolean' ? std.enabled : d.standard.enabled,
      cost: toMoney(std.cost, d.standard.cost),
      minDays: stdMin,
      maxDays: stdMax,
    },
    express: {
      enabled: typeof exp.enabled === 'boolean' ? exp.enabled : d.express.enabled,
      cost: toMoney(exp.cost, d.express.cost),
      minDays: expMin,
      maxDays: expMax,
    },
    freeShipping: {
      enabled: typeof free.enabled === 'boolean' ? free.enabled : d.freeShipping.enabled,
      minOrderAmount: toMoney(free.minOrderAmount, d.freeShipping.minOrderAmount),
    },
    localPickup: {
      enabled: typeof pickup.enabled === 'boolean' ? pickup.enabled : d.localPickup.enabled,
      cost: toMoney(pickup.cost, d.localPickup.cost),
      locations,
    },
  };
}

/** Returns a list of problems that would stop checkout from offering shipping. */
export function validateShippingConfig(config: ShippingConfig): string[] {
  const errors: string[] = [];
  const pickupUsable = config.localPickup.enabled && config.localPickup.locations.length > 0;
  if (!config.standard.enabled && !config.express.enabled && !pickupUsable) {
    errors.push('Enable at least one of Standard Shipping, Express Shipping, or Local Pickup (with a location).');
  }
  if (config.localPickup.enabled && config.localPickup.locations.length === 0) {
    errors.push('Local Pickup is enabled but has no pickup locations.');
  }
  if (config.freeShipping.enabled && !config.standard.enabled) {
    errors.push('Free shipping applies to Standard Shipping, so Standard Shipping must be enabled.');
  }
  const optionCount =
    (config.standard.enabled ? 1 : 0) +
    (config.express.enabled ? 1 : 0) +
    (config.localPickup.enabled ? config.localPickup.locations.length : 0);
  if (optionCount > MAX_SHIPPING_OPTIONS) {
    errors.push(`Checkout supports at most ${MAX_SHIPPING_OPTIONS} shipping choices in total (including each pickup location).`);
  }
  return errors;
}

export type ShippingQuote = {
  id: string;
  label: string;
  /** Dollars */
  amount: number;
  minDays?: number;
  maxDays?: number;
};

export function qualifiesForFreeShipping(config: ShippingConfig, subtotal: number) {
  return (
    config.freeShipping.enabled &&
    config.standard.enabled &&
    subtotal >= config.freeShipping.minOrderAmount
  );
}

/**
 * The shipping choices a customer gets for an order with the given subtotal
 * (in dollars, after discounts), cheapest first.
 */
export function getShippingQuotes(config: ShippingConfig, subtotal: number): ShippingQuote[] {
  const quotes: ShippingQuote[] = [];

  if (config.standard.enabled) {
    const free = qualifiesForFreeShipping(config, subtotal);
    quotes.push({
      id: 'standard',
      label: free ? 'Free Standard Shipping' : 'Standard Shipping',
      amount: free ? 0 : config.standard.cost,
      minDays: config.standard.minDays,
      maxDays: config.standard.maxDays,
    });
  }

  if (config.express.enabled) {
    quotes.push({
      id: 'express',
      label: 'Express Shipping',
      amount: config.express.cost,
      minDays: config.express.minDays,
      maxDays: config.express.maxDays,
    });
  }

  if (config.localPickup.enabled) {
    for (const location of config.localPickup.locations) {
      quotes.push({
        id: `pickup-${location.id}`,
        label: `Local Pickup - ${location.name}`,
        amount: config.localPickup.cost,
      });
    }
  }

  return quotes.sort((a, b) => a.amount - b.amount).slice(0, MAX_SHIPPING_OPTIONS);
}
