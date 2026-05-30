import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Clock, SlidersHorizontal, WifiOff, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import NearbyDropdown from '../components/NearbyDropdown';
import SpotlightHero from '../components/SpotlightHero';
import OfferCard from '../components/OfferCard';
import CategoryIcon from '../components/CategoryIcon';
import { useFeedStore } from '../store/useFeedStore';
import { useUserStore } from '../store/useUserStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { api, endpoints } from '../utils/api';

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

interface Category { id: number; name: string; slug: string; icon: string; }

const FILTER_TABS = [
  { key: 'all',       label: 'All',         icon: null },
  { key: 'trending',  label: 'Trending',    icon: TrendingUp },
  { key: 'flash',     label: 'Flash Sales', icon: Zap },
  { key: 'ending',    label: 'Ending Soon', icon: Clock },
];

export default function Feed() {
  const { user } = useUserStore();
  const { lat, lng } = useGeolocation();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const {
    forYouOffers, trendingOffers, loading,
    activeTab, setTab, loadFeed, loadTrending,
    page, perPage, totalPages, totalOffers, setPerPage,
    search, setSearch,
  } = useFeedStore();

  const [isOnline, setIsOnline]             = useState(globalThis.navigator.onLine);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [offerCount, setOfferCount]         = useState(0);
  const [activeFilter, setActiveFilter]     = useState('all');
  const [nearbyRadius, setNearbyRadius]     = useState(0);
  const [categories, setCategories]         = useState<Category[]>([]);

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

  useEffect(() => {
    api.get(endpoints.categoriesList(true))
      .then(r => setCategories(r.data.data ?? []))
      .catch(() => {});
    api.get(endpoints.feedCount)
      .then(r => { if (r.data.total) setOfferCount(r.data.total); })
      .catch(() => {});
  }, []);

  // Sync ?q= from URL into store and reload page 1
  useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || loading) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (activeTab === 'forYou' && user) loadFeed(user.id, lat, lng, p);
    else loadTrending('Chennai', p);
  };

  const changePerPage = (n: number) => {
    setPerPage(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (activeTab === 'forYou' && user) loadFeed(user.id, lat, lng, 1);
    else loadTrending('Chennai', 1);
  };

  useEffect(() => {
    if (!isOnline) return;
    if (activeTab === 'forYou' && user) {
      loadFeed(user.id, lat, lng, 1);
    } else {
      loadTrending('Chennai', 1);
    }
  }, [activeTab, lat, lng, user?.id, isOnline, search]);

  const apiOffers = (activeTab === 'forYou' && user) ? forYouOffers : trendingOffers;

  const displayOffers = apiOffers.filter(o => {
    if (activeCategory && o.category !== activeCategory) return false;
    if (nearbyRadius > 0 && (o.distance === undefined || o.distance > nearbyRadius)) return false;
    if (activeFilter === 'flash' && (o.discountPercent ?? 0) < 30) return false;
    if (activeFilter === 'ending') {
      if (!o.validUntil) return false;
      const diff = new Date(o.validUntil).getTime() - Date.now();
      if (diff > 86400000 * 2) return false;
    }
    return true;
  });

  return (
    <div className="pb-20 sm:pb-6">

      {/* Guest banner */}
      {!user && (
        <div className="mb-4 bg-gradient-to-r from-primary/10 to-orange-50 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Sign in to save offers & earn rewards</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Join free — unlock saves, coins & leaderboard</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link to="/login" className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
              <LogIn size={13} /> Login
            </Link>
            <Link to="/register" className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="mb-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-2.5 flex items-center gap-2 text-[#78350F] text-sm">
          <WifiOff size={16} />
          <span>You are offline — some features may be unavailable</span>
        </div>
      )}

      {/* Hero — spotlight video carousel */}
      <SpotlightHero onExplore={() => setTab('trending')} />

      {/* Browse Categories */}
      <div className="mb-6">
        <h2 className="font-heading font-bold text-[var(--text)] text-lg mb-4">Browse Categories</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(activeCategory === cat.slug ? null : cat.slug)}
              className={`category-chip ${activeCategory === cat.slug ? 'active' : ''}`}
            >
              <CategoryIcon name={cat.icon} size={22} />
              <span className="text-[10px] font-medium text-[var(--text-secondary)] text-center leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter tabs + sort */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`filter-tab ${activeFilter === key ? 'active' : ''}`}
            >
              {Icon && <Icon size={13} />}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <NearbyDropdown radius={nearbyRadius} onChange={setNearbyRadius} />
          <button
            onClick={() => setTab(activeTab === 'forYou' ? 'trending' : 'forYou')}
            className="filter-tab"
          >
            <SlidersHorizontal size={13} />
            {activeTab === 'forYou' ? 'For You' : 'Trending'}
          </button>
        </div>
      </div>

      {/* Offers heading + per-page selector */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-heading font-bold text-[var(--text)] text-lg">
            {search ? `Results for "${search}"` : 'All Offers'}
          </h2>
          <span className="badge badge-primary">
            {totalOffers > 0 ? totalOffers : offerCount} offers
          </span>
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

      {/* Offers grid */}
      {displayOffers.length === 0 && !loading ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <div className="text-5xl mb-4">🎁</div>
          <p className="font-heading font-semibold text-[var(--text-secondary)] mb-1">No offers found</p>
          <p className="text-sm">Try a different category or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayOffers.map((offer, i) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <OfferCard offer={offer} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Skeleton — initial load */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: perPage > 20 ? 8 : 4 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton h-44 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination bar */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
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
