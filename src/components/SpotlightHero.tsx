import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Volume2, VolumeX, MapPin, ArrowUpRight } from 'lucide-react';
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
  targetUrl?: string; // banner ads only — external click-through
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

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 8000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  // Restart video on slide change
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
    <div className="relative rounded-2xl overflow-hidden mb-8 h-[340px] sm:h-[420px] bg-dark">

      {/* Background media */}
      {activeMediaType === 'video' ? (
        <video
          ref={videoRef}
          key={activeMediaUrl}
          src={activeMediaUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted={muted}
          playsInline
        />
      ) : (
        <img
          key={activeMediaUrl}
          src={activeMediaUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

      {/* Mute toggle — video slides only */}
      {activeMediaType === 'video' && (
        <button
          onClick={() => setMuted((m) => !m)}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}

      {/* Badge */}
      {activeSlide && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-primary/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {activeSlide.source === 'banner' ? 'Sponsored' : 'Featured Spotlight'}
        </div>
      )}

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            {activeSlide?.businessName && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold overflow-hidden">
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
              </div>
            )}

            <h1 className="font-heading font-extrabold text-2xl sm:text-4xl text-white leading-tight mb-2">
              {activeSlide ? activeSlide.title : (
                <>Discover Today's Best<br />Offers <span className="text-primary">Near You</span></>
              )}
            </h1>

            <p className="text-white/70 text-sm sm:text-base mb-5 max-w-lg">
              {activeSlide?.tagline ?? 'All the deals from shops around you — in one place. Stop scrolling multiple apps!'}
            </p>

            <button
              onClick={handleCta}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-primary/30 w-fit"
            >
              {activeSlide?.source === 'banner' && activeSlide.targetUrl ? (
                <>Visit Now <ArrowUpRight size={16} /></>
              ) : (
                <><Search size={16} /> Explore Offers</>
              )}
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Dots + arrows */}
        {slides.length > 1 && (
          <div className="flex items-center gap-3 mt-5">
            <button onClick={prev} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setCurrent(i); }}
                  className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-primary w-6' : 'bg-white/40 w-1.5'}`}
                />
              ))}
            </div>
            <button onClick={next} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
