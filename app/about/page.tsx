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
              It started with a dream. We began as a simple idea to bring the tranquility and warmth of handcrafted candles into homes across the world.
            </p>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              Our journey started with small batches made in our founder&apos;s kitchen. Today, we&apos;ve grown but still maintain the same dedication to quality and craftsmanship that defined us from the beginning.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Each candle is still hand-poured with care, using only the finest ingredients to create memorable scent experiences that transform your space.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="relative w-[350px] h-[350px]">
              <Image 
                src="/images/about-story.jpg" 
                alt="Our candle making process" 
                fill
                className="object-cover rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Who We Are Section */}
      <div className="container mx-auto py-16 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="order-2 md:order-1">
            <div className="relative w-[350px] h-[350px] mx-auto md:mx-0">
              <Image 
                src="/images/about-who-we-are.jpg" 
                alt="Our candles" 
                fill
                className="object-cover rounded"
              />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-2xl font-light mb-1">Who We Are ?</h2>
            <p className="text-xs text-gray-500 mb-5">Meet the team behind the scents</p>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              We are artisans, dreamers, and creators dedicated to crafting exceptional candle experiences that elevate everyday moments into something special.
            </p>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              Our small team combines traditional candlemaking techniques with innovative approaches to create products that are both beautiful and functional.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              We believe in sustainability, quality, and creating products that bring joy and tranquility to your home.
            </p>
          </div>
        </div>
      </div>

      {/* Team section - Fixed structure */}
      <div className="container mx-auto py-16 px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="relative w-[250px] h-[250px] mx-auto mb-3">
              <Image 
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=500&auto=format&fit=crop"
                alt="Sage Moore" 
                fill
                className="object-cover"
              />
            </div>
            <h3 className="font-medium text-sm">Sage Moore</h3>
            <p className="text-gray-500 text-xs">Founder & Creative Director</p>
          </div>
          <div className="text-center">
            <div className="relative w-[250px] h-[250px] mx-auto mb-3">
              <Image 
                src="https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=500&auto=format&fit=crop"
                alt="Karen Ryan" 
                fill
                className="object-cover"
              />
            </div>
            <h3 className="font-medium text-sm">Karen Ryan</h3>
            <p className="text-gray-500 text-xs">Master Chandler</p>
          </div>
          <div className="text-center">
            <div className="relative w-[250px] h-[250px] mx-auto mb-3">
              <Image 
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=500&auto=format&fit=crop"
                alt="Adrian Stone" 
                fill
                className="object-cover"
              />
            </div>
            <h3 className="font-medium text-sm">Adrian Stone</h3>
            <p className="text-gray-500 text-xs">Design Lead</p>
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
              <h3 className="text-lg font-medium mb-2">Design</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                Beautiful aesthetics combined with function. We create candles that complement your home decor while delivering exceptional fragrance experiences.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-700">
                  <path d="M20 5L25 15H35L27 22L30 32L20 27L10 32L13 22L5 15H15L20 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Quality</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                Premium ingredients and meticulous craftsmanship. Every candle is made with natural soy wax, lead-free cotton wicks, and the finest fragrance oils.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-700">
                  <path d="M5 20H35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M30 10L35 20L30 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Journey</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                From our workshop to your home. We pour our passion into creating candles that transform spaces and create memorable moments in your everyday life.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Behind The Brands */}
      <div className="container mx-auto py-16 px-6">
        <h2 className="text-2xl font-medium mb-5 text-center">Behind The Brands</h2>
        <p className="text-sm text-gray-700 text-center max-w-3xl mx-auto mb-12 leading-relaxed">
          We are a team of dedicated craft. With a combined total of 15 years experience in home fragrance creation, our team members are passionate about handcrafting fragrances in small batches. We carefully select each ingredient to ensure the highest quality products. We&apos;re proud to be a small business that puts our customers at the heart of everything we do.
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