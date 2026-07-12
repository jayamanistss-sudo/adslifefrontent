/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CreditCard } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';
import { DataTable, Pagination } from '../../components';
import { type ColDef } from 'ag-grid-community';

// No vendor-facing payment history existed anywhere — a vendor had no way
// to see their own plan/banner-ad payments without asking an admin.

interface PaymentRow {
  id: number; order_id: string; amount: string;
  status: string; purpose: string; reference_type: string;
  paid_at: string | null; created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300',
  pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300',
  failed: 'bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400',
  refunded: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
};

export default function VendorPayments() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(30);

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.vendorPayments(status, Math.floor(offset / limit) + 1, limit))
      .then((r) => {
        if (r.data.success) {
          setPayments(r.data.data.payments ?? []);
          setTotal(r.data.data.total ?? 0);
        }
      })
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false));
  }, [status, offset, limit]);

  useEffect(() => { setOffset(0); }, [status]);
  useEffect(() => { load(); }, [load]);

  const totalPaid = useMemo(
    () => payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
    [payments],
  );

  const columnDefs = useMemo<ColDef<PaymentRow>[]>(
    () => [
      {
        headerName: 'Order ID',
        field: 'order_id',
        flex: 1.3,
        cellRenderer: (params: any) => {
          const p = params.data;
          if (!p) return null;
          return <span className="font-mono text-xs text-[var(--text-muted)]">{p.order_id}</span>;
        },
      },
      {
        headerName: 'Purpose',
        field: 'purpose',
        flex: 1,
        cellRenderer: (params: any) => {
          const p = params.data;
          if (!p) return null;
          return <span className="text-[var(--text-muted)] capitalize">{p.purpose?.replace(/_/g, ' ')}</span>;
        },
      },
      {
        headerName: 'Amount',
        field: 'amount',
        flex: 0.9,
        cellRenderer: (params: any) => {
          const p = params.data;
          if (!p) return null;
          return <span className="font-semibold text-[var(--text)]">₹{Number(p.amount).toLocaleString()}</span>;
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        flex: 0.9,
        cellRenderer: (params: any) => {
          const p = params.data;
          if (!p) return null;
          return (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[p.status] ?? 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
              {p.status}
            </span>
          );
        },
      },
      {
        headerName: 'Date',
        field: 'created_at',
        flex: 1,
        cellRenderer: (params: any) => {
          const p = params.data;
          if (!p) return null;
          return <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</span>;
        },
      },
    ],
    [],
  );

  return (
    <div className="pb-8">
      <BackButton to="/vendor/dashboard" />
      <div className="page-header mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <CreditCard size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="page-title">Payments</h1>
            <p className="page-subtitle">{total.toLocaleString()} total transactions{totalPaid ? ` — ₹${totalPaid.toLocaleString()} paid on this page` : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] self-start overflow-x-auto mb-5 w-fit">
        {[
          { value: '', label: 'All' },
          { value: 'paid', label: 'Paid' },
          { value: 'pending', label: 'Pending' },
          { value: 'failed', label: 'Failed' },
          { value: 'refunded', label: 'Refunded' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              status === tab.value
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)] border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="text-xs text-[var(--text-muted)]">
          Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + limit, total)} of {total}
        </div>
        <Pagination
          page={Math.floor(offset / limit) + 1}
          totalPages={Math.ceil(total / limit) || 1}
          currentPageSize={limit}
          pageSizeOptions={[
            { value: '10', label: '10' },
            { value: '30', label: '30' },
            { value: '50', label: '50' },
          ]}
          onPageChange={(p) => setOffset((p - 1) * limit)}
          onPageSizeChanged={(sz) => { setLimit(Number(sz)); setOffset(0); }}
        />
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <div className="card overflow-hidden min-w-[600px]">
          <DataTable
            rowData={payments}
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
