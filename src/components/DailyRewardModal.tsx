/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Coins, Gift, RotateCcw } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface DailyRewardModalProps {
  onClose: () => void;
  onClaimCoins: (amount: number) => void;
}

interface Sector {
  amount: number;
  label: string;
  color: string;
}

export default function DailyRewardModal({ onClose, onClaimCoins }: DailyRewardModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDeg, setSpinDeg] = useState(0);
  const [reward, setReward] = useState<Sector | null>(null);

  const sectors: Sector[] = [
    { amount: 50, label: '50 Coins', color: 'from-amber-500/20 to-yellow-500/10' },
    { amount: 100, label: '100 Coins', color: 'from-sky-500/20 to-blue-500/10' },
    { amount: 250, label: 'JACKPOT! 250', color: 'from-rose-500/30 to-rose-600/10' },
    { amount: 75, label: '75 Coins', color: 'from-fuchsia-500/20 to-pink-500/10' },
    { amount: 150, label: 'MEGA 150', color: 'from-emerald-500/20 to-teal-500/10' },
    { amount: 50, label: '50 Coins', color: 'from-violet-500/20 to-purple-500/10' },
    { amount: 100, label: '100 Coins', color: 'from-cyan-500/20 to-cyan-600/10' },
    { amount: 200, label: 'STAR 200', color: 'from-orange-500/20 to-amber-600/10' },
  ];

  const handleSpin = () => {
    if (isSpinning || reward) return;

    audioEngine.playPowerup();
    setIsSpinning(true);

    // Pick a random prize sector
    const sectorIndex = Math.floor(Math.random() * sectors.length);
    const chosenSector = sectors[sectorIndex];

    // Determine target rotation degree
    // Align index exactly with pointers (wheel split is 360 / 8 = 45 degrees)
    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full spins
    const targetDeg = extraSpins * 360 - sectorIndex * 45;

    setSpinDeg(targetDeg);

    // After 4s animation, give reward
    setTimeout(() => {
      setIsSpinning(false);
      setReward(chosenSector);
      
      // Play rewarding sound
      audioEngine.playCombo();
      onClaimCoins(chosenSector.amount);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-4xl p-6 relative overflow-hidden text-center shadow-[0_0_50px_rgba(251,191,36,0.2)]"
      >
        
        {/* Neon Header border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSpinning}
          className="absolute top-4 right-4 p-2 bg-slate-950/60 border border-white/5 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer outline-none"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <span className="block text-[10px] uppercase font-mono tracking-widest text-amber-400">ARCADE REWARD CHAMBER</span>
          <h3 className="text-2xl font-black text-white tracking-wide flex items-center justify-center gap-1.5 mt-1">
            DAILY LUCKY WHEEL
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Spin the golden wheel once per day to secure coin bonuses!
          </p>
        </div>

        {/* WHEEL CONTAINER */}
        <div className="relative w-72 h-72 mx-auto my-8 flex items-center justify-center">
          
          {/* Central Target Indicator Needles */}
          <div className="absolute -top-3 z-20 w-5 h-6 bg-rose-500 rounded-b-lg shadow-lg rotate-180 border-2 border-white" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />

          {/* Spinner Circle Wheel */}
          <div 
            className="w-full h-full rounded-full border-4 border-slate-950 bg-slate-950 relative overflow-hidden shadow-2xl transition-transform ease-out duration-[4500ms]"
            style={{ 
              transform: `rotate(${spinDeg}deg)`,
              boxShadow: '0 0 35px rgba(245, 158, 11, 0.25)'
            }}
          >
            {/* Draw sectors splitting */}
            {sectors.map((sec, idx) => (
              <div
                key={idx}
                className="absolute top-0 left-0 w-full h-full origin-center flex items-start justify-center"
                style={{ 
                  transform: `rotate(${idx * 45}deg)`,
                  clipPath: 'polygon(50% 50%, 31% 0, 69% 0)'
                }}
              >
                <div className={`w-full h-1/2 bg-gradient-to-b ${sec.color} flex flex-col items-center justify-start pt-6 text-center`}>
                  <Coins className="w-5 h-5 text-amber-400 mb-1" />
                  <span className="text-[10px] font-mono font-bold tracking-tight text-white leading-none whitespace-nowrap">
                    {sec.label}
                  </span>
                </div>
              </div>
            ))}

            {/* Hub hubcaps center */}
            <div className="absolute inset-[38%] rounded-full bg-slate-900 border-2 border-white/10 flex items-center justify-center shadow-lg z-10">
              <span className="text-lg">🎡</span>
            </div>

          </div>

          {/* Inner Light trail shadows rings */}
          <div className="absolute inset-[-1px] rounded-full border-2 border-white/5 pointer-events-none" />
        </div>

        {/* RESULTS CARD OR SPIN ACTION */}
        <AnimatePresence mode="wait">
          {!reward ? (
            <motion.button
              key="spin-btn"
              whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(251,191,36,0.5)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSpin}
              disabled={isSpinning}
              className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest cursor-pointer outline-none relative overflow-hidden ${
                isSpinning
                  ? 'bg-slate-800 text-slate-500 cursor-default'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950'
              }`}
            >
              {isSpinning ? 'SPINNING CHAMBERS...' : 'LAUNCH SPIN WHEEL'}
            </motion.button>
          ) : (
            <motion.div
              key="reward-result"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-4"
            >
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center">
                <Sparkles className="w-8 h-8 text-emerald-400 animate-bounce mb-1" />
                <span className="block text-[10px] uppercase font-mono tracking-widest text-slate-400">WINNING SECURED</span>
                <span className="text-xl font-black text-white font-mono mt-1">
                  + 🪙 {reward.amount} Arcade Coins
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-3.5 bg-slate-800 text-white font-bold tracking-wider rounded-2xl uppercase transition-colors hover:bg-slate-700 cursor-pointer outline-none"
              >
                COLLECT AND CLOSE
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
