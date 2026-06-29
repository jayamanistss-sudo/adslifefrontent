import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const variants = {
  enter: { opacity: 0, y: 10 },
  center: { opacity: 1, y: 0 },
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="enter"
      animate="center"
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] as const }}
    >
      {children}
    </motion.div>
  );
}
