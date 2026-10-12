"use client";

import { AdminButton } from "@/components/ui/admin-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone } from "lucide-react";
import { useState, useRef } from "react";
import Image from 'next/image';

export default function ProfilePage() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size should be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-medium">Profile Settings</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center gap-6">
            <div className="relative h-32 w-32">
              <Image
                src={photoUrl || '/placeholder.png'}
                alt="Profile avatar"
                fill
                className="object-cover rounded-full"
              />
            </div>
            <div>
              <h3 className="font-medium mb-1">Profile Photo</h3>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
              />
              <AdminButton 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Change photo
              </AdminButton>
              {photoUrl && (
                <button
                  onClick={() => setPhotoUrl(null)}
                  className="ml-2 text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">First Name</label>
                <Input placeholder="Enter first name" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Last Name</label>
                <Input placeholder="Enter last name" />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input className="pl-10" placeholder="Enter email address" type="email" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input className="pl-10" placeholder="Enter phone number" type="tel" />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <AdminButton>
              Save Changes
            </AdminButton>
          </div>
        </div>
      </Card>
    </div>
  );
}