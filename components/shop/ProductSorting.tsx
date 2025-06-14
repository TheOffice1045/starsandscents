"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface SortOption {
  label: string;
  value: string;
}

interface ProductSortingProps {
  onSortChange: (value: string) => void;
  currentSort: string;
}

export function ProductSorting({ onSortChange, currentSort }: ProductSortingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const sortOptions: SortOption[] = [
    { label: "Default sorting", value: "default" },
    { label: "Best Selling", value: "best-selling" },
    { label: "Alphabetically, A-Z", value: "title-asc" },
    { label: "Price, high to low", value: "price-desc" },
    { label: "Price, low to high", value: "price-asc" },
    { label: "Date, old to new", value: "date-asc" },
    { label: "Date, new to old", value: "date-desc" },
  ];
  
  // Find the current sort option label
  const currentSortLabel = sortOptions.find(option => option.value === currentSort)?.label || "Default sorting";
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="flex items-center gap-2 text-gray-500 border border-gray-300 px-4 py-2 rounded-md text-xs"
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentSortLabel}
        <ChevronDown className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[160px] whitespace-nowrap">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              className={`block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm ${
                currentSort === option.value ? "text-[#4A332F] font-medium" : "text-gray-700"
              }`}
              onClick={() => {
                onSortChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}