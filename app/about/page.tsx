"use client";

import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="w-full">
      {/* Hero Banner */}
      <div className="w-full h-[250px] relative bg-cover bg-center bg-fixed" 
           style={{ backgroundImage: "url('/images/about-banner.jpg')" }}>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-light mb-3 tracking-wide">About Us</h1>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Link href="/" className="hover:text-[#F5E6D8] transition-colors">Home</Link>
              <span>•</span>
              <span className="text-[#F5E6D8]">About Us</span>
            </div>
          </div>
        </div>
      </div>

      {/* Our Story Section */}
      <div className="container mx-auto py-16 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-light mb-1">Our Story</h2>
            <p className="text-xs text-gray-500 mb-5">Discover our journey and passion</p>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              Our business started with a $200 birthday gift and challenge.
            </p>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              For her 10th birthday in 2022, our founder was gifted $200 by her mom and challenged to start a business of her own. Instead of choosing something simple, she decided to learn how to make candles—and turned that idea into a real brand.
            </p>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              She&apos;s been running the business ever since, and has even teamed up with her brother. Together they proudly co-own and operate the business.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Every candle we make represents creativity, hard work, and the belief that age is never a limit. Thanks for being part of our journey.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="relative w-[350px] h-[350px]">
              <Image 
                src="/images/About/1.png" 
                alt="Our candle making process" 
                fill
                className="object-cover rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Team section - Fixed structure */}
      <div className="container mx-auto py-16 px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="relative w-[250px] h-[250px] mx-auto mb-3">
              <Image 
                src="/images/About/2.png"
                alt="Sage Moore" 
                fill
                className="object-cover"
              />
            </div>
            <h3 className="font-medium text-sm">Award Winner</h3>
            <p className="text-gray-500 text-xs">Recognized for Young Entrepreneurship</p>
          </div>
          <div className="text-center">
            <div className="relative w-[250px] h-[250px] mx-auto mb-3">
              <Image
                src="/images/About/3.png"
                alt="Children's Business Fair"
                fill
                className="object-cover"
              />
            </div>
            <h3 className="font-medium text-sm">Business Fair</h3>
            <p className="text-gray-500 text-xs">Sharing Our Products with the Community</p>
          </div>
          <div className="text-center">
            <div className="relative w-[250px] h-[250px] mx-auto mb-3">
              <Image
                src="/images/About/4.png"
                alt="Meeting Customers"
                fill
                className="object-cover"
              />
            </div>
            <h3 className="font-medium text-sm">Customer Connections</h3>
            <p className="text-gray-500 text-xs">Building Relationships One Candle at a Time</p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-neutral-100 py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-700">
                  <path d="M20 5L5 15V35H35V15L20 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 35V20H25V35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Creativity</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                What started as a birthday challenge became a real brand. We bring imagination and fresh ideas to every candle we create.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-700">
                  <path d="M20 5L25 15H35L27 22L30 32L20 27L10 32L13 22L5 15H15L20 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Hard Work</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                From learning the craft to running a business, we put dedication into everything we do. Every candle is handmade with care and attention.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-700">
                  <path d="M5 20H35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M30 10L35 20L30 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Family</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                A sister-brother team proudly co-owning and operating this business together. We believe age is never a limit when you have passion and support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Behind The Brands */}
      <div className="container mx-auto py-16 px-6">
        <h2 className="text-2xl font-medium mb-5 text-center">Behind The Brand</h2>
        <p className="text-sm text-gray-700 text-center max-w-3xl mx-auto mb-12 leading-relaxed">
          Stars And Scents was born from a $200 birthday gift and a challenge to dream big. Our founder started this journey at just 10 years old in 2022, learning to make candles from scratch and turning that skill into a real business. Now joined by her brother, together they run every part of the operation—from crafting each candle by hand to connecting with customers. We&apos;re proof that with creativity, hard work, and a little family support, anything is possible.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Team members are already displayed above, so you can remove this duplicate section */}
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="bg-neutral-100 py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 6L12 13L2 6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-sm font-medium mb-2">JOIN OUR NEWSLETTER!</h3>
          <p className="text-xs text-gray-600 mb-5">
            Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
          </p>
          <div className="flex max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-grow border border-gray-300 px-4 py-2 text-sm focus:outline-none"
            />
            <button className="bg-black text-white px-6 py-2 text-xs font-medium">SUBMIT</button>
          </div>
        </div>
      </div>
    </div>
  );
}