import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Zap, Clock, SlidersHorizontal, WifiOff, LogIn, ChevronLeft, ChevronRight, X, LayoutGrid } from 'lucide-react';
import { OfferCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import NearbyDropdown from '../components/NearbyDropdown';
import SpotlightHero from '../components/SpotlightHero';
import OfferCard from '../components/OfferCard';
import CategoryIcon from '../components/CategoryIcon';
import { useUserStore } from '../store/useUserStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOffers, useCategories, type Category } from '../powersync/queries';
import { api, endpoints } from '../utils/api';
import type { Offer } from '../types';

// Categories themselves come live from the API/PowerSync (respecting is_active) —
// this is just a visual palette cycled by index since the DB has no color column.
const CATEGORY_GRADIENTS = [
  'from-blue-400 to-indigo-600',
  'from-pink-400 to-rose-500',
  'from-amber-400 to-yellow-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-green-400 to-lime-500',
  'from-orange-400 to-red-500',
  'from-yellow-400 to-orange-500',
  'from-sky-400 to-cyan-600',
  'from-slate-400 to-slate-600',
];
const gradientFor = (i: number) => CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length];

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

const FILTER_TABS = [
  { key: 'all',       label: 'All',         icon: null },
  { key: 'trending',  label: 'Trending',    icon: TrendingUp },
  { key: 'flash',     label: 'Flash Sales', icon: Zap },
  { key: 'ending',    label: 'Ending Soon', icon: Clock },
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

export default function Feed() {
  const { user } = useUserStore();
  const { lat, lng } = useGeolocation();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [isOnline, setIsOnline]               = useState(globalThis.navigator.onLine);
  const [activeCategory, setActiveCategory]   = useState<string | null>(null);
  const [activeFilter, setActiveFilter]       = useState('all');
  const [nearbyRadius, setNearbyRadius]       = useState(0);
  const [search, setSearch]                   = useState(urlQuery);
  const [perPage, setPerPage]                 = useState(20);
  const [page, setPage]                       = useState(1);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [apiOffers, setApiOffers]             = useState<Offer[]>([]);
  const [apiCategories, setApiCategories]     = useState<Category[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const psOffers     = useOffers(activeCategory);
  const psCategories = useCategories();

  // Use PowerSync data if available, fallback to API
  const allOffers  = psOffers.length > 0 ? psOffers : apiOffers;
  const categories = psCategories.length > 0 ? psCategories : apiCategories;

  // API fallback — only fires when PowerSync has no data yet
  useEffect(() => {
    if (psOffers.length > 0) return;
    setLoading(true);
    setError(null);
    const cityParam = user?.city || 'Chennai';
    const feedPromise = user
      ? api.get(endpoints.feed(user.id, lat || 13.08, lng || 80.27, 1, 50, ''))
      : api.get(endpoints.trending(cityParam, 1, 50, ''));
    feedPromise
      .then(r => { if (r.data.success) setApiOffers((r.data.data ?? []).map(mapApiOffer)); })
      .catch((err) => {
        console.error('[Feed] Failed to load offers:', err);
        setError('Failed to load offers. Please check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, [psOffers.length, user?.id]);

  useEffect(() => {
    if (psCategories.length > 0) return;
    api.get(endpoints.categoriesList()).then(r => setApiCategories(r.data.data ?? [])).catch((err) => {
      console.error('[Feed] Failed to load categories:', err);
    });
  }, [psCategories.length]);

  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    globalThis.addEventListener('online',  goOnline);
    globalThis.addEventListener('offline', goOffline);
    return () => {
      globalThis.removeEventListener('online',  goOnline);
      globalThis.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => { setSearch(urlQuery); setPage(1); }, [urlQuery]);

  const displayOffers = allOffers.filter((o: Offer) => {
    if (activeCategory && o.category !== activeCategory) return false;
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()) &&
        !o.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (nearbyRadius > 0 && lat && lng) {
      if (o.vendorLat && o.vendorLng) {
        const d = Math.sqrt(Math.pow((o.vendorLat - lat) * 111, 2) + Math.pow((o.vendorLng - lng) * 111, 2));
        if (d > nearbyRadius) return false;
      }
    }
    if (activeFilter === 'flash' && (o.discountPercent ?? 0) < 30) return false;
    if (activeFilter === 'ending') {
      if (!o.validUntil) return false;
      const diff = new Date(o.validUntil).getTime() - Date.now();
      if (diff > 86400000 * 2) return false;
    }
    if (activeFilter === 'trending') return (o.views ?? 0) > 100;
    return true;
  });

  const totalOffers = displayOffers.length;
  const totalPages  = Math.max(1, Math.ceil(totalOffers / perPage));
  const pagedOffers = displayOffers.slice((page - 1) * perPage, page * perPage);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPage(p);
  };

  const changePerPage = (n: number) => {
    setPerPage(n);
    setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pb-20 sm:pb-6">

      {/* Guest banner */}
      {!user && (
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 mb-5 rounded-xl border border-[var(--primary-border)] bg-[var(--primary-light)]">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Sign in to save offers &amp; earn rewards</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Join free — unlock saves, coins &amp; leaderboard</p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Link to="/login" className="btn btn-primary btn-sm">
              <LogIn size={13} /> Login
            </Link>
            <Link to="/register" className="btn btn-secondary btn-sm">
              Sign Up
            </Link>
          </div>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="mb-4 bg-[var(--warning-light)] border border-[rgba(245,158,11,0.2)] rounded-xl px-4 py-2.5 flex items-center gap-2 text-[var(--text-secondary)] text-sm">
          <WifiOff size={16} className="text-amber-500 flex-shrink-0" />
          <span>You are offline — showing cached data</span>
        </div>
      )}

      {/* API error banner */}
      {error && (
        <div className="mb-4 bg-[var(--danger-light)] border border-[rgba(239,68,68,0.18)] rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
          <span className="text-[var(--text-secondary)]">{error}</span>
          <button
            onClick={() => { setError(null); globalThis.location.reload(); }}
            className="flex-shrink-0 text-xs font-semibold text-[var(--danger)] underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Hero — spotlight video carousel */}
      <SpotlightHero onExplore={() => setActiveFilter('trending')} />

      {/* Explore Popular Categories - horizontal scroll carousel */}
      <div className="mt-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-[var(--text)] text-lg">Explore Popular Categories</h2>
          <button
            onClick={() => setShowAllCategories(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:opacity-75 transition-opacity"
          >
            <LayoutGrid size={14} /> View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex gap-6 px-1 pt-2 pb-3 -mx-1 overflow-x-auto scrollbar-hide">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.slug}
              onClick={() => { setActiveCategory(activeCategory === cat.slug ? null : cat.slug); setPage(1); }}
              className="explore-cat-item"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.045, type: 'spring', stiffness: 300, damping: 24 }}
            >
              <div className={`explore-cat-circle bg-gradient-to-br ${gradientFor(i)} ${activeCategory === cat.slug ? 'scale-110' : ''}`}>
                <CategoryIcon name={cat.icon} size={28} className="text-white/90" />
                {activeCategory === cat.slug && (
                  <div className="absolute inset-0 rounded-full ring-[3px] ring-[var(--primary)] ring-offset-2 pointer-events-none" />
                )}
              </div>
              <span className={`text-[11px] font-medium text-center whitespace-nowrap transition-colors ${activeCategory === cat.slug ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                {cat.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* All Categories Modal */}
      <AnimatePresence>
        {showAllCategories && (() => {
          return (
            <motion.div
              className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllCategories(false)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[6px]" />

              {/* Sheet */}
              <motion.div
                className="relative w-full sm:max-w-2xxl bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                initial={{ y: 80, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 80, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Drag handle (mobile) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                  <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <div>
                    <h3 className="font-heading font-bold text-[var(--text)] text-lg leading-none">All Categories</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{categories.length} categories available</p>
                  </div>
                  <button
                    onClick={() => setShowAllCategories(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all"
                  >
                    <X size={17} />
                  </button>
                </div>

                {/* Active category hint */}
                {activeCategory && (
                  <div className="flex items-center gap-2 px-6 pt-3">
                    <span className="text-xs text-[var(--text-muted)]">Active filter:</span>
                    <span className="capitalize badge badge-primary">{activeCategory}</span>
                    <button
                      onClick={() => { setActiveCategory(null); setPage(1); setShowAllCategories(false); }}
                      className="text-xs text-[var(--text-muted)] hover:text-red-500 underline transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Categories grid */}
                <div className="px-6 py-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 max-h-[55vh] overflow-y-auto scrollbar-hide">
                  {categories.map((cat, i) => {
                    const isActive = activeCategory === cat.slug;
                    return (
                      <motion.button
                        key={cat.slug}
                        onClick={() => {
                          setActiveCategory(isActive ? null : cat.slug);
                          setPage(1);
                          setShowAllCategories(false);
                        }}
                        className="flex flex-col items-center gap-2 group"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.025, type: 'spring', stiffness: 320, damping: 22 }}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.93 }}
                      >
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradientFor(i)} flex items-center justify-center shadow-md overflow-hidden transition-all duration-200 ${isActive ? 'ring-[3px] ring-[var(--primary)] ring-offset-2 scale-110 shadow-[0_6px_20px_rgba(255,98,0,0.35)]' : 'group-hover:shadow-lg group-hover:scale-105'}`}>
                          <CategoryIcon name={cat.icon} size={28} className="text-white/90" />
                        </div>
                        <span className={`text-[11px] font-medium text-center leading-tight transition-colors ${isActive ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-secondary)] group-hover:text-[var(--text)]'}`}>
                          {cat.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]">
                  <span className="text-xs text-[var(--text-muted)]">
                    {activeCategory ? `Showing offers in "${activeCategory}"` : 'Showing all offers'}
                  </span>
                  <button
                    onClick={() => setShowAllCategories(false)}
                    className="btn btn-primary btn-sm"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Filter tabs + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
          {FILTER_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`filter-tab text-[0.8rem] ${activeFilter === key ? 'active' : 'border-transparent bg-transparent'}`}
            >
              {Icon && <Icon size={13} />}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <NearbyDropdown radius={nearbyRadius} onChange={setNearbyRadius} />
          <button className="filter-tab">
            <SlidersHorizontal size={13} />
            All Offers
          </button>
        </div>
      </div>

      {/* Offers heading + per-page selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading font-bold text-[var(--text)] text-lg">
            {search ? `Results for "${search}"` : 'All Offers'}
          </h2>
          <span className="badge badge-primary">{totalOffers} offers</span>
          {search && (
            <button
              onClick={() => { setSearch(''); window.history.pushState({}, '', '/feed'); }}
              className="text-xs text-[var(--text-muted)] hover:text-red-500 underline"
            >
              Clear search
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span className="hidden sm:inline">Show</span>
          <div className="flex gap-1">
            {PER_PAGE_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => changePerPage(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  perPage === n
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="hidden sm:inline">per page</span>
        </div>
      </div>

      {/* Skeleton */}
      {loading && pagedOffers.length === 0 && (
        <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Offers grid */}
      {!loading && pagedOffers.length === 0 ? (
        <EmptyState
          icon="🎁"
          title="No offers found"
          description={search ? `No results for "${search}". Try a different keyword or clear the filter.` : 'No offers match your current filters. Try a different category.'}
          action={
            (activeCategory || search) ? (
              <button
                className="btn btn-secondary text-sm"
                onClick={() => { setActiveCategory(null); setSearch(''); window.history.pushState({}, '', '/feed'); }}
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : !loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pagedOffers.map((offer: Offer, i: number) => (
            <motion.div
              key={offer.id}
              className="h-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <OfferCard offer={offer} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination bar */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          {/* Prev */}
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[var(--border)] text-sm font-medium disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          {/* Page numbers */}
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
                <button
                  key={p}
                  onClick={() => goToPage(p as number)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold border transition-colors ${
                    p === page
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  }`}
                >
                  {p}
                </button>
              )
            )}

          {/* Next */}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[var(--border)] text-sm font-medium disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            Next <ChevronRight size={16} />
          </button>

          {/* Page info */}
          <span className="text-xs text-[var(--text-muted)] ml-2">
            Page {page} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
