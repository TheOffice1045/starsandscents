"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "../../components/ui/star-rating";
import { toast } from "sonner";

interface ProductReviewsProps {
  productId: string;
  storeSettings?: {
    reviewsEnabled: boolean;
    starRatingsEnabled: boolean;
    starRatingsRequired: boolean;
  };
}

interface Review {
  rating: number;
  comment: string;
}

export default function ProductReviews({ productId, storeSettings }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [userReview, setUserReview] = useState<any>(null);
  const [newReview, setNewReview] = useState<Review>({
    rating: 0,
    comment: ""
  });
  const [localSettings, setLocalSettings] = useState<any>(storeSettings || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchReviews = useCallback(async () => {
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          *,
          customers (
            id,
            first_name,
            last_name
          )
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (reviewsError) {
        toast.error("Error fetching reviews");
        return;
      }

      setReviews(reviewsData || []);

      // Get user's review if logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: customerData } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (customerData) {
          const userReview = reviewsData?.find(
            (review) => review.customer_id === customerData.id
          );
          setUserReview(userReview || null);
        }
      }
    } catch (error) {
      toast.error("Error fetching reviews");
    } finally {
      setIsLoading(false);
    }
  }, [productId, supabase]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchReviews();
  }, [productId, fetchReviews]);

  // Fetch store settings and reviews
  useEffect(() => {
    const fetchSettingsAndReviews = async () => {
      try {
        setIsLoading(true);
        
        // If storeSettings prop is provided, use it
        if (storeSettings) {
          setLocalSettings(storeSettings);
        } else {
          // Otherwise fetch from database
          const { data: settings, error: settingsError } = await supabase
            .from('store_settings')
            .select('reviews_enabled, star_ratings_enabled, star_ratings_required')
            .single();
            
          if (settingsError && settingsError.code !== 'PGRST116') {
            console.error("Error fetching store settings:", settingsError);
            return;
          }
          
          setLocalSettings(settings || {
            reviews_enabled: false,
            star_ratings_enabled: false,
            star_ratings_required: false
          });
        }
      } catch (error) {
        console.error("Error in fetchSettingsAndReviews:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettingsAndReviews();
  }, [productId, storeSettings, supabase]);

  // Submit a new review
  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      toast.error("Please enter a review");
      return;
    }
    
    if (localSettings?.star_ratings_enabled && localSettings?.star_ratings_required && newReview.rating === 0) {
      toast.error("Please provide a star rating");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to submit a review");
        return;
      }

      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (customerError) {
        toast.error("Error submitting review");
        return;
      }

      const customerId = customerData.id;

      const { error: reviewError } = await supabase
        .from("reviews")
        .insert({
          product_id: productId,
          customer_id: customerId,
          content: newReview.comment,
          rating: localSettings?.star_ratings_enabled ? newReview.rating : null,
          created_at: new Date().toISOString()
        });

      if (reviewError) {
        toast.error("Error submitting review");
        return;
      }
      
      toast.success("Review submitted successfully");
      setNewReview({
        rating: 0,
        comment: ""
      });
      
      // Refresh reviews
      fetchReviews();
    } catch (error) {
      toast.error("Error submitting review");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If reviews are disabled or still loading, don't render anything
  if (isLoading) {
    return <div className="py-4 text-center">Loading reviews...</div>;
  }
  
  if (!localSettings?.reviews_enabled) {
    return null; // Don't render anything if reviews are disabled
  }

  return (
    <div className="mt-12 pt-8">
      <h2 className="text-2xl font-medium mb-6">Customer Reviews</h2>
      
      {/* Review submission form */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-medium mb-4">Write a Review</h3>
        
        {localSettings?.star_ratings_enabled && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating {localSettings?.star_ratings_required && <span className="text-red-500">*</span>}
            </label>
            <StarRating 
              value={newReview.rating} 
              onChange={(value: number) => setNewReview({ ...newReview, rating: value })} 
              size="large" 
            />
          </div>
        )}
        
        <Textarea
          placeholder="Share your thoughts about this product..."
          value={newReview.comment}
          onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
          className="mb-4"
          rows={4}
        />
        
        <Button 
          onClick={handleSubmitReview}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </Button>
      </div>
      
      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b pb-6">
              {localSettings?.star_ratings_enabled && review.rating && (
                <div className="mb-2">
                  <StarRating value={review.rating} readOnly size="small" />
                </div>
              )}
              <p className="text-gray-800">{review.content}</p>
              <div className="mt-2 text-sm text-gray-500">
                {new Date(review.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No reviews yet. Be the first to review this product!
        </div>
      )}
    </div>
  );
}