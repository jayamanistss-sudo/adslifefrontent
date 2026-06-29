/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Ban, CheckCircle, Trash2 } from "lucide-react";
import BackButton from "../../components/BackButton";
import { api, endpoints } from "../../utils/api";
import toast from "react-hot-toast";
import { DataTable, Pagination } from "../../components";
import { type ColDef } from "ag-grid-community";

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  city: string;
  streak_days: number;
  is_active: number;
  created_at: string;
  last_login: string | null;
  login_count: number;
  interactions: number;
  follows: number;
}



export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(30);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(endpoints.adminUsers(search, status, limit, offset))
      .then((r) => {
        if (r.data.success) {
          setUsers(r.data.data.users);
          setTotal(r.data.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [search, status, limit, offset]);

  useEffect(() => {
    setOffset(0);
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const action = useCallback(
    async (userId: number, act: string, extra?: Record<string, string>) => {
      try {
        const res = await api.put(endpoints.adminUserAction(userId), { action: act, ...extra });
        toast.success(res.data.message);
        load();
      } catch {
        toast.error("Action failed");
      }
    },
    [load],
  );

  const columnDefs = useMemo<ColDef<UserRow>[]>(
    () => [
      {
        headerName: "User",
        field: "name",
        flex: 1.5,
        cellRenderer: (params: any) => {
          const u = params.data;
          if (!u) return null;
          return (
            <div className="flex items-center gap-2 h-full py-1">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                {u.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="font-medium text-[var(--text)] truncate max-w-32" title={u.name}>
                  {u.name}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate max-w-32" title={u.email}>
                  {u.email}
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
          const u = params.data;
          if (!u) return null;
          return <span className="text-[var(--text-muted)] capitalize">{u.city || "–"}</span>;
        },
      },
      {
        headerName: "Interactions",
        field: "interactions",
        flex: 1,
        cellRenderer: (params: any) => {
          const u = params.data;
          if (!u) return null;
          return <span className="text-[var(--text-muted)]">{u.interactions}</span>;
        },
      },
      {
        headerName: "Logins",
        field: "login_count",
        flex: 1,
        cellRenderer: (params: any) => {
          const u = params.data;
          if (!u) return null;
          return <span className="text-[var(--text-muted)]">{u.login_count}</span>;
        },
      },
      {
        headerName: "Joined",
        field: "created_at",
        flex: 1,
        cellRenderer: (params: any) => {
          const u = params.data;
          if (!u) return null;
          return (
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{u.created_at.slice(0, 10)}</span>
          );
        },
      },
      {
        headerName: "Status",
        field: "is_active",
        flex: 1,
        cellRenderer: (params: any) => {
          const u = params.data;
          if (!u) return null;
          return (
            <div className="flex items-center h-full py-1">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300" : "bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400"}`}
              >
                {u.is_active ? "Active" : "Banned"}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Actions",
        field: "id",
        flex: 0.8,
        minWidth: 90,
        cellRenderer: (params: any) => {
          const u = params.data;
          if (!u) return null;
          return (
            <div className="flex items-center gap-1 h-full py-1">
              {u.is_active ? (
                <button
                  onClick={() => action(u.id, "ban")}
                  title="Ban"
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                >
                  <Ban size={14} />
                </button>
              ) : (
                <button
                  onClick={() => action(u.id, "unban")}
                  title="Unban"
                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                >
                  <CheckCircle size={14} />
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${u.name}?`)) action(u.id, "delete");
                }}
                title="Delete"
                className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.08)] text-[var(--text-muted)] hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    [action],
  );

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{total.toLocaleString()} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="input pl-8 w-full"
            placeholder="Search name, email, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] self-start sm:self-auto">
          {[
            { value: "", label: "All Users" },
            { value: "active", label: "Active" },
            { value: "banned", label: "Banned" },
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
          rowData={users}
          columnDefs={columnDefs}
          domLayout="autoHeight"
          rowHeight={56}
          headerHeight={44}
          loading={loading}
          getRowClass={(params: any) => {
            if (params.data && !params.data.is_active) {
              return "opacity-70";
            }
            return "";
          }}
        />
      </div>
      </div>
    </div>
  );
}
