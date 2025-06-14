import { useState, useCallback } from 'react';

export function useFileDrop(onDrop: (file: File) => void, accept = '.csv') {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(accept)) {
      onDrop(file);
    }
  }, [onDrop, accept]);

  return { isDragging, handleDragOver, handleDragLeave, handleDrop };
}