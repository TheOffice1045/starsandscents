// Add collections data
export const collections = [
  {
    id: "seasonal",
    name: "Seasonal",
  },
  {
    id: "bestsellers",
    name: "Best Sellers",
  },
  {
    id: "new",
    name: "New Arrivals",
  },
  {
    id: "sale",
    name: "Sale",
  }
];

export const products = [
  {
    id: "1",
    name: "Vanilla Dream",
    price: 24.99,
    image: "/candle1.jpg",
    salesCount: 150,
    addedDate: "2024-01-15",
    collectionId: "bestsellers"  // Add collection reference
  },
  {
    id: "2",
    name: "Ocean Breeze",
    price: 29.99,
    oldPrice: 34.99,
    image: "/candle2.jpg",
    salesCount: 200,
    addedDate: "2024-01-20",
    collectionId: "new"  // Add collection reference
  },
  // ... update other products with addedDate
];