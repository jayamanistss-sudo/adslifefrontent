import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Volume2, VolumeX, MapPin, ArrowUpRight, Sparkles } from 'lucide-react';
import { api, endpoints } from '../utils/api';

interface Slide {
  key: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  title: string;
  tagline?: string;
  businessName?: string;
  city?: string;
  vendorLogo?: string;
  targetUrl?: string;
  source: 'spotlight' | 'banner';
}

interface Props {
  readonly onExplore: () => void;
}

function mapSpotlight(s: Record<string, unknown>): Slide {
  return {
    key:          `spotlight-${s.id}`,
    mediaUrl:     s.video_url as string,
    mediaType:    'video',
    title:        s.title as string,
    tagline:      s.tagline as string | undefined,
    businessName: s.business_name as string | undefined,
    city:         s.city as string | undefined,
    vendorLogo:   s.vendor_logo as string | undefined,
    source:       'spotlight',
  };
}

function mapBannerAd(b: Record<string, unknown>): Slide {
  return {
    key:          `banner-${b.id}`,
    mediaUrl:     b.image_url as string,
    mediaType:    (b.media_type as string) === 'video' ? 'video' : 'image',
    title:        (b.title as string) ?? 'Sponsored',
    businessName: b.business_name as string | undefined,
    vendorLogo:   b.vendor_logo as string | undefined,
    targetUrl:    b.target_url as string | undefined,
    source:       'banner',
  };
}

const DEFAULT_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4';

export default function SpotlightHero({ onExplore }: Props) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(endpoints.spotlightActive).catch(() => null),
      api.get(endpoints.bannerList).catch(() => null),
    ]).then(([spotlightRes, bannerRes]) => {
      const spotlightSlides: Slide[] = spotlightRes?.data?.success
        ? spotlightRes.data.data.map(mapSpotlight)
        : [];
      const bannerSlides: Slide[] = bannerRes?.data?.success
        ? bannerRes.data.data.map(mapBannerAd)
        : [];
      setSlides([...bannerSlides, ...spotlightSlides]);
    });
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 8000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
  }, [current]);

  const activeSlide = slides[current];
  const activeMediaUrl = activeSlide?.mediaUrl ?? DEFAULT_VIDEO;
  const activeMediaType = activeSlide?.mediaType ?? 'video';

  const prev = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  };
  const next = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent((c) => (c + 1) % slides.length);
  };

  const handleCta = () => {
    if (activeSlide?.source === 'banner' && activeSlide.targetUrl) {
      window.open(activeSlide.targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      onExplore();
    }
  };

  return (
    <motion.div
      className="relative overflow-hidden mb-0 sm:rounded-2xl sm:mb-8 h-[200px] sm:h-[440px] bg-dark hero-ring"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMediaUrl}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {activeMediaType === 'video' ? (
            <video
              ref={videoRef}
              src={activeMediaUrl}
              className="absolute inset-0 w-full h-full object-cover ken-burns"
              autoPlay loop muted={muted} playsInline
            />
          ) : (
            <img
              src={activeMediaUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover ken-burns"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent" />

      {/* Decorative sparkles */}
      <motion.div
        className="absolute top-6 right-16 text-white/20 hidden sm:block"
        animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles size={28} />
      </motion.div>

      {activeMediaType === 'video' && (
        <motion.button
          onClick={() => setMuted((m) => !m)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-md border border-white/10"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </motion.button>
      )}

      {activeSlide && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 gradient-bg text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" />
          {activeSlide.source === 'banner' ? 'Sponsored' : 'Featured Spotlight'}
        </motion.div>
      )}

      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {activeSlide?.businessName && (
              <motion.div
                className="flex items-center gap-2 mb-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold overflow-hidden border border-white/15">
                  {activeSlide.vendorLogo
                    ? <img src={activeSlide.vendorLogo} alt="" className="w-full h-full object-cover" />
                    : activeSlide.businessName[0]}
                </div>
                <span className="text-white/80 text-xs font-medium">{activeSlide.businessName}</span>
                {activeSlide.city && (
                  <span className="flex items-center gap-0.5 text-white/60 text-xs">
                    <MapPin size={10} /> {activeSlide.city}
                  </span>
                )}
              </motion.div>
            )}

            <h1 className="font-heading font-extrabold text-xl sm:text-4xl text-white leading-tight mb-1 sm:mb-2 drop-shadow-lg">
              {activeSlide ? activeSlide.title : (
                <>Discover Today's Best<br />Offers <span className="text-primary-300">Near You</span></>
              )}
            </h1>

            <p className="text-white/75 text-[11px] sm:text-base mb-3 sm:mb-5 max-w-lg line-clamp-2 sm:line-clamp-none">
              {activeSlide?.tagline ?? 'All the deals from shops around you — in one place. Stop scrolling multiple apps!'}
            </p>

            <motion.button
              onClick={handleCta}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-1.5 gradient-bg btn-shine text-white font-semibold text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg shadow-primary/30 w-fit"
            >
              {activeSlide?.source === 'banner' && activeSlide.targetUrl ? (
                <>Visit Now <ArrowUpRight size={16} /></>
              ) : (
                <><Search size={16} /> Explore Offers</>
              )}
            </motion.button>
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-5">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prev}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-sm">
              <ChevronLeft size={16} />
            </motion.button>
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setCurrent(i); }}
                  className="relative h-1.5 rounded-full transition-all overflow-hidden"
                  style={{ width: i === current ? 24 : 6 }}
                >
                  <span className={`absolute inset-0 rounded-full ${i === current ? 'gradient-bg' : 'bg-white/40'}`} />
                  {i === current && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-white/25 origin-left"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 8, ease: 'linear' }}
                      style={{ transformOrigin: 'left' }}
                    />
                  )}
                </button>
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={next}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-sm">
              <ChevronRight size={16} />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
