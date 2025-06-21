import { useSettingsStore } from '@/lib/store/settings';
import { getSiteConfig } from '@/config/site';

export function useSiteConfig() {
  const { settings } = useSettingsStore();
  
  return getSiteConfig(settings.name, settings.slogan);
} 