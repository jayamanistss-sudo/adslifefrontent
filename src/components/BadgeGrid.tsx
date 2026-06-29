import { useState } from 'react';

import type { Badge } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  badges: Badge[];
  showAll?: boolean;
}

export default function BadgeGrid({ badges, showAll = false }: Props) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const display = showAll ? badges : badges.slice(0, 6);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {display.map((badge) => (
        <motion.div
          key={badge.id}
          className="relative flex flex-col items-center gap-1 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          onHoverStart={() => setHoveredId(badge.id)}
          onHoverEnd={() => setHoveredId(null)}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
            badge.earned
              ? 'bg-gradient-to-br from-warning/20 to-orange-200 shadow-sm ring-2 ring-warning/40'
              : 'bg-[var(--surface-2)] grayscale opacity-40 dark:opacity-25'
          }`}>
            {badge.icon}
          </div>
          <span className="text-xs text-center text-[var(--text-secondary)] font-medium leading-tight">{badge.name}</span>

          {/* Tooltip */}
          <AnimatePresence>
            {hoveredId === badge.id && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute -top-20 left-1/2 -translate-x-1/2 bg-[var(--text)] text-[var(--bg)] text-xs px-3 py-2 rounded-lg w-40 z-10 text-center shadow-lg"
              >
                <div className="font-semibold mb-0.5">{badge.name}</div>
                <div className="text-gray-300">{badge.description}</div>
                {badge.earned && badge.earnedAt && (
                  <div className="text-warning mt-1">Earned {new Date(badge.earnedAt).toLocaleDateString()}</div>
                )}
                {!badge.earned && <div className="text-[var(--text-muted)] mt-1">Locked</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
