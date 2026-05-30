import BackButton from '../../components/BackButton';
import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, endpoints } from '../../utils/api';
import type { AudienceData } from '../../types';

export default function AudienceInsights() {
  const [data, setData]       = useState<AudienceData | null>(null);
  const [days, setDays]       = useState(30);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState(0);
  const [followers, setFollowers] = useState<{ total: number; this_month: number; growth_pct: number }>({ total: 0, this_month: 0, growth_pct: 0 });

  // Fetch vendor id once
  useEffect(() => {
    api.get(endpoints.vendorProfile).then((res) => {
      if (res.data.success) setVendorId(res.data.data.id as number);
    });
  }, []);

  // Fetch audience data whenever vendorId or days changes
  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    Promise.all([
      api.get(endpoints.audience(vendorId, days)),
      api.get(endpoints.vendorFollowers(vendorId, 5)),
    ]).then(([audRes, follRes]) => {
      if (audRes.data.success) {
        const d = audRes.data.data;
        setData({
          deviceBreakdown:  d.device_breakdown,
          peakHours:        d.peak_hours,
          topCities:        d.top_cities,
          engagementRate:   d.engagement_rate,
          totalImpressions: d.total_impressions,
          totalClicks:      d.total_clicks,
          totalSaves:       d.total_saves,
        });
      }
      if (follRes.data.success) {
        const f = follRes.data.data;
        setFollowers({ total: f.total, this_month: f.this_month, growth_pct: f.growth_pct });
      }
    }).finally(() => setLoading(false));
  }, [vendorId, days]);

  if (loading) return (
    <>
      <BackButton to="/vendor/dashboard" />
      <div className="text-center py-20 text-gray-400">Loading insights…</div>
    </>
  );

  if (!data) return null;

  const deviceData = [
    { name: 'Mobile',  value: data.deviceBreakdown.mobile,  color: '#1A73E8' },
    { name: 'Desktop', value: data.deviceBreakdown.desktop, color: '#34A853' },
    { name: 'Tablet',  value: data.deviceBreakdown.tablet,  color: '#FBBC04' },
  ].filter((d) => d.value > 0);

  const hourData = data.peakHours.map((count, hr) => ({ hour: `${hr}h`, users: count }));
  const cityData = data.topCities.map((c) => ({ city: c.city, count: c.count }));

  return (
    <div className="pb-20 sm:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Audience Insights</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${days === d ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Reach',     value: data.totalImpressions?.toLocaleString() ?? '0' },
          { label: 'Total Clicks',    value: data.totalClicks?.toLocaleString() ?? '0' },
          { label: 'Total Saves',     value: data.totalSaves?.toLocaleString() ?? '0' },
          { label: 'Engagement Rate', value: `${data.engagementRate ?? 0}%` },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="font-heading font-bold text-xl text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Subscriber card */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Users size={22} className="text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-heading font-bold text-2xl text-gray-900">{followers.total.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Total Subscribers</div>
        </div>
        <div className="text-right">
          <div className={`font-semibold text-sm ${followers.growth_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {followers.growth_pct >= 0 ? '+' : ''}{followers.growth_pct}%
          </div>
          <div className="text-xs text-gray-400">{followers.this_month} this month</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-heading font-semibold text-gray-800 mb-4">Device Breakdown</h3>
          {deviceData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                    {deviceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {deviceData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-semibold ml-auto">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Top cities */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-heading font-semibold text-gray-800 mb-4">Top Cities</h3>
          {cityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="city" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1A73E8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">No city data yet</div>
          )}
        </div>

        {/* Peak hours */}
        <div className="bg-white rounded-2xl shadow-sm p-5 lg:col-span-2">
          <h3 className="font-heading font-semibold text-gray-800 mb-4">Peak Engagement by Hour</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hourData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#34A853" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#34A853" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#34A853" fill="url(#hourGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
