import { createClient } from '@/lib/supabase/server';
import { normalizeShippingConfig, validateShippingConfig } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

const money = (n: number) => `$${n.toFixed(2)}`;

// Rates come from the admin Shipping settings, the same source checkout uses
async function getShippingMethods() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('store_settings')
    .select('shipping_methods')
    .limit(1)
    .maybeSingle();
  if (error) return [];

  const config = normalizeShippingConfig(data?.shipping_methods);
  if (validateShippingConfig(config).length > 0) return [];

  const methods: { title: string; timing?: string; price: string; note?: string }[] = [];
  const { standard, express, freeShipping, localPickup } = config;

  if (standard.enabled) {
    const alwaysFree = freeShipping.enabled && freeShipping.minOrderAmount === 0;
    methods.push({
      title: 'Standard Shipping',
      timing: `${standard.minDays}-${standard.maxDays} business days`,
      price: alwaysFree ? 'Free' : money(standard.cost),
      note:
        freeShipping.enabled && !alwaysFree
          ? `Free on orders of ${money(freeShipping.minOrderAmount)} or more`
          : undefined,
    });
  }
  if (express.enabled) {
    methods.push({
      title: 'Express Shipping',
      timing: `${express.minDays}-${express.maxDays} business days`,
      price: money(express.cost),
    });
  }
  if (localPickup.enabled && localPickup.locations.length > 0) {
    methods.push({
      title: 'Local Pickup',
      price: localPickup.cost === 0 ? 'Free' : money(localPickup.cost),
      note: localPickup.locations.map((l) => `${l.name}: ${l.address}`).join(' · '),
    });
  }
  return methods;
}

export default async function ShippingPage() {
  const methods = await getShippingMethods();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Shipping Information</h1>
      <div className="prose max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Shipping Methods</h2>
          {methods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {methods.map((method) => (
                <div key={method.title} className="border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-2">{method.title}</h3>
                  {method.timing && <p className="text-muted-foreground mb-2">{method.timing}</p>}
                  <p className="font-semibold">{method.price}</p>
                  {method.note && <p className="text-sm text-muted-foreground mt-2">{method.note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p>Shipping options and rates are shown at checkout.</p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Shipping Policy</h2>
          <ul className="space-y-4">
            <li>Orders are processed within 1-2 business days</li>
            <li>Shipping is available within the continental United States</li>
            <li>Tracking information will be provided via email</li>
            <li>Signature may be required for orders over $100</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">International Shipping</h2>
          <p className="mb-4">
            Currently, we only ship within the continental United States. We plan to expand our shipping options to international destinations in the future.
          </p>
        </section>
      </div>
    </div>
  );
}