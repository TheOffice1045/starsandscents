"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Upload, Pencil } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import Image from "next/image";

interface ImageUploaderProps {
  images: Array<{
    id?: string;
    url: string;
    altText?: string;
    position?: number;
  }>;
  onChange: (images: any[]) => void;
}

export function ImageUploader({ images = [], onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [editingAltText, setEditingAltText] = useState<number | null>(null);
  const [altText, setAltText] = useState("");
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      // First, let's list available buckets to debug
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
        toast.error(`Failed to list storage buckets: ${bucketsError.message}`);
        return;
      }
      
      // Log available buckets
      console.log('Available buckets:', buckets);
      
      // Use the first available bucket or default to 'product-images'
      const bucketName = buckets && buckets.length > 0 ? buckets[0].name : 'product-images';
      
      const newImages = [...images];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds the 5MB size limit`);
          continue;
        }
        
        // Generate a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;
        
        console.log(`Attempting to upload to bucket: ${bucketName}`);
        
        // Upload to the first available bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
              
        if (uploadError) {
          console.error(`Supabase upload error for bucket ${bucketName}:`, uploadError);
          toast.error(`Failed to upload ${file.name}: ${uploadError.message || 'Bucket not found'}`);
          continue;
        }
        
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
            
        if (!publicUrlData || !publicUrlData.publicUrl) {
          toast.error(`Failed to get public URL for ${file.name}`);
          continue;
        }
        
        // Add to images array
        newImages.push({
          url: publicUrlData.publicUrl,
          altText: '',
          position: newImages.length
        });
      }
      
      onChange(newImages);
      
      if (newImages.length > images.length) {
        toast.success('Images uploaded successfully');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(`Failed to upload image: ${error?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      // Reset the input
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    // Update positions
    newImages.forEach((img, idx) => {
      img.position = idx;
    });
    onChange(newImages);
  };

  const handleEditAltText = (index: number) => {
    setEditingAltText(index);
    setAltText(images[index].altText || '');
  };

  const handleSaveAltText = () => {
    if (editingAltText === null) return;
    
    const newImages = [...images];
    newImages[editingAltText].altText = altText;
    onChange(newImages);
    setEditingAltText(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex === dropIndex) return;
    
    const newImages = [...images];
    const draggedItem = newImages[dragIndex];
    
    // Remove the dragged item
    newImages.splice(dragIndex, 1);
    // Insert at the new position
    newImages.splice(dropIndex, 0, draggedItem);
    
    // Update positions
    newImages.forEach((img, idx) => {
      img.position = idx;
    });
    
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Product Images</h3>
        <div>
          <Input
            type="file"
            id="image-upload"
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
          />
          <label htmlFor="image-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="cursor-pointer"
              asChild
            >
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Images
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>
      
      {images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative border rounded-md overflow-hidden group"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="aspect-square relative">
                <Image
                  src={image.url}
                  alt={image.altText || `Product image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEditAltText(index)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {editingAltText === index && (
                <div className="absolute inset-0 bg-white p-2 flex flex-col">
                  <Input
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Enter alt text"
                    className="mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAltText(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveAltText}
                      className="flex-1"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                {index === 0 && <span className="font-medium">Main Image</span>}
                {index !== 0 && <span>Position {index + 1}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <div className="flex flex-col items-center">
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-500 mb-2">No images uploaded yet</p>
            <p className="text-gray-400 text-sm">
              Drag and drop images or click the upload button
            </p>
          </div>
        </div>
      )}
      
      <div className="text-sm text-gray-500">
        <p>You can drag and drop images to reorder them. The first image will be used as the main product image.</p>
        <p>Recommended image size: 1000x1000px. Max file size: 5MB.</p>
      </div>
    </div>
  );
}