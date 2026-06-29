import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Bookmark, Eye, Heart, Play, Pause, BadgeCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Offer } from '../types';
import { useFeedStore } from '../store/useFeedStore';
import { useUserStore } from '../store/useUserStore';
import { useSavedStore } from '../store/useSavedStore';

interface Props {
  readonly offer: Offer;
  readonly onSave?: () => void;
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

const CATEGORY_FALLBACK: Record<string, string> = {
  food: '🍽️', electronics: '📱', fashion: '👗',
  fitness: '💪', beauty: '💄', grocery: '🛒',
  education: '🎓', health: '❤️', home: '🏠',
  automotive: '🚗', gifting: '🎁', salon: '✂️',
};

function SparkleIcon({ size = 10, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 0 L11.8 7.2 L19 9 L11.8 10.8 L10 18 L8.2 10.8 L1 9 L8.2 7.2 Z" />
    </svg>
  );
}

export default function OfferCard({ offer, onSave }: Props) {
  const { user } = useUserStore();
  const { recordInteraction } = useFeedStore();
  const { isSaved, save, unsave } = useSavedStore();
  const navigate = useNavigate();

  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isHovered, setIsHovered]       = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saved = isSaved(offer.id);

  const handleCardClick = () => {
    if (videoPlaying) return;
    if (user) recordInteraction(user.id, offer.id, 'click');
    navigate(`/offer/${offer.id}`);
  };

