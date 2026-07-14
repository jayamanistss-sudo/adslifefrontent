import { useEffect, useRef, useState } from 'react';
import BackButton from '../components/BackButton';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import { useGeolocation } from '../hooks/useGeolocation';

declare const L: any;

// Offer titles and vendor business names are vendor-supplied free text —
// they get interpolated into Leaflet popup/marker HTML below, so they must
// be escaped or a crafted offer becomes a stored-XSS payload for every
// visitor who opens that pin.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface MapOffer {
  id: number;
  title: string;
  discount_percent: number;
  business_name?: string;
  vlat?: number;
  vlng?: number;
  vendor_lat?: number;
  vendor_lng?: number;
}

export default function OffersMap() {
  const { user } = useUserStore();
  const { lat, lng } = useGeolocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    let cancelled = false;

    const init = async () => {
      // The external Leaflet script can still be loading when the user
      // navigates away; without this guard script.onload fires after
      // mapRef.current is already null and L.map(null) throws.
      if (cancelled || !mapRef.current) return;
      const centerLat = lat || 13.0827;
      const centerLng = lng || 80.2707;
      const map = L.map(mapRef.current!).setView([centerLat, centerLng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      mapObj.current = map;

      if (lat && lng) {
        L.circleMarker([lat, lng], {
          radius: 8, color: '#fff', weight: 3, fillColor: '#3B82F6', fillOpacity: 1,
        }).addTo(map).bindTooltip('You are here');
      }

      try {
        const r = user
          ? await api.get(endpoints.feed(user.id, centerLat, centerLng, 1, 100, ''))
          : await api.get(endpoints.trending('Chennai', 1, 100, '', centerLat, centerLng));
        const offers: MapOffer[] = r.data?.data ?? [];
        // Group offers by vendor location so one shop = one pin listing all
        // its live offers (overlapping same-location pins were unusable).
        const groups = new Map<string, MapOffer[]>();
        for (const o of offers) {
          const olat = Number(o.vlat ?? o.vendor_lat);
          const olng = Number(o.vlng ?? o.vendor_lng);
          if (!olat || !olng) continue;
          const key = `${olat.toFixed(5)},${olng.toFixed(5)}`;
          const arr = groups.get(key) ?? [];
          arr.push(o);
          groups.set(key, arr);
        }
        for (const [key, group] of groups) {
          const [olat, olng] = key.split(',').map(Number);
          const topPct = Math.max(...group.map((g) => Math.round(g.discount_percent || 0)));
          const multi = group.length > 1;
          const icon = L.divIcon({
            className: '',
            html: `<div style="background:#FF6200;color:#fff;font-weight:800;font-size:11px;
                     padding:3px 7px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.3);
                     white-space:nowrap;font-family:inherit">${topPct}%${multi ? ` · ${group.length}` : ''}</div>`,
            iconAnchor: [16, 12],
          });
          const list = group
            .map((g) => `<a href="/offer/${g.id}" style="display:block;color:#0f172a;text-decoration:none;padding:4px 0;border-top:1px solid #eee">
                 <strong>${escapeHtml(g.title)}</strong> · <span style="color:#FF6200">${Math.round(g.discount_percent || 0)}% OFF</span></a>`)
            .join('');
          L.marker([olat, olng], { icon })
            .addTo(map)
            .bindPopup(
              `<div style="max-width:220px"><span style="color:#FF6200;font-weight:700">${escapeHtml(group[0].business_name ?? 'Shop')}</span>
               <div style="font-size:11px;color:#64748b;margin-bottom:2px">${group.length} offer${group.length !== 1 ? 's' : ''}</div>${list}</div>`,
            );
        }
        setCount(offers.length);
      } catch { /* map still usable without pins */ }
    };

    if ((globalThis as any).L) { init(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = init;
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      mapObj.current?.remove();
      mapObj.current = null;
    };
  }, [lat, lng, user?.id]);

  return (
    <div className="pb-6">
      <BackButton to="/feed" />
      <div className="flex items-center justify-between mb-4 mt-1">
        <div>
          <h1 className="page-title">Offers Near You</h1>
          <p className="page-subtitle">{count} deals pinned on the map — click a pin to view</p>
        </div>
      </div>
      <div ref={mapRef} className="rounded-2xl border border-[var(--border)] overflow-hidden"
        style={{ height: '70vh', minHeight: 420 }} />
    </div>
  );
}
