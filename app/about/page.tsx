import Image from "next/image";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content-server";
import { cssUrl, paragraphs } from "@/lib/site-content";

const VALUE_ICONS = [
  <svg key="home" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-700">
    <path d="M20 5L5 15V35H35V15L20 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 35V20H25V35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>,
  <svg key="star" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-700">
    <path d="M20 5L25 15H35L27 22L30 32L20 27L10 32L13 22L5 15H15L20 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>,
  <svg key="arrow" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-700">
    <path d="M5 20H35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M30 10L35 20L30 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>,
];

export default async function AboutPage() {
  const { "about.page": c } = await getSiteContent(["about.page"]);
  const gallery = (c.gallery ?? []).filter((item: any) => item.image || item.title);
  const values = (c.values ?? []).filter((v: any) => v.title || v.text);

  return (
    <div className="w-full">
      {/* Hero Banner */}
      <div className="w-full h-[250px] relative bg-cover bg-center bg-fixed" 
           style={c.bannerImage ? { backgroundImage: cssUrl(c.bannerImage) } : { backgroundColor: "#4A332F" }}>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-light mb-3 tracking-wide">{c.bannerTitle}</h1>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Link href="/" className="hover:text-[#F5E6D8] transition-colors">Home</Link>
              <span>•</span>
              <span className="text-[#F5E6D8]">{c.bannerTitle}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Our Story Section */}
      <div className="container mx-auto py-16 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            {c.storyHeading && <h2 className="text-2xl font-light mb-1">{c.storyHeading}</h2>}
            {c.storySubheading && <p className="text-xs text-gray-500 mb-5">{c.storySubheading}</p>}
            {paragraphs(c.storyText).map((p, i) => (
              <p key={i} className="text-sm text-gray-700 mb-4 last:mb-0 leading-relaxed">{p}</p>
            ))}
          </div>
          {c.storyImage && (
            <div className="flex justify-center md:justify-end">
              <div className="relative w-[350px] h-[350px]">
                <Image src={c.storyImage} alt={c.storyHeading || "Our story"} fill className="object-cover rounded" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo row */}
      {gallery.length > 0 && (
        <div className="container mx-auto py-16 px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {gallery.map((item: any, i: number) => (
              <div key={i} className="text-center">
                {item.image && (
                  <div className="relative w-[250px] h-[250px] mx-auto mb-3">
                    <Image src={item.image} alt={item.title || ""} fill className="object-cover" />
                  </div>
                )}
                {item.title && <h3 className="font-medium text-sm">{item.title}</h3>}
                {item.caption && <p className="text-gray-500 text-xs">{item.caption}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Values Section */}
      <div className="bg-neutral-100 py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            {values.map((value: any, i: number) => (
              <div key={i} className="flex flex-col items-center">
                <div className="mb-4">{VALUE_ICONS[i % VALUE_ICONS.length]}</div>
                {value.title && <h3 className="text-lg font-medium mb-2">{value.title}</h3>}
                {value.text && (
                  <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">{value.text}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Behind The Brand */}
      {(c.brandHeading || c.brandText) && (
        <div className="container mx-auto py-16 px-6">
          {c.brandHeading && <h2 className="text-2xl font-medium mb-5 text-center">{c.brandHeading}</h2>}
          {paragraphs(c.brandText).map((p, i) => (
            <p key={i} className="text-sm text-gray-700 text-center max-w-3xl mx-auto mb-4 leading-relaxed">{p}</p>
          ))}
        </div>
      )}

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