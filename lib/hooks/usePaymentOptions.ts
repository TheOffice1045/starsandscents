import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { getAvailablePayments, normalizePaymentConfig } from '@/lib/payments';

type PaymentOptions = ReturnType<typeof getAvailablePayments>;

/**
 * The payment options enabled in the admin Payments settings.
 * Returns null until they have loaded.
 */
export function usePaymentOptions() {
  const [options, setOptions] = useState<PaymentOptions | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase
      .from('store_settings')
      .select('payment_methods')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Error loading payment settings:', error);
        setOptions(getAvailablePayments(normalizePaymentConfig(error ? null : data?.payment_methods)));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}
