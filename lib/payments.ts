// Payment configuration shared by the admin settings page (which edits it), the
// storefront cart/checkout (which shows the enabled options) and the checkout API
// (which refuses card checkout when Stripe is off). Stored as JSON in
// store_settings.payment_methods.
//
// store_settings is publicly readable, so nothing here may be a secret. The Stripe
// secret key lives in the STRIPE_SECRET_KEY server environment variable.

export type PaymentConfig = {
  stripe: {
    enabled: boolean;
  };
  venmo: {
    enabled: boolean;
    /** Venmo username without the leading @ */
    username: string;
  };
  zelle: {
    enabled: boolean;
    /** Payment link from the Zelle app ("Share my QR code") */
    link: string;
  };
};

// Matches what the storefront offered before payments were configurable, so a
// store that has never saved this tab keeps working unchanged.
export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  stripe: { enabled: true },
  venmo: { enabled: true, username: 'StarsScents' },
  zelle: {
    enabled: true,
    link: 'https://enroll.zellepay.com/qr-codes?data=eyJuYW1lIjoiWUVNSVNJIiwiYWN0aW9uIjoicGF5bWVudCIsInRva2VuIjoiNDQzODI0MTk4MSJ9',
  },
};

/** True when the value is missing or still in the old array format (COD/PayPal/Stripe). */
export function isUnconfigured(raw: unknown) {
  return !raw || typeof raw !== 'object' || Array.isArray(raw);
}

const cleanUsername = (value: unknown) =>
  typeof value === 'string' ? value.trim().replace(/^@/, '') : '';

const cleanLink = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
};

/**
 * Parse whatever is stored in store_settings.payment_methods into a complete
 * PaymentConfig. The old array format never drove the storefront, so it is
 * ignored in favour of the defaults.
 */
export function normalizePaymentConfig(raw: unknown): PaymentConfig {
  const d = DEFAULT_PAYMENT_CONFIG;
  if (isUnconfigured(raw)) return structuredClone(d);
  const src = raw as any;

  const stripe = src.stripe || {};
  const venmo = src.venmo || {};
  const zelle = src.zelle || {};

  return {
    stripe: {
      enabled: typeof stripe.enabled === 'boolean' ? stripe.enabled : d.stripe.enabled,
    },
    venmo: {
      enabled: typeof venmo.enabled === 'boolean' ? venmo.enabled : d.venmo.enabled,
      username: typeof venmo.username === 'string' ? cleanUsername(venmo.username) : d.venmo.username,
    },
    zelle: {
      enabled: typeof zelle.enabled === 'boolean' ? zelle.enabled : d.zelle.enabled,
      link: typeof zelle.link === 'string' ? cleanLink(zelle.link) : d.zelle.link,
    },
  };
}

/** Returns a list of problems that would leave customers without a working way to pay. */
export function validatePaymentConfig(config: PaymentConfig): string[] {
  const errors: string[] = [];
  if (!config.stripe.enabled && !config.venmo.enabled && !config.zelle.enabled) {
    errors.push('Enable at least one payment method.');
  }
  if (config.venmo.enabled && !/^[A-Za-z0-9_-]{5,30}$/.test(config.venmo.username)) {
    errors.push('Enter a valid Venmo username (5-30 letters, numbers, - or _).');
  }
  if (config.zelle.enabled && !config.zelle.link) {
    errors.push('Enter your Zelle payment link (it must start with https://).');
  }
  return errors;
}

export const venmoUrl = (config: PaymentConfig) =>
  `https://account.venmo.com/u/${encodeURIComponent(config.venmo.username)}`;

/** Only the methods that are enabled and fully set up. */
export function getAvailablePayments(config: PaymentConfig) {
  return {
    stripe: config.stripe.enabled,
    venmo: config.venmo.enabled && !!config.venmo.username ? venmoUrl(config) : null,
    zelle: config.zelle.enabled && !!config.zelle.link ? config.zelle.link : null,
  };
}
