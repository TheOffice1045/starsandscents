# Dynamic Site Configuration

This application now supports dynamic site configuration that fetches the Site Name and Description from the Store Settings instead of using hardcoded values.

## How It Works

### 1. Store Settings Integration
- **Store Name** → Site Name
- **Store Slogan** → Site Description

### 2. Dynamic Configuration Function
The `getSiteConfig()` function in `config/site.ts` dynamically returns configuration based on store settings:

```typescript
export const getSiteConfig = (storeName?: string, storeSlogan?: string) => {
  return {
    name: storeName || defaultSiteConfig.name,
    description: storeSlogan || defaultSiteConfig.description
  };
};
```

### 3. Custom Hook
Use the `useSiteConfig()` hook in React components:

```typescript
import { useSiteConfig } from "@/hooks/useSiteConfig";

export function MyComponent() {
  const siteConfig = useSiteConfig();
  
  return (
    <div>
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.description}</p>
    </div>
  );
}
```

### 4. Dynamic Metadata
The `DynamicMetadata` component automatically updates:
- Document title
- Meta description
- Open Graph tags
- Twitter card tags

## Where It's Used

### ✅ Already Dynamic
- Header component (store name)
- Admin header (store name)
- Home page hero section (store name + slogan)
- Document title and meta tags

### 🔧 Admin Settings
- Navigate to `/admin/settings`
- Go to "General" tab
- Update "Store Name" and "Store Slogan"
- Changes apply immediately across the site

### 📝 Database
The migration `20240507000000_add_store_slogan.sql` adds the `store_slogan` column to the `store_settings` table.

## Fallbacks

If no store settings are configured, the system falls back to:
- **Default Name**: "Candles"
- **Default Description**: "Handcrafted with Love"

## Benefits

1. **Centralized Management**: Update site name/description from one place
2. **Real-time Updates**: Changes appear immediately without redeployment
3. **SEO Friendly**: Dynamic metadata for better search engine optimization
4. **Brand Consistency**: Ensures consistent branding across all pages
5. **Multi-store Ready**: Easy to extend for multi-store setups 