"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DiscountType = "fixed" | "percentage";

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (discount: {
    code: string;
    type: DiscountType;
    value: number;
  }) => void;
}

export function DiscountModal({ isOpen, onClose, onSave }: DiscountModalProps) {
  const [discountCode, setDiscountCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<string>("0");

  const handleSubmit = () => {
    onSave({
      code: discountCode,
      type: discountType,
      value: parseFloat(discountValue) || 0
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Create discount</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-lg font-medium mb-2">
              Discount code
            </label>
            <Input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="SUMMER2023"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-lg font-medium mb-2">
              Type
            </label>
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={discountType === "fixed"}
                  onChange={() => setDiscountType("fixed")}
                  className="h-4 w-4 rounded-full"
                />
                <span>Fixed amount</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={discountType === "percentage"}
                  onChange={() => setDiscountType("percentage")}
                  className="h-4 w-4 rounded-full"
                />
                <span>Percentage</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-lg font-medium mb-2">
              {discountType === "percentage" ? "Percentage" : "Amount"}
            </label>
            <Input
              type="number"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex justify-end space-x-4 mt-8">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-8"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-[#4A332F] hover:bg-[#3a2824] text-white px-8"
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}