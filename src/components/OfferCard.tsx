import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Bookmark, Tag, Eye, Heart, Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Offer } from '../types';
import { useFeedStore } from '../store/useFeedStore';
import { useUserStore } from '../store/useUserStore';
import { useSavedStore } from '../store/useSavedStore';
import ShareButton from './ShareButton';

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

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍽️', electronics: '📱', fashion: '👕',
  fitness: '💪', beauty: '💄', grocery: '🛒',
  education: '🎓', health: '❤️', home: '🏠',
  automotive: '🚗', gifting: '🎁', salon: '✂️',
};

export default function OfferCard({ offer, onSave }: Props) {
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
    if (saved) {
      await unsave(offer.id);
    } else {
      await save(offer.id);
      onSave?.();
    }
  };

  const toggleVideo = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (videoPlaying) {
      vid.pause();
      setVideoPlaying(false);
    } else {
      vid.play();
      setVideoPlaying(true);
    }
  };

  const tl = timeLeft(offer.validUntil);
  const isHot = (offer.views ?? 0) > 50 || (offer.discountPercent ?? 0) >= 40;
  const hasVideo = !!offer.videoUrl;

  return (
    <motion.div
      className="offer-card overflow-hidden cursor-pointer group"
      whileHover={{ y: -2 }}
      onClick={handleCardClick}
    >
      {/* Media (video or image) */}
      <div className="relative h-44 bg-gradient-to-br from-[var(--surface-2)] to-[var(--border)] overflow-hidden">

        {/* Video player */}
        {hasVideo && videoPlaying ? (
          <video
            ref={videoRef}
            src={offer.videoUrl}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            onEnded={() => setVideoPlaying(false)}
          />
        ) : offer.bannerUrl || offer.imageUrl ? (
          <img
            src={offer.bannerUrl || offer.imageUrl}
            alt={offer.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-5xl opacity-60">{CATEGORY_ICONS[offer.category ?? ''] ?? '🏷️'}</span>
          </div>
        )}

        {/* Video play/pause overlay */}
        {hasVideo && (
          <button
            onClick={toggleVideo}
            className="absolute inset-0 flex items-center justify-center group/vid"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
              videoPlaying
                ? 'bg-black/60 opacity-0 group-hover/vid:opacity-100'
                : 'bg-primary/90 backdrop-blur-sm group-hover/vid:bg-primary'
            }`}>
              {videoPlaying
                ? <Pause size={20} className="text-white" />
                : <Play  size={20} className="text-white ml-0.5" />}
            </div>
            {!videoPlaying && (
              <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
                ▶ Watch
              </span>
            )}
          </button>
        )}

        {/* Hot badge — top left */}
        {isHot && !videoPlaying && (
          <div className="absolute top-3 left-3 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            Hot
          </div>
        )}

        {/* Discount badge — top right */}
        {(offer.discountPercent ?? 0) > 0 && !videoPlaying && (
          <div className="absolute top-3 right-3 bg-primary text-white font-heading font-bold text-xs px-2.5 py-1 rounded-lg shadow">
            {offer.discountPercent}% OFF
          </div>
        )}

        {/* Distance — bottom left */}
        {offer.distance !== undefined && !videoPlaying && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
            <MapPin size={9} />
            {offer.distance < 1 ? `${(offer.distance * 1000).toFixed(0)}m` : `${offer.distance}km`}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`absolute top-3 transition-all ${
            (offer.discountPercent ?? 0) > 0 ? 'right-[68px]' : 'right-3'
          } p-1.5 rounded-full shadow ${
            saved
              ? 'bg-primary text-white'
              : 'bg-white/90 text-gray-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity'
          }`}
        >
          <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3.5">
        {/* Business + location */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {offer.vendorLogo ? (
            <img src={offer.vendorLogo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-bold text-primary">{offer.businessName?.[0]}</span>
            </div>
          )}
          <span className="text-xs text-[var(--text-secondary)] truncate">
            {offer.businessName}
            {offer.vendorCity ? ` · ${offer.vendorCity}` : ''}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-heading font-semibold text-[var(--text)] text-sm leading-snug mb-2 line-clamp-2">
          {offer.title}
        </h3>

        {/* Price row */}
        {(() => {
          if ((offer.offerPrice ?? 0) > 0) return (
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[var(--primary)] text-base">₹{offer.offerPrice}</span>
                {(offer.originalPrice ?? 0) > 0 && (
                  <span className="text-xs text-[var(--text-muted)] line-through">₹{offer.originalPrice}</span>
                )}
              </div>
            </div>
          );
          if (offer.couponCode) return (
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex items-center gap-1 bg-[var(--surface-2)] border border-dashed border-[var(--border-strong)] px-2 py-0.5 rounded text-xs font-mono text-[var(--text-secondary)]">
                <Tag size={9} />
                {offer.couponCode}
              </div>
            </div>
          );
          return <div className="mb-2.5" />;
        })()}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-0.5">
              <Eye size={11} /> {offer.views ?? 0}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart size={11} /> {offer.saves ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ShareButton offer={offer} />
            {tl && (
              <span className={`flex items-center gap-0.5 ${tl === 'Ending soon' ? 'text-[#991B1B]' : 'text-[var(--text-muted)]'}`}>
                <Clock size={10} /> {tl}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
