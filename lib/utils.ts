import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format price to currency string
export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined) return '$0.00';
  
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numericPrice);
}

// Generate a random SKU
export function generateSKU(productName: string): string {
  const prefix = productName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 3);
    
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}-${randomNum}`;
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}

// Convert status to display format
export function formatStatus(status: string): { label: string; color: string } {
  switch (status?.toLowerCase()) {
    case 'active':
      return { label: 'Active', color: 'bg-green-100 text-green-800' };
    case 'draft':
      return { label: 'Draft', color: 'bg-gray-100 text-gray-800' };
    case 'archived':
      return { label: 'Archived', color: 'bg-amber-100 text-amber-800' };
    default:
      return { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
}

// Format date to a readable string
export function formatDate(dateString: string | null | undefined, includeTime: boolean = false): string {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(includeTime ? {
      hour: '2-digit',
      minute: '2-digit'
    } : {})
  }).format(date);
}

// Calculate discount percentage
export function calculateDiscountPercentage(price: number, compareAtPrice: number): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  
  const discount = ((compareAtPrice - price) / compareAtPrice) * 100;
  return Math.round(discount);
}

// Format tags for display
export function formatTags(tags: string[] | null | undefined): string {
  if (!tags || tags.length === 0) return 'None';
  return tags.join(', ');
}

// Validate product data
export function validateProduct(product: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!product.title || product.title.trim() === '') {
    errors.push('Product title is required');
  }
  
  if (!product.description || product.description.trim() === '') {
    errors.push('Product description is required');
  }
  
  if (product.price === undefined || product.price === null || isNaN(product.price)) {
    errors.push('Valid product price is required');
  } else if (product.price < 0) {
    errors.push('Product price cannot be negative');
  }
  
  if (product.quantity === undefined || product.quantity === null || isNaN(product.quantity)) {
    errors.push('Valid product quantity is required');
  } else if (product.quantity < 0) {
    errors.push('Product quantity cannot be negative');
  }
  
  if (!product.status || !['active', 'draft'].includes(product.status)) {
    errors.push('Valid product status is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Generate slug from product title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .trim();
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Check if a URL is valid
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Format product inventory status
export function getInventoryStatus(quantity: number): { label: string; color: string } {
  if (quantity <= 0) {
    return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
  } else if (quantity <= 5) {
    return { label: 'Low Stock', color: 'bg-amber-100 text-amber-800' };
  } else {
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  }
}