  const handleSave = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (saved) { await unsave(offer.id); } else { await save(offer.id); onSave?.(); }
  };

  const toggleVideo = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (videoPlaying) { vid.pause(); setVideoPlaying(false); } else { vid.play(); setVideoPlaying(true); }
  };

  const tl         = timeLeft(offer.validUntil);
  const isHot      = (offer.views ?? 0) > 50 || (offer.discountPercent ?? 0) >= 40;
  const hasVideo   = !!offer.videoUrl;
  const discount   = offer.discountPercent ?? 0;
  const savings    = (offer.originalPrice ?? 0) > 0 && (offer.offerPrice ?? 0) > 0
    ? Math.round(offer.originalPrice! - offer.offerPrice!) : 0;
  const isExpiring = tl === 'Ending soon' || tl === 'Expired';

  return (
    <motion.div
      className="relative bg-[var(--surface)] rounded-3xl overflow-hidden cursor-pointer group h-full flex flex-col border border-[var(--border)]"
      style={{ boxShadow: '0 4px 28px rgba(0,0,0,0.07)' }}
      onClick={handleCardClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -5, boxShadow: '0 20px 52px rgba(255,98,0,0.16), 0 4px 16px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.985 }}
    >
      {/* TOP — image / media area */}
      <div className="relative bg-[var(--primary-light)]" style={{ '--primary-light': '#FFF5EE' } as React.CSSProperties}>

        <SparkleIcon size={13} className="absolute top-3 left-6 text-orange-300 opacity-80 pointer-events-none z-10" />
        <SparkleIcon size={8}  className="absolute top-6 left-2 text-orange-200 opacity-55 pointer-events-none z-10" />
        <SparkleIcon size={10} className="absolute top-3 right-16 text-orange-300 opacity-65 pointer-events-none z-10" />
        <SparkleIcon size={7}  className="absolute bottom-8 right-3 text-orange-300 opacity-60 pointer-events-none z-10" />

        {/* Hot badge */}
        {isHot && !videoPlaying && (
          <div className="absolute top-3.5 left-4 z-20 flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md">
            🔥 Hot
          </div>
        )}

        {/* Discount ribbon */}
        {discount > 0 && !videoPlaying && (
          <div
            className="absolute top-0 right-5 z-20 flex flex-col items-center text-white shadow-xl"
            style={{
              background: 'linear-gradient(160deg, #FF8534 0%, #E55000 100%)',
              clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)',
              width: 56,
              paddingTop: 13,
              paddingBottom: 24,
            }}
          >
            <span className="font-black text-[1.2rem] leading-none">{discount}%</span>
            <span className="font-bold text-[10px] tracking-[0.15em] mt-0.5 opacity-90">OFF</span>
            {isHovered && (
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)' }}
                initial={{ x: '-150%' }}
                animate={{ x: '260%' }}
                transition={{ duration: 0.5, ease: 'easeIn', repeat: Infinity, repeatDelay: 0.9 }}
              />
            )}
          </div>
        )}

        {/* Image */}
        <div
          className="relative overflow-hidden aspect-[16/9] sm:aspect-[4/3]"
          style={{
            borderBottomLeftRadius:  isHovered ? '0px' : '50% 56px',
            borderBottomRightRadius: isHovered ? '0px' : '50% 56px',
            transition: 'border-bottom-left-radius 0.38s ease, border-bottom-right-radius 0.38s ease',
          }}
        >
          {hasVideo && videoPlaying ? (
            <video
              ref={videoRef}
              src={offer.videoUrl}
              className="w-full h-full object-cover"
              autoPlay playsInline
              onEnded={() => setVideoPlaying(false)}
            />
          ) : offer.bannerUrl || offer.imageUrl ? (
            <img
              src={offer.bannerUrl || offer.imageUrl}
              alt={offer.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
              <span className="text-5xl opacity-40">{CATEGORY_FALLBACK[offer.category ?? ''] ?? '🏷️'}</span>
            </div>
          )}

          {!videoPlaying && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/12 via-transparent to-transparent pointer-events-none" />
          )}

          {hasVideo && (
            <button onClick={toggleVideo} className="absolute inset-0 flex items-center justify-center group/vid">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                videoPlaying
                  ? 'bg-black/60 opacity-0 group-hover/vid:opacity-100'
                  : 'bg-[#FF6200]/90 group-hover/vid:scale-110'
              }`}>
                {videoPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
              </div>
            </button>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          aria-label={saved ? 'Remove from saved' : 'Save offer'}
          className={`absolute right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
            saved
              ? 'bg-[#FF6200] text-white scale-110'
              : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[#FF6200] hover:scale-110'
          }`}
          style={{ bottom: '52px' }}
        >
          <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
        </button>

        <div style={{ height: 22 }} />
      </div>

      {/* BOTTOM — content */}
      <div className="bg-[var(--surface)] px-4 pt-4 pb-5 flex-grow flex flex-col">

        {/* Business row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {offer.vendorLogo ? (
              <img
                src={offer.vendorLogo}
                alt=""
                className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-orange-100 shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0 ring-2 ring-orange-100 shadow-sm">
                <span className="text-sm font-extrabold text-[#FF6200]">{offer.businessName?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-bold text-[var(--text)] truncate leading-tight">{offer.businessName}</span>
                <BadgeCheck size={14} className="text-blue-500 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] mt-0.5">
                <MapPin size={9} className="flex-shrink-0" />
                <span className="truncate">{offer.vendorCity || 'Nearby'}</span>
              </div>
            </div>
          </div>

          {offer.isFeatured && (
            <div className="flex items-center gap-1 border border-emerald-400 text-emerald-600 text-[10px] font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0 whitespace-nowrap">
              <ShieldCheck size={11} className="flex-shrink-0" />
              Trusted
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-heading font-bold text-[var(--text)] text-[0.93rem] leading-snug mb-3 line-clamp-2 group-hover:text-[#FF6200] transition-colors duration-200">
          {offer.title}
        </h3>

        {/* Price */}
        {(offer.offerPrice ?? 0) > 0 ? (
          <div className="flex items-center gap-2.5 mb-4 flex-wrap">
            <span className="font-heading font-extrabold text-[#FF6200] text-2xl leading-none">₹{offer.offerPrice}</span>
            {(offer.originalPrice ?? 0) > 0 && (
              <span className="text-sm text-[var(--text-muted)] line-through leading-none">₹{offer.originalPrice}</span>
            )}
            {savings > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 border border-orange-200 bg-orange-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                🏷️ Save ₹{savings}
              </span>
            )}
          </div>
        ) : offer.couponCode ? (
          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-dashed border-orange-200 px-2.5 py-1 rounded-lg text-xs font-mono text-orange-700">
              🏷️ {offer.couponCode}
            </div>
          </div>
        ) : (
          <div className="mb-4" />
        )}

        {/* Stats footer */}
        <div className="flex items-stretch pt-3 border-t border-[var(--border)] mt-auto">
          <div className="flex-1 flex flex-col items-center gap-0.5 py-0.5">
            <div className="flex items-center gap-1">
              <Eye size={14} className="text-[var(--text-muted)]" />
              <span className="font-semibold text-[var(--text)] text-[13px]">{offer.views ?? 0}</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Views</span>
          </div>

          <div className="w-px bg-[var(--border)] self-stretch my-0.5" />

          <div className="flex-1 flex flex-col items-center gap-0.5 py-0.5">
            <div className="flex items-center gap-1">
              <Heart size={14} className="text-[var(--text-muted)]" />
              <span className="font-semibold text-[var(--text)] text-[13px]">{offer.saves ?? 0}</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Saves</span>
          </div>

          <div className="w-px bg-[var(--border)] self-stretch my-0.5" />

          <div className="flex-1 flex flex-col items-center gap-0.5 py-0.5">
            <div className="flex items-center gap-1">
              <Clock size={14} className={isExpiring ? 'text-red-500' : 'text-[var(--text-muted)]'} />
              <span className={`font-semibold text-[13px] ${isExpiring ? 'text-red-500' : 'text-[var(--text)]'}`}>
                {tl || '--'}
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Ends</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
