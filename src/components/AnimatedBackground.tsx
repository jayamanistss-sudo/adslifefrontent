import { motion } from 'framer-motion';

const ORBS = [
  { size: 420, x: '-8%',  y: '-12%', color: 'rgba(255,98,0,0.09)',   dur: 22, delay: 0  },
  { size: 320, x: '78%',  y: '8%',   color: 'rgba(59,130,246,0.06)', dur: 18, delay: 3  },
  { size: 260, x: '62%',  y: '72%',  color: 'rgba(16,185,129,0.05)', dur: 25, delay: 6  },
  { size: 200, x: '12%',  y: '68%',  color: 'rgba(255,136,64,0.07)', dur: 20, delay: 2  },
];

export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 24, -12, 0],
            y: [0, -18, 14, 0],
            scale: [1, 1.08, 0.96, 1],
          }}
          transition={{
            duration: orb.dur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.35]" />
    </div>
  );
}
