"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Plus } from "lucide-react";

export function AddCollectionModal() {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Add your collection creation logic here
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#19191c]">
          <Plus className="mr-2 h-4 w-4" />
          Add Collection
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Collection Name</Label>
            <Input id="name" placeholder="Enter collection name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter collection description"
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input id="image" type="url" placeholder="Enter image URL" />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#19191c]">
              Create Collection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}