import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Zap, Clock, WifiOff, LogIn, ChevronLeft, ChevronRight,
  LayoutGrid, List, X, SlidersHorizontal, ChevronDown, Eye, Bookmark, MapPin,
  Flame, Tag, Plus,
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import PullToRefresh from '../components/ui/PullToRefresh';
import NearbyDropdown from '../components/NearbyDropdown';
import OfferCard from '../components/OfferCard';
import CategoryIcon from '../components/CategoryIcon';
import SpotlightHero from '../components/SpotlightHero';
import { useUserStore } from '../store/useUserStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOffers, useCategories, type Category } from '../powersync/queries';
import { api, endpoints } from '../utils/api';
import type { Offer } from '../types';

const CATEGORY_GRADIENTS = [
  'from-blue-400 to-indigo-600', 'from-pink-400 to-rose-500',
  'from-amber-400 to-yellow-600', 'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600', 'from-orange-400 to-red-500',
];
const gradientFor = (i: number) => CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length];

const FILTER_TABS = [
  { key: 'all',      label: 'All',         icon: LayoutGrid },
  { key: 'trending', label: 'Trending',    icon: TrendingUp },
  { key: 'flash',    label: 'Flash Sales', icon: Zap },
  { key: 'ending',   label: 'Ending Soon', icon: Clock },
];

const SORT_OPTIONS = [
  { key: 'default',  label: 'Recommended' },
  { key: 'discount', label: 'Highest Discount' },
  { key: 'views',    label: 'Most Popular' },
];

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
    vendorLat: o.vlat ? Number.parseFloat(o.vlat) : undefined, vendorLng: o.vlng ? Number.parseFloat(o.vlng) : undefined,
    distance: o.distance === undefined ? undefined : Number.parseFloat(o.distance),
  };
}

