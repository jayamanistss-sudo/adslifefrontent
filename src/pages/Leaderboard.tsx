import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '../types';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';

type Period = 'weekly' | 'monthly' | 'alltime';

const CITIES = ['Chennai', 'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad'];

export default function Leaderboard() {
  const { user } = useUserStore();
  const [entries, setEntries]     = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState<Period>('monthly');
  const [city, setCity]           = useState('Chennai');

  useEffect(() => {
    setLoading(true);
    api.get(endpoints.leaderboard(city, period)).then((res) => {
      if (res.data.success) {
        setEntries(res.data.data.map((e: any, i: number) => ({
          rank:             i + 1,
          userId:           e.user_id,
          name:             e.name,
          avatarUrl:        e.avatar_url,
          city:             e.user_city || e.city,
          score:            e.score,
          totalSaves:       e.total_saves,
          totalRedemptions: e.total_redemptions,
          totalReviews:     e.total_reviews,
        })));
      }
    }).finally(() => setLoading(false));
  }, [period, city]);

  const top3  = entries.slice(0, 3);
  const rest  = entries.slice(3);
  const myRank = entries.findIndex((e) => e.userId === user?.id);

  const podiumOrder   = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumHeights = ['h-20', 'h-28', 'h-16'];
  const podiumColors  = ['bg-neutral-300', 'bg-[#F59E0B]', 'bg-[#CD7F32]'];
  const medals        = ['🥈', '🥇', '🥉'];

  return (
    <div className="pb-6 max-w-2xl mx-auto">
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

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
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

          {myRank === -1 && user && (
            <div className="mt-4 p-4 bg-[var(--primary-light)] border border-[var(--primary)]/20 rounded-xl text-center">
              <p className="text-sm text-[var(--text-secondary)]">You're not yet ranked. Start saving and redeeming offers to climb the leaderboard!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
