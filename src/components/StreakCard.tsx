

import type { StreakStatus } from '../types';

interface Props { streak: StreakStatus }

export default function StreakCard({ streak }: Props) {
  const progress = streak.nextMilestone > 0
    ? Math.min(100, (streak.currentStreak / streak.nextMilestone) * 100)
    : 100;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    
    
    // Approximate active days
    const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
    return daysAgo < streak.currentStreak;
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${streak.currentStreak > 0 ? 'animate-streak-fire' : ''}`}>🔥</span>
          <div>
            <div className="font-heading font-bold text-2xl text-[var(--text)]">{streak.currentStreak}</div>
            <div className="text-xs text-[var(--text-muted)]">Day Streak</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-[var(--text-secondary)]">Best: {streak.longestStreak} days</div>
          <div className="text-xs text-[var(--text-muted)]">Next reward at {streak.nextMilestone} days</div>
        </div>
      </div>

      {/* 7-day calendar */}
      <div className="flex gap-1.5 mb-4">
        {['M','T','W','T','F','S','S'].map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-full h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
              last7[i] ? 'bg-[var(--warning)] text-white shadow-sm' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
            }`}>
              {last7[i] ? '🔥' : day}
            </div>
            <span className="text-[9px] text-[var(--text-muted)]">{day}</span>
          </div>
        ))}
      </div>

      {/* Progress to next milestone */}
      <div>
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
          <span>{streak.currentStreak} days</span>
          <span>{streak.daysUntilNext} days to {streak.nextMilestone}-day milestone</span>
        </div>
        <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
