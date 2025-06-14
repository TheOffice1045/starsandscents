"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div>
      {/* Hero Banner */}
      <div className="w-full h-[250px] relative bg-cover bg-center bg-fixed" 
           style={{ backgroundImage: "url('/images/contact-banner.jpg')" }}>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-light mb-3 tracking-wide">Contact Us</h1>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Link href="/" className="hover:text-[#F5E6D8] transition-colors">Home</Link>
              <span>•</span>
              <span className="text-[#F5E6D8]">Contact Us</span>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Contact Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Rest of your existing contact page content remains unchanged */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <p className="text-muted-foreground mb-6">
              Have questions about our products or need assistance? We&apos;re here to help!
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Email</h3>
                <p className="text-muted-foreground">support@serenitycandles.com</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Phone</h3>
                <p className="text-muted-foreground">(555) 123-4567</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Hours</h3>
                <p className="text-muted-foreground">Monday - Friday: 9am - 5pm EST</p>
              </div>
            </div>
          </div>
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block font-medium mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border border-input px-4 py-2"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-md border border-input px-4 py-2"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full rounded-md border border-input px-4 py-2 h-32"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}