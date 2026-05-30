import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, MousePointer, Bookmark, Trash2, Star, ToggleLeft, ToggleRight } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface Category { slug: string; name: string; }

interface OfferRow {
  id: number; title: string; category: string; discount_percent: string;
  original_price: string; offer_price: string; is_active: number;
  views: number; clicks: number; saves: number;
  current_redemptions: number; max_redemptions: number;
  valid_until: string | null; created_at: string;
  business_name: string; vendor_id: number; vendor_email: string;
}

export default function AdminOffers() {
  const [offers, setOffers]   = useState<OfferRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus]   = useState('');
  const [offset, setOffset]   = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const LIMIT = 30;

  useEffect(() => {
    api.get(endpoints.categoriesList(true)).then((r) => {
      if (r.data.success) setCategories(r.data.data ?? []);
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.adminOffers(search, category, status, LIMIT, offset))
      .then((r) => {
        if (r.data.success) { setOffers(r.data.data.offers ?? []); setTotal(r.data.data.total ?? 0); }
      })
      .catch(() => toast.error('Failed to load offers'))
      .finally(() => setLoading(false));
  }, [search, category, status, offset]);

  useEffect(() => { setOffset(0); }, [search, category, status]);
  useEffect(() => { load(); }, [load]);

  const action = async (offerId: number, act: string, extra?: Record<string, unknown>) => {
    if (act === 'delete' && !window.confirm('Delete this offer permanently?')) return;
    try {
      const res = await api.put(endpoints.adminOfferAction(offerId), { action: act, ...extra });
      toast.success(res.data.message);
      load();
    } catch { toast.error('Action failed'); }
  };

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">All Offers</h1>
          <p className="page-subtitle">{total.toLocaleString()} total offers</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 w-full" placeholder="Search title, coupon, vendor…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-36" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="input w-32" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-gray-50/50">
                {['Offer', 'Vendor', 'Category', 'Discount', 'Stats', 'Valid Until', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="py-3 px-4"><div className="skeleton h-4 w-20 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : offers.map((o) => (
                <tr key={o.id} className="border-b border-[var(--border)] hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-[var(--text)] truncate max-w-40">{o.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">ID #{o.id}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-[var(--text)] truncate max-w-32">{o.business_name}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate max-w-32">{o.vendor_email}</p>
                  </td>
                  <td className="py-3 px-4 capitalize text-[var(--text-muted)]">{o.category}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-primary">{o.discount_percent}%</span>
                    <p className="text-xs text-[var(--text-muted)]">₹{o.offer_price}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-0.5"><Eye size={11} /> {o.views}</span>
                      <span className="flex items-center gap-0.5"><MousePointer size={11} /> {o.clicks}</span>
                      <span className="flex items-center gap-0.5"><Bookmark size={11} /> {o.saves}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {o.valid_until ? o.valid_until.slice(0, 10) : '∞'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${o.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                      {o.is_active ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => action(o.id, o.is_active ? 'deactivate' : 'activate')}
                        title={o.is_active ? 'Deactivate' : 'Activate'}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--text-muted)] transition-colors">
                        {o.is_active ? <ToggleRight size={15} className="text-emerald-500" /> : <ToggleLeft size={15} />}
                      </button>
                      <button onClick={() => action(o.id, 'feature', { featured: o.is_active ? 0 : 1 })}
                        title="Feature/Unfeature"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors">
                        <Star size={14} />
                      </button>
                      <button onClick={() => action(o.id, 'delete')}
                        title="Delete"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)]">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="btn btn-secondary btn-sm">Prev</button>
              <button disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
