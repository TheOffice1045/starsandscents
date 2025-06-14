"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarIcon, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSettingsStore } from "@/lib/store/settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { user } = useAuth();
  
  // Get settings to check if star ratings are enabled
  const { settings } = useSettingsStore();

  // Add this new state to track if the user has already reviewed
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [userExistingReview, setUserExistingReview] = useState<any>(null);
  
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          customers:customer_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to include a name field
      const transformedData = data?.map(review => ({
        ...review,
        customers: review.customers ? {
          ...review.customers,
          name: `${review.customers.first_name || ''} ${review.customers.last_name || ''}`.trim() || 'Anonymous'
        } : null
      })) || [];
      
      setReviews(transformedData);
    } catch (error: any) {
      console.error('Error fetching reviews:', error?.message || 'Unknown error', error);
      // More specific error message with refresh option
      toast.error('Unable to load reviews. Please refresh the page or try again later.', {
        action: {
          label: 'Retry',
          onClick: () => fetchReviews()
        }
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, productId]);

  // Add a new state for the review title
  const [userReviewTitle, setUserReviewTitle] = useState("");
  
  // Update the handleEditReview function to also set the title
  const handleEditReview = (review: any) => {
    setUserReview(review.text || review.content || review.review || "");
    setUserRating(review.rating || 0);
    setUserReviewTitle(review.title || ""); // Set the title when editing
    setEditingReviewId(review.id);
    // Scroll to review form
    document.querySelector('.review-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Update the handleCancelEdit function to reset the title
  const handleCancelEdit = () => {
    setUserReview("");
    setUserRating(0);
    setUserReviewTitle(""); // Reset the title
    setEditingReviewId(null);
  };

  // Update the handleSubmitReview function to include the title
  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('Please sign in to leave a review');
      return;
    }

    // Check if rating is required based on settings
    if (settings.starRatingsEnabled && settings.starRatingsRequired && userRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!userReview.trim()) {
      toast.error('Please enter a review');
      return;
    }

    try {
      setSubmitting(true);

      // Get customer ID from email
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single();

      if (customerError) throw customerError;

      const customerId = customerData?.id;

      if (!customerId) {
        toast.error('Customer profile not found');
        return;
      }

      if (editingReviewId) {
        // Update existing review with title
        const { data: updatedReview, error } = await supabase
          .from('product_reviews')
          .update({
            rating: settings.starRatingsEnabled ? userRating : 0,
            text: userReview,
            title: userReviewTitle, // Include title in update
            updated_at: new Date().toISOString()
          })
          .eq('id', editingReviewId)
          .select('*');

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        toast.success('Review updated successfully');
        
        // Update the review in the state with title
        if (updatedReview) {
          setReviews(reviews.map(review => 
            review.id === editingReviewId 
              ? { 
                  ...review, 
                  text: userReview, 
                  rating: userRating, 
                  title: userReviewTitle, // Include title in state update
                  updated_at: new Date().toISOString() 
                } 
              : review
          ));
        } else {
          fetchReviews();
        }
        
        // Reset form including title
        setUserReview("");
        setUserRating(0);
        setUserReviewTitle(""); // Reset title
        setEditingReviewId(null);
      } else {
        // Submit new review with title
        const { data: newReview, error } = await supabase
          .from('product_reviews')
          .insert({
            product_id: productId,
            customer_id: customerId,
            rating: settings.starRatingsEnabled ? userRating : 0,
            text: userReview,
            title: userReviewTitle, // Include title in new review
            created_at: new Date().toISOString(),
            status: 'approved'
          })
          .select('*');

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        toast.success('Review submitted successfully');
        setUserReview("");
        setUserRating(0);
        
        // Update reviews state immediately with the new review
        if (newReview) {
          // Add customer info to the new review
          const reviewWithCustomer = {
            ...newReview[0],
            customers: {
              name: user.email?.split('@')[0] || 'Anonymous',
              email: user.email || ''
            }
          };
          setReviews([reviewWithCustomer, ...reviews]);
        } else {
          // If we don't get the new review back, fetch all reviews
          fetchReviews();
        }
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error(`Failed to submit review: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const checkUserReview = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .single();

      if (existingReview) {
        setUserReview(existingReview);
        setUserRating(existingReview.rating);
        setUserReviewTitle(existingReview.title || "");
        setUserHasReviewed(true);
        setUserExistingReview(existingReview);
      } else {
        setUserHasReviewed(false);
        setUserExistingReview(null);
      }
    } catch (error) {
      console.error('Error checking user review:', error);
    }
  }, [user, productId, supabase]);

  useEffect(() => {
    fetchReviews();
    checkUserReview();
  }, [productId, fetchReviews, checkUserReview]);

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-medium">Customer Reviews</h3>

      {/* Reviews List - Visible to all users */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="border-b pb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{review.name || review.customers?.name || 'Anonymous'}</p>
                  {/* Star ratings in review list - Only shown if enabled in settings */}
                  {settings.starRatingsEnabled && (
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                  
                  {/* Ellipsis menu for Edit/Delete - Only shown to the review author */}
                  {user && review.customers?.email === user.email && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 ml-2"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditReview(review)}>
                          Edit
                        </DropdownMenuItem>
                        {/* Removed delete button as handleDeleteReview is not defined */}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              {/* Only display custom titles, not the default ones */}
              {review.title && !review.title.startsWith('Review for product') && (
                <p className="font-medium mb-1">{review.title}</p>
              )}
              <p className="text-gray-700">{review.content || review.review || review.text}</p>
              {review.updated_at && review.updated_at !== review.created_at && (
                <p className="text-xs text-gray-400 mt-2">
                  Edited on {formatDate(review.updated_at)}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
        )}
      </div>

      {/* Review Form - Only shown to logged in users */}
      {user ? (
        <div className="bg-gray-50 p-6 rounded-lg review-form">
          {userHasReviewed && !editingReviewId ? (
            // User has already reviewed - show their review with edit option
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium">Your Review</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditReview(userExistingReview)}
                >
                  Edit Your Review
                </Button>
              </div>
              
              {/* Display the review title if it exists */}
              {userExistingReview?.title && (
                <h5 className="font-medium text-base mb-2">{userExistingReview.title}</h5>
              )}
              
              {settings.starRatingsEnabled && userExistingReview?.rating > 0 && (
                <div className="flex items-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`h-5 w-5 ${
                        i < userExistingReview.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-500">
                    {userExistingReview.rating} out of 5 stars
                  </span>
                </div>
              )}
              
              <p className="text-gray-700 mt-2">
                {userExistingReview?.text || userExistingReview?.content || userExistingReview?.review}
              </p>
              
              <p className="text-xs text-gray-500 mt-4">
                Posted on {formatDate(userExistingReview?.created_at)}
                {userExistingReview?.updated_at && userExistingReview.updated_at !== userExistingReview.created_at && (
                  <span> · Edited on {formatDate(userExistingReview.updated_at)}</span>
                )}
              </p>
            </div>
          ) : (
            // Show review form for editing or new review
            <>
              <h4 className="text-lg font-medium mb-4">
                {editingReviewId ? 'Edit Your Review' : 'Write a Review'}
              </h4>
              
              {/* Title input field */}
              <input
                type="text"
                placeholder="Review Title (optional)"
                value={userReviewTitle}
                onChange={(e) => setUserReviewTitle(e.target.value)}
                className="w-full p-2 border rounded mb-4"
                maxLength={100}
              />
              
              {/* Star Rating - Only shown if enabled in settings */}
              {settings.starRatingsEnabled && (
                <div className="flex items-center mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="focus:outline-none"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setUserRating(star)}
                      >
                        <StarIcon
                          className={`h-6 w-6 ${
                            star <= (hoverRating || userRating)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-500">
                    {userRating > 0 ? `${userRating} out of 5 stars` : "Select a rating"}
                    {settings.starRatingsRequired && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </div>
              )}
              
              <Textarea
                placeholder="Share your experience with this product..."
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                className="mb-4"
                rows={4}
              />
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleSubmitReview} 
                  disabled={submitting}
                  className="bg-[#4A332F] hover:bg-[#3a2824] text-white hover:text-white"
                >
                  {submitting ? "Submitting..." : editingReviewId ? "Update Review" : "Submit Review"}
                </Button>
                
                {editingReviewId && (
                  <Button 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    className="border-gray-300"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <p className="mb-3">You need to be logged in to write a review</p>
          <Button asChild className="bg-[#4A332F] hover:bg-[#3a2824]">
            <a href="/signin">Sign In to Write a Review</a>
          </Button>
        </div>
      )}
    </div>
  );
}

// Removed handleDeleteReview function as it uses undefined variables