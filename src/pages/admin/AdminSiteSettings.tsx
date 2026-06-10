import { useEffect, useRef, useState } from "react";
import { Settings, Upload, Save, Globe, Search, Mail, Phone, Image } from "lucide-react";
import { api, endpoints } from "../../utils/api";
import toast from "react-hot-toast";
import { useSiteSettings } from "../../store/useSiteSettings";
import BackButton from "../../components/BackButton";

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
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-[var(--surface-2)] rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="h-48 rounded-2xl bg-[var(--surface)] border border-[var(--border)]" />
            <div className="h-48 rounded-2xl bg-[var(--surface)] border border-[var(--border)]" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 rounded-2xl bg-[var(--surface)] border border-[var(--border)]" />
            <div className="h-64 rounded-2xl bg-[var(--surface)] border border-[var(--border)]" />
            <div className="h-36 rounded-2xl bg-[var(--surface)] border border-[var(--border)]" />
          </div>
        </div>
      </div>
    );

  return (
    <div className="pb-20">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      
      {/* Header */}
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] dark:bg-primary/10 flex items-center justify-center text-[var(--primary)] shadow-sm border border-[var(--primary)]/10">
            <Settings size={20} />
          </div>
          <div>
            <h1 className="page-title text-[var(--text)]">Site Settings</h1>
            <p className="page-subtitle text-[var(--text-secondary)]">Manage site name, logo, and SEO</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Live Preview & Logo */}
        <div className="lg:col-span-1 space-y-6">
          {/* Logo Card */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-4 flex items-center gap-2">
              <Image size={15} className="text-[var(--primary)]" /> Site Logo
            </h3>
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-[var(--border-strong)] flex items-center justify-center overflow-hidden bg-[var(--surface-2)]">
                {form.site_logo_url ? (
                  <img src={form.site_logo_url} alt="logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <Image size={32} className="text-[var(--text-muted)]" />
                )}
              </div>
              <div className="w-full text-center">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-secondary btn-sm w-full"
                >
                  <Upload size={14} />
                  {uploading ? "Uploading…" : "Upload Logo"}
                </button>
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                  PNG, SVG, or WebP recommended
                </p>
                
                {form.site_logo_url && (
                  <input
                    value={form.site_logo_url}
                    onChange={(e) => set("site_logo_url", e.target.value)}
                    className="input mt-3 text-xs py-1.5"
                    placeholder="Or paste URL"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Search Result Preview */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-4 flex items-center gap-2">
              <Search size={15} className="text-[var(--primary)]" /> Search Snippet
            </h3>
            <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)] leading-normal space-y-1">
              <div className="text-xs text-[var(--text-secondary)] truncate">
                https://{form.site_name.toLowerCase().replace(/\s+/g, '') || 'adslife'}.in
              </div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate">
                {form.seo_title || form.site_name || 'AdsLife'}
              </div>
              <div className="text-xs text-[var(--text-secondary)] line-clamp-3">
                {form.seo_description || 'Find the best local deals, earn coins, and win rewards on AdsLife.'}
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-3">
              This is how your site will look on search engine results.
            </p>
          </div>
        </div>

        {/* Right column: Form Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Configuration */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-4 flex items-center gap-2">
              <Globe size={15} className="text-[var(--primary)]" /> Brand Identity
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">Site Name</label>
                <input
                  value={form.site_name}
                  onChange={(e) => set("site_name", e.target.value)}
                  className="input"
                  placeholder="AdsLife"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">Tagline</label>
                <input
                  value={form.site_tagline}
                  onChange={(e) => set("site_tagline", e.target.value)}
                  className="input"
                  placeholder="Discover · Earn · Win"
                />
              </div>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-4 flex items-center gap-2">
              <Search size={15} className="text-[var(--primary)]" /> Search Engine Optimization (SEO)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">Meta Title</label>
                <input
                  value={form.seo_title}
                  onChange={(e) => set("seo_title", e.target.value)}
                  className="input"
                  placeholder="AdsLife - Discover Local Offers & Deals"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                  <span>{form.seo_title.length} / 60 characters recommended</span>
                  <span className={form.seo_title.length > 60 ? "text-amber-500" : ""}>
                    {form.seo_title.length > 60 ? "Too long" : "Good length"}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">Meta Description</label>
                <textarea
                  value={form.seo_description}
                  onChange={(e) => set("seo_description", e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Find the best local deals, earn coins, and win rewards on AdsLife."
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                  <span>{form.seo_description.length} / 160 characters recommended</span>
                  <span className={form.seo_description.length > 160 ? "text-amber-500" : ""}>
                    {form.seo_description.length > 160 ? "Too long" : "Good length"}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                  Keywords <span className="font-normal text-[var(--text-muted)]">(comma separated)</span>
                </label>
                <input
                  value={form.seo_keywords}
                  onChange={(e) => set("seo_keywords", e.target.value)}
                  className="input"
                  placeholder="offers, deals, discounts, local"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-4 flex items-center gap-2">
              <Mail size={15} className="text-[var(--primary)]" /> Contact Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">Contact Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => set("contact_email", e.target.value)}
                    className="input pl-9"
                    placeholder="support@adslife.in"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">Contact Phone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => set("contact_phone", e.target.value)}
                    className="input pl-9"
                    placeholder="+91 99999 99999"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary w-full py-3.5 shadow-lg shadow-primary/20 text-sm font-semibold flex items-center justify-center gap-2 mt-4 hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
