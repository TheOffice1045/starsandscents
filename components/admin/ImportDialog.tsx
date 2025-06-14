"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { useFileDrop } from '@/lib/hooks/use-file-drop';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export function ImportDialog({ isOpen, onClose, onImport }: ImportDialogProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setStatus('error');
      setErrorMessage('Please select a CSV file');
      return;
    }

    try {
      setStatus('uploading');
      await onImport(file);
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import file');
    }
  };

  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useFileDrop(handleFileProcess);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {status === 'idle' && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileProcess(file);
                  }}
                />
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select CSV file
                </Button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                or drag and drop your file here
              </p>
            </div>
          )}

          {status === 'uploading' && (
            <div className="text-center p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm">Importing customers...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center p-6">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-4 text-sm">Import completed successfully!</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center p-6">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setStatus('idle')}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}