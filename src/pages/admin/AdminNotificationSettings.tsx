import { useEffect, useState } from "react";
import { Bell, Mail, Smartphone, MessageSquare } from "lucide-react";
import { api, endpoints } from "../../utils/api";
import toast from "react-hot-toast";
import BackButton from "../../components/BackButton";

interface NotificationSetting {
  id: number;
  activity_type: string;
  category: string;
  label: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
}

type Channel = "email_enabled" | "push_enabled" | "in_app_enabled";

function Toggle({ on, onChange, label }: { readonly on: boolean; readonly onChange: () => void; readonly label: string }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${on ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
      style={{ height: "22px" }}
    >
      <span
        className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(20px)" : "translateX(2px)" }}
      />
    </button>
  );
}

export default function AdminNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);

  useEffect(() => {
    api.get(endpoints.adminNotificationSettings)
      .then((r) => { if (r.data.success) setSettings(r.data.data); })
      .catch(() => toast.error("Failed to load notification settings"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (row: NotificationSetting, channel: Channel) => {
    const next = !row[channel];
    const prev = settings;
    setSettings((s) => s.map((r) => r.activity_type === row.activity_type ? { ...r, [channel]: next } : r));
    setSavingType(row.activity_type);
    try {
      const r = await api.put(endpoints.adminNotificationSettingUpdate(row.activity_type), { [channel]: next });
      if (!r.data.success) throw new Error(r.data.error);
    } catch (err: any) {
      setSettings(prev); // revert on failure
      toast.error(err?.response?.data?.error ?? err?.message ?? "Failed to update");
    } finally {
      setSavingType(null);
    }
  };

  const grouped = settings.reduce<Record<string, NotificationSetting[]>>((acc, row) => {
    (acc[row.category] ??= []).push(row);
    return acc;
  }, {});

  if (loading) return (
    <div className="max-w-3xl pb-6">
      <BackButton to="/admin/dashboard" />
      <div className="space-y-3 mt-6">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl pb-6">
      <BackButton to="/admin/dashboard" />

      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-light)" }}>
            <Bell size={20} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h1 className="page-title">Notification Settings</h1>
            <p className="page-subtitle">Choose which channels each activity is allowed to use</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 mb-4 px-1 text-xs font-semibold text-[var(--text-muted)]">
        <span className="flex-1" />
        <span className="w-10 flex items-center gap-1"><Mail size={13} /> Email</span>
        <span className="w-10 flex items-center gap-1"><Smartphone size={13} /> Push</span>
        <span className="w-10 flex items-center gap-1"><MessageSquare size={13} /> In-app</span>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, rows]) => (
          <div key={category}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">{category}</h2>
            <div className="card divide-y divide-[var(--border)]">
              {rows.map((row) => (
                <div key={row.activity_type} className="flex items-center gap-5 px-4 py-3">
                  <span className={`flex-1 text-sm text-[var(--text)] ${savingType === row.activity_type ? "opacity-50" : ""}`}>
                    {row.label}
                  </span>
                  <span className="w-10 flex justify-start">
                    <Toggle on={row.email_enabled} onChange={() => toggle(row, "email_enabled")} label={`Email for ${row.label}`} />
                  </span>
                  <span className="w-10 flex justify-start">
                    <Toggle on={row.push_enabled} onChange={() => toggle(row, "push_enabled")} label={`Push for ${row.label}`} />
                  </span>
                  <span className="w-10 flex justify-start">
                    <Toggle on={row.in_app_enabled} onChange={() => toggle(row, "in_app_enabled")} label={`In-app for ${row.label}`} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
