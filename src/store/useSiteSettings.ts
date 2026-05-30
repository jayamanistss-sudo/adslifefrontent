import { create } from 'zustand';
import { api, endpoints } from '../utils/api';

interface SiteSettings {
  site_name: string;
  site_tagline: string;
  site_logo_url: string;
  seo_title: string;
  seo_description: string;
}

interface SiteSettingsStore {
  settings: SiteSettings;
  loaded: boolean;
  fetch: () => Promise<void>;
}

const defaults: SiteSettings = {
  site_name:       'AdsLife',
  site_tagline:    'Discover · Earn · Win',
  site_logo_url:   '',
  seo_title:       'AdsLife',
  seo_description: '',
};

export const useSiteSettings = create<SiteSettingsStore>((set, get) => ({
  settings: defaults,
  loaded:   false,
  fetch: async () => {
    if (get().loaded) return;
    try {
      const res = await api.get(endpoints.siteSettings);
      if (res.data.success) {
        set({ settings: { ...defaults, ...res.data.data }, loaded: true });
      }
    } catch { /* keep defaults */ }
  },
}));
