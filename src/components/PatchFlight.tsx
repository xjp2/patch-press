import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlyingPatch {
  id: string;
  image: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
}

interface PatchFlightProps {
  flights: FlyingPatch[];
  onComplete: (id: string) => void;
}

export function PatchFlight({ flights, onComplete }: PatchFlightProps) {
  return (
    <AnimatePresence>
      {flights.map((flight) => (
        <PatchFlightItem key={flight.id} flight={flight} onComplete={() => onComplete(flight.id)} />
      ))}
    </AnimatePresence>
  );
}

function PatchFlightItem({ flight, onComplete }: { flight: FlyingPatch; onComplete: () => void }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDone(true);
      setTimeout(onComplete, 100);
    }, 500);
    return () => clearTimeout(t);
  }, [onComplete]);

  // Control point for quadratic bezier curve (arc upward)
  const midX = (flight.startX + flight.endX) / 2;
  const midY = Math.min(flight.startY, flight.endY) - 120;

  return (
    <motion.img
      src={flight.image}
      alt=""
      initial={{
        left: flight.startX,
        top: flight.startY,
        width: flight.size,
        height: flight.size,
        opacity: 1,
        scale: 1,
        rotate: 0,
      }}
      animate={done ? {
        left: flight.endX,
        top: flight.endY,
        width: flight.size * 1.8,
        height: flight.size * 1.8,
        opacity: 0,
        scale: 0.5,
        rotate: 15,
      } : {
        left: [flight.startX, midX, flight.endX],
        top: [flight.startY, midY, flight.endY],
        width: [flight.size, flight.size * 2, flight.size * 1.8],
        height: [flight.size, flight.size * 2, flight.size * 1.8],
        opacity: [1, 1, 0.8],
        scale: [1, 1.3, 1],
        rotate: [0, -10, 15],
      }}
      transition={{
        duration: 0.6,
        ease: 'easeInOut',
        times: done ? undefined : [0, 0.5, 1],
      }}
      className="fixed z-[60] pointer-events-none object-contain"
      style={{
        filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))',
        marginLeft: '-50%',
        marginTop: '-50%',
      }}
    />
  );
}

export type { FlyingPatch };
