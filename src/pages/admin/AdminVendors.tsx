/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, CheckCircle, XCircle, PauseCircle, Tag, Eye } from "lucide-react";
import BackButton from "../../components/BackButton";
import { useNavigate } from "react-router-dom";
import { api, endpoints } from "../../utils/api";
import toast from "react-hot-toast";
import { DataTable, Pagination } from "../../components";
import { type ColDef } from "ag-grid-community";
import { usePlansStore } from "../../store/usePlansStore";

interface VendorRow {
  id: number;
  business_name: string;
  category: string;
  city: string;
  status: string;
  subscription_plan: string;
  plan_expires_at: string | null;
  total_followers: number;
  created_at: string;
  email: string;
  user_id: number;
  user_active: number;
  total_offers: number;
  active_offers: number;
  total_views: number;
  total_clicks: number;
}



export default function AdminVendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(30);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkPlan, setBulkPlan] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const { plans, fetchPlans } = usePlansStore();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const planOptions = useMemo(() => {
    return ["", ...plans.map((p) => p.slug)];
  }, [plans]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(endpoints.adminVendors(search, status, plan, limit, offset))
      .then((r) => {
        if (r.data.success) {
          setVendors(r.data.data.vendors);
          setTotal(r.data.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [search, status, plan, limit, offset]);

  useEffect(() => {
    setOffset(0);
    setSelectedIds([]);
    setBulkPlan("");
  }, [search, status, plan]);

  useEffect(() => {
    load();
  }, [load]);

  const action = useCallback(
    async (vendorId: number, act: string, extra?: Record<string, string>) => {
      try {
        const res = await api.put(endpoints.adminVendorAction(vendorId), { action: act, ...extra });
        toast.success(res.data.message);
        load();
      } catch {
        toast.error("Action failed");
      }
    },
    [load],
  );

  const handleSelection = useCallback((selectedRows: VendorRow[]) => {
    setSelectedIds(selectedRows.map((r) => r.id));
  }, []);

  const handleBulkPlanUpdate = useCallback(async () => {
    if (selectedIds.length === 0 || !bulkPlan) return;
    setBulkUpdating(true);
    try {
      const res = await api.put(endpoints.adminVendorsBulkPlan, {
        vendor_ids: selectedIds,
        plan: bulkPlan,
      });
      toast.success(res.data.message || "Bulk plan updated successfully");
      setSelectedIds([]);
      setBulkPlan("");
      load();
    } catch {
      toast.error("Bulk update failed");
    } finally {
      setBulkUpdating(false);
    }
  }, [selectedIds, bulkPlan, load]);

  const statusColor = (s: string) =>
    ({
      approved:       "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300",
      pending_review: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300",
      suspended:      "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-300",
      rejected:       "bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400",
    })[s] ?? "bg-[var(--surface-2)] text-[var(--text-muted)]";

  const columnDefs = useMemo<ColDef<VendorRow>[]>(
    () => [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        maxWidth: 50,
        minWidth: 50,
        suppressSizeToFit: true,
        flex: 0,
        resizable: false,
        sortable: false,
      },
      {
        headerName: "Vendor",
        field: "business_name",
        flex: 1.5,
        cellRenderer: (params: any) => {
          const v = params.data;
          if (!v) return null;
          return (
            <div className="flex items-center gap-2 h-full py-1">
              <div className="w-7 h-7 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold text-xs flex-shrink-0">
                {v.business_name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="font-medium text-[var(--text)] truncate max-w-32" title={v.business_name}>
                  {v.business_name}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate max-w-32" title={v.email}>
                  {v.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        headerName: "City",
        field: "city",
        flex: 1,
        cellRenderer: (params: any) => {
          const v = params.data;
          if (!v) return null;
          return <span className="text-[var(--text-muted)] capitalize">{v.city || "–"}</span>;
        },
      },
      {
        headerName: "Plan",
        field: "subscription_plan",
        flex: 1.2,
        cellRenderer: (params: any) => {
          const v = params.data;
          if (!v) return null;
          return (
            <div className="flex flex-col justify-center leading-tight py-1 h-full">
              <span className="text-xs font-semibold capitalize text-[var(--text)]">{v.subscription_plan}</span>
              {v.plan_expires_at && (
                <p className="text-xs text-[var(--text-muted)]">exp {v.plan_expires_at.slice(0, 10)}</p>
              )}
            </div>
          );
        },
      },
      {
        headerName: "Offers",
        field: "active_offers",
        flex: 0.8,
        cellRenderer: (params: any) => {
          const v = params.data;
          if (!v) return null;
          return (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Tag size={11} /> {v.active_offers}/{v.total_offers}
            </span>
          );
        },
      },
      {
        headerName: "Reach",
        field: "total_views",
        flex: 1,
        cellRenderer: (params: any) => {
          const v = params.data;
          if (!v) return null;
          return (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Eye size={11} /> {Number(v.total_views).toLocaleString()}
            </span>
          );
        },
      },
      {
        headerName: "Followers",
        field: "total_followers",
        flex: 0.8,
        cellRenderer: (params: any) => {
          const v = params.data;
          if (!v) return null;
          return <span className="text-[var(--text-muted)]">{v.total_followers}</span>;
        },
      },
      {
        headerName: "Joined",
        field: "created_at",
        flex: 1,
        cellRenderer: (params: any) => {
          const v = params.data;
          if (!v) return null;
          return (
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{v.created_at.slice(0, 10)}</span>
          );
        },
      },
      {
        headerName: "Status",
        field: "status",
        flex: 1,
        cellRenderer: (params: any) => {
          const v = params.data;
          if (!v) return null;
          return (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(v.status)}`}>
              {v.status.replace("_", " ")}
            </span>
          );
        },
      },
      {
        headerName: "Actions",
        field: "id",
        flex: 1.2,
        cellRenderer: (params: any) => {
          const v = params.data;
          if (!v) return null;
          return (
            <div className="flex items-center gap-1 h-full py-1">
              <button
                onClick={() => navigate(`/admin/vendors/${v.id}`)}
                title="View details"
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
              >
                <Eye size={14} />
              </button>
              {v.status !== "approved" && (
                <button
                  onClick={() => action(v.id, "approve")}
                  title="Approve"
                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                >
                  <CheckCircle size={14} />
                </button>
              )}
              {v.status === "approved" && (
                <button
                  onClick={() => action(v.id, "suspend")}
                  title="Suspend"
                  className="p-1.5 rounded-lg hover:bg-[var(--primary-light)] text-[var(--primary)] transition-colors"
                >
                  <PauseCircle size={14} />
                </button>
              )}
              {v.status !== "rejected" && v.status === "pending_review" && (
                <button
                  onClick={() => action(v.id, "reject")}
                  title="Reject"
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [action, plans],
  );

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">{total.toLocaleString()} total vendors</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Search & Plan Dropdown */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className="input pl-8 w-full"
              placeholder="Search business name, email, city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Plan filter (custom styled select) */}
          <div className="relative w-full sm:w-48">
            <select
              className="input pr-10 w-full appearance-none cursor-pointer bg-[var(--surface)] text-[var(--text)] border-[1.5px] border-[var(--border)] rounded-xl"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              {planOptions.map((p) => (
                <option key={p} value={p}>
                  {p ? (p.charAt(0).toUpperCase() + p.slice(1)) : "All plans"}
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
        <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] overflow-x-auto overflow-y-hidden scrollbar-none max-w-full">
          {[
            { value: "", label: "All Status" },
            { value: "approved", label: "Approved" },
            { value: "pending_review", label: "Pending" },
            { value: "suspended", label: "Suspended" },
            { value: "rejected", label: "Rejected" },
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

      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="text-xs text-[var(--text-muted)]">
          Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + limit, total)} of {total}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1 rounded-xl text-xs">
              <span className="font-semibold text-[var(--text)]">{selectedIds.length} selected</span>
              <div className="h-3 w-px bg-[var(--border-strong)] mx-1" />
              <span className="text-[var(--text-secondary)]">Change plan to:</span>
              <select
                className="bg-transparent border border-[var(--border)] rounded-lg px-2 py-0.5 text-[var(--text)] outline-none cursor-pointer text-xs"
                value={bulkPlan}
                onChange={(e) => setBulkPlan(e.target.value)}
              >
                <option value="">Select Plan...</option>
                {plans.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              {bulkPlan && (
                <button
                  onClick={handleBulkPlanUpdate}
                  disabled={bulkUpdating}
                  className="bg-primary text-white font-semibold px-2 py-0.5 rounded-lg hover:opacity-90 transition-opacity text-xs"
                >
                  {bulkUpdating ? "Saving..." : "Update"}
                </button>
              )}
            </div>
          )}

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
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
      <div className="card overflow-hidden min-w-[600px]">
        <DataTable
          rowData={vendors}
          columnDefs={columnDefs}
          domLayout="autoHeight"
          rowHeight={56}
          headerHeight={44}
          loading={loading}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          onSelection={handleSelection}
        />
      </div>
      </div>
    </div>
  );
}
