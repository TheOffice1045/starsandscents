interface SiteConfig {
  name: string;
  description: string;
}

// Default static config for fallback
export const defaultSiteConfig: SiteConfig = {
  name: "Candles",
  description: "Handcrafted with Love"
};

// Dynamic site config function
export const getSiteConfig = (storeName?: string, storeSlogan?: string): SiteConfig => {
  return {
    name: storeName || defaultSiteConfig.name,
    description: storeSlogan || defaultSiteConfig.description
  };
};

// Export the default for backward compatibility
export const siteConfig = defaultSiteConfig;