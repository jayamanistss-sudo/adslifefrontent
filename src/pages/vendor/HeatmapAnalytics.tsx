import BackButton from '../../components/BackButton';
import { useState, useEffect, useRef } from 'react';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, endpoints } from '../../utils/api';
import type { HeatmapPoint } from '../../types';

type Days = 7 | 30 | 90;

export default function HeatmapAnalytics() {
  const mapRef     = useRef<L.Map | null>(null);
  const heatRef    = useRef<any>(null);
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const [days, setDays]   = useState<Days>(30);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, topArea: '', peakHour: 0 });
  const vendorId = 1;

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

  const loadHeatmap = async (d: Days) => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.heatmap(vendorId, d));
      if (res.data.success && mapRef.current) {
        const points: HeatmapPoint[] = res.data.data;

        // Remove old heat layer
        if (heatRef.current) mapRef.current.removeLayer(heatRef.current);

        // Dynamically import leaflet.heat
        const heatData = points.map((p) => [p.lat, p.lng, p.weight / 50] as [number, number, number]);

        if ((L as any).heatLayer) {
          heatRef.current = (L as any).heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 17 })
            .addTo(mapRef.current);
        } else {
          // Fallback: circles
          points.forEach((p) => {
            L.circle([p.lat, p.lng], { radius: 200, color: '#EA4335', opacity: 0.3, fillOpacity: 0.2 })
              .addTo(mapRef.current!);
          });
        }

        const total = points.reduce((s, p) => s + p.weight, 0);
        setStats({ total, topArea: 'Chennai Central', peakHour: 18 });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHeatmap(days); }, [days]);

  return (
    <div className="pb-20 sm:pb-6">
      <BackButton to="/vendor/dashboard" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Customer Heatmap</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([7, 30, 90] as Days[]).map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${days === d ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>
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
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="font-heading font-bold text-xl text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-2xl">
            <div className="text-sm text-gray-500">Loading heatmap...</div>
          </div>
        )}
        <div ref={mapDivRef} className="h-96 w-full relative" />
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
        <span>Low</span>
        <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-blue-300 via-yellow-400 to-red-500" />
        <span>High</span>
      </div>
    </div>
  );
}
