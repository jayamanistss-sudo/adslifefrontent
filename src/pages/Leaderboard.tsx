import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '../types';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';

type Period = 'weekly' | 'monthly' | 'alltime';

const ALL_CITIES = 'All Cities';
const CITIES = [ALL_CITIES, 'Chennai', 'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad'];

export default function Leaderboard() {
  const { user } = useUserStore();
  const [entries, setEntries]     = useState<LeaderboardEntry[]>([]);
  const [myStanding, setMyStanding] = useState<{ rank: number | null; score: number; total_ranked: number } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState<Period>('monthly');
  // Default to the user's own city so profile rank and this page agree
  const [city, setCity]           = useState(() => {
    const mine = useUserStore.getState().user?.city?.trim();
    return mine && CITIES.includes(mine) ? mine : ALL_CITIES;
  });

  useEffect(() => {
    setLoading(true);
    api.get(endpoints.leaderboard(city === ALL_CITIES ? '' : city, period)).then((res) => {
      const live: LeaderboardEntry[] = res.data.success
        ? res.data.data.map((e: any, i: number) => ({
            rank:             i + 1,
            userId:           e.user_id,
            name:             e.name,
            avatarUrl:        e.avatar_url,
            city:             e.user_city || e.city,
            score:            e.score,
            totalSaves:       e.total_saves,
            totalRedemptions: e.total_redemptions,
            totalReviews:     e.total_reviews,
          }))
        : [];
      setEntries(live);
    }).catch(() => {
      setEntries([]);
    }).finally(() => setLoading(false));

    // The user's own standing — shown even when they're outside the top list.
    if (user) {
      api.get(endpoints.leaderboardMe(city === ALL_CITIES ? '' : city, period))
        .then((r) => { if (r.data.success) setMyStanding(r.data.data); })
        .catch(() => setMyStanding(null));
    } else {
      setMyStanding(null);
    }
  }, [period, city, user?.id]);

  const top3  = entries.slice(0, 3);
  const rest  = entries.slice(3);

  const podiumOrder   = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumHeights = ['h-20', 'h-28', 'h-16'];
  const podiumColors  = ['bg-neutral-300', 'bg-[#F59E0B]', 'bg-[#CD7F32]'];
  const medals        = ['🥈', '🥇', '🥉'];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--warning-light)' }}>
            <Trophy size={20} style={{ color: '#78350F' }} />
          </div>
          <div>
            <h1 className="page-title">Leaderboard</h1>
            <p className="page-subtitle">Top earners in your city</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="input w-auto flex-shrink-0"
        >
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        <div className="segmented-control flex-shrink-0">
          {(['weekly', 'monthly', 'alltime'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`segmented-item capitalize ${period === p ? 'active' : ''}`}>
              {p === 'alltime' ? 'All Time' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Your standing — always visible, even outside the top list */}
      {user && myStanding && (
        <div className="card p-4 mb-6 flex items-center gap-4 border border-[var(--primary)]/30 bg-[var(--primary-light)]">
          <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center font-heading font-bold text-white text-lg flex-shrink-0 overflow-hidden">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading font-bold text-[var(--text)] text-sm truncate">{user.name} <span className="text-[var(--primary)] text-xs font-semibold">(You)</span></div>
            <div className="text-xs text-[var(--text-muted)]">
              {myStanding.rank
                ? `Rank #${myStanding.rank} of ${myStanding.total_ranked}`
                : 'Not ranked yet — save & redeem offers to climb'}
            </div>
          </div>
          <div className="text-right">
            <div className="font-heading font-bold text-[var(--primary)] text-lg leading-none">{myStanding.rank ? `#${myStanding.rank}` : '—'}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{myStanding.score} pts</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🏆</div>
          <p className="font-heading font-bold text-[var(--text)]">{city === ALL_CITIES ? 'No rankings yet' : `No rankings in ${city} yet`}</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Save and redeem offers to earn coins and claim the top spot!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length === 3 && (
            <motion.div
              className="card-grand p-6 mb-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              <div className="flex items-end justify-center gap-4">
                {podiumOrder.map((entry, i) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, y: 40, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22, delay: i * 0.12 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <motion.div
                      className="text-xl"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    >
                      {medals[i]}
                    </motion.div>
                    <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center font-heading font-bold text-white text-lg border-2 border-[var(--surface)] shadow-lg">
                      {entry.name?.[0]}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-heading font-semibold text-[var(--text)] max-w-[72px] truncate">{entry.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{entry.score} pts</div>
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 + i * 0.1 }}
                      className={`${podiumHeights[i]} w-16 rounded-t-xl flex items-start justify-center pt-2 text-white font-heading font-bold text-base ${podiumColors[i]} shadow-md`}
                    >
                      {podiumOrder[i]?.rank ?? i + 1}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* List */}
          <div className="space-y-2">
            {rest.map((entry, idx) => (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex items-center gap-3 p-3.5 rounded-xl transition-colors ${
                  entry.userId === user?.id
                    ? 'bg-[var(--primary-light)] border border-[var(--primary)]/30'
                    : 'card'
                }`}
              >
                <div className="w-8 text-center font-heading font-bold text-[var(--text-muted)] text-sm">
                  #{entry.rank}
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary-light)] to-[#ECFDF5] flex items-center justify-center font-heading font-bold text-[var(--primary)] text-sm flex-shrink-0">
                  {entry.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-semibold text-[var(--text)] text-sm truncate">
                    {entry.name} {entry.userId === user?.id && <span className="text-[var(--primary)] text-xs">(You)</span>}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{entry.city}</div>
                </div>
                <div className="text-right">
                  <div className="font-heading font-bold text-[var(--text)] text-sm">{entry.score}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">pts</div>
                </div>
              </motion.div>
            ))}
          </div>

        </>
      )}
    </div>
  );
}
