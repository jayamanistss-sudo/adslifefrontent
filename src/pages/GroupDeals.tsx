import { useState, useEffect } from 'react';

import type { GroupDeal } from '../types';
import { api, endpoints } from '../utils/api';
import GroupDealCard from '../components/GroupDealCard';

export default function GroupDeals() {
  const [deals, setDeals]   = useState<GroupDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity]     = useState('Chennai');

  const CITY_COORDS: Record<string, [number, number]> = {
    Chennai:   [13.0827, 80.2707],
    Mumbai:    [19.0760, 72.8777],
    Bangalore: [12.9716, 77.5946],
    Delhi:     [28.6139, 77.2090],
  };

  const load = () => {
    const [lat, lng] = CITY_COORDS[city] ?? CITY_COORDS.Chennai;
    setLoading(true);
    api.get(endpoints.groupDealsActive(lat, lng)).then((res) => {
      if (res.data.success) {
        setDeals(res.data.data.map((d: any) => ({
          id:                  d.id,
          offerId:             d.offer_id,
          vendorId:            d.vendor_id,
          minParticipants:     parseInt(d.min_participants),
          currentParticipants: parseInt(d.current_participants),
          dealStatus:          d.deal_status,
          expiresAt:           d.expires_at,
          title:               d.title,
          imageUrl:            d.image_url,
          discountPercent:     parseFloat(d.discount_percent),
          businessName:        d.business_name,
          vendorLogo:          d.vendor_logo,
          progressPercent:     parseInt(d.progress_percent),
          remaining:           parseInt(d.remaining),
          participantsPreview: d.participants_preview ?? [],
        })));
      }
    }).finally(() => setLoading(false));
  };

  useEffect(load, [city]);

  return (
    <div className="w-full pb-20 sm:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Group Deals 👥</h1>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white"
        >
          {['Chennai', 'Mumbai', 'Bangalore', 'Delhi'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="mb-4 p-4 bg-accent/5 border border-accent/20 rounded-xl text-sm text-gray-600">
        💡 <strong>Group deals</strong> unlock when enough people join together. Invite friends for bigger savings!
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="skeleton rounded-2xl h-72" />)}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-heading font-semibold text-gray-600 mb-1">No active group deals</p>
          <p className="text-sm">Check back soon for group discounts!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {deals.map((deal) => (
            <GroupDealCard key={deal.id} deal={deal} onJoined={load} />
          ))}
        </div>
      )}
    </div>
  );
}
