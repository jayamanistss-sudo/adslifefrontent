import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Phone, Globe, Clock, Tag, Bookmark,
  Navigation, Copy, CheckCheck, Play, Pause, Star, Share2,
  Calendar, ExternalLink, Bell, BellOff, ZoomIn, X, MessageCircle,
  Flag, MessageSquare, ChevronRight,
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
  { value: 'fake_offer',  label: 'Fake offer' },
  { value: 'misleading',  label: 'Misleading details' },
  { value: 'expired',     label: 'Expired but still showing' },
  { value: 'scam',        label: 'Looks like a scam' },
  { value: 'other',       label: 'Other' },
];

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size}
          className={i <= Math.round(value) ? 'text-warning' : 'text-[var(--border)]'}
          fill={i <= Math.round(value) ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} className="p-0.5">
          <Star size={28} className={i <= value ? 'text-warning' : 'text-[var(--border)]'}
            fill={i <= value ? 'currentColor' : 'none'} />
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

const card = 'bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm';

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { isSaved, save, unsave } = useSavedStore();

  const [offer, setOffer]             = useState<Offer | null>(null);
  const [loading, setLoading]         = useState(true);
  const [copied, setCopied]           = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [lightbox, setLightbox]       = useState(false);
  const [following, setFollowing]     = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const [reviews, setReviews]         = useState<OfferReview[]>([]);
  const [avgRating, setAvgRating]     = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [myRating, setMyRating]       = useState(0);
  const [myComment, setMyComment]     = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [reportOpen, setReportOpen]   = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInst       = useRef<L.Map | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const viewRecorded  = useRef<number | null>(null);

  const psOffer = useOffer(Number(id));

  useEffect(() => {
    if (!id) return;
    if (psOffer) { setOffer(psOffer); setLoading(false); return; }
    setLoading(true);
    api.get(endpoints.offerDetail(Number(id)))
      .then((res) => { if (res.data.success) setOffer(res.data.data as Offer); })
      .catch(() => toast.error('Offer not found'))
      .finally(() => setLoading(false));
  }, [id, psOffer]);

  useEffect(() => {
    if (!id || !offer) return;
    const numId = Number(id);
    if (viewRecorded.current === numId) return;
    viewRecorded.current = numId;
    api.post(endpoints.offerView(numId)).catch(() => {});
  }, [id, offer]);

  useEffect(() => {
    if (!id) return;
    api.get(endpoints.offerReviews(Number(id))).then((res) => {
      if (!res.data.success) return;
      setReviews(res.data.data as OfferReview[]);
      setAvgRating(res.data.avgRating ?? null);
      setReviewCount(res.data.reviewCount ?? 0);
      if (res.data.myReview) { setMyRating(res.data.myReview.rating); setMyComment(res.data.myReview.comment ?? ''); }
    }).catch(() => {});
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
    } catch { toast.error('Could not submit your review'); }
    finally { setSubmittingReview(false); }
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
    } catch { toast.error('Could not submit your report'); }
    finally { setSubmittingReport(false); }
  };

  useEffect(() => {
    if (!user || !offer?.vendorId) return;
    api.get(endpoints.vendorFollowStatus(offer.vendorId)).then((r) => {
      if (r.data.success) { setFollowing(r.data.data.following); setFollowersCount(r.data.data.followers_count); }
    }).catch(() => {});
  }, [offer?.vendorId, user?.id]);

  useEffect(() => {
    if (!offer?.vendorLat || !offer?.vendorLng || !mapRef.current) return;
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
    const lat = offer.vendorLat, lng = offer.vendorLng;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 15);
    mapInst.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
    const icon = L.divIcon({
      html: `<div style="background:#FF6200;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
               <div style="transform:rotate(45deg);font-size:16px;padding-top:6px;text-align:center;">🏪</div></div>`,
      className: '', iconSize: [36, 36], iconAnchor: [18, 36],
    });
    L.marker([lat, lng], { icon }).addTo(map);
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [offer?.vendorLat, offer?.vendorLng]);

  const saved = offer ? isSaved(offer.id) : false;

  const handleSave = async () => {
    if (!user) { toast.error('Sign in to save offers'); navigate('/login'); return; }
    if (!offer) return;
    if (saved) { await unsave(offer.id); toast.success('Removed from saved'); }
    else        { await save(offer.id);  toast.success('Offer saved!'); }
  };

  const handleFollow = async () => {
    if (!user) { toast.error('Sign in to subscribe'); navigate('/login'); return; }
    if (!offer?.vendorId || followLoading) return;
    setFollowLoading(true);
    const action = following ? 'unfollow' : 'follow';
    try {
      await api.post(endpoints.vendorFollow, { vendor_id: offer.vendorId, action });
      setFollowing(!following);
      setFollowersCount((c) => c + (following ? -1 : 1));
      toast.success(following ? 'Unsubscribed' : 'Subscribed! You\'ll get alerts on new offers.');
    } catch { toast.error('Could not update subscription'); }
    finally { setFollowLoading(false); }
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
    const destLat = offer.vendorLat, destLng = offer.vendorLng;
    if (!destLat || !destLng) {
      const q = encodeURIComponent(offer.vendorAddress ?? offer.businessName ?? '');
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
      return;
    }
    const destination = `${destLat},${destLng}`;
    const mapsTab = window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, '_blank');
    if (navigator.geolocation && mapsTab) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { mapsTab.location.href = `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${destination}&travelmode=driving`; },
        () => {},
        { timeout: 5000 },
      );
    }
  };

  const handleShare = async () => {
    if (!offer) return;
    const url  = `${window.location.origin}/offer/${offer.id}`;
    const text = `${offer.title} — ${offer.discountPercent}% OFF at ${offer.businessName}!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
  };

  const handleCopyLink = () => {
    if (!offer) return;
    navigator.clipboard.writeText(`${window.location.origin}/offer/${offer.id}`);
    toast.success('Link copied!');
  };

  const toggleVideo = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (videoPlaying) { vid.pause(); setVideoPlaying(false); }
    else              { vid.play();  setVideoPlaying(true); }
  };

  if (loading) return (
    <div className="w-full max-w-2xl mx-auto pt-6 pb-24 space-y-4 animate-pulse px-4">
      <div className="skeleton h-72 rounded-3xl" />
      <div className="skeleton h-8 w-3/4 rounded-xl" />
      <div className="skeleton h-5 w-1/2 rounded-xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  );

  if (!offer) return (
    <div className="w-full max-w-2xl mx-auto pt-20 text-center px-4">
      <div className="text-5xl mb-4">🔍</div>
      <p className="font-heading font-semibold text-[var(--text)] mb-1">Offer not found</p>
      <button onClick={() => navigate('/feed')} className="mt-4 text-[var(--primary)] underline text-sm">Back to feed</button>
    </div>
  );

  const tl = timeLeft(offer.validUntil);
  const isUrgent = tl === 'Ending soon' || tl.includes('1d');

  return (
    <div className="w-full max-w-2xl mx-auto pb-28">

      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text)] text-sm font-medium mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden mb-5 shadow-lg">
        {offer.videoUrl ? (
          <div className="relative h-72 sm:h-96 bg-black">
            <video ref={videoRef} src={offer.videoUrl} className="w-full h-full object-cover"
              playsInline onEnded={() => setVideoPlaying(false)} />
            <button onClick={toggleVideo} className="absolute inset-0 flex items-center justify-center group">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl backdrop-blur-sm transition-all
                ${videoPlaying ? 'bg-black/50 opacity-0 group-hover:opacity-100' : 'bg-[var(--primary)]/90'}`}>
                {videoPlaying ? <Pause size={26} className="text-white" /> : <Play size={26} className="text-white ml-1" />}
              </div>
            </button>
          </div>
        ) : (offer.bannerUrl || offer.imageUrl) ? (
          <button type="button" onClick={() => setLightbox(true)} className="relative w-full group block">
            <img src={offer.bannerUrl || offer.imageUrl} alt={offer.title} className="w-full h-72 sm:h-96 object-cover" />
            {/* gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <ZoomIn size={22} className="text-white" />
              </div>
            </div>
            {/* Overlay title */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-end justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-2 capitalize border border-white/20">
                    {offer.category}
                  </span>
                  <h1 className="font-heading font-bold text-white text-xl leading-snug drop-shadow-md line-clamp-2">
                    {offer.title}
                  </h1>
                </div>
                {offer.discountPercent > 0 && (
                  <div className="bg-[var(--primary)] text-white font-heading font-extrabold text-2xl px-4 py-2 rounded-2xl shadow-lg flex-shrink-0">
                    {offer.discountPercent}%<br/><span className="text-xs font-bold leading-none">OFF</span>
                  </div>
                )}
              </div>
            </div>
          </button>
        ) : (
          <div className="h-56 flex items-center justify-center text-7xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 rounded-3xl">
            🏷️
          </div>
        )}

        {/* Featured badge */}
        {offer.isFeatured && (
          <div className="absolute top-4 left-4 bg-warning text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
            <Star size={10} fill="white" /> Featured
          </div>
        )}
      </div>

      {/* Title row (when no image overlay) */}
      {!(offer.bannerUrl || offer.imageUrl || offer.videoUrl) && (
        <div className="mb-4">
          <span className="inline-block bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 capitalize">
            {offer.category}
          </span>
          <h1 className="font-heading font-bold text-[var(--text)] text-2xl leading-snug">{offer.title}</h1>
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={handleShare} title="Share on WhatsApp"
          className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-green-600 hover:border-green-400 transition-colors bg-[var(--surface)]">
          <MessageCircle size={18} />
        </button>
        <button onClick={handleCopyLink} title="Copy link"
          className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors bg-[var(--surface)]">
          <Share2 size={18} />
        </button>
        <button onClick={handleSave}
          className={`p-2.5 rounded-xl border transition-colors bg-[var(--surface)] ${
            saved ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]'
          }`}>
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => setReportOpen(true)} title="Report"
          className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-300 transition-colors bg-[var(--surface)] ml-auto">
          <Flag size={18} />
        </button>
      </div>

      {/* ── Price & Coupon card ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className={`${card} p-5 mb-4`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          {(offer.offerPrice ?? 0) > 0 && (
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-extrabold text-[var(--primary)] text-4xl">₹{offer.offerPrice}</span>
              {(offer.originalPrice ?? 0) > 0 && (
                <span className="text-[var(--text-muted)] line-through text-xl">₹{offer.originalPrice}</span>
              )}
              {offer.discountPercent > 0 && (offer.bannerUrl || offer.imageUrl || offer.videoUrl) && (
                <span className="ml-1 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {offer.discountPercent}% OFF
                </span>
              )}
            </div>
          )}
          {offer.couponCode && (
            <button onClick={handleCopyCoupon}
              className="flex items-center gap-2 bg-[var(--primary)]/8 border-2 border-dashed border-[var(--primary)]/40 hover:border-[var(--primary)] px-4 py-2.5 rounded-xl transition-all group">
              <Tag size={14} className="text-[var(--primary)]" />
              <span className="font-mono font-bold text-[var(--primary)] text-sm tracking-widest">{offer.couponCode}</span>
              {copied ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />}
            </button>
          )}
        </div>

        {/* Validity */}
        {(offer.validFrom || offer.validUntil) && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
            {offer.validFrom && (
              <span className="flex items-center gap-1.5">
                <Calendar size={12} /> From {formatDate(offer.validFrom)}
              </span>
            )}
            {offer.validUntil && (
              <span className={`flex items-center gap-1.5 font-semibold ${isUrgent ? 'text-red-500' : ''}`}>
                <Clock size={12} />
                {tl || `Until ${formatDate(offer.validUntil)}`}
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Description ── */}
      {offer.description && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className={`${card} p-5 mb-4`}>
          <h2 className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider mb-2">About this offer</h2>
          <p className="text-[var(--text)] text-sm leading-relaxed">{offer.description}</p>
        </motion.div>
      )}

      {/* ── Redeem Online banner ── */}
      {offer.redeemUrl && (
        <a href={offer.redeemUrl} target="_blank" rel="noopener noreferrer"
          onClick={() => { if (offer.couponCode) handleCopyCoupon(); }}
          className="flex items-center justify-between gap-3 bg-gradient-to-r from-[var(--primary)] to-orange-500 text-white px-5 py-4 rounded-2xl mb-4 shadow-lg shadow-[var(--primary)]/25 hover:opacity-95 transition-opacity">
          <div>
            <p className="font-heading font-bold text-base leading-none">Redeem Online</p>
            <p className="text-xs text-white/80 mt-1">Tap to visit the offer page</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ExternalLink size={20} />
          </div>
        </a>
      )}

      {/* ── Vendor card ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className={`${card} overflow-hidden mb-4`}>
        {/* Vendor header */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-[var(--border)]">
            {offer.vendorLogo
              ? <img src={offer.vendorLogo} alt="" className="w-full h-full object-cover" />
              : <span className="font-bold text-[var(--primary)] text-2xl">{offer.businessName?.[0]}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-[var(--text)] text-base leading-tight">{offer.businessName}</p>
            <p className="text-xs text-[var(--text-secondary)] capitalize mt-0.5">
              {offer.vendorCategory}{offer.vendorCity ? ` · ${offer.vendorCity}` : ''}
            </p>
            {followersCount > 0 && (
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{followersCount.toLocaleString()} subscribers</p>
            )}
          </div>
          {user && (
            <button onClick={handleFollow} disabled={followLoading}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all flex-shrink-0 ${
                following
                  ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]'
                  : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}>
              {following ? <BellOff size={13} /> : <Bell size={13} />}
              {following ? 'Subscribed' : 'Subscribe'}
            </button>
          )}
        </div>

        {/* Contact details */}
        <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
          {offer.vendorAddress && (
            <div className="flex items-start gap-3 px-5 py-3 text-sm text-[var(--text-secondary)]">
              <MapPin size={15} className="text-[var(--primary)] mt-0.5 flex-shrink-0" />
              <span className="leading-snug">{offer.vendorAddress}</span>
            </div>
          )}
          {offer.vendorPhone && (
            <a href={`tel:${offer.vendorPhone}`}
              className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
              <Phone size={15} className="text-[var(--primary)] flex-shrink-0" />
              <span>{offer.vendorPhone}</span>
              <ChevronRight size={14} className="ml-auto text-[var(--text-muted)]" />
            </a>
          )}
          {offer.vendorWebsite && (
            <a href={offer.vendorWebsite} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--primary)] hover:bg-[var(--surface-2)] transition-colors">
              <Globe size={15} className="flex-shrink-0" />
              <span className="truncate">{offer.vendorWebsite}</span>
              <ExternalLink size={12} className="ml-auto flex-shrink-0 text-[var(--text-muted)]" />
            </a>
          )}
          <button onClick={handleTakeStep}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
            <Navigation size={15} className="text-[var(--primary)] flex-shrink-0" />
            Get Directions
            <ChevronRight size={14} className="ml-auto text-[var(--text-muted)]" />
          </button>
        </div>
      </motion.div>

      {/* ── Map ── */}
      {offer.vendorLat && offer.vendorLng && (
        <motion.div ref={mapSectionRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`${card} overflow-hidden mb-4`}>
          <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border)]">
            <h2 className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
              <MapPin size={13} className="text-[var(--primary)]" /> Location
            </h2>
            <button onClick={handleTakeStep} className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1 hover:underline">
              Open in Maps <ExternalLink size={11} />
            </button>
          </div>
          <div ref={mapRef} className="h-52 w-full" />
        </motion.div>
      )}

      {/* ── Ratings & Reviews ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className={`${card} p-5 mb-4`}>
        <h2 className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
          <MessageSquare size={13} className="text-[var(--primary)]" /> Ratings & Reviews
        </h2>

        {/* Summary */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[var(--border)]">
          <div className="text-center">
            <p className="font-heading font-extrabold text-4xl text-[var(--text)]">
              {avgRating ? avgRating.toFixed(1) : '—'}
            </p>
            <StarRow value={avgRating ?? 0} size={13} />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              {reviewCount ? `${reviewCount} review${reviewCount !== 1 ? 's' : ''}` : 'No reviews'}
            </p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5,4,3,2,1].map((star) => {
              const count = reviews.filter((r) => Math.round(r.rating) === star).length;
              const pct = reviewCount ? Math.round((count / reviewCount) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-muted)] w-3">{star}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)]">
                    <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave a rating */}
        <div className="bg-[var(--surface-2)] rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-2.5">
            {myRating > 0 ? 'Your rating' : 'Rate this offer'}
          </p>
          <StarPicker value={myRating} onChange={setMyRating} />
          <textarea value={myComment} onChange={(e) => setMyComment(e.target.value)}
            placeholder="Share your experience (optional)" rows={2}
            className="w-full mt-3 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--primary)] resize-none text-[var(--text)] placeholder-[var(--text-muted)]" />
          <button onClick={handleSubmitReview} disabled={submittingReview || myRating < 1}
            className="mt-2.5 text-xs font-bold bg-[var(--primary)] text-white px-5 py-2 rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity">
            {submittingReview ? 'Submitting…' : myRating > 0 ? 'Update Rating' : 'Submit Rating'}
          </button>
        </div>

        {/* Review list */}
        {reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[var(--primary)] overflow-hidden">
                  {r.userAvatar
                    ? <img src={r.userAvatar} alt="" className="w-full h-full object-cover" />
                    : r.userName?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--text)]">{r.userName}</span>
                    <StarRow value={r.rating} size={11} />
                    <span className="text-[11px] text-[var(--text-muted)] ml-auto">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Fixed bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-3 flex gap-3 z-50">
        <button onClick={handleTakeStep}
          className="flex-1 flex items-center justify-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] font-semibold py-3.5 rounded-2xl hover:bg-[var(--border)] transition-colors text-sm">
          <Navigation size={17} /> Directions
        </button>
        {offer.redeemUrl ? (
          <a href={offer.redeemUrl} target="_blank" rel="noopener noreferrer"
            onClick={() => { if (offer.couponCode) handleCopyCoupon(); }}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--primary)] hover:opacity-90 text-white font-bold py-3.5 rounded-2xl transition-opacity shadow-lg shadow-[var(--primary)]/30 text-sm">
            <ExternalLink size={17} /> Redeem Online
          </a>
        ) : (
          <button onClick={() => { if (offer.couponCode) handleCopyCoupon(); toast.success('Offer redeemed! 🎉'); }}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--primary)] hover:opacity-90 text-white font-bold py-3.5 rounded-2xl transition-opacity shadow-lg shadow-[var(--primary)]/30 text-sm">
            <Tag size={17} /> Redeem Offer
          </button>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (offer.bannerUrl || offer.imageUrl) && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X size={20} className="text-white" />
          </button>
          <img src={offer.bannerUrl || offer.imageUrl} alt={offer.title}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* ── Report modal ── */}
      {reportOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setReportOpen(false)}>
          <div className={`${card} p-5 w-full max-w-sm shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-[var(--text)] text-sm flex items-center gap-2">
                <Flag size={15} className="text-red-500" /> Report this offer
              </h3>
              <button onClick={() => setReportOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={18} />
              </button>
            </div>
            <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block uppercase tracking-wider">Reason</label>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}
              className="input-field w-full mb-3">
              {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block uppercase tracking-wider">Details (optional)</label>
            <textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Tell us more…" rows={3}
              className="input-field w-full mb-4 resize-none" />
            <button onClick={handleSubmitReport} disabled={submittingReport}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-50 transition-colors">
              {submittingReport ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
