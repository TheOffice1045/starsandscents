interface SiteConfig {
  name: string;
  description: string;
}

// Store name used whenever none is set in Admin → Settings
export const DEFAULT_STORE_NAME = "Stars And Scents";

// Default static config for fallback
export const defaultSiteConfig: SiteConfig = {
  name: DEFAULT_STORE_NAME,
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