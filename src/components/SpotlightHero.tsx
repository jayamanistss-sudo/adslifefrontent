import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Volume2, VolumeX, MapPin } from 'lucide-react';
import { api, endpoints } from '../utils/api';

interface Spotlight {
  id: number;
  videoUrl: string;
  title: string;
  tagline?: string;
  businessName: string;
  city?: string;
  category?: string;
  vendorLogo?: string;
}

interface Props {
  readonly onExplore: () => void;
}

function mapSpotlight(s: Record<string, unknown>): Spotlight {
  return {
    id:           s.id as number,
    videoUrl:     s.video_url as string,
    title:        s.title as string,
    tagline:      s.tagline as string | undefined,
    businessName: s.business_name as string,
    city:         s.city as string | undefined,
    category:     s.category as string | undefined,
    vendorLogo:   s.vendor_logo as string | undefined,
  };
}

const DEFAULT_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4';

export default function SpotlightHero({ onExplore }: Props) {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get(endpoints.spotlightActive)
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          setSpotlights(res.data.data.map(mapSpotlight));
        }
      })
      .catch(() => {});
  }, []);

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (spotlights.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % spotlights.length);
    }, 8000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [spotlights.length]);

  // Restart video on slide change
  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
  }, [current]);

  const activeVideo = spotlights[current]?.videoUrl ?? DEFAULT_VIDEO;
  const activeSpot  = spotlights[current];

  const prev = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent((c) => (c - 1 + spotlights.length) % spotlights.length);
  };
  const next = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent((c) => (c + 1) % spotlights.length);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden mb-8 h-[340px] sm:h-[420px] bg-dark">

      {/* Background video */}
      <video
        ref={videoRef}
        key={activeVideo}
        src={activeVideo}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted={muted}
        playsInline
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

      {/* Mute toggle */}
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Spotlight badge */}
      {activeSpot && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-primary/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Featured Spotlight
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
            {activeSpot && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {activeSpot.vendorLogo
                    ? <img src={activeSpot.vendorLogo} alt="" className="w-full h-full object-cover" />
                    : activeSpot.businessName[0]}
                </div>
                <span className="text-white/80 text-xs font-medium">{activeSpot.businessName}</span>
                {activeSpot.city && (
                  <span className="flex items-center gap-0.5 text-white/60 text-xs">
                    <MapPin size={10} /> {activeSpot.city}
                  </span>
                )}
              </div>
            )}

            <h1 className="font-heading font-extrabold text-2xl sm:text-4xl text-white leading-tight mb-2">
              {activeSpot ? activeSpot.title : (
                <>Discover Today's Best<br />Offers <span className="text-primary">Near You</span></>
              )}
            </h1>

            <p className="text-white/70 text-sm sm:text-base mb-5 max-w-lg">
              {activeSpot?.tagline ?? 'All the deals from shops around you — in one place. Stop scrolling multiple apps!'}
            </p>

            <button
              onClick={onExplore}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-primary/30 w-fit"
            >
              <Search size={16} />
              Explore Offers
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Dots + arrows */}
        {spotlights.length > 1 && (
          <div className="flex items-center gap-3 mt-5">
            <button onClick={prev} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1.5">
              {spotlights.map((_, i) => (
                <button
                  key={i}
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
