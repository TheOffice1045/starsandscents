"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEmail } from "@/lib/hooks/useEmail";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { toast } from "sonner";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const { sendContactForm, isLoading } = useEmail();
  const siteConfig = useSiteConfig();
  const storeName = siteConfig.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await sendContactForm(
        formData.name,
        formData.email,
        formData.subject,
        formData.message,
        storeName
      );

      if (result.success) {
        toast.success("Message sent successfully! We'll get back to you soon.");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error(result.error || "Failed to send message. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again later.");
    }
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

      {/* Contact Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="subject" className="block font-medium mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full rounded-md border border-input px-4 py-2"
                  required
                  disabled={isLoading}
                  placeholder="How can we help you?"
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
                  disabled={isLoading}
                  placeholder="Tell us more about your inquiry..."
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}