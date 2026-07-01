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
  readonly index?: number;
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

export default function OfferCard({ offer, onSave, index = 0 }: Props) {
  const { user } = useUserStore();
  const { recordInteraction } = useFeedStore();
  const { isSaved, save, unsave } = useSavedStore();
  const navigate = useNavigate();

  const [videoPlaying, setVideoPlaying] = useState(false);
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
      className="card-grand card-shine relative overflow-hidden cursor-pointer group h-full flex flex-col p-0"
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, delay: index * 0.04 }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Image */}
      <div className="relative h-[108px] sm:h-auto sm:aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
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
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary-light)] to-[var(--surface-2)]">
            <span className="text-5xl opacity-40">{CATEGORY_FALLBACK[offer.category ?? ''] ?? '🏷️'}</span>
          </div>
        )}

        {!videoPlaying && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
        )}

        {hasVideo && (
          <button onClick={toggleVideo} className="absolute inset-0 flex items-center justify-center group/vid">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
              videoPlaying
                ? 'bg-black/60 opacity-0 group-hover/vid:opacity-100'
                : 'bg-[var(--primary)]/90 group-hover/vid:scale-110'
            }`}>
              {videoPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
            </div>
          </button>
        )}

        {/* Hot badge */}
        {isHot && !videoPlaying && (
          <motion.div
            initial={{ scale: 0, x: -10 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18, delay: index * 0.04 + 0.15 }}
            className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 z-20 flex items-center gap-1 text-white text-[9px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full badge-hot"
            style={{ background: 'var(--danger)' }}
          >
            🔥 Hot
          </motion.div>
        )}

        {/* Discount badge */}
        {discount > 0 && !videoPlaying && (
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 16, delay: index * 0.04 + 0.1 }}
            className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 z-20 gradient-bg text-white text-[9px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-md badge-shine"
          >
            {discount}% OFF
          </motion.div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          aria-label={saved ? 'Remove from saved' : 'Save offer'}
          className={`absolute bottom-1.5 right-1.5 sm:bottom-3 sm:right-3 z-20 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
            saved
              ? 'gradient-bg text-white scale-110'
              : 'bg-[var(--surface)]/90 text-[var(--text-muted)] hover:text-[var(--primary)] hover:scale-110'
          }`}
        >
          <Bookmark size={12} className="sm:hidden" fill={saved ? 'currentColor' : 'none'} />
          <Bookmark size={15} className="hidden sm:block" fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Content */}
      <div className="px-2.5 pt-2.5 pb-2.5 sm:px-4 sm:pt-4 sm:pb-5 flex-grow flex flex-col">

        {/* Business row */}
        <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {offer.vendorLogo ? (
              <img
                src={offer.vendorLogo}
                alt=""
                className="w-6 h-6 sm:w-11 sm:h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-[var(--primary-light)]"
              />
            ) : (
              <div className="w-6 h-6 sm:w-11 sm:h-11 rounded-full bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0 ring-2 ring-[var(--primary-light)]">
                <span className="text-[10px] sm:text-xs font-extrabold text-[var(--primary)]">{offer.businessName?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] sm:text-[13px] font-bold text-[var(--text)] truncate leading-tight">{offer.businessName}</span>
                <BadgeCheck size={12} style={{ color: 'var(--info)' }} className="flex-shrink-0 sm:hidden" />
                <BadgeCheck size={14} style={{ color: 'var(--info)' }} className="flex-shrink-0 hidden sm:block" />
              </div>
              <div className="flex items-center gap-1 text-[9px] sm:text-[11px] text-[var(--text-muted)] mt-0.5">
                <MapPin size={8} className="flex-shrink-0 sm:hidden" />
                <MapPin size={9} className="flex-shrink-0 hidden sm:block" />
                <span className="truncate">{offer.vendorCity || 'Nearby'}</span>
              </div>
            </div>
          </div>

          {offer.isFeatured && (
            <div className="badge badge-accent flex-shrink-0 whitespace-nowrap hidden sm:flex">
              <ShieldCheck size={11} className="flex-shrink-0" />
              Trusted
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-heading font-bold text-[var(--text)] text-[0.7rem] sm:text-[0.93rem] leading-snug mb-1.5 sm:mb-3 line-clamp-2 group-hover:text-[var(--primary)] transition-colors duration-200">
          {offer.title}
        </h3>

        {/* Price */}
        {(offer.offerPrice ?? 0) > 0 ? (
          <div className="flex items-center gap-1.5 sm:gap-2.5 mb-1.5 sm:mb-4 flex-wrap">
            <span className="font-heading font-extrabold text-[var(--primary)] text-base sm:text-2xl leading-none">₹{offer.offerPrice}</span>
            {(offer.originalPrice ?? 0) > 0 && (
              <span className="text-xs sm:text-sm text-[var(--text-muted)] line-through leading-none">₹{offer.originalPrice}</span>
            )}
            {savings > 0 && (
              <span className="badge badge-primary whitespace-nowrap hidden sm:inline-flex">
                🏷️ Save ₹{savings}
              </span>
            )}
          </div>
        ) : offer.couponCode ? (
          <div className="mb-1.5 sm:mb-4">
            <div className="inline-flex items-center gap-1.5 bg-[var(--primary-light)] border border-dashed border-[var(--primary-border)] px-2.5 py-1 rounded-lg text-xs font-mono text-[var(--primary)]">
              🏷️ {offer.couponCode}
            </div>
          </div>
        ) : (
          <div className="mb-1.5 sm:mb-4" />
        )}

        {/* Stats footer */}
        <div className="flex items-stretch pt-1.5 sm:pt-3 border-t border-[var(--border)] mt-auto">
          <div className="flex-1 flex flex-col items-center gap-0.5 py-0.5">
            <div className="flex items-center gap-1">
              <Eye size={11} className="text-[var(--text-muted)] sm:hidden" />
              <Eye size={14} className="text-[var(--text-muted)] hidden sm:block" />
              <span className="font-semibold text-[var(--text)] text-[11px] sm:text-[13px]">{offer.views ?? 0}</span>
            </div>
            <span className="text-[8px] sm:text-[10px] text-[var(--text-muted)]">Views</span>
          </div>

          <div className="w-px bg-[var(--border)] self-stretch my-0.5" />

          <div className="flex-1 flex flex-col items-center gap-0.5 py-0.5">
            <div className="flex items-center gap-1">
              <Heart size={11} className="text-[var(--text-muted)] sm:hidden" />
              <Heart size={14} className="text-[var(--text-muted)] hidden sm:block" />
              <span className="font-semibold text-[var(--text)] text-[11px] sm:text-[13px]">{offer.saves ?? 0}</span>
            </div>
            <span className="text-[8px] sm:text-[10px] text-[var(--text-muted)]">Saves</span>
          </div>

          <div className="w-px bg-[var(--border)] self-stretch my-0.5" />

          <div className="flex-1 flex flex-col items-center gap-0.5 py-0.5">
            <div className="flex items-center gap-1">
              <Clock size={11} className="sm:hidden" style={{ color: isExpiring ? 'var(--danger)' : 'var(--text-muted)' }} />
              <Clock size={14} className="hidden sm:block" style={{ color: isExpiring ? 'var(--danger)' : 'var(--text-muted)' }} />
              <span className="font-semibold text-[11px] sm:text-[13px]" style={{ color: isExpiring ? 'var(--danger)' : 'var(--text)' }}>
                {tl || '--'}
              </span>
            </div>
            <span className="text-[8px] sm:text-[10px] text-[var(--text-muted)]">Ends</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
