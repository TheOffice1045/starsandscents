"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyDiscount: (amount: number, type: 'fixed' | 'percentage') => void;
}

export function DiscountDialog({ open, onOpenChange, onApplyDiscount }: DiscountDialogProps) {
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [amount, setAmount] = useState<string>('');
  const [code, setCode] = useState<string>('');

  const handleApply = () => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      onApplyDiscount(numAmount, discountType);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Discount</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Discount Type</label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={discountType === 'fixed' ? 'default' : 'outline'}
                onClick={() => setDiscountType('fixed')}
              >
                Fixed Amount
              </Button>
              <Button
                type="button"
                variant={discountType === 'percentage' ? 'default' : 'outline'}
                onClick={() => setDiscountType('percentage')}
              >
                Percentage
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              placeholder={discountType === 'fixed' ? "0.00" : "0"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Discount Code (Optional)</label>
            <Input
              placeholder="Enter discount code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Discount
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}