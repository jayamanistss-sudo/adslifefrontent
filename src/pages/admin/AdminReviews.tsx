/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Star, EyeOff, Eye } from "lucide-react";
import BackButton from "../../components/BackButton";
import { api, endpoints } from "../../utils/api";
import toast from "react-hot-toast";
import { DataTable, Pagination } from "../../components";
import { type ColDef } from "ag-grid-community";

interface ReviewRow {
  id: number;
  offer_id: number;
  offer_title: string;
  user_name: string;
  user_email: string;
  rating: number;
  comment: string | null;
  hidden_by_admin: boolean;
  created_at: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(30);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(endpoints.adminReviews(Math.floor(offset / limit) + 1, limit))
      .then((r) => {
        if (r.data.success) {
          setReviews(r.data.data.reviews);
          setTotal(r.data.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [offset, limit]);

  useEffect(() => { load(); }, [load]);

  const toggleHidden = useCallback(async (row: ReviewRow) => {
    try {
      const endpoint = row.hidden_by_admin ? endpoints.adminReviewUnhide(row.id) : endpoints.adminReviewHide(row.id);
      const res = await api.put(endpoint, {});
      toast.success(res.data.message ?? "Done");
      load();
    } catch {
      toast.error("Action failed");
    }
  }, [load]);

  const columnDefs = useMemo<ColDef<ReviewRow>[]>(
    () => [
      {
        headerName: "Offer",
        field: "offer_title",
        flex: 1.2,
        cellRenderer: (params: any) => {
          const r = params.data;
          if (!r) return null;
          return <span className="text-[var(--text)] font-medium truncate" title={r.offer_title}>{r.offer_title}</span>;
        },
      },
      {
        headerName: "Reviewer",
        field: "user_name",
        flex: 1,
        cellRenderer: (params: any) => {
          const r = params.data;
          if (!r) return null;
          return (
            <div className="leading-tight">
              <p className="text-[var(--text)] truncate max-w-32" title={r.user_name}>{r.user_name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate max-w-32" title={r.user_email}>{r.user_email}</p>
            </div>
          );
        },
      },
      {
        headerName: "Rating",
        field: "rating",
        flex: 0.8,
        cellRenderer: (params: any) => {
          const r = params.data;
          if (!r) return null;
          return (
            <span className="flex items-center gap-1 text-amber-500 font-semibold">
              <Star size={13} fill="currentColor" /> {r.rating}
            </span>
          );
        },
      },
      {
        headerName: "Comment",
        field: "comment",
        flex: 2,
        cellRenderer: (params: any) => {
          const r = params.data;
          if (!r) return null;
          return <span className="text-[var(--text-muted)] text-xs truncate" title={r.comment ?? ""}>{r.comment || "—"}</span>;
        },
      },
      {
        headerName: "Posted",
        field: "created_at",
        flex: 0.9,
        cellRenderer: (params: any) => {
          const r = params.data;
          if (!r) return null;
          return <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{r.created_at.slice(0, 10)}</span>;
        },
      },
      {
        headerName: "Status",
        field: "hidden_by_admin",
        flex: 0.8,
        cellRenderer: (params: any) => {
          const r = params.data;
          if (!r) return null;
          return (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              r.hidden_by_admin ? "bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400" : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300"
            }`}>
              {r.hidden_by_admin ? "Hidden" : "Visible"}
            </span>
          );
        },
      },
      {
        headerName: "Actions",
        field: "id",
        flex: 0.8,
        minWidth: 90,
        cellRenderer: (params: any) => {
          const r = params.data;
          if (!r) return null;
          return (
            <button
              onClick={() => {
                if (window.confirm(r.hidden_by_admin ? "Restore this review to public view?" : "Hide this review from public view?")) toggleHidden(r);
              }}
              title={r.hidden_by_admin ? "Unhide" : "Hide"}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              {r.hidden_by_admin ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          );
        },
      },
    ],
    [toggleHidden],
  );

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Reviews</h1>
          <p className="page-subtitle">{total.toLocaleString()} total reviews — hide fake or abusive ones</p>
        </div>
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
            rowData={reviews}
            columnDefs={columnDefs}
            domLayout="autoHeight"
            rowHeight={56}
            headerHeight={44}
            loading={loading}
            getRowClass={(params: any) => (params.data?.hidden_by_admin ? "opacity-60" : "")}
          />
        </div>
      </div>
    </div>
  );
}
