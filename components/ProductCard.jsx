import Image from 'next/image';

// ... existing code ...
<Image
  src={product.image || '/default-product.jpg'}
  alt={product.name}
  width={300}
  height={300}
  className="w-full h-auto object-cover rounded-md"
  onError={(e) => {
    // If image fails to load, use a data URI for a simple gray placeholder
    const target = e.target;
    if (target instanceof HTMLImageElement) {
      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect width="300" height="300" fill="%23cccccc"/%3E%3C/svg%3E';
    }
  }}
/>
// ... existing code ...