import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface MotionStepProps {
  stepKey: string;
  children: ReactNode;
}

const variants = {
  enter: {
    opacity: 0,
  },
  center: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

export function MotionStep({ stepKey, children }: MotionStepProps) {
  return (
    <motion.div
      key={stepKey}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        duration: 0.25,
        ease: 'easeInOut',
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
