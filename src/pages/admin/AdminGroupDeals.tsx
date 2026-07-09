/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Users2, Ban } from "lucide-react";
import BackButton from "../../components/BackButton";
import { api, endpoints } from "../../utils/api";
import toast from "react-hot-toast";
import { DataTable, Pagination } from "../../components";
import { type ColDef } from "ag-grid-community";

interface DealRow {
  id: number;
  offer_id: number;
  offer_title: string;
  business_name: string;
  min_members: number;
  max_members: number | null;
  current_members: number;
  status: string;
  expires_at: string;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300",
  fulfilled: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300",
  expired: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  cancelled: "bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400",
};

export default function AdminGroupDeals() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(30);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(endpoints.adminGroupDeals(status, Math.floor(offset / limit) + 1, limit))
      .then((r) => {
        if (r.data.success) {
          setDeals(r.data.data.deals);
          setTotal(r.data.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [status, offset, limit]);

  useEffect(() => { load(); }, [load]);

  const cancelDeal = useCallback(async (row: DealRow) => {
    const note = window.prompt(`Cancel this group deal for "${row.offer_title}"?\n\nReason (optional):`);
    if (note === null) return;
    try {
      const res = await api.post(endpoints.adminGroupDealCancel(row.id), { note: note || undefined });
      toast.success(res.data.message ?? "Cancelled");
      load();
    } catch {
      toast.error("Action failed");
    }
  }, [load]);

  const columnDefs = useMemo<ColDef<DealRow>[]>(
    () => [
      {
        headerName: "Offer",
        field: "offer_title",
        flex: 1.3,
        cellRenderer: (params: any) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="leading-tight">
              <p className="text-[var(--text)] font-medium truncate max-w-40" title={d.offer_title}>{d.offer_title}</p>
              <p className="text-xs text-[var(--text-muted)] truncate max-w-40">{d.business_name}</p>
            </div>
          );
        },
      },
      {
        headerName: "Members",
        field: "current_members",
        flex: 0.9,
        cellRenderer: (params: any) => {
          const d = params.data;
          if (!d) return null;
          return <span className="text-[var(--text)]">{d.current_members} / {d.min_members}{d.max_members ? ` (max ${d.max_members})` : ""}</span>;
        },
      },
      {
        headerName: "Status",
        field: "status",
        flex: 0.8,
        cellRenderer: (params: any) => {
          const d = params.data;
          if (!d) return null;
          return (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[d.status] ?? "bg-[var(--surface-2)] text-[var(--text-muted)]"}`}>
              {d.status}
            </span>
          );
        },
      },
      {
        headerName: "Expires",
        field: "expires_at",
        flex: 1,
        cellRenderer: (params: any) => {
          const d = params.data;
          if (!d) return null;
          return <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{new Date(d.expires_at).toLocaleString()}</span>;
        },
      },
      {
        headerName: "Created",
        field: "created_at",
        flex: 0.9,
        cellRenderer: (params: any) => {
          const d = params.data;
          if (!d) return null;
          return <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{d.created_at.slice(0, 10)}</span>;
        },
      },
      {
        headerName: "Actions",
        field: "id",
        flex: 0.7,
        minWidth: 90,
        cellRenderer: (params: any) => {
          const d = params.data;
          if (!d) return null;
          if (d.status !== "active") return null;
          return (
            <button
              onClick={() => cancelDeal(d)}
              title="Cancel deal"
              className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.08)] text-[var(--text-muted)] hover:text-red-500 transition-colors"
            >
              <Ban size={14} />
            </button>
          );
        },
      },
    ],
    [cancelDeal],
  );

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <Users2 size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="page-title">Group Deals</h1>
            <p className="page-subtitle">{total.toLocaleString()} total deals across the platform</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] self-start mb-5 overflow-x-auto">
        {[
          { value: "", label: "All" },
          { value: "active", label: "Active" },
          { value: "fulfilled", label: "Fulfilled" },
          { value: "expired", label: "Expired" },
          { value: "cancelled", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setOffset(0); }}
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
          ]}
          onPageChange={(p) => setOffset((p - 1) * limit)}
          onPageSizeChanged={(sz) => {
            setLimit(Number(sz));
            setOffset(0);
          }}
        />
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <div className="card overflow-hidden min-w-[700px]">
          <DataTable
            rowData={deals}
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
