import BackButton from '../../components/BackButton';
import { useState, useEffect, useRef } from 'react';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin } from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

export default function NeighborhoodTargeting() {
  const mapDivRef   = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<L.Map | null>(null);
  const circleRef   = useRef<L.Circle | null>(null);
  const [search, setSearch]     = useState('');
  const [radius, setRadius]     = useState(5);
  const [center, setCenter]     = useState({ lat: 13.0827, lng: 80.2707 });
  const [pincode, setPincode]   = useState('');
  const [targetType, setTargetType] = useState<'radius' | 'pincode' | 'area'>('radius');
  const [loading, setLoading]   = useState(false);
  const [reachEst, setReachEst] = useState<number | null>(null);

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    mapRef.current = L.map(mapDivRef.current).setView([center.lat, center.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);
    updateCircle(center.lat, center.lng, radius);
  }, []);

  const updateCircle = (lat: number, lng: number, r: number) => {
    if (!mapRef.current) return;
    if (circleRef.current) mapRef.current.removeLayer(circleRef.current);
    circleRef.current = L.circle([lat, lng], {
      radius:      r * 1000,
      color:       '#1A73E8',
      fillColor:   '#1A73E8',
      fillOpacity: 0.1,
      weight:      2,
    }).addTo(mapRef.current);
    mapRef.current.setView([lat, lng], r > 10 ? 10 : 12);
    setReachEst(Math.round(r * r * 3.14 * 80)); // rough estimate
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(endpoints.targetingSearch(search));
      if (res.data.success) {
        const { lat, lng } = res.data.data;
        setCenter({ lat, lng });
        updateCircle(lat, lng, radius);
        if (mapRef.current) mapRef.current.setView([lat, lng], 13);
      } else {
        toast.error('Area not found');
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (r: number) => {
    setRadius(r);
    updateCircle(center.lat, center.lng, r);
  };

  const handleSave = async () => {
    try {
      await api.post(endpoints.targetingSet, {
        vendor_id:   1,
        offer_id:    1,
        target_type: targetType,
        pincode:     pincode || null,
        radius_km:   radius,
        area_name:   search || null,
        center_lat:  center.lat,
        center_lng:  center.lng,
      });
      toast.success('Targeting saved!');
    } catch {
      toast.error('Failed to save');
    }
  };

  return (
    <div className="pb-20 sm:pb-6">
      <BackButton to="/vendor/dashboard" />
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
            <MapPin size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="page-title">Neighborhood Targeting</h1>
            <p className="page-subtitle">Reach customers in a specific area</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Target type */}
          <div className="card p-4">
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Target Type</label>
            <div className="flex gap-2">
              {(['radius', 'pincode', 'area'] as const).map((t) => (
                <button key={t} onClick={() => setTargetType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${targetType === t ? 'bg-primary text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Area search */}
          <div className="card p-4">
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Search Area</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. Anna Nagar Chennai"
                className="flex-1 border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <button onClick={handleSearch} disabled={loading}
                className="p-2 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors">
                <Search size={16} />
              </button>
            </div>
          </div>

          {targetType === 'pincode' && (
            <div className="card p-4">
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">PIN Code</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="600040"
                maxLength={6}
                className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {/* Radius slider */}
          {targetType === 'radius' && (
            <div className="card p-4">
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                Radius: <span className="text-primary font-bold">{radius} km</span>
              </label>
              <input
                type="range" min={1} max={25} value={radius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>1 km</span><span>25 km</span>
              </div>
            </div>
          )}

          {/* Reach estimate */}
          {reachEst !== null && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
              <div className="font-heading font-bold text-2xl text-primary">~{reachEst.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-muted)]">Estimated reach in this area</div>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full bg-primary text-white py-3 rounded-xl font-heading font-semibold hover:opacity-90 transition-colors"
          >
            <MapPin size={16} className="inline mr-2" />
            Save Targeting
          </button>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden h-96 lg:h-[500px]">
            <div ref={mapDivRef} className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
