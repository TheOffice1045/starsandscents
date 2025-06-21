"use client";

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings';
import { getSiteConfig } from '@/config/site';

export function DynamicMetadata() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const siteConfig = getSiteConfig(settings.name, settings.slogan);
    
    // Update document title
    if (settings.name && settings.slogan) {
      document.title = `${siteConfig.name} - ${siteConfig.description}`;
    } else if (settings.name) {
      document.title = siteConfig.name;
    }
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && siteConfig.description) {
      metaDescription.setAttribute('content', `Discover our collection at ${siteConfig.name}. ${siteConfig.description}`);
    }
    
    // Update og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', `${siteConfig.name} - ${siteConfig.description}`);
    }
    
    // Update og:description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && siteConfig.description) {
      ogDescription.setAttribute('content', `Discover our collection at ${siteConfig.name}. ${siteConfig.description}`);
    }
    
  }, [settings.name, settings.slogan]);

  return null; // This component doesn't render anything visual
} 