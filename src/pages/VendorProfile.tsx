import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Globe, Users, Store, BadgeCheck, Bell, BellOff, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';
import OfferCard from '../components/OfferCard';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../components/ui/EmptyState';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import { hasSpaSessionStarted } from '../utils/spaSession';
import type { Offer } from '../types';

interface VendorPublic {
  id: number;
  business_name: string;
  category?: string;
  city?: string;
  address?: string;
  description?: string;
  website?: string;
  logo_url?: string;
  name?: string;
  followers_count: number;
  offers: any[];
  verified_badge_tier?: 'none' | 'standard' | 'premium';
  rating: number;
  review_count: number;
}

function mapApiOffer(o: any): Offer {
  return {
    id: o.id, vendorId: o.vendor_id, title: o.title, description: o.description,
    category: o.category, discountPercent: Number.parseFloat(o.discount_percent) || 0,
    originalPrice: Number.parseFloat(o.original_price) || 0, offerPrice: Number.parseFloat(o.offer_price) || 0,
    imageUrl: o.image_url, bannerUrl: o.banner_url, couponCode: o.coupon_code,
    maxRedemptions: Number.parseInt(o.max_redemptions) || 0, currentRedemptions: Number.parseInt(o.current_redemptions) || 0,
    validFrom: o.valid_from, validUntil: o.valid_until, isFeatured: !!o.is_featured,
    isActive: !!o.is_active, views: Number.parseInt(o.views) || 0, clicks: Number.parseInt(o.clicks) || 0,
    saves: Number.parseInt(o.saves) || 0, createdAt: o.created_at, videoUrl: o.video_url || undefined,
    businessName: o.business_name, vendorLogo: o.vendor_logo, vendorCity: o.vendor_city,
  };
}

