'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, MoreVertical, Edit, Trash } from 'lucide-react';
import { Button } from './ui/button';
import { useOnClickOutside } from '@/lib/hooks/use-on-click-outside';

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  userId?: string;
}

interface ProductTabsProps {
  description: string;
  productId: number;
}

export function ProductTabs({ description, productId }: ProductTabsProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(actionsRef, () => setShowActions(null));

  useEffect(() => {
    setMounted(true);
    const savedReviews = localStorage.getItem(`product-reviews-${productId}`);
    if (savedReviews) {
      setReviews(JSON.parse(savedReviews));
    }
  }, [productId]);

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setRating(review.rating);
    setName(review.name);
    setComment(review.comment);
    setShowReviewForm(true);
    setShowActions(null);
  };

  const handleDeleteReview = (reviewId: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      const updatedReviews = reviews.filter(r => r.id !== reviewId);
      setReviews(updatedReviews);
      localStorage.setItem(`product-reviews-${productId}`, JSON.stringify(updatedReviews));
      setShowActions(null);
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    const reviewData = {
      id: editingReview ? editingReview.id : `${productId}-${Date.now()}`,
      name,
      rating,
      comment,
      date: editingReview ? editingReview.date : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      userId: 'current-user-id',
    };

    const updatedReviews = editingReview
      ? reviews.map(r => r.id === editingReview.id ? reviewData : r)
      : [reviewData, ...reviews];

    setReviews(updatedReviews);
    localStorage.setItem(`product-reviews-${productId}`, JSON.stringify(updatedReviews));
    setShowReviewForm(false);
    setEditingReview(null);
    setRating(0);
    setComment('');
    setName('');
  };

  if (!mounted) {
    return null;
  }

  return (
    <div>
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('description')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'description'
                ? "border-[#4A332F] text-[#4A332F]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reviews'
                ? "border-[#4A332F] text-[#4A332F]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Reviews
          </button>
        </nav>
      </div>

      <div className="py-6">
        {activeTab === 'description' && (
          <div className="prose max-w-none">
            <p className="text-gray-600">{description}</p>
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Customer Reviews</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </p>
              </div>
              {!showReviewForm && (
                <Button 
                  onClick={() => setShowReviewForm(true)}
                  variant="outline"
                >
                  Write a review
                </Button>
              )}
            </div>

            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">
                  {editingReview ? 'Edit Your Review' : 'Write Your Review'}
                </h4>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="text-gray-300 hover:text-yellow-400"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            rating >= star ? "fill-yellow-400 text-yellow-400" : ""
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#4A332F] focus:ring-[#4A332F]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Review</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#4A332F] focus:ring-[#4A332F]"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowReviewForm(false);
                      setEditingReview(null);
                      setRating(0);
                      setComment('');
                      setName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingReview ? 'Update Review' : 'Submit Review'}
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-medium">{review.name}</span>
                      </div>
                      
                      {(review.userId === 'current-user-id' || true) && (
                        <div className="relative">
                          <button
                            onClick={() => setShowActions(review.id)}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {showActions === review.id && (
                            <div
                              ref={actionsRef}
                              className="absolute right-0 top-8 w-32 bg-white shadow-lg rounded-md py-1 z-10"
                            >
                              <button
                                onClick={() => handleEditReview(review)}
                                className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-50 text-red-600"
                              >
                                <Trash className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{review.comment}</p>
                    <span className="text-sm text-gray-500">{review.date}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">
                  No reviews yet. Be the first to review this product.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}