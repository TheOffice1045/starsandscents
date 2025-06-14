export default function ShippingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Shipping Information</h1>
      <div className="prose max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Shipping Methods</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Standard Shipping</h3>
              <p className="text-muted-foreground mb-2">5-7 business days</p>
              <p className="font-semibold">$5.99</p>
              <p className="text-sm text-muted-foreground mt-2">Free on orders over $50</p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Express Shipping</h3>
              <p className="text-muted-foreground mb-2">2-3 business days</p>
              <p className="font-semibold">$12.99</p>
            </div>
          </div>
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