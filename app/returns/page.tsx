export default function ReturnsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Returns & Refunds</h1>
      <div className="prose max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Return Policy</h2>
          <p className="mb-4">
            We want you to be completely satisfied with your purchase. If you&apos;re not happy with your order, we accept returns within 30 days of delivery.
          </p>
          <div className="bg-muted p-6 rounded-lg mb-6">
            <h3 className="text-xl font-semibold mb-3">Return Requirements</h3>
            <ul className="space-y-2">
              <li>Items must be unused and in original packaging</li>
              <li>Include original receipt or proof of purchase</li>
              <li>Products must not show signs of burning or damage</li>
              <li>Limited edition items are final sale</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Refund Process</h2>
          <ol className="space-y-4">
            <li>
              <strong>1. Initiate Return:</strong> Contact our customer service team to receive a return authorization
            </li>
            <li>
              <strong>2. Package Item:</strong> Carefully package the item in its original packaging
            </li>
            <li>
              <strong>3. Ship Return:</strong> Send the package to our returns center
            </li>
            <li>
              <strong>4. Refund Processing:</strong> Refunds are processed within 5-7 business days of receiving the return
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Damaged Items</h2>
          <p>
            If you receive a damaged item, please contact us within 48 hours of delivery. We&apos;ll provide a prepaid return label and send a replacement immediately.
          </p>
        </section>
      </div>
    </div>
  );
}