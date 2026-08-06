/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Trophy, Medal, Star, Shield, Flame } from 'lucide-react';
import { LeaderboardEntry, UserProgress } from '../types';
import { audioEngine } from '../utils/audio';

interface LeaderboardScreenProps {
  progress: UserProgress;
  onBack: () => void;
}

export default function LeaderboardScreen({ progress, onBack }: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // 1. Fetch score values from LocalStorage
    const stored = localStorage.getItem('fruit_ninja_leaderboard');
    let data: LeaderboardEntry[] = [];
    
    if (stored) {
      try {
        data = JSON.parse(stored);
      } catch (e) {
        console.error("Invalid leaderboard syntax", e);
      }
    }

    // 2. If empty, pre-populate nostalgic retro CPU records to keep the board highly engaging!
    if (data.length === 0) {
      const defaultCPU: LeaderboardEntry[] = [
        { name: 'SENSEI_SOTO', score: 3500, level: 85, date: '2026-05-18' },
        { name: 'BOMB_SABOTAGE', score: 2850, level: 66, date: '2026-05-20' },
        { name: 'KAGE_KUN', score: 2400, level: 52, date: '2026-05-21' },
        { name: 'CHERRY_BLOSSOM', score: 1950, level: 41, date: '2026-05-22' },
        { name: 'NEON_BLADE', score: 1500, level: 30, date: '2026-05-22' }
      ];
      data = defaultCPU;
      localStorage.setItem('fruit_ninja_leaderboard', JSON.stringify(defaultCPU));
    }

    // 3. Inspect if the current player's score is present, or insert it dynamically
    const playerExists = data.some((ent) => ent.name === progress.name);
    if (progress.highScore > 0) {
      if (!playerExists) {
        data.push({
          name: progress.name || 'Anonymous',
          score: progress.highScore,
          level: progress.unlockedLevels,
          date: new Date().toISOString().split('T')[0]
        });
      } else {
        // Update score if higher
        data = data.map((ent) => {
          if (ent.name === progress.name && progress.highScore > ent.score) {
            return {
              ...ent,
              score: progress.highScore,
              level: progress.unlockedLevels,
              date: new Date().toISOString().split('T')[0]
            };
          }
          return ent;
        });
      }
    }

    // Sort by descending scores
    data.sort((a, b) => b.score - a.score);
    // Limit to top 8 entries
    setEntries(data.slice(0, 10));
  }, [progress]);

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 0:
        return 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse'; // Gold
      case 1:
        return 'text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.6)]'; // Silver
      case 2:
        return 'text-amber-600 drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]'; // Bronze
      default:
        return 'text-slate-500';
    }
  };

  const getRankIndicator = (rank: number) => {
    if (rank < 3) {
      return <Medal className={`w-5 h-5 ${getMedalColor(rank)}`} />;
    }
    return <span className="font-mono text-xs font-black text-slate-500">#{rank + 1}</span>;
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col justify-between overflow-hidden select-none">
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 z-10 gap-4">
        <button
          onClick={() => {
            audioEngine.playClick();
            onBack();
          }}
          className="p-3 bg-slate-900/60 hover:bg-slate-800 border border-white/5 rounded-2xl flex items-center justify-center cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-amber-300 tracking-wider">
            GOLDEN ROLL
          </h2>
          <span className="text-[10px] font-mono text-sky-400 tracking-widest uppercase">
            SUPREME LEADERBOARD
          </span>
        </div>

        <div className="w-11 h-11" />
      </div>

      {/* LEADERBOARD FRAME */}
      <div className="max-w-xl mx-auto w-full bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-5 md:p-7 z-10 my-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-rose-500 to-amber-500" />
        
        {/* Title Indicator */}
        <div className="flex items-center justify-between font-mono text-xs text-indigo-400 font-bold border-b border-white/5 pb-2 mb-3 px-2">
          <span className="flex items-center gap-1.5 uppercase">
            <Trophy className="w-4 h-4 text-amber-500" /> HALL OF LEGENDS
          </span>
          <span className="uppercase text-slate-400">SCORE RECORDS</span>
        </div>

        {/* Dynamic score entries list */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {entries.map((ent, idx) => {
            const isUser = ent.name === progress.name;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`py-3 px-4 rounded-xl border flex items-center justify-between gap-4 select-none ${
                  isUser
                    ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)] font-bold'
                    : 'bg-slate-950/40 border-white/5 hover:bg-slate-950/70 hover:border-white/10'
                }`}
              >
                {/* Left side Rank + Name */}
                <div className="flex items-center gap-3">
                  <div className="w-8 flex items-center justify-center">
                    {getRankIndicator(idx)}
                  </div>
                  <div>
                    <span className={`text-sm tracking-wide block ${isUser ? 'text-rose-400 font-extrabold' : 'text-slate-200'}`}>
                      {ent.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 block uppercase">
                      REACHED LVL {ent.level} • {ent.date}
                    </span>
                  </div>
                </div>

                {/* Right side Points Tracker */}
                <div className="text-right flex items-center gap-2">
                  <span className={`text-base font-mono font-black ${isUser ? 'text-amber-400' : 'text-sky-400'}`}>
                    {ent.score.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">PTS</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Underlay Info showing your current standing */}
        {progress.highScore === 0 && (
          <div className="mt-5 text-center p-3.5 bg-slate-950/60 rounded-xl border border-dashed border-white/5">
            <p className="text-xs text-slate-400 font-mono">
              ★ NO RANK REGISTERED YET ★
              <br />
              Complete a stage and defeat fruit swarms to write your destiny.
            </p>
          </div>
        )}
      </div>

      <div className="w-full text-center mt-8">
        <span className="text-[10px] font-mono text-slate-600 uppercase">
          Fruit Ninja • Dynamic Neon Scoreboards
        </span>
      </div>

    </div>
  );
}