function humanize(slug?: string): string {
  if (!slug) return '';
  return slug.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

export default function VendorProfile() {
  const { id } = useParams();
  const vendorId = Number(id);
  const { user } = useUserStore();

  const [vendor, setVendor] = useState<VendorPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followers, setFollowers] = useState(0);

  // Shop-QR scans land here as a plain https:// page load — on Android,
  // hand off to the app via the intent:// scheme, which lets the browser
  // itself fall back to the Play Store when the app isn't installed (no
  // custom timing/visibility tricks needed, and no assetlinks.json to host
  // — that's what a verified App Link would need instead). Gated on
  // hasSpaSessionStarted() rather than document.referrer: this is a
  // client-routed SPA, so the referrer only reflects how the TAB was first
  // opened and never updates on pushState navigation — a user already
  // browsing the web app (landed on /feed from a bookmark, a search result,
  // or literally any external referrer) who then clicks through to a shop
  // page would have looked identical to a fresh QR scan under that check,
  // getting bounced to the app/Play Store mid-session. This module-state
  // flag is set once per tab by Layout on every page's first mount, so it's
  // only false for the very first page this tab has ever rendered.
  useEffect(() => {
    if (!vendorId) return;
    const isAndroid = /Android/i.test(navigator.userAgent || '');
    const cameFromExternal = !hasSpaSessionStarted();
    if (isAndroid && cameFromExternal) {
      const fallback = encodeURIComponent(
        'https://play.google.com/store/apps/details?id=com.adslife.adslife_mobile',
      );
      window.location.href =
        `intent://shop/${vendorId}#Intent;scheme=adslife;package=com.adslife.adslife_mobile;S.browser_fallback_url=${fallback};end`;
    }
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    api.get(`/vendor/profile/${vendorId}`)
      .then((r) => {
        if (r.data.success) {
          setVendor(r.data.data);
          setFollowers(r.data.data.followers_count ?? 0);
        } else {
          setError(r.data.error ?? 'Vendor not found');
        }
      })
      .catch((err) => setError(err.response?.data?.error ?? 'Failed to load vendor'))
      .finally(() => setLoading(false));

    if (user) {
      // This is a public page — `user` is a locally-cached object that can
      // outlive the actual session (cookie expired since the last visit). A
      // real 401 here must never trigger the global redirect-to-/login
      // interceptor (see api.ts), or a guest scanning a shop's QR code gets
      // yanked to the login page instead of seeing the shop.
      api.get(`/vendor/follow-status?vendor_id=${vendorId}`, { skipAuthRedirect: true })
        .then((r) => setFollowing(r.data?.data?.following === true))
        .catch(() => {});
    }
  }, [vendorId, user?.id]);

  const toggleFollow = async () => {
    if (!user) { toast.error('Login to follow vendors'); return; }
    if (followBusy) return;
    setFollowBusy(true);
    try {
      const r = await api.post(endpoints.vendorFollow, { vendor_id: vendorId });
      const nowFollowing = r.data?.data?.following ?? !following;
      setFollowing(nowFollowing);
      setFollowers((f) => f + (nowFollowing ? 1 : -1));
      toast.success(nowFollowing ? 'Following! You\'ll get alerts for new offers' : 'Unfollowed');
    } catch {
      toast.error('Could not update follow. Try again.');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) return (
    <div className="pb-6"><BackButton to="/feed" /><DashboardSkeleton /></div>
  );

  if (error || !vendor) return (
    <div className="pb-6"><BackButton to="/feed" /><ErrorState description={error ?? 'Vendor not found'} /></div>
  );

  const offers = (vendor.offers ?? []).map(mapApiOffer).map((o) => ({
    ...o,
    businessName: o.businessName ?? vendor.business_name,
    vendorLogo: o.vendorLogo ?? vendor.logo_url,
    vendorCity: o.vendorCity ?? vendor.city,
    vendorBadgeTier: vendor.verified_badge_tier ?? 'none',
  }));

  return (
    <div className="pb-10">
      <BackButton to="/feed" />

      {/* ── Vendor header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 mt-2 mb-6"
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
            {vendor.logo_url
              ? <img src={vendor.logo_url} alt={vendor.business_name} className="w-full h-full object-cover" />
              : <Store size={30} className="text-[var(--text-muted)]" />}
          </div>

          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-bold text-xl text-[var(--text)]">{vendor.business_name}</h1>
              {vendor.verified_badge_tier === 'premium' && (
                <span title="Premium verified"><BadgeCheck size={18} className="text-amber-500" /></span>
              )}
              {vendor.verified_badge_tier === 'standard' && (
                <span title="Verified"><BadgeCheck size={18} className="text-[var(--info)]" /></span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)] flex-wrap">
              {vendor.category && <span className="badge badge-neutral">{humanize(vendor.category)}</span>}
              {vendor.city && (
                <span className="flex items-center gap-1"><MapPin size={12} /> {vendor.city}</span>
              )}
              <span className="flex items-center gap-1"><Users size={12} /> {followers} follower{followers === 1 ? '' : 's'}</span>
              {vendor.review_count > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  {vendor.rating.toFixed(1)} ({vendor.review_count} review{vendor.review_count === 1 ? '' : 's'})
                </span>
              )}
            </div>
            {vendor.description && (
              <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed max-w-xl">{vendor.description}</p>
            )}
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] font-medium mt-2 hover:underline">
                <Globe size={12} /> {vendor.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          <button
            onClick={toggleFollow}
            disabled={followBusy}
            className={following ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
          >
            {following ? <BellOff size={15} /> : <Bell size={15} />}
            {following ? 'Following' : 'Follow'}
          </button>
        </div>
      </motion.div>

      {/* ── Offers ── */}
      <h2 className="font-heading font-semibold text-[var(--text)] text-sm mb-4">
        Offers from {vendor.business_name} ({offers.length})
      </h2>
      {offers.length === 0 ? (
        <EmptyState icon="🏷️" title="No active offers" description="This vendor hasn't posted any offers yet. Follow them to get notified!" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {offers.map((offer, i) => <OfferCard key={offer.id} offer={offer} index={i} />)}
        </div>
      )}
    </div>
  );
}
