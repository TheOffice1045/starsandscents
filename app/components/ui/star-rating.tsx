"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "small" | "medium" | "large";
}

export function StarRating({ 
  value, 
  onChange, 
  readOnly = false,
  size = "medium" 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClass = {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6"
  }[size];
  
  const handleClick = (rating: number) => {
    if (!readOnly && onChange) {
      onChange(rating);
    }
  };
  
  const handleMouseEnter = (rating: number) => {
    if (!readOnly) {
      setHoverRating(rating);
    }
  };
  
  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };
  
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((rating) => (
        <span
          key={rating}
          onClick={() => handleClick(rating)}
          onMouseEnter={() => handleMouseEnter(rating)}
          onMouseLeave={handleMouseLeave}
          className={`cursor-${readOnly ? 'default' : 'pointer'} mr-1`}
        >
          <svg
            className={`${sizeClass} ${
              (hoverRating || value) >= rating
                ? "text-yellow-400"
                : "text-gray-300"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}