function timeLeft(until: string | undefined): string | null {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

export default function Feed() {
  const { user } = useUserStore();
  const { lat, lng } = useGeolocation();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [isOnline, setIsOnline]             = useState(globalThis.navigator.onLine);
  const [activeFilter, setActiveFilter]     = useState('all');
  const [nearbyRadius, setNearbyRadius]     = useState(0);
  const [search, setSearch]                 = useState(urlQuery);
  const [sortKey, setSortKey]               = useState('default');
  const [page, setPage]                     = useState(1);
  const [perPage]                           = useState(20);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [apiOffers, setApiOffers]           = useState<Offer[]>([]);
  const [apiCategories, setApiCategories]   = useState<Category[]>([]);
  const [sortOpen, setSortOpen]             = useState(false);
  const [viewMode, setViewMode]             = useState<'list' | 'grid'>('grid');
  const [showMoreCats, setShowMoreCats]     = useState(false);

  const CATS_LIMIT = 8;

  const psOffers     = useOffers(activeCategory);
  const psCategories = useCategories();

  const allOffers     = psOffers.length > 0 ? psOffers : apiOffers;
  const allCategories = psCategories.length > 0 ? psCategories : apiCategories;

  const fetchOffers = async () => {
    setLoading(true); setError(null);
    const cityParam = user?.city || 'Chennai';
    try {
      const r = user
        ? await api.get(endpoints.feed(user.id, lat || 13.08, lng || 80.27, 1, 50, ''))
        : await api.get(endpoints.trending(cityParam, 1, 50, ''));
      if (r.data.success) setApiOffers((r.data.data ?? []).map(mapApiOffer));
    } catch {
      setError('Failed to load offers. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (psOffers.length > 0) return; fetchOffers(); }, [psOffers.length, user?.id]);
  const handleRefresh = async () => { await fetchOffers(); };

  useEffect(() => {
    if (psCategories.length > 0) return;
    api.get(endpoints.categoriesList()).then(r => setApiCategories(r.data.data ?? [])).catch(() => {});
  }, [psCategories.length]);

  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    globalThis.addEventListener('online',  goOnline);
    globalThis.addEventListener('offline', goOffline);
    return () => { globalThis.removeEventListener('online', goOnline); globalThis.removeEventListener('offline', goOffline); };
  }, []);

  useEffect(() => { setSearch(urlQuery); setPage(1); }, [urlQuery]);

  const displayOffers = allOffers
    .filter((o: Offer) => {
      if (activeCategory && o.category !== activeCategory) return false;
      if (search && !o.title.toLowerCase().includes(search.toLowerCase()) &&
          !o.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (nearbyRadius > 0 && lat && lng && o.vendorLat && o.vendorLng) {
        const d = Math.sqrt(Math.pow((o.vendorLat - lat) * 111, 2) + Math.pow((o.vendorLng - lng) * 111, 2));
        if (d > nearbyRadius) return false;
      }
      if (activeFilter === 'flash'   && (o.discountPercent ?? 0) < 30) return false;
      if (activeFilter === 'trending') return (o.views ?? 0) > 100;
      if (activeFilter === 'ending') {
        if (!o.validUntil) return false;
        if (new Date(o.validUntil).getTime() - Date.now() > 86400000 * 2) return false;
      }
      return true;
    })
    .sort((a: Offer, b: Offer) => {
      if (sortKey === 'discount') return (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (sortKey === 'views')    return (b.views ?? 0) - (a.views ?? 0);
      return 0;
    });

  const totalOffers = displayOffers.length;
  const totalPages  = Math.max(1, Math.ceil(totalOffers / perPage));
  const pagedOffers = displayOffers.slice((page - 1) * perPage, page * perPage);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPage(p);
  };

  const currentSort = SORT_OPTIONS.find(s => s.key === sortKey)!;
  const activeCatObj = allCategories.find(c => c.slug === activeCategory);

  return (
    <PullToRefresh onRefresh={handleRefresh}>

      {/* ── System banners ── */}
      {!user && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-0 py-3 mb-4 rounded-xl border border-[var(--primary-border)] bg-[var(--primary-light)]">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">Sign in to save offers &amp; earn rewards</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 hidden sm:block">Join free — unlock saves, coins &amp; leaderboard</p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Link to="/login"    className="btn btn-primary btn-sm"><LogIn size={13} /> Login</Link>
            <Link to="/register" className="btn btn-secondary btn-sm hidden sm:inline-flex">Sign Up</Link>
          </div>
        </div>
      )}
      {!isOnline && (
        <div className="mb-4 bg-[var(--warning-light)] border border-[rgba(245,158,11,0.2)] rounded-xl px-4 py-2.5 flex items-center gap-2 text-[var(--text-secondary)] text-sm">
          <WifiOff size={15} className="text-amber-500 flex-shrink-0" />
          <span>You are offline — showing cached data</span>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-[var(--danger-light)] border border-[rgba(239,68,68,0.18)] rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
          <span className="text-[var(--text-secondary)]">{error}</span>
          <button onClick={() => { setError(null); globalThis.location.reload(); }}
            className="flex-shrink-0 text-xs font-semibold text-[var(--danger)] underline">Retry</button>
        </div>
      )}

      {/* ── Banner ads carousel (vendor-submitted, approved/live) ── */}
      <SpotlightHero onExplore={() => { window.scrollBy({ top: 400, behavior: 'smooth' }); }} />

      {/* ── Category pills (wrapped, with View More) ── */}
      {allCategories.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveCategory(null); setPage(1); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                !activeCategory
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--shadow-primary)]'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]'
              }`}
            >
              <LayoutGrid size={11} /> All
            </button>
            {(showMoreCats ? allCategories : allCategories.slice(0, CATS_LIMIT)).map((cat, i) => {
              const active = activeCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => { setActiveCategory(active ? null : cat.slug); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--shadow-primary)]'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradientFor(i)} flex items-center justify-center flex-shrink-0`}>
                    <CategoryIcon name={cat.icon} size={9} className="text-white" />
                  </span>
                  {cat.name}
                </button>
              );
            })}
            {allCategories.length > CATS_LIMIT && (
              <button
                onClick={() => setShowMoreCats(v => !v)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-dashed border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all"
              >
                {showMoreCats ? (
                  <><ChevronLeft size={11} /> View Less</>
                ) : (
                  <><Plus size={11} /> {allCategories.length - CATS_LIMIT} more</>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Filter + sort bar ── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0 pb-0.5">
          {FILTER_TABS.map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => { setActiveFilter(key); setPage(1); }}
              className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 border transition-colors ${
                activeFilter === key
                  ? 'text-white border-transparent'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}>
              {activeFilter === key && (
                <motion.span layoutId="feedTabPill"
                  className="absolute inset-0 rounded-full gradient-bg shadow-[var(--shadow-primary)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={12} /> {label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <NearbyDropdown radius={nearbyRadius} onChange={setNearbyRadius} />
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 rounded-full hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              <SlidersHorizontal size={12} />
              <span className="hidden sm:inline">{currentSort.label}</span>
              <ChevronDown size={11} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="absolute right-0 top-full mt-1.5 w-44 card z-30 py-1.5 overflow-hidden"
                  style={{ boxShadow: 'var(--shadow-lg)' }}
                >
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.key}
                      onClick={() => { setSortKey(opt.key); setSortOpen(false); setPage(1); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        sortKey === opt.key
                          ? 'text-[var(--primary)] font-semibold bg-[var(--primary-light)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                      }`}>{opt.label}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Result header ── */}
      <div className="flex items-center gap-2 mb-4 px-0.5">
        {activeCategory && (
          <button
            onClick={() => { setActiveCategory(null); setPage(1); }}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-all flex-shrink-0"
          >
            <ChevronLeft size={14} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <span className="font-heading font-bold text-[var(--text)] text-sm truncate capitalize">
            {search
              ? `Results for "${search}"`
              : activeCatObj?.name ?? FILTER_TABS.find(f => f.key === activeFilter)?.label}
          </span>
          <span className="text-xs text-[var(--text-muted)] ml-2">{totalOffers} offers</span>
        </div>
        {search && (
          <button
            onClick={() => { setSearch(''); window.history.pushState({}, '', '/feed'); }}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-[var(--danger)] bg-[var(--danger-light)] border border-[rgba(239,68,68,0.2)] px-2.5 py-1 rounded-full"
          >
            <X size={10} /> Clear
          </button>
        )}

        {/* View toggle */}
        <div className="flex-shrink-0 flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'}`}
            title="Card view"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'}`}
            title="List view"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* ── Loading skeletons ── */}
      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-3 sm:p-4 flex items-center gap-3 sm:gap-4 animate-pulse">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[var(--surface-2)] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[var(--surface-2)] rounded w-1/3" />
                <div className="h-4 bg-[var(--surface-2)] rounded w-3/4" />
                <div className="h-3 bg-[var(--surface-2)] rounded w-1/2" />
              </div>
              <div className="flex-shrink-0 space-y-2 text-right">
                <div className="h-8 w-14 bg-[var(--surface-2)] rounded" />
                <div className="h-3 w-16 bg-[var(--surface-2)] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && pagedOffers.length === 0 && (
        <EmptyState
          icon="🎁"
          title="No offers found"
          description={search ? `No results for "${search}".` : 'No offers match your current filters.'}
          action={
            (activeCategory || search) ? (
              <button className="btn btn-secondary text-sm"
                onClick={() => { setActiveCategory(null); setSearch(''); window.history.pushState({}, '', '/feed'); }}>
                Clear filters
              </button>
            ) : undefined
          }
        />
      )}

      {/* ── Card grid ── */}
      {!loading && pagedOffers.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {pagedOffers.map((offer: Offer, i: number) => (
            <OfferCard key={offer.id} offer={offer} index={i} />
          ))}
        </div>
      )}

      {/* ── Horizontal list ── */}
      {!loading && pagedOffers.length > 0 && viewMode === 'list' && (
        <div className="flex flex-col gap-3">
          {pagedOffers.map((offer: Offer, i: number) => {
            const discount = Math.round(offer.discountPercent ?? 0);
            const expiry   = timeLeft(offer.validUntil);
            const isFlash  = discount >= 40;
            return (
              <motion.div key={offer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28, delay: Math.min(i * 0.03, 0.25) }}
              >
                <Link to={`/offer/${offer.id}`}
                  className="card card-hover flex items-stretch gap-0 overflow-hidden group">

                  {/* ── Discount strip (left edge) ── */}
                  <div className="w-1.5 flex-shrink-0 gradient-bg" />

                  {/* ── Thumbnail ── */}
                  <div className="w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden bg-[var(--surface-2)] m-3 sm:m-4 rounded-xl self-center">
                    {(offer.imageUrl || offer.bannerUrl) ? (
                      <img
                        src={offer.imageUrl || offer.bannerUrl}
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradientFor(i)} flex items-center justify-center`}>
                        <Tag size={22} className="text-white/80" />
                      </div>
                    )}
                  </div>

                  {/* ── Info ── */}
                  <div className="flex-1 min-w-0 py-3 sm:py-4 pr-1">
                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {offer.category && (
                        <span className="badge badge-secondary text-[10px] capitalize">{offer.category}</span>
                      )}
                      {isFlash && (
                        <span className="badge badge-warning text-[10px] flex items-center gap-0.5">
                          <Flame size={9} /> Hot
                        </span>
                      )}
                      {offer.isFeatured && (
                        <span className="badge badge-accent text-[10px]">Featured</span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-heading font-semibold text-sm sm:text-base text-[var(--text)] line-clamp-1 leading-snug">
                      {offer.title}
                    </h3>

                    {/* Business + location */}
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1 line-clamp-1">
                      {offer.vendorCity && <><MapPin size={10} className="flex-shrink-0" /> {offer.vendorCity} · </>}
                      {offer.businessName}
                    </p>

                    {/* Description (desktop) */}
                    {offer.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1 hidden sm:block leading-relaxed">
                        {offer.description}
                      </p>
                    )}

                    {/* Stats row (desktop) */}
                    <div className="hidden sm:flex items-center gap-3 mt-1.5">
                      {(offer.views ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                          <Eye size={11} /> {offer.views?.toLocaleString()}
                        </span>
                      )}
                      {(offer.saves ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                          <Bookmark size={11} /> {offer.saves}
                        </span>
                      )}
                      {expiry && (
                        <span className={`flex items-center gap-1 text-[11px] font-medium ${
                          expiry === 'Expired' ? 'text-[var(--danger)]' : 'text-amber-500'
                        }`}>
                          <Clock size={11} /> {expiry}
                        </span>
                      )}
                      {offer.couponCode && (
                        <span className="text-[11px] font-mono font-bold text-[var(--primary)] bg-[var(--primary-light)] px-1.5 py-0.5 rounded border border-[var(--primary-border)]">
                          {offer.couponCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Price + CTA ── */}
                  <div className="flex flex-col items-end justify-center gap-1.5 px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0 min-w-[80px] sm:min-w-[110px]">
                    {/* Discount % */}
                    <div className="text-xl sm:text-3xl font-extrabold font-heading text-[var(--primary)] leading-none">
                      {discount}%
                    </div>
                    <div className="text-[10px] sm:text-xs text-[var(--text-muted)] text-right leading-tight">
                      {(offer.originalPrice ?? 0) > 0 && (
                        <span className="line-through block">₹{(offer.originalPrice ?? 0).toLocaleString()}</span>
                      )}
                      {(offer.offerPrice ?? 0) > 0 && (
                        <span className="font-bold text-[var(--text)] text-xs sm:text-sm">₹{(offer.offerPrice ?? 0).toLocaleString()}</span>
                      )}
                    </div>
                    <span className="hidden sm:inline-flex btn btn-primary btn-sm text-xs mt-1 group-hover:shadow-[var(--shadow-primary)] transition-shadow">
                      Get Deal
                    </span>
                  </div>

                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          <button onClick={() => goToPage(page - 1)} disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[var(--border)] text-sm font-medium disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
            <ChevronLeft size={15} /> Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-[var(--text-muted)]">…</span>
              ) : (
                <button key={p} onClick={() => goToPage(p as number)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold border transition-colors ${
                    p === page
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  }`}>{p}</button>
              )
            )}
          <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[var(--border)] text-sm font-medium disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

    </PullToRefresh>
  );
}
