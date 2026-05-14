import { motion, useAnimation } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { Flame, Check } from 'lucide-react';

interface HeatPressSequenceProps {
  phase: number; // 0=idle, 1=lowering, 2=heating, 3=cooling, 4=done
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) % 1;
  return x < 0 ? x + 1 : x;
}

export function HeatPressSequence({ phase }: HeatPressSequenceProps) {
  const plateControls = useAnimation();
  const glowControls = useAnimation();
  const shakeControls = useAnimation();
  const textControls = useAnimation();

  const sparks = useMemo(() => Array.from({ length: 12 }).map((_, i) => {
    const rand1 = seededRandom(i * 7 + 1);
    const rand2 = seededRandom(i * 7 + 2);
    const rand3 = seededRandom(i * 7 + 3);
    return (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-craft-mint rounded-full"
        style={{ left: `${10 + (i * 7)}%`, top: `${10 + (i % 3) * 15}%` }}
        animate={{
          y: [0, -40 - rand1 * 60],
          x: [0, (rand2 - 0.5) * 40],
          opacity: [1, 0],
          scale: [1, 0],
        }}
        transition={{
          duration: 0.5 + rand3 * 0.5,
          repeat: Infinity,
          delay: i * 0.08,
        }}
      />
    );
  }), []);

  const steam = useMemo(() => Array.from({ length: 8 }).map((_, i) => {
    const rand1 = seededRandom(i * 11 + 101);
    const rand2 = seededRandom(i * 11 + 102);
    return (
      <motion.div
        key={`steam-${i}`}
        className="absolute bg-white/20 rounded-full"
        style={{
          left: `${15 + i * 10}%`,
          bottom: '10%',
          width: 8 + (i % 3) * 4,
          height: 8 + (i % 3) * 4,
        }}
        animate={{
          y: [0, -100 - rand1 * 50],
          x: [0, (rand2 - 0.5) * 30],
          opacity: [0.6, 0],
          scale: [1, 2],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: i * 0.15,
        }}
      />
    );
  }), []);

  useEffect(() => {
    if (phase === 0) return;

    const runSequence = async () => {
      if (phase === 1) {
        // Lowering
        await plateControls.start({
          y: 0,
          transition: { type: 'spring', stiffness: 80, damping: 20 },
        });
      }
      if (phase === 2) {
        // Heating
        await glowControls.start({
          opacity: 1,
          scale: 1.2,
          transition: { duration: 0.5, ease: 'easeOut' },
        });
        await shakeControls.start({
          x: [0, -3, 3, -3, 3, 0],
          transition: { duration: 0.4, repeat: 3 },
        });
      }
      if (phase === 3) {
        // Cooling
        await glowControls.start({
          opacity: 0,
          scale: 1,
          transition: { duration: 0.8 },
        });
      }
      if (phase === 4) {
        // Done
        await textControls.start({
          opacity: 1,
          scale: 1,
          transition: { type: 'spring', stiffness: 400, damping: 15 },
        });
      }
    };

    runSequence();
  }, [phase, plateControls, glowControls, shakeControls, textControls]);

  if (phase === 0) return null;

  return (
    <motion.div
      className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Dark overlay */}
      <motion.div
        className="absolute inset-0 bg-black/40"
        animate={{ opacity: phase >= 2 ? 0.5 : 0.25 }}
        transition={{ duration: 0.5 }}
      />

      {/* Heat glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,213,79,0.4) 0%, rgba(255,213,79,0.15) 40%, transparent 70%)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={glowControls}
      />

      {/* Press plate */}
      <motion.div
        className="absolute left-[5%] right-[5%] h-7 rounded-b-xl shadow-lg"
        style={{
          background: 'linear-gradient(to bottom, #888, #777, #666, #555)',
        }}
        initial={{ y: -100 }}
        animate={plateControls}
      >
        <div className="absolute top-1 left-[10%] right-[10%] h-0.5 bg-white/30 rounded-full" />
      </motion.div>

      {/* Side glow bars */}
      {phase >= 2 && phase <= 3 && (
        <>
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-1.5"
            style={{ background: 'linear-gradient(to bottom, transparent 10%, rgba(255,213,79,0.6) 30%, rgba(255,193,7,0.8) 50%, rgba(255,213,79,0.6) 70%, transparent 90%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-1.5"
            style={{ background: 'linear-gradient(to bottom, transparent 10%, rgba(255,213,79,0.6) 30%, rgba(255,193,7,0.8) 50%, rgba(255,213,79,0.6) 70%, transparent 90%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ duration: 0.5 }}
          />
        </>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20 backdrop-blur-sm">
        <motion.div
          className="h-full bg-gradient-to-r from-craft-yellow via-[#ffe082] to-craft-yellow"
          style={{ boxShadow: '0 0 12px rgba(255,213,79,0.8)' }}
          initial={{ width: '0%' }}
          animate={{ width: phase === 1 ? '20%' : phase === 2 ? '60%' : phase === 3 ? '85%' : '100%' }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />
      </div>

      {/* Center status */}
      <motion.div
        className="relative z-10 text-center"
        animate={textControls}
        initial={{ opacity: 0, scale: 0.8 }}
      >
        {phase === 4 ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-16 h-16 bg-craft-mint rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ boxShadow: '0 0 30px rgba(129,199,132,0.6)' }}
          >
            <Check className="w-8 h-8 text-white" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Flame className={`w-12 h-12 mx-auto mb-3 ${phase >= 2 ? 'text-craft-mint' : 'text-craft-mint/80'}`} />
          </motion.div>
        )}
        <p className="text-ink font-heading font-bold text-lg drop-shadow-lg tracking-wide">
          {phase === 1 && 'Lowering press...'}
          {phase === 2 && 'Applying heat...'}
          {phase === 3 && 'Cooling down...'}
          {phase === 4 && 'Done! ✓'}
        </p>
        {phase >= 1 && phase <= 3 && (
          <p className="text-ink/60 text-xs mt-1">Do not remove product</p>
        )}
      </motion.div>

      {/* Sparks during heating */}
      {phase === 2 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {sparks}
        </div>
      )}

      {/* Steam during cooling */}
      {phase === 3 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {steam}
        </div>
      )}

      {/* Success flash */}
      {phase === 4 && (
        <motion.div
          className="absolute inset-0 bg-craft-mint/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.8 }}
        />
      )}
    </motion.div>
  );
}
