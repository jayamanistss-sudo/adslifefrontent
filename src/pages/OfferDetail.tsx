import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Phone, Globe, Clock, Tag, Bookmark,
  Navigation, Copy, CheckCheck, Star, Share2, Calendar,
  ExternalLink, Bell, BellOff, ZoomIn, X, Flag,
  MessageSquare, ChevronRight, ShoppingBag, Play, Pause,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import type { Offer, OfferReview } from '../types';
import toast from 'react-hot-toast';

const REPORT_REASONS = [
  { value: 'fake_offer', label: 'Fake offer' },
  { value: 'misleading', label: 'Misleading details' },
  { value: 'expired',    label: 'Expired but still showing' },
  { value: 'scam',       label: 'Looks like a scam' },
  { value: 'other',      label: 'Other' },
];

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size}
          className={i <= Math.round(value) ? 'text-amber-400' : 'text-[var(--border)]'}
          fill={i <= Math.round(value) ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hov, setHov] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)}
          onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(0)}
          className="transition-transform hover:scale-110">
          <Star size={28}
            className={i <= (hov||value) ? 'text-amber-400' : 'text-[var(--border)]'}
            fill={i <= (hov||value) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

function timeLeft(until?: string) {
  if (!until) return '';
  const d = new Date(until).getTime() - Date.now();
  if (d <= 0) return 'Expired';
  const days = Math.floor(d / 86400000);
  if (days > 1) return `${days}d left`;
  const hrs = Math.floor(d / 3600000);
  return hrs > 0 ? `${hrs}h left` : 'Ending soon';
}

function fmtDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [saved, setSaved] = useState(false);

  const [offer, setOffer]         = useState<Offer | null>(null);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState(false);
  const [lightbox, setLightbox]   = useState(false);
  const [vidPlay, setVidPlay]     = useState(false);
  const [following, setFollowing] = useState(false);
  const [followCnt, setFollowCnt] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  const [reviews, setReviews]     = useState<OfferReview[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCnt, setReviewCnt] = useState(0);
  const [myRating, setMyRating]   = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [heroIdx, setHeroIdx] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  const [reportOpen, setReportOpen]       = useState(false);
  const [reportReason, setReportReason]   = useState(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy]       = useState(false);

  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInst      = useRef<L.Map | null>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const viewRecorded = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(endpoints.offerDetail(Number(id)))
      .then(r => {
        if (r.data.success) {
          setOffer(r.data.data as Offer);
          if (typeof r.data.data.isSaved === 'boolean') setSaved(r.data.data.isSaved);
        }
      })
      .catch(() => toast.error('Offer not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !offer) return;
    const n = Number(id);
    if (viewRecorded.current === n) return;
    viewRecorded.current = n;
    api.post(endpoints.offerView(n)).catch(() => {});
  }, [id, offer]);

  useEffect(() => {
    if (!id) return;
    api.get(endpoints.offerReviews(Number(id))).then(r => {
      if (!r.data.success) return;
      setReviews(r.data.data as OfferReview[]);
      setAvgRating(r.data.avgRating ?? null);
      setReviewCnt(r.data.reviewCount ?? 0);
      if (r.data.myReview) { setMyRating(r.data.myReview.rating); setMyComment(r.data.myReview.comment ?? ''); }
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!user || !offer?.vendorId) return;
    api.get(endpoints.vendorFollowStatus(offer.vendorId)).then(r => {
      if (r.data.success) { setFollowing(r.data.data.following); setFollowCnt(r.data.data.followers_count); }
    }).catch(() => {});
  }, [offer?.vendorId, user?.id]);

  useEffect(() => {
    if (!offer?.vendorLat || !offer?.vendorLng || !mapRef.current) return;
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
      .setView([offer.vendorLat, offer.vendorLng], 15);
    mapInst.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    const icon = L.divIcon({
      html: `<div style="background:#FF6200;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"><span style="transform:rotate(45deg);font-size:14px;display:block;text-align:center;margin-top:4px">🏪</span></div>`,
      className: '', iconSize: [32,32], iconAnchor: [16,32],
    });
    L.marker([offer.vendorLat, offer.vendorLng], { icon }).addTo(map);
    return () => { mapInst.current?.remove(); mapInst.current = null; };
  }, [offer?.vendorLat, offer?.vendorLng]);

  const handleSave = async () => {
    if (!user) { toast.error('Sign in to save'); navigate('/login'); return; }
    if (!offer) return;
    const willSave = !saved;
    setSaved(willSave);
    try {
      if (willSave) {
        await api.post(endpoints.interaction, { offer_id: offer.id, action: 'save' });
      } else {
        await api.delete(endpoints.unsaveOffer, { data: { offer_id: offer.id } });
      }
      toast.success(willSave ? 'Saved!' : 'Removed from saved');
    } catch {
      setSaved(!willSave);
    }
  };

  const handleFollow = async () => {
    if (!user) { toast.error('Sign in to subscribe'); navigate('/login'); return; }
    if (!offer?.vendorId || followBusy) return;
    setFollowBusy(true);
    try {
      await api.post(endpoints.vendorFollow, { vendor_id: offer.vendorId, action: following ? 'unfollow' : 'follow' });
      setFollowing(!following); setFollowCnt(c => c + (following ? -1 : 1));
      toast.success(following ? 'Unsubscribed' : 'Subscribed!');
    } catch { toast.error('Could not update'); }
    finally { setFollowBusy(false); }
  };

  const handleCopy = () => {
    if (!offer?.couponCode) return;
    navigator.clipboard.writeText(offer.couponCode);
    setCopied(true); toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDirections = () => {
    if (!offer) return;
    const lat = offer.vendorLat, lng = offer.vendorLng;
    if (!lat || !lng) { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offer.vendorAddress ?? offer.businessName ?? '')}`, '_blank'); return; }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
  };

  const handleShare = () => {
    if (!offer) return;
    const url = `${window.location.origin}/offer/${offer.id}`;
    const text = `${offer.title} — ${offer.discountPercent}% OFF at ${offer.businessName}!`;
    if (navigator.share) navigator.share({ title: offer.title, text, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
  };

  const handleReview = async () => {
    if (!user) { toast.error('Sign in first'); navigate('/login'); return; }
    if (!offer || myRating < 1) { toast.error('Pick a star rating'); return; }
    setSubmitting(true);
    try {
      const r = await api.post(endpoints.offerReviews(offer.id), { rating: myRating, comment: myComment || undefined });
      toast.success('Review submitted!');
      if (r.data.success) { setReviews(r.data.data); setAvgRating(r.data.avgRating); setReviewCnt(r.data.reviewCount); }
    } catch { toast.error('Could not submit'); }
    finally { setSubmitting(false); }
  };

  const handleReport = async () => {
    if (!user) { toast.error('Sign in first'); navigate('/login'); return; }
    if (!offer) return;
    setReportBusy(true);
    try {
      await api.post(endpoints.offerReport(offer.id), { reason: reportReason, details: reportDetails || undefined });
      toast.success("Thanks, we'll review this");
      setReportOpen(false); setReportDetails('');
    } catch { toast.error('Could not submit'); }
    finally { setReportBusy(false); }
  };

  // ─── Hero auto-slider ───────────────────────────────────────────────────
  const heroSlideCount = offer && !offer.videoUrl
    ? (offer.bannerUrl || offer.imageUrl ? 1 : 0) + (offer.images?.length ?? 0)
    : 0;
  useEffect(() => {
    if (heroSlideCount <= 1 || heroPaused) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroSlideCount), 4000);
    return () => clearInterval(t);
  }, [heroSlideCount, heroPaused]);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="w-full animate-pulse space-y-4">
      <div className="skeleton h-10 w-32 rounded-xl" />
      <div className="skeleton aspect-video w-full rounded-3xl" />
      <div className="skeleton h-8 w-2/3 rounded-xl" />
      <div className="skeleton h-6 w-1/3 rounded-xl" />
      <div className="skeleton h-32 rounded-2xl" />
      <div className="skeleton h-24 rounded-2xl" />
    </div>
  );

  if (!offer) return (
    <div className="w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-4">🔍</div>
      <p className="font-heading font-bold text-[var(--text)] text-xl mb-2">Offer not found</p>
      <p className="text-[var(--text-secondary)] text-sm mb-6">This offer may have expired or been removed.</p>
      <button onClick={() => navigate('/feed')}
        className="bg-[var(--primary)] text-white px-6 py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity">
        Browse Offers
      </button>
    </div>
  );

  const tl        = timeLeft(offer.validUntil);
  const isUrgent  = tl === 'Ending soon' || tl === '1d left';
  const savings   = (offer.originalPrice ?? 0) - (offer.offerPrice ?? 0);
  const hasVid    = !!offer.videoUrl;
  const imageSlides = [
    ...(offer.bannerUrl || offer.imageUrl ? [offer.bannerUrl || offer.imageUrl!] : []),
    ...(offer.images ?? []),
  ];
  const hasImg = imageSlides.length > 0;
  const heroImg = imageSlides[Math.min(heroIdx, imageSlides.length - 1)];
  const heroPrev = () => setHeroIdx(i => (i - 1 + imageSlides.length) % imageSlides.length);
  const heroNext = () => setHeroIdx(i => (i + 1) % imageSlides.length);

  return (
    <div className="w-full pb-6">

      {/* ── Back row ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors font-medium text-sm">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-1.5">
          <button onClick={handleSave}
            data-testid="save-offer-btn"
            aria-label={saved ? 'Unsave offer' : 'Save offer'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/30'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
            }`}>
            <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
            {saved && <span className="text-xs font-bold">Saved</span>}
          </button>
          <button onClick={handleShare} className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
            <Share2 size={17} />
          </button>
          <button onClick={() => setReportOpen(true)} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <Flag size={17} />
          </button>
        </div>
      </div>

      {/* ── Hero image ─────────────────────────────────────────────────── */}
      <div
        className="relative w-full aspect-[4/3] md:aspect-[3/1] rounded-3xl overflow-hidden bg-gray-950 mb-5 shadow-xl shadow-black/10"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
      >
        {hasVid ? (
          <>
            <video ref={videoRef} src={offer.videoUrl} className="w-full h-full object-cover"
              playsInline onEnded={() => setVidPlay(false)} />
            <button onClick={() => { const v = videoRef.current; if (!v) return; vidPlay ? v.pause() : v.play(); setVidPlay(!vidPlay); }}
              className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-opacity ${vidPlay ? 'opacity-0 hover:opacity-100' : ''}`}>
                {vidPlay ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
              </div>
            </button>
          </>
        ) : hasImg ? (
          <>
            <AnimatePresence mode="wait">
              <motion.button
                key={heroIdx}
                type="button"
                onClick={() => setLightbox(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 w-full h-full block group"
              >
                <img src={heroImg} alt={offer.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full p-2">
                    <ZoomIn size={15} className="text-white" />
                  </div>
                </div>
              </motion.button>
            </AnimatePresence>

            {/* Slider controls — only when there's more than one image */}
            {imageSlides.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); heroPrev(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight size={16} className="rotate-180" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); heroNext(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                  {imageSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setHeroIdx(i); }}
                      className={`h-1.5 rounded-full transition-all ${i === heroIdx ? 'bg-white w-5' : 'bg-white/40 w-1.5'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 to-orange-900/30">
            <ShoppingBag size={64} className="text-white/20" />
          </div>
        )}

        {/* Discount badge — top right of image */}
        {(offer.discountPercent ?? 0) > 0 && (
          <div className="absolute top-4 right-4 bg-[var(--primary)] text-white rounded-2xl px-4 py-2 shadow-xl">
            <div className="font-heading font-black text-2xl leading-none text-center">{offer.discountPercent}%</div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-center opacity-90">OFF</div>
          </div>
        )}

        {/* Urgency badge — top left */}
        {tl && (
          <div className={`absolute top-4 left-4 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg ${
            isUrgent ? 'bg-red-500 text-white' : 'bg-black/50 text-white'
          }`}>
            <Clock size={11} /> {tl}
          </div>
        )}

        {/* Featured */}
        {offer.isFeatured && (
          <div className="absolute bottom-4 left-4 bg-amber-400 text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Star size={9} fill="currentColor" /> Featured
          </div>
        )}
      </div>

      {!hasVid && imageSlides.length > 1 && (
        <p className="text-xs text-[var(--text-muted)] text-center -mt-3 mb-5">{heroIdx + 1} / {imageSlides.length} photos</p>
      )}

      {/* ── Title block ────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            {offer.category}
          </span>
          {avgRating != null && (
            <div className="flex items-center gap-1.5">
              <Stars value={avgRating} size={12} />
              <span className="text-sm font-semibold text-[var(--text)]">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-[var(--text-muted)]">({reviewCnt} review{reviewCnt !== 1 ? 's' : ''})</span>
            </div>
          )}
        </div>
        <h1 className="font-heading font-bold text-[var(--text)] text-2xl md:text-3xl leading-snug">
          {offer.title}
        </h1>
        {saved && (
          <div className="inline-flex items-center gap-1.5 mt-2 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold px-3 py-1.5 rounded-full">
            <Bookmark size={11} fill="currentColor" /> Saved to your list
          </div>
        )}
      </div>

      {/* ── Price + coupon card ─────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 mb-3 shadow-sm">
        {/* Price */}
        {(offer.offerPrice ?? 0) > 0 ? (
          <div className="flex items-end gap-3 flex-wrap mb-4">
            <span className="font-heading font-black text-[var(--primary)] text-5xl leading-none">
              ₹{offer.offerPrice?.toLocaleString('en-IN')}
            </span>
            {(offer.originalPrice ?? 0) > 0 && (
              <span className="text-[var(--text-muted)] line-through text-2xl leading-none pb-0.5">
                ₹{offer.originalPrice?.toLocaleString('en-IN')}
              </span>
            )}
            {savings > 0 && (
              <span className="text-sm font-bold bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                Save ₹{savings.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        ) : (offer.discountPercent ?? 0) > 0 && (
          <p className="font-heading font-black text-[var(--primary)] text-4xl mb-4 leading-none">
            {offer.discountPercent}% OFF
          </p>
        )}

        {/* Coupon */}
        {offer.couponCode && (
          <button onClick={handleCopy}
            className="w-full flex items-center gap-3 border-2 border-dashed border-[var(--primary)]/40 hover:border-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 rounded-xl px-4 py-3 transition-all group mb-4">
            <Tag size={15} className="text-[var(--primary)] flex-shrink-0" />
            <span className="font-mono font-bold text-[var(--primary)] text-base tracking-[0.18em] flex-1 text-left">
              {offer.couponCode}
            </span>
            <span className={`flex items-center gap-1 text-xs font-bold transition-colors flex-shrink-0 ${copied ? 'text-green-600' : 'text-[var(--text-muted)] group-hover:text-[var(--primary)]'}`}>
              {copied ? <><CheckCheck size={13} /> Copied!</> : <><Copy size={13} /> Copy code</>}
            </span>
          </button>
        )}

        {/* Dates */}
        {(offer.validFrom || offer.validUntil) && (
          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
            {offer.validFrom && (
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-[var(--primary)]" /> From {fmtDate(offer.validFrom)}
              </span>
            )}
            {offer.validUntil && (
              <span className={`flex items-center gap-1.5 ${isUrgent ? 'text-red-500 font-medium' : ''}`}>
                <Clock size={12} /> Until {fmtDate(offer.validUntil)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Two-column grid on desktop ─────────────────────────────────── */}
      <div className="md:grid md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_360px] md:gap-4">

        {/* LEFT column */}
        <div className="space-y-3">

          {/* Redeem online */}
          {offer.redeemUrl && (
            <a href={offer.redeemUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => { if (offer.couponCode) handleCopy(); }}
              className="flex items-center gap-4 gradient-bg text-white px-5 py-4 rounded-2xl shadow-lg shadow-[var(--primary)]/20 hover:opacity-95 transition-opacity group">
              <div className="flex-1">
                <p className="font-heading font-bold text-lg leading-tight">Redeem Online</p>
                <p className="text-xs text-white/75 mt-0.5">
                  {offer.couponCode ? `Apply code ${offer.couponCode} at checkout` : 'Tap to visit the offer page'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center flex-shrink-0 transition-colors">
                <ExternalLink size={20} />
              </div>
            </a>
          )}

          {/* Description */}
          {offer.description && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-4 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-2">About this offer</p>
              <p className="text-sm text-[var(--text)] leading-relaxed">{offer.description}</p>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-1.5">
          <MessageSquare size={10} className="text-[var(--primary)]" /> Ratings & Reviews
        </p>

        {/* Summary */}
        <div className="flex items-stretch gap-4 mb-5 pb-5 border-b border-[var(--border)]">
          <div className="flex flex-col items-center justify-center bg-[var(--surface-2)] rounded-2xl px-5 py-4 flex-shrink-0 min-w-[88px]">
            <span className="font-heading font-black text-5xl text-[var(--text)] leading-none">
              {avgRating ? avgRating.toFixed(1) : '—'}
            </span>
            <Stars value={avgRating ?? 0} size={12} />
            <span className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center whitespace-nowrap">
              {reviewCnt ? `${reviewCnt} review${reviewCnt !== 1 ? 's' : ''}` : 'No reviews yet'}
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1.5">
            {[5,4,3,2,1].map(s => {
              const cnt = reviews.filter(r => Math.round(r.rating) === s).length;
              const pct = reviewCnt ? Math.round((cnt / reviewCnt) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-muted)] w-2.5 text-right flex-shrink-0">{s}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <motion.div className="h-full rounded-full bg-amber-400"
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: (5-s)*0.06 }} />
                  </div>
                  {cnt > 0 && <span className="text-[10px] text-[var(--text-muted)] w-3 flex-shrink-0">{cnt}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Write review */}
        <div className="bg-[var(--surface-2)] rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">{myRating ? 'Your rating' : 'Rate this offer'}</p>
          <StarPicker value={myRating} onChange={setMyRating} />
          <textarea value={myComment} onChange={e => setMyComment(e.target.value)}
            placeholder="Share your experience (optional)" rows={2}
            className="w-full mt-3 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 resize-none text-[var(--text)] placeholder-[var(--text-muted)] transition-all" />
          <button onClick={handleReview} disabled={submitting || myRating < 1}
            className="mt-3 text-sm font-bold bg-[var(--primary)] text-white px-5 py-2.5 rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity">
            {submitting ? 'Submitting…' : myRating ? 'Update Review' : 'Submit Review'}
          </button>
        </div>

        {/* Review list */}
        {reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[var(--primary)] overflow-hidden">
                  {r.userAvatar ? <img src={r.userAvatar} alt="" className="w-full h-full object-cover" /> : r.userName?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-[var(--text)]">{r.userName}</span>
                    <Stars value={r.rating} size={10} />
                    <span className="text-[10px] text-[var(--text-muted)] ml-auto">{fmtDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>{/* /reviews card */}
        </div>{/* /left column */}

        {/* RIGHT column — vendor + map */}
        <div className="space-y-3 mt-3 md:mt-0">

          {/* Vendor card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3.5 p-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 border border-[var(--border)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {offer.vendorLogo
                  ? <img src={offer.vendorLogo} alt="" className="w-full h-full object-cover" />
                  : <span className="font-black text-[var(--primary)] text-2xl">{offer.businessName?.[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-[var(--text)] text-base truncate">{offer.businessName}</p>
                <p className="text-xs text-[var(--text-secondary)] capitalize mt-0.5">
                  {offer.vendorCategory}{offer.vendorCity ? ` · ${offer.vendorCity}` : ''}
                </p>
                {followCnt > 0 && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{followCnt.toLocaleString()} subscribers</p>}
              </div>
              {user && (
                <button onClick={handleFollow} disabled={followBusy}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all flex-shrink-0 ${
                    following
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                      : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  }`}>
                  {following ? <BellOff size={12} /> : <Bell size={12} />}
                  {following ? 'Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>
            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {offer.vendorAddress && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <MapPin size={14} className="text-[var(--primary)] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-[var(--text-secondary)] leading-snug">{offer.vendorAddress}</span>
                </div>
              )}
              {offer.vendorPhone && (
                <a href={`tel:${offer.vendorPhone}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                  <Phone size={14} className="text-[var(--primary)] flex-shrink-0" />
                  <span className="text-sm text-[var(--text-secondary)] flex-1">{offer.vendorPhone}</span>
                  <ChevronRight size={13} className="text-[var(--text-muted)]" />
                </a>
              )}
              {offer.vendorWebsite && (
                <a href={offer.vendorWebsite} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                  <Globe size={14} className="text-[var(--primary)] flex-shrink-0" />
                  <span className="text-sm text-[var(--primary)] flex-1 truncate">{offer.vendorWebsite}</span>
                  <ExternalLink size={11} className="text-[var(--text-muted)]" />
                </a>
              )}
              <button onClick={handleDirections}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-2)] transition-colors">
                <Navigation size={14} className="text-[var(--primary)] flex-shrink-0" />
                <span className="text-sm font-semibold text-[var(--text)] flex-1 text-left">Get Directions</span>
                <ChevronRight size={13} className="text-[var(--text-muted)]" />
              </button>
            </div>
          </div>

          {/* Map */}
          {offer.vendorLat && offer.vendorLng && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--text-muted)] flex items-center gap-1.5">
                  <MapPin size={10} className="text-[var(--primary)]" /> Location
                </span>
                <button onClick={handleDirections} className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1 hover:underline">
                  Open Maps <ExternalLink size={11} />
                </button>
              </div>
              <div ref={mapRef} className="h-56 w-full" />
            </div>
          )}

        </div>{/* /right column */}
      </div>{/* /grid */}


      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox && hasImg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}>
            <button onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X size={20} className="text-white" />
            </button>
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              src={heroImg} alt={offer.title}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Report modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={() => setReportOpen(false)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-semibold text-[var(--text)] flex items-center gap-2">
                  <Flag size={15} className="text-red-500" /> Report this offer
                </h3>
                <button onClick={() => setReportOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Reason</p>
              <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="input-field w-full mb-4">
                {REPORT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <p className="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Details (optional)</p>
              <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)}
                placeholder="Tell us more…" rows={3} className="input-field w-full mb-5 resize-none" />
              <button onClick={handleReport} disabled={reportBusy}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-3 rounded-2xl disabled:opacity-50 transition-colors">
                {reportBusy ? 'Submitting…' : 'Submit Report'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
