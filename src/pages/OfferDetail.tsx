import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Phone, Globe, Clock, Tag, Bookmark,
  Navigation, Copy, CheckCheck, Play, Pause, Star, Share2,
  Calendar, Store, ExternalLink, Bell, BellOff, ZoomIn, X, MessageCircle,
  Flag, MessageSquare,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import { useSavedStore } from '../store/useSavedStore';
import { useOffer } from '../powersync/queries';
import type { Offer, OfferReview } from '../types';
import toast from 'react-hot-toast';

const REPORT_REASONS = [
  { value: 'fake_offer', label: 'Fake offer' },
  { value: 'misleading', label: 'Misleading details' },
  { value: 'expired',    label: 'Expired but still showing' },
  { value: 'scam',       label: 'Looks like a scam' },
  { value: 'other',      label: 'Other' },
];

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? 'text-warning' : 'text-gray-200'}
          fill={i <= Math.round(value) ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} className="p-0.5">
          <Star
            size={26}
            className={i <= value ? 'text-warning' : 'text-gray-200'}
            fill={i <= value ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}

function timeLeft(until?: string): string {
  if (!until) return '';
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  if (days > 1) return `${days}d left`;
  const hrs = Math.floor(diff / 3600000);
  return hrs > 0 ? `${hrs}h left` : 'Ending soon';
}

function formatDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { isSaved, save, unsave } = useSavedStore();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const [reviews, setReviews] = useState<OfferReview[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInst       = useRef<L.Map | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const viewRecorded  = useRef<number | null>(null);

  const psOffer = useOffer(Number(id));

  // Load offer — prefer PowerSync local data, fall back to API
  useEffect(() => {
    if (!id) return;
    if (psOffer) {
      setOffer(psOffer);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(endpoints.offerDetail(Number(id)))
      .then((res) => {
        if (res.data.success) setOffer(res.data.data as Offer);
      })
      .catch(() => toast.error('Offer not found'))
      .finally(() => setLoading(false));
  }, [id, psOffer]);

  // Record view exactly once per offer ID
  useEffect(() => {
    if (!id || !offer) return;
    const numId = Number(id);
    if (viewRecorded.current === numId) return;
    viewRecorded.current = numId;
    api.post(endpoints.offerView(numId)).catch(() => {});
  }, [id, offer]);

  // Ratings & reviews are always fetched live — never short-circuited by the
  // PowerSync local offer cache (psOffer), since average/count/myReview are
  // server-computed and can't exist in the offline-synced offers table.
  useEffect(() => {
    if (!id) return;
    api.get(endpoints.offerReviews(Number(id)))
      .then((res) => {
        if (!res.data.success) return;
        setReviews(res.data.data as OfferReview[]);
        setAvgRating(res.data.avgRating ?? null);
        setReviewCount(res.data.reviewCount ?? 0);
        if (res.data.myReview) {
          setMyRating(res.data.myReview.rating);
          setMyComment(res.data.myReview.comment ?? '');
        }
      })
      .catch(() => {});
  }, [id]);

  const handleSubmitReview = async () => {
    if (!user) { toast.error('Sign in to leave a rating'); navigate('/login'); return; }
    if (!offer || myRating < 1) { toast.error('Pick a star rating first'); return; }
    setSubmittingReview(true);
    try {
      const res = await api.post(endpoints.offerReviews(offer.id), { rating: myRating, comment: myComment || undefined });
      toast.success('Thanks for your feedback!');
      if (res.data.success) {
        setReviews(res.data.data as OfferReview[]);
        setAvgRating(res.data.avgRating ?? null);
        setReviewCount(res.data.reviewCount ?? 0);
      }
    } catch {
      toast.error('Could not submit your review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!user) { toast.error('Sign in to report an offer'); navigate('/login'); return; }
    if (!offer) return;
    setSubmittingReport(true);
    try {
      await api.post(endpoints.offerReport(offer.id), { reason: reportReason, details: reportDetails || undefined });
      toast.success("Thanks, we'll review this");
      setReportOpen(false);
      setReportDetails('');
    } catch {
      toast.error('Could not submit your report');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Load follow status when vendor changes — runs once per vendor, not on every sync
  useEffect(() => {
    if (!user || !offer?.vendorId) return;
    api.get(endpoints.vendorFollowStatus(offer.vendorId))
      .then((r) => {
        if (r.data.success) {
          setFollowing(r.data.data.following);
          setFollowersCount(r.data.data.followers_count);
        }
      }).catch(() => {});
  }, [offer?.vendorId, user?.id]);

  // Init Leaflet map when offer loads
  useEffect(() => {
    if (!offer?.vendorLat || !offer?.vendorLng || !mapRef.current) return;
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }

    const lat = offer.vendorLat;
    const lng = offer.vendorLng;

    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 15);
    mapInst.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="background:#FF6200;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
               <div style="transform:rotate(45deg);font-size:16px;">🏪</div>
             </div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`<b>${offer.businessName ?? 'Shop'}</b><br/>${offer.vendorAddress ?? ''}`)
      .openPopup();

    return () => { map.remove(); mapInst.current = null; };
  }, [offer?.vendorLat, offer?.vendorLng]);

  const handleFollow = async () => {
    if (!user || !offer?.vendorId || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await api.post(endpoints.vendorFollow, { vendor_id: offer.vendorId, action: 'toggle' });
      if (res.data.success) {
        setFollowing(res.data.data.following);
        setFollowersCount(res.data.data.followers_count);
        toast.success(res.data.data.following ? 'Subscribed to shop!' : 'Unsubscribed');
      }
    } catch {
      toast.error('Failed to update subscription');
    } finally {
      setFollowLoading(false);
    }
  };

  const saved = offer ? isSaved(offer.id) : false;

  const handleSave = async () => {
    if (!user) { toast.error('Sign in to save offers'); navigate('/login'); return; }
    if (!offer) return;
    if (saved) {
      await unsave(offer.id);
      toast.success('Removed from saved');
    } else {
      await save(offer.id);
      toast.success('Offer saved!');
    }
  };

  const handleCopyCoupon = () => {
    if (!offer?.couponCode) return;
    navigator.clipboard.writeText(offer.couponCode);
    setCopied(true);
    toast.success('Coupon code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTakeStep = () => {
    if (!offer) return;

    const destLat = offer.vendorLat;
    const destLng = offer.vendorLng;

    if (!destLat || !destLng) {
      const q = encodeURIComponent(offer.vendorAddress ?? offer.businessName ?? '');
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
      return;
    }

    const destination = `${destLat},${destLng}`;

    // Open Google Maps immediately (must be synchronous with user gesture to avoid popup blocker)
    const mapsTab = window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
      '_blank',
    );

    // Try to get user location and update the Maps URL with origin
    if (navigator.geolocation && mapsTab) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
          mapsTab.location.href = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        },
        () => { /* keep the tab open with destination-only URL */ },
        { timeout: 5000 },
      );
    }
  };

  const handleShare = async () => {
    if (!offer) return;
    const url  = `${window.location.origin}/offer/${offer.id}`;
    const text = `${offer.title} — ${offer.discountPercent}% OFF at ${offer.businessName}!`;
    const wa   = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    window.open(wa, '_blank');
  };

  const handleCopyLink = () => {
    if (!offer) return;
    const url = `${window.location.origin}/offer/${offer.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const toggleVideo = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (videoPlaying) { vid.pause(); setVideoPlaying(false); }
    else              { vid.play(); setVideoPlaying(true); }
  };

  if (loading) return (
    <div className="w-full max-w-3xxl mx-auto pt-8 pb-20 animate-pulse space-y-4">
      <div className="skeleton h-64 rounded-2xl" />
      <div className="skeleton h-8 w-3/4 rounded-xl" />
      <div className="skeleton h-5 w-1/2 rounded-xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );

  if (!offer) return (
    <div className="w-full max-w-3xxl mx-auto pt-16 text-center text-gray-500">
      <div className="text-5xl mb-4">🔍</div>
      <p className="font-heading font-semibold text-gray-700 mb-1">Offer not found</p>
      <button onClick={() => navigate('/feed')} className="mt-4 text-primary underline text-sm">Back to feed</button>
    </div>
  );

  const tl = timeLeft(offer.validUntil);

  return (
    <div className="w-full max-w-3xxl mx-auto pb-24">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-4 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Hero: video or image */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 mb-5">
        {offer.videoUrl ? (
          <div className="relative h-64 sm:h-80 bg-black">
            <video
              ref={videoRef}
              src={offer.videoUrl}
              className="w-full h-full object-cover"
              playsInline
              onEnded={() => setVideoPlaying(false)}
            />
            <button
              onClick={toggleVideo}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${
                videoPlaying ? 'bg-black/50 opacity-0 group-hover:opacity-100' : 'bg-primary/90 backdrop-blur-sm'
              }`}>
                {videoPlaying
                  ? <Pause size={26} className="text-white" />
                  : <Play  size={26} className="text-white ml-1" />}
              </div>
            </button>
            {!videoPlaying && (
              <div className="absolute top-4 left-4 bg-black/60 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                <Play size={11} fill="white" /> Watch Video Ad
              </div>
            )}
          </div>
        ) : (offer.bannerUrl || offer.imageUrl) ? (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="relative w-full group block"
          >
            <img
              src={offer.bannerUrl || offer.imageUrl}
              alt={offer.title}
              className="w-full h-64 sm:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-3 backdrop-blur-sm">
                <ZoomIn size={22} className="text-white" />
              </div>
            </div>
          </button>
        ) : (
          <div className="h-64 flex items-center justify-center text-7xl bg-gradient-to-br from-primary/10 to-primary/5">
            🏷️
          </div>
        )}

        {/* Discount badge */}
        {offer.discountPercent > 0 && (
          <div className="absolute top-4 right-4 bg-primary text-white font-heading font-bold text-base px-3 py-1.5 rounded-xl shadow-lg">
            {offer.discountPercent}% OFF
          </div>
        )}

        {/* Featured */}
        {offer.isFeatured && (
          <div className="absolute top-4 left-4 bg-warning text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Star size={10} fill="white" /> Featured
          </div>
        )}
      </div>

      {/* Title + actions */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 capitalize">
            {offer.category}
          </span>
          <h1 className="font-heading font-bold text-gray-900 text-xl leading-snug">
            {offer.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleShare}
            title="Share on WhatsApp"
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-400 transition-colors"
          >
            <MessageCircle size={18} />
          </button>
          <button
            onClick={handleCopyLink}
            title="Copy link"
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-primary hover:border-primary transition-colors"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={handleSave}
            className={`p-2.5 rounded-xl border transition-colors ${
              saved ? 'bg-primary border-primary text-white' : 'border-gray-200 text-gray-500 hover:text-primary hover:border-primary'
            }`}
          >
            <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setReportOpen(true)}
            title="Report this offer"
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-danger hover:border-danger transition-colors"
          >
            <Flag size={18} />
          </button>
        </div>
      </div>

      {/* Price + coupon */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          {(offer.offerPrice ?? 0) > 0 && (
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-primary text-3xl">₹{offer.offerPrice}</span>
              {(offer.originalPrice ?? 0) > 0 && (
                <span className="text-gray-400 line-through text-lg">₹{offer.originalPrice}</span>
              )}
            </div>
          )}
          {offer.couponCode && (
            <button
              onClick={handleCopyCoupon}
              className="flex items-center gap-2 bg-primary/5 border-2 border-dashed border-primary/30 hover:border-primary px-4 py-2 rounded-xl transition-all group"
            >
              <Tag size={14} className="text-primary" />
              <span className="font-mono font-bold text-primary text-sm">{offer.couponCode}</span>
              {copied
                ? <CheckCheck size={14} className="text-accent" />
                : <Copy size={14} className="text-gray-400 group-hover:text-primary transition-colors" />}
            </button>
          )}
        </div>

        {/* Validity */}
        {(offer.validFrom || offer.validUntil) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} /> From {formatDate(offer.validFrom)}
            </span>
            {offer.validUntil && (
              <span className={`flex items-center gap-1.5 font-semibold ${tl === 'Ending soon' ? 'text-danger' : ''}`}>
                <Clock size={12} /> {tl || `Until ${formatDate(offer.validUntil)}`}
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Description */}
      {offer.description && (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900 text-sm mb-2">About this offer</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{offer.description}</p>
        </div>
      )}

      {/* Redeem Online banner */}
      {offer.redeemUrl && (
        <a
          href={offer.redeemUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (offer.couponCode) handleCopyCoupon();
          }}
          className="flex items-center justify-between gap-3 bg-primary text-white px-5 py-4 rounded-2xl mb-4 shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
        >
          <div>
            <p className="font-heading font-bold text-base leading-none">Redeem Online</p>
            <p className="text-xs text-white/80 mt-1">Click to visit the offer page</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ExternalLink size={20} />
          </div>
        </a>
      )}

      {/* Vendor info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100"
      >
        <h2 className="font-heading font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Store size={15} className="text-primary" /> Shop Details
        </h2>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            {offer.vendorLogo
              ? <img src={offer.vendorLogo} alt="" className="w-12 h-12 rounded-xl object-cover" />
              : <span className="font-bold text-primary text-lg">{offer.businessName?.[0]}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{offer.businessName}</p>
            <p className="text-xs text-gray-500 capitalize">{offer.vendorCategory} · {offer.vendorCity}</p>
            {followersCount > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{followersCount.toLocaleString()} subscribers</p>
            )}
          </div>
          {user && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex-shrink-0 ${
                following
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              {following ? <BellOff size={13} /> : <Bell size={13} />}
              {following ? 'Subscribed' : 'Subscribe'}
            </button>
          )}
        </div>

        {offer.vendorDescription && (
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">{offer.vendorDescription}</p>
        )}

        <div className="space-y-2">
          {offer.vendorAddress && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <span>{offer.vendorAddress}</span>
            </div>
          )}
          {offer.vendorPhone && (
            <a href={`tel:${offer.vendorPhone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors">
              <Phone size={14} className="text-primary flex-shrink-0" />
              <span>{offer.vendorPhone}</span>
            </a>
          )}
          {offer.vendorWebsite && (
            <a href={offer.vendorWebsite} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Globe size={14} className="flex-shrink-0" />
              <span className="truncate">{offer.vendorWebsite}</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </motion.div>

      {/* Ratings & Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100"
      >
        <h2 className="font-heading font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <MessageSquare size={15} className="text-primary" /> Ratings & Feedback
        </h2>

        <div className="flex items-center gap-3 mb-4">
          <span className="font-heading font-bold text-gray-900 text-2xl">
            {avgRating ? avgRating.toFixed(1) : '—'}
          </span>
          <div>
            <StarRow value={avgRating ?? 0} />
            <p className="text-xs text-gray-400 mt-0.5">
              {reviewCount ? `${reviewCount} review${reviewCount > 1 ? 's' : ''}` : 'No reviews yet'}
            </p>
          </div>
        </div>

        {/* Leave / edit a rating */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            {myRating > 0 ? 'Your rating' : 'Rate this offer'}
          </p>
          <StarPicker value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder="Share your experience (optional)"
            rows={2}
            className="w-full mt-2 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary resize-none"
          />
          <button
            onClick={handleSubmitReview}
            disabled={submittingReview || myRating < 1}
            className="mt-2 text-xs font-semibold bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-primary-dark transition-colors"
          >
            {submittingReview ? 'Submitting…' : myRating > 0 ? 'Update Rating' : 'Submit Rating'}
          </button>
        </div>

        {/* Review list */}
        {reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="flex gap-3 pt-3 border-t border-gray-100 first:border-t-0 first:pt-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                  {r.userAvatar
                    ? <img src={r.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    : r.userName?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{r.userName}</span>
                    <StarRow value={r.rating} size={11} />
                  </div>
                  {r.comment && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.comment}</p>}
                  <p className="text-[11px] text-gray-300 mt-1">{formatDate(r.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Map */}
      {offer.vendorLat && offer.vendorLng && (
        <motion.div
          ref={mapSectionRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm border border-gray-100"
        >
          <div className="p-3 flex items-center justify-between border-b border-gray-100">
            <h2 className="font-heading font-semibold text-gray-900 text-sm flex items-center gap-2">
              <MapPin size={15} className="text-primary" /> Location
            </h2>
            <button
              onClick={handleTakeStep}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
            >
              Open in Maps <ExternalLink size={11} />
            </button>
          </div>
          <div ref={mapRef} className="h-56 w-full" />
        </motion.div>
      )}

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 z-50 shadow-xl"
      >
        {/* Take Step — open shop in maps */}
        <button
          onClick={handleTakeStep}
          className="flex-1 flex items-center justify-center gap-2 bg-dark text-white font-semibold py-3.5 rounded-xl hover:bg-dark-card transition-colors"
        >
          <Navigation size={18} />
          Take Step — Get Directions
        </button>

        {/* Redeem */}
        {offer.redeemUrl ? (
          <a
            href={offer.redeemUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { if (offer.couponCode) handleCopyCoupon(); }}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-primary/30"
          >
            <ExternalLink size={18} />
            Redeem Online
          </a>
        ) : (
          <button
            onClick={() => {
              if (offer.couponCode) handleCopyCoupon();
              toast.success('Offer redeemed! 🎉');
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-primary/30"
          >
            <Tag size={18} />
            Redeem Offer
          </button>
        )}

      </motion.div>

      {/* Lightbox */}
      {lightbox && (offer.bannerUrl || offer.imageUrl) && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          <img
            src={offer.bannerUrl || offer.imageUrl}
            alt={offer.title}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Report modal */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Flag size={15} className="text-danger" /> Report this offer
              </h3>
              <button onClick={() => setReportOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-primary"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Details (optional)</label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Tell us more…"
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-primary resize-none"
            />

            <button
              onClick={handleSubmitReport}
              disabled={submittingReport}
              className="w-full bg-danger text-white font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {submittingReport ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
