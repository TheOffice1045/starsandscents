export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Frequently Asked Questions</h1>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Product Information</h2>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">What type of wax do you use?</h3>
              <p className="text-muted-foreground">
                We use 100% natural soy wax for all our candles. This provides a clean, long-lasting burn with excellent scent throw.
              </p>
            </div>
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">How long do your candles burn?</h3>
              <p className="text-muted-foreground">
                Our standard 8oz candles have a burn time of approximately 40-50 hours when burned properly.
              </p>
            </div>
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Are your fragrances natural?</h3>
              <p className="text-muted-foreground">
                We use a blend of essential oils and premium fragrance oils that are phthalate-free and carefully selected for their quality.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Orders & Shipping</h2>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">How long does shipping take?</h3>
              <p className="text-muted-foreground">
                Standard shipping takes 5-7 business days. Express shipping is available for 2-3 business day delivery.
              </p>
            </div>
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Do you ship internationally?</h3>
              <p className="text-muted-foreground">
                Currently, we only ship within the continental United States.
              </p>
            </div>
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Can I modify my order?</h3>
              <p className="text-muted-foreground">
                Orders can be modified within 1 hour of placement. Please contact customer service immediately for assistance.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Care Instructions</h2>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">How do I care for my candle?</h3>
              <p className="text-muted-foreground">
                Trim the wick to 1/4 inch before each use, allow the wax to melt completely across the surface on first burn, and never burn for more than 4 hours at a time.
              </p>
            </div>
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">What if my candle tunnels?</h3>
              <p className="text-muted-foreground">
                To prevent tunneling, always allow the wax to melt completely across the surface on the first burn. If tunneling occurs, wrap the candle in aluminum foil while burning to help even out the wax.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}