import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type StepDirection = 'right' | 'left' | 'up' | 'down';

interface MotionStepProps {
  stepKey: string;
  children: ReactNode;
  direction?: StepDirection;
}

const variants = {
  enter: (dir: StepDirection) => ({
    x: dir === 'right' ? 80 : dir === 'left' ? -80 : 0,
    y: dir === 'up' ? 60 : dir === 'down' ? -60 : 0,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: StepDirection) => ({
    x: dir === 'right' ? -80 : dir === 'left' ? 80 : 0,
    y: dir === 'up' ? -60 : dir === 'down' ? 60 : 0,
    opacity: 0,
    scale: 0.96,
  }),
};

export function MotionStep({ stepKey, children, direction = 'right' }: MotionStepProps) {
  return (
    <motion.div
      key={stepKey}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
