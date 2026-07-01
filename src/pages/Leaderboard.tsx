import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '../types';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';

type Period = 'weekly' | 'monthly' | 'alltime';

const CITIES = ['Chennai', 'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad'];

/* ── Sample data shown when the API returns no entries ── */
const SAMPLE_USERS: Record<string, Array<{ name: string; id: number }>> = {
  Chennai: [
    { name: 'Arjun Karthik',   id: 1001 }, { name: 'Priya Sundaram', id: 1002 },
    { name: 'Rahul Venkatesh', id: 1003 }, { name: 'Deepa Nair',     id: 1004 },
    { name: 'Vikram Iyer',     id: 1005 }, { name: 'Ananya Pillai',  id: 1006 },
    { name: 'Suresh Balaji',   id: 1007 }, { name: 'Meera Krishnan', id: 1008 },
    { name: 'Arun Kumar',      id: 1009 }, { name: 'Lakshmi Rajan',  id: 1010 },
  ],
  Mumbai: [
    { name: 'Rohan Patil',    id: 2001 }, { name: 'Sneha Desai',   id: 2002 },
    { name: 'Amit Shah',      id: 2003 }, { name: 'Pooja Joshi',   id: 2004 },
    { name: 'Raj Malhotra',   id: 2005 }, { name: 'Neha Kulkarni', id: 2006 },
    { name: 'Sameer Mehta',   id: 2007 }, { name: 'Kavita Nair',   id: 2008 },
    { name: 'Vishal Kamat',   id: 2009 }, { name: 'Asha Thakkar',  id: 2010 },
  ],
  Bangalore: [
    { name: 'Kiran Reddy',   id: 3001 }, { name: 'Divya Menon',   id: 3002 },
    { name: 'Sunil Hegde',   id: 3003 }, { name: 'Anjali Rao',    id: 3004 },
    { name: 'Ravi Shankar',  id: 3005 }, { name: 'Vidya Murthy',  id: 3006 },
    { name: 'Praveen Gowda', id: 3007 }, { name: 'Shruti Kumar',  id: 3008 },
    { name: 'Naveen Shetty', id: 3009 }, { name: 'Padma Swamy',   id: 3010 },
  ],
  Delhi: [
    { name: 'Rahul Sharma', id: 4001 }, { name: 'Pooja Agarwal', id: 4002 },
    { name: 'Vikas Gupta',  id: 4003 }, { name: 'Nisha Singh',   id: 4004 },
    { name: 'Ajay Verma',   id: 4005 }, { name: 'Ritu Chopra',   id: 4006 },
    { name: 'Manish Yadav', id: 4007 }, { name: 'Simran Kapoor', id: 4008 },
    { name: 'Sandeep Arora',id: 4009 }, { name: 'Priya Bhatia',  id: 4010 },
  ],
  Hyderabad: [
    { name: 'Venkat Rao',    id: 5001 }, { name: 'Swetha Reddy',  id: 5002 },
    { name: 'Krishna Murthy',id: 5003 }, { name: 'Lalitha Devi',  id: 5004 },
    { name: 'Suresh Babu',   id: 5005 }, { name: 'Padmaja Nair',  id: 5006 },
    { name: 'Ramesh Kumar',  id: 5007 }, { name: 'Anitha Raju',   id: 5008 },
    { name: 'Aditya Varma',  id: 5009 }, { name: 'Kavya Reddy',   id: 5010 },
  ],
};

const BASE_SCORES: Record<Period, number[]> = {
  weekly:  [1420, 1180, 980, 840, 720, 610, 510, 420, 340, 260],
  monthly: [7800, 6400, 5200, 4300, 3500, 2800, 2200, 1700, 1200, 850],
  alltime: [24500, 19800, 16200, 13400, 10800, 8600, 6700, 5100, 3800, 2600],
};

function makeSampleEntries(city: string, period: Period): LeaderboardEntry[] {
  const users  = SAMPLE_USERS[city] ?? SAMPLE_USERS['Chennai'];
  const scores = BASE_SCORES[period];
  return users.map((u, i) => ({
    rank:             i + 1,
    userId:           u.id,
    name:             u.name,
    city,
    score:            scores[i],
    totalSaves:       Math.round(scores[i] * 0.4),
    totalRedemptions: Math.round(scores[i] * 0.25),
    totalReviews:     Math.round(scores[i] * 0.15),
  }));
}

export default function Leaderboard() {
  const { user } = useUserStore();
  const [entries, setEntries]     = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState<Period>('monthly');
  const [city, setCity]           = useState('Chennai');

  useEffect(() => {
    setLoading(true);
    api.get(endpoints.leaderboard(city, period)).then((res) => {
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
      setEntries(live.length > 0 ? live : makeSampleEntries(city, period));
    }).catch(() => {
      setEntries(makeSampleEntries(city, period));
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
