import Image from 'next/image';
import { createBrowserClient } from "@supabase/ssr";

export default async function ComingSoonPage() {
  // Fetch store settings to get the logo
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: storeSettings } = await supabase
    .from('store_settings')
    .select('store_logo')
    .single();
  
  const logoUrl = storeSettings?.store_logo || '';

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-black px-4">
      {/* Background photo: same image as the Shop page hero */}
      <Image
        src="/images/shop-hero-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-white/80" />

      <div className="relative max-w-md w-full aspect-square flex flex-col items-center justify-center text-center bg-white px-6 md:px-10">
        <div className="mb-4">
          {logoUrl ? (
            <div className="mx-auto w-56 h-36 md:w-72 md:h-48 relative">
              <Image 
                src={logoUrl} 
                alt="Store Logo" 
                fill 
                className="object-contain brightness-0"
                sizes="(max-width: 768px) 224px, 288px"
              />
            </div>
          ) : (
            <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center">
              <span className="text-black text-2xl font-bold">LOGO</span>
            </div>
          )}
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-black">We&apos;ll Be Right Back</h1>

        <p className="text-gray-800">
          Our site is currently undergoing scheduled maintenance. Thank you for your patience, we&apos;ll be back shortly.
        </p>
        
      </div>
    </div>
  );
}