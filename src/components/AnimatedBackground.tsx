import { motion } from 'framer-motion';

const ORBS = [
  { id: 'orb-1', size: 480, x: '-10%', y: '-15%', color: 'rgba(255,85,0,0.09)',   dur: 22, delay: 0  },
  { id: 'orb-2', size: 340, x: '75%',  y: '5%',   color: 'rgba(124,58,237,0.07)', dur: 18, delay: 3  },
  { id: 'orb-3', size: 280, x: '60%',  y: '70%',  color: 'rgba(0,196,140,0.05)',  dur: 26, delay: 7  },
  { id: 'orb-4', size: 220, x: '10%',  y: '65%',  color: 'rgba(255,119,51,0.07)', dur: 20, delay: 2  },
  { id: 'orb-5', size: 160, x: '40%',  y: '35%',  color: 'rgba(124,58,237,0.04)', dur: 30, delay: 10 },
];

export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {ORBS.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 28, -14, 0],
            y: [0, -20, 16, 0],
            scale: [1, 1.07, 0.95, 1],
          }}
          transition={{
            duration: orb.dur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.28]" />
    </div>
  );
}
