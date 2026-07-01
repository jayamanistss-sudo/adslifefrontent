import BackButton from '../../components/BackButton';
import { useState, useEffect, useRef } from 'react';
import { Map as MapIcon } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { endpoints } from '../../utils/api';
import type { HeatmapPoint } from '../../types';
import { useUserStore } from '../../store/useUserStore';
import { useVendorDashboardPS } from '../../powersync/queries';
import { useCachedApi } from '../../hooks/useCachedApi';

type Days = 7 | 30 | 90;

export default function HeatmapAnalytics() {
  const { user } = useUserStore();
  const ps = useVendorDashboardPS(user?.id ?? 0);
  const vendorId = ps.vendorId > 0 ? ps.vendorId : 0;

  const mapRef     = useRef<L.Map | null>(null);
  const heatRef    = useRef<any>(null);
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const [days, setDays]   = useState<Days>(30);
  const [stats, setStats] = useState({ total: 0, topArea: '', peakHour: 0 });

  // Init map
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    mapRef.current = L.map(mapDivRef.current).setView([13.0827, 80.2707], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    // Vendor pin
    L.marker([13.0827, 80.2707])
      .bindPopup('Your Business')
      .addTo(mapRef.current);
  }, []);

  const { data: heatPoints, loading } = useCachedApi<HeatmapPoint[]>(
    vendorId ? endpoints.heatmap(vendorId, days) : '',
  );

  // Render heatmap layer whenever data or map initialises
  useEffect(() => {
    if (!heatPoints || !mapRef.current) return;
    if (heatRef.current) mapRef.current.removeLayer(heatRef.current);
    const heatData = heatPoints.map((p) => [p.lat, p.lng, p.weight / 50] as [number, number, number]);
    if ((L as any).heatLayer) {
      heatRef.current = (L as any).heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 17 })
        .addTo(mapRef.current);
    } else {
      heatPoints.forEach((p) => {
        L.circle([p.lat, p.lng], { radius: 200, color: '#EA4335', opacity: 0.3, fillOpacity: 0.2 })
          .addTo(mapRef.current!);
      });
    }
    const total = heatPoints.reduce((s, p) => s + p.weight, 0);
    setStats({ total, topArea: 'Chennai Central', peakHour: 18 });
  }, [heatPoints, mapRef.current]);

  return (
    <div className="pb-20 sm:pb-6">
      <BackButton to="/vendor/dashboard" />
      <div className="page-header flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
            <MapIcon size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="page-title">Customer Heatmap</h1>
            <p className="page-subtitle">Where your customers are browsing from</p>
          </div>
        </div>
        <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-xl">
          {([7, 30, 90] as Days[]).map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${days === d ? 'bg-[var(--surface)] shadow text-primary' : 'text-[var(--text-muted)]'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Impressions', value: stats.total.toLocaleString() },
          { label: 'Top Area',          value: stats.topArea || '—' },
          { label: 'Peak Hour',         value: stats.peakHour ? `${stats.peakHour}:00` : '—' },
        ].map((s) => (
          <div key={s.label} className="stat-card items-center text-center p-4">
            <div className="stat-value text-xl">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="card overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-[var(--surface)]/80 z-10 flex items-center justify-center rounded-2xl">
            <div className="text-sm text-[var(--text-muted)]">Loading heatmap...</div>
          </div>
        )}
        <div ref={mapDivRef} className="h-96 w-full" />
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span>Low</span>
        <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-blue-300 via-yellow-400 to-red-500" />
        <span>High</span>
      </div>
    </div>
  );
}
