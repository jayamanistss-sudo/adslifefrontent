/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Eye, MousePointer, Bookmark, Trash2, Star, ToggleLeft, ToggleRight } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';
import { DataTable, Pagination } from "../../components";
import { type ColDef } from "ag-grid-community";

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
  const [limit, setLimit]     = useState(30);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.get(endpoints.categoriesList(true)).then((r) => {
      if (r.data.success) setCategories(r.data.data ?? []);
    }).catch((err) => {
      console.error('[AdminOffers] Failed to load categories:', err);
    });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.adminOffers(search, category, status, limit, offset))
      .then((r) => {
        if (r.data.success) {
          setOffers(r.data.data.offers ?? []);
          setTotal(r.data.data.total ?? 0);
        }
      })
      .catch(() => toast.error('Failed to load offers'))
      .finally(() => setLoading(false));
  }, [search, category, status, limit, offset]);

  useEffect(() => { setOffset(0); }, [search, category, status]);
  useEffect(() => { load(); }, [load]);

  const action = useCallback(
    async (offerId: number, act: string, extra?: Record<string, unknown>) => {
      if (act === 'delete' && !window.confirm('Delete this offer permanently?')) return;
      try {
        const res = await api.put(endpoints.adminOfferAction(offerId), { action: act, ...extra });
        toast.success(res.data.message);
        load();
      } catch {
        toast.error('Action failed');
      }
    },
    [load]
  );

  const columnDefs = useMemo<ColDef<OfferRow>[]>(
    () => [
      {
        headerName: "Offer",
        field: "title",
        flex: 1.5,
        cellRenderer: (params: any) => {
          const o = params.data;
          if (!o) return null;
          return (
            <div className="flex flex-col justify-center leading-tight py-1 h-full">
              <p className="font-medium text-[var(--text)] truncate max-w-40" title={o.title}>
                {o.title}
              </p>
              <p className="text-xs text-[var(--text-muted)]">ID #{o.id}</p>
            </div>
          );
        },
      },
      {
        headerName: "Vendor",
        field: "business_name",
        flex: 1.5,
        cellRenderer: (params: any) => {
          const o = params.data;
          if (!o) return null;
          return (
            <div className="flex flex-col justify-center leading-tight py-1 h-full">
              <p className="text-[var(--text)] truncate max-w-32" title={o.business_name}>
                {o.business_name}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate max-w-32" title={o.vendor_email}>
                {o.vendor_email}
              </p>
            </div>
          );
        },
      },
      {
        headerName: "Category",
        field: "category",
        flex: 1,
        cellRenderer: (params: any) => {
          const o = params.data;
          if (!o) return null;
          return <span className="text-[var(--text-muted)] capitalize">{o.category}</span>;
        },
      },
      {
        headerName: "Discount",
        field: "discount_percent",
        flex: 1,
        cellRenderer: (params: any) => {
          const o = params.data;
          if (!o) return null;
          return (
            <div className="flex flex-col justify-center leading-tight py-1 h-full">
              <span className="font-semibold text-primary">{o.discount_percent}%</span>
              <p className="text-xs text-[var(--text-muted)]">₹{o.offer_price}</p>
            </div>
          );
        },
      },
      {
        headerName: "Stats",
        field: "views",
        flex: 1.2,
        cellRenderer: (params: any) => {
          const o = params.data;
          if (!o) return null;
          return (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] h-full">
              <span className="flex items-center gap-0.5" title="Views">
                <Eye size={11} /> {o.views}
              </span>
              <span className="flex items-center gap-0.5" title="Clicks">
                <MousePointer size={11} /> {o.clicks}
              </span>
              <span className="flex items-center gap-0.5" title="Saves">
                <Bookmark size={11} /> {o.saves}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Valid Until",
        field: "valid_until",
        flex: 1,
        cellRenderer: (params: any) => {
          const o = params.data;
          if (!o) return null;
          return (
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
              {o.valid_until ? o.valid_until.slice(0, 10) : '∞'}
            </span>
          );
        },
      },
      {
        headerName: "Status",
        field: "is_active",
        flex: 1,
        cellRenderer: (params: any) => {
          const o = params.data;
          if (!o) return null;
          return (
            <div className="flex items-center h-full py-1">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  o.is_active ? 'bg-[var(--accent-light)] text-emerald-700 dark:text-emerald-400' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                }`}
              >
                {o.is_active ? 'Active' : 'Off'}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Actions",
        field: "id",
        flex: 1.5,
        minWidth: 120,
        cellRenderer: (params: any) => {
          const o = params.data;
          if (!o) return null;
          return (
            <div className="flex items-center gap-1 h-full py-1">
              <button
                onClick={() => action(o.id, o.is_active ? 'deactivate' : 'activate')}
                title={o.is_active ? 'Deactivate' : 'Activate'}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors"
              >
                {o.is_active ? <ToggleRight size={15} className="text-emerald-500" /> : <ToggleLeft size={15} />}
              </button>
              <button
                onClick={() => action(o.id, 'feature', { featured: o.is_active ? 0 : 1 })}
                title="Feature/Unfeature"
                className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-500 transition-colors"
              >
                <Star size={14} />
              </button>
              <button
                onClick={() => action(o.id, 'delete')}
                title="Delete"
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    [action]
  );

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">All Offers</h1>
          <p className="page-subtitle">{total.toLocaleString()} total offers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Search & Category Dropdown */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className="input pl-8 w-full"
              placeholder="Search title, coupon, vendor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Category filter (custom styled select) */}
          <div className="relative w-full sm:w-48">
            <select
              className="input pr-10 w-full appearance-none cursor-pointer bg-[var(--surface)] text-[var(--text)] border-[1.5px] border-[var(--border)] rounded-xl"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-secondary)]">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Status filter (segmented tab bar) */}
        <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] overflow-x-auto scrollbar-none max-w-full">
          {[
            { value: "", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "expired", label: "Expired" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                status === tab.value
                  ? "bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text)] border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pagination & Count info */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="text-xs text-[var(--text-muted)]">
          Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + limit, total)} of {total}
        </div>

        <Pagination
          page={Math.floor(offset / limit) + 1}
          totalPages={Math.ceil(total / limit) || 1}
          currentPageSize={limit}
          pageSizeOptions={[
            { value: "10", label: "10" },
            { value: "30", label: "30" },
            { value: "50", label: "50" },
            { value: "100", label: "100" },
          ]}
          onPageChange={(p) => setOffset((p - 1) * limit)}
          onPageSizeChanged={(sz) => {
            setLimit(Number(sz));
            setOffset(0);
          }}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
      <div className="card overflow-hidden min-w-[600px]">
        <DataTable
          rowData={offers}
          columnDefs={columnDefs}
          domLayout="autoHeight"
          rowHeight={56}
          headerHeight={44}
          loading={loading}
        />
      </div>
      </div>
    </div>
  );
}
