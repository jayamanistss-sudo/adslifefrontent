/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Star, ArrowUp, ArrowDown, X, Search, Plus } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

// is_featured was a flat boolean with no scheduling window, manual ordering,
// or dedicated screen — just a star icon buried in the all-offers grid.

interface FeaturedOffer {
  id: number; title: string; business_name: string;
  featured_start_at: string | null; featured_until: string | null;
  featured_order: number;
}

interface SearchResult {
  id: number; title: string; business_name: string; is_featured: number;
}

export default function AdminFeaturedOffers() {
  const [offers, setOffers] = useState<FeaturedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.adminFeaturedOffers)
      .then((r) => { if (r.data.success) setOffers(r.data.data ?? []); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.get(endpoints.adminOffers(search, '', 'active', 10, 0))
        .then((r) => { if (r.data.success) setResults(r.data.data.offers ?? []); })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const addFeatured = async (offer: SearchResult) => {
    try {
      await api.put(endpoints.adminSetFeatured(offer.id), { featured: true });
      toast.success(`"${offer.title}" is now featured`);
      setSearch('');
      setResults([]);
      load();
    } catch { toast.error('Failed'); }
  };

  const removeFeatured = async (offer: FeaturedOffer) => {
    if (!window.confirm(`Remove "${offer.title}" from Featured?`)) return;
    try {
      await api.put(endpoints.adminSetFeatured(offer.id), { featured: false });
      toast.success('Removed from Featured');
      load();
    } catch { toast.error('Failed'); }
  };

  const updateDates = async (offer: FeaturedOffer, field: 'featured_start_at' | 'featured_until', value: string) => {
    try {
      await api.put(endpoints.adminSetFeatured(offer.id), {
        featured: true,
        featured_start_at: field === 'featured_start_at' ? value : offer.featured_start_at,
        featured_until: field === 'featured_until' ? value : offer.featured_until,
      });
      load();
    } catch { toast.error('Failed to update dates'); }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const newOrder = [...offers];
    const target = index + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setOffers(newOrder);
    try {
      await api.put(endpoints.adminReorderFeatured, { ordered_ids: newOrder.map((o) => o.id) });
    } catch { toast.error('Reorder failed'); load(); }
  };

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <Star size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="page-title">Featured Offers</h1>
            <p className="page-subtitle">{offers.length} currently featured — drives a +5% feed-ranking boost while active</p>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-5">
        <p className="text-xs font-semibold text-[var(--text)] mb-2">Add an offer to Featured</p>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="input pl-8 w-full"
            placeholder="Search active offers by title or vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search.trim() && (
          <div className="mt-2 border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {searching ? (
              <div className="p-3 text-xs text-[var(--text-muted)]">Searching…</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-xs text-[var(--text-muted)]">No matching active offers</div>
            ) : (
              results.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2.5 hover:bg-[var(--surface-2)]">
                  <div className="text-xs">
                    <p className="font-medium text-[var(--text)]">{r.title}</p>
                    <p className="text-[var(--text-muted)]">{r.business_name}</p>
                  </div>
                  {r.is_featured ? (
                    <span className="text-[10px] text-[var(--text-muted)]">Already featured</span>
                  ) : (
                    <button onClick={() => addFeatured(r)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Add to Featured">
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-10 text-center text-[var(--text-muted)] text-sm">Loading…</div>
      ) : offers.length === 0 ? (
        <div className="card p-10 text-center text-[var(--text-muted)] text-sm">No offers featured yet — search above to add one</div>
      ) : (
        <div className="space-y-2.5">
          {offers.map((o, i) => (
            <div key={o.id} className="card p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-0.5">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 text-[var(--text-muted)]">
                      <ArrowUp size={13} />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === offers.length - 1} className="p-1 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 text-[var(--text-muted)]">
                      <ArrowDown size={13} />
                    </button>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)] text-sm">{o.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{o.business_name}</p>
                  </div>
                </div>
                <button onClick={() => removeFeatured(o)} title="Remove from Featured" className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide block mb-1">Start (optional)</label>
                  <input
                    type="date" className="input text-xs py-1"
                    value={o.featured_start_at?.slice(0, 10) ?? ''}
                    onChange={(e) => updateDates(o, 'featured_start_at', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide block mb-1">End (optional — indefinite if blank)</label>
                  <input
                    type="date" className="input text-xs py-1"
                    value={o.featured_until?.slice(0, 10) ?? ''}
                    onChange={(e) => updateDates(o, 'featured_until', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
