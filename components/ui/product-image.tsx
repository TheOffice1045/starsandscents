import { useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import Image from 'next/image';

interface ProductImageProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
}

export function ProductImage({ url, alt, className = "rounded-md object-cover h-full w-full" }: ProductImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const placeholderUrl = "https://placehold.co/600x400?text=No+Image";
  
  // Validate URL on component mount and when URL changes
  useEffect(() => {
    // Reset error state when URL changes
    setHasError(false);
    
    // Validate URL
    if (!url || url.trim() === "") {
      setImageUrl(null);
      return;
    }
    
    // Set valid URL
    setImageUrl(url.trim());
  }, [url]);
  
  // If no valid URL or error occurred, show placeholder
  if (!imageUrl || hasError) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
        <Image
          src={placeholderUrl}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    );
  }
  
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}