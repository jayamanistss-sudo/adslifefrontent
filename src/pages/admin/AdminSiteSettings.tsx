import { useEffect, useRef, useState } from "react";
import { Settings, Upload, Save, Globe, Search, Mail, Phone, Image } from "lucide-react";
import { api, endpoints } from "../../utils/api";
import toast from "react-hot-toast";
import { useSiteSettings } from "../../store/useSiteSettings";

interface SiteSettings {
  site_name: string;
  site_tagline: string;
  site_logo_url: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  contact_email: string;
  contact_phone: string;
}

const defaults: SiteSettings = {
  site_name: "",
  site_tagline: "",
  site_logo_url: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  contact_email: "",
  contact_phone: "",
};

export default function AdminSiteSettings() {
  const { setSettings } = useSiteSettings();
  const [form, setForm] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get(endpoints.siteSettings)
      .then((r) => {
        if (r.data.success) setForm({ ...defaults, ...r.data.data });
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof SiteSettings, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/upload/image.php", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.success) {
        set("site_logo_url", res.data.data.url);
        toast.success("Logo uploaded");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(endpoints.siteSettings, form);
      if (res.data.success) {
        toast.success("Settings saved!");
        setSettings(form);
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-gray-900 text-xl">Site Settings</h1>
          <p className="text-sm text-gray-500">Manage site name, logo, and SEO</p>
        </div>
      </div>

      {/* Logo */}
      <section className="bg-white rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <Image size={15} className="text-primary" /> Site Logo
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
            {form.site_logo_url ? (
              <img src={form.site_logo_url} alt="logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Image size={28} className="text-gray-300" />
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-primary/10 text-primary font-semibold text-sm px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Upload size={14} />
              {uploading ? "Uploading…" : "Upload Logo"}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">PNG, SVG, or WebP recommended</p>
            {form.site_logo_url && (
              <input
                value={form.site_logo_url}
                onChange={(e) => set("site_logo_url", e.target.value)}
                className="mt-2 w-64 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 focus:outline-none focus:border-primary"
                placeholder="Or paste URL"
              />
            )}
          </div>
        </div>
      </section>

      {/* Brand */}
      <section className="bg-white rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <Globe size={15} className="text-primary" /> Brand
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Site Name</label>
            <input
              value={form.site_name}
              onChange={(e) => set("site_name", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              placeholder="AdsLife"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Tagline</label>
            <input
              value={form.site_tagline}
              onChange={(e) => set("site_tagline", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              placeholder="Discover · Earn · Win"
            />
          </div>
        </div>
      </section>

      {/* SEO */}
      <section className="bg-white rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <Search size={15} className="text-primary" /> SEO
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Meta Title</label>
            <input
              value={form.seo_title}
              onChange={(e) => set("seo_title", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              placeholder="AdsLife - Discover Local Offers & Deals"
            />
            <p className="text-xs text-gray-400 mt-1">{form.seo_title.length}/60 chars recommended</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Meta Description</label>
            <textarea
              value={form.seo_description}
              onChange={(e) => set("seo_description", e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
              placeholder="Find the best local deals, earn coins, and win rewards on AdsLife."
            />
            <p className="text-xs text-gray-400 mt-1">{form.seo_description.length}/160 chars recommended</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Keywords <span className="font-normal text-gray-400">(comma separated)</span>
            </label>
            <input
              value={form.seo_keywords}
              onChange={(e) => set("seo_keywords", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              placeholder="offers, deals, discounts, local"
            />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <Mail size={15} className="text-primary" /> Contact Info
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Contact Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
                className="w-full pl-9 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                placeholder="support@adslife.in"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Contact Phone</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
                className="w-full pl-9 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                placeholder="+91 99999 99999"
              />
            </div>
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 disabled:opacity-50"
      >
        <Save size={18} />
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
