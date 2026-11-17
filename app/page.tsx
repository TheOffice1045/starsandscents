import { createClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/lib/site-content-server";
import HomeClient, { type FeaturedProduct } from "./HomeClient";

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").trim();

async function getFeaturedProduct(productId: string): Promise<FeaturedProduct | null> {
  if (!productId) return null;
  try {
    const supabase = createClient();
    const { data: product } = await supabase
      .from("products")
      .select("id, title, description, status")
      .eq("id", productId)
      .eq("status", "active")
      .maybeSingle();
    if (!product) return null;
    const { data: images } = await supabase
      .from("product_images")
      .select("url")
      .eq("product_id", product.id)
      .order("position", { ascending: true })
      .limit(1);
    return {
      id: product.id,
      title: product.title,
      description: stripHtml(product.description ?? ""),
      image: images?.[0]?.url ?? null,
    };
  } catch (err) {
    console.error("Featured product failed", err);
    return null;
  }
}

export default async function Home() {
  const content = await getSiteContent(["home.hero", "home.headings", "home.feature", "home.featured"]);
  const featuredProduct = await getFeaturedProduct(content["home.featured"].productId);

  return (
    <HomeClient
      hero={content["home.hero"]}
      headings={content["home.headings"]}
      feature={content["home.feature"]}
      featured={content["home.featured"]}
      featuredProduct={featuredProduct}
    />
  );
}
