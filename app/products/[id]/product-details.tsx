"use client";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductDetailsProps {
  product: {
    id: number;
    name: string;
    price: number;
    oldPrice?: number | null;
    image: string;
    isNew?: boolean;
  };
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("6 oz");
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  
  // Add these new states
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [reviews, setReviews] = useState([
    {
      id: 1,
      userId: 'user1',
      name: 'Sarah M.',
      rating: 5,
      text: 'Amazing fragrance that lasts for hours! The packaging was beautiful and the candle burns evenly. Will definitely purchase again.',
      date: '2 months ago',
    },
    {
      id: 2,
      userId: 'user2',
      name: 'Michael R.',
      rating: 4,
      text: 'Great quality candle with a wonderful scent. The only reason for 4 stars is that I wish it lasted a bit longer.',
      date: '1 month ago',
    },
  ]);

  // Mock current user (replace with your auth system)
  const currentUser = { id: 'user1', isAdmin: false };

  // Add these new handlers
  // Add this helper function after the states
  const hasUserReviewed = reviews.some(review => review.userId === currentUser.id);

  // Update the handleSubmitReview function
  // Add this at the top with other state declarations
    const [nextReviewId, setNextReviewId] = useState(3); // Start from 3 since we have 2 initial reviews
  
    // Update the handleSubmitReview function
    const handleSubmitReview = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingReviewId) {
        setReviews(reviews.map(review => 
          review.id === editingReviewId 
            ? { ...review, rating, text: reviewText }
            : review
        ));
      } else if (!hasUserReviewed) {
        setReviews([...reviews, {
          id: nextReviewId,
          userId: currentUser.id,
          name: 'Current User',
          rating,
          text: reviewText,
          date: 'Just now',
        }]);
        setNextReviewId(nextReviewId + 1);
      }
      setRating(0);
      setReviewText('');
      setEditingReviewId(null);
    };

  // Update the Reviews Content section
  {/* Reviews Content */}
  <div className={`py-6 ${activeTab !== 'reviews' ? 'hidden' : ''}`}>
    <div className="space-y-8">
      {/* Existing Reviews */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="font-medium">{review.name}</div>
              <div className="text-yellow-400">
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
              <div className="text-gray-500 text-sm">{review.date}</div>
              {(currentUser.id === review.userId || currentUser.isAdmin) && (
                <div className="ml-auto space-x-2">
                  <button
                    onClick={() => handleEditReview(review)}
                    className="text-sm text-[#4A332F] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <p className="text-gray-600">{review.text}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
  const handleEditReview = (review: typeof reviews[0]) => {
    setRating(review.rating);
    setReviewText(review.text);
    setEditingReviewId(review.id);
  };

  const handleDeleteReview = (reviewId: number) => {
    setReviews(reviews.filter(review => review.id !== reviewId));
  };

  const sizes = [
    { label: "6 oz", price: product.price },
    { label: "8 oz", price: product.price * 1.25 },
    { label: "12 oz", price: product.price * 1.5 },
  ];

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: `${product.name} - ${selectedSize}`,
      price: sizes.find(s => s.label === selectedSize)?.price || product.price,
      image: product.image,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-8">
        <Link href="/" className="text-gray-500 hover:text-[#4A332F]">Home</Link>
        <span className="text-gray-500">/</span>
        <Link href="/shop" className="text-gray-500 hover:text-[#4A332F]">Shop</Link>
        <span className="text-gray-500">/</span>
        <span className="text-[#4A332F]">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-gray-50">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                className="relative aspect-square bg-gray-50"
              >
                <Image
                  src={product.image}
                  alt={`${product.name} view ${num}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-medium mb-4">{product.name}</h1>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xl font-medium">
              ${sizes.find(s => s.label === selectedSize)?.price.toFixed(2)}
            </span>
            {product.oldPrice && (
              <span className="text-gray-400 line-through">
                ${product.oldPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Size Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Size of a Piece
            </label>
            <div className="grid grid-cols-3 gap-4">
              {sizes.map((size) => (
                <button
                  key={size.label}
                  onClick={() => setSelectedSize(size.label)}
                  className={cn(
                    "py-3 border text-sm transition-colors",
                    selectedSize === size.label
                      ? "border-[#4A332F] text-[#4A332F]"
                      : "border-gray-200 text-gray-500 hover:border-[#4A332F] hover:text-[#4A332F]"
                  )}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-2 w-32">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="flex-1 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart */}
          <Button
            className="w-full mb-6"
            size="lg"
            onClick={handleAddToCart}
          >
            ADD TO CART
          </Button>

          {/* Features */}
          <div className="grid grid-cols-4 gap-4 py-8 border-t border-b">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(/icons/natural.svg)' }} />
              <span className="text-xs">NATURAL INGREDIENTS</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(/icons/handmade.svg)' }} />
              <span className="text-xs">HANDMADE</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(/icons/warranty.svg)' }} />
              <span className="text-xs">24 MONTH WARRANTY</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(/icons/shipping.svg)' }} />
              <span className="text-xs">FREE SHIPPING</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Reviews Tabs */}
      <div className="mt-16">
        <div className="border-b">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('description')}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === 'description'
                  ? "border-[#4A332F] text-[#4A332F] font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? "border-[#4A332F] text-[#4A332F] font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Reviews (2)
            </button>
          </nav>
        </div>

        {/* Description Content */}
        <div className={`py-6 prose prose-sm max-w-none ${activeTab !== 'description' ? 'hidden' : ''}`}>
          <p>
            Our handcrafted candles are made with the finest natural ingredients, 
            creating a luxurious and long-lasting fragrance for your home. Each 
            candle is carefully poured and features:
          </p>
          <ul className="mt-4 space-y-2">
            <li>100% natural soy wax for a clean, even burn</li>
            <li>Premium cotton wicks for optimal fragrance throw</li>
            <li>Hand-poured in small batches for quality control</li>
            <li>30-40 hours burn time (6 oz)</li>
            <li>45-50 hours burn time (8 oz)</li>
            <li>60-70 hours burn time (12 oz)</li>
          </ul>
          <p className="mt-4">
            For best results, trim wick to 1/4 inch before each use and allow the 
            wax to melt to the edges of the container during the first burn.
          </p>
        </div>

        {/* Reviews Content */}
        <div className={`py-6 ${activeTab !== 'reviews' ? 'hidden' : ''}`}>
          <div className="space-y-8">
            {/* Existing Reviews */}
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="font-medium">{review.name}</div>
                    <div className="text-yellow-400">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </div>
                    <div className="text-gray-500 text-sm">{review.date}</div>
                    {(currentUser.id === review.userId || currentUser.isAdmin) && (
                      <div className="ml-auto space-x-2">
                        <button
                          onClick={() => handleEditReview(review)}
                          className="text-sm text-[#4A332F] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600">{review.text}</p>
                </div>
              ))}
            </div>

            {/* Review Form - Only show if user hasn't reviewed */}
            {!hasUserReviewed && !editingReviewId && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Write a Review</h3>
                <form className="space-y-4" onSubmit={handleSubmitReview}>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rating</label>
                    <div className="flex gap-1 text-2xl">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`${
                            star <= rating ? 'text-yellow-400' : 'text-gray-300'
                          } hover:text-yellow-400 transition-colors`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Your Review</label>
                    <textarea
                      rows={4}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full rounded-md border border-gray-200 focus:border-[#4A332F] focus:ring-[#4A332F] text-sm"
                      placeholder="Share your thoughts about this product..."
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingReviewId ? 'Update Review' : 'Submit Review'}
                  </Button>
                </form>
              </div>
            )}

            {/* Edit Form - Only show when editing */}
            {editingReviewId && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Edit Review</h3>
                <form className="space-y-4" onSubmit={handleSubmitReview}>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rating</label>
                    <div className="flex gap-1 text-2xl">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`${
                            star <= rating ? 'text-yellow-400' : 'text-gray-300'
                          } hover:text-yellow-400 transition-colors`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Your Review</label>
                    <textarea
                      rows={4}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full rounded-md border border-gray-200 focus:border-[#4A332F] focus:ring-[#4A332F] text-sm"
                      placeholder="Share your thoughts about this product..."
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingReviewId ? 'Update Review' : 'Submit Review'}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products would go here */}
    </div>
  );
}