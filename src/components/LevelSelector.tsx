/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Lock, Trophy, Play, Star, Sparkles } from 'lucide-react';
import { UserProgress, Difficulty } from '../types';
import { getLevelConfig, getDifficulty } from '../utils/levels';
import { audioEngine } from '../utils/audio';

interface LevelSelectorProps {
  progress: UserProgress;
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}

export default function LevelSelector({ progress, onSelectLevel, onBack }: LevelSelectorProps) {
  const [activeTab, setActiveTab] = useState<'all' | Difficulty>('all');

  const levelsArray = Array.from({ length: 100 }, (_, i) => i + 1);

  const filteredLevels = levelsArray.filter((lvl) => {
    if (activeTab === 'all') return true;
    return getDifficulty(lvl) === activeTab;
  });

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case 'Easy':
        return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      case 'Medium':
        return 'border-amber-500/30 text-amber-400 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
      case 'Hard':
        return 'border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/5 shadow-[0_0_15px_rgba(217,70,239,0.1)]';
      case 'Extreme':
        return 'border-rose-500/30 text-rose-400 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.12)]';
    }
  };

  const tabs: { id: 'all' | Difficulty; label: string; color: string }[] = [
    { id: 'all', label: 'ALL LEVELS', color: 'bg-slate-800' },
    { id: 'Easy', label: 'EASY (1-20)', color: 'bg-emerald-500' },
    { id: 'Medium', label: 'MED (21-50)', color: 'bg-amber-500' },
    { id: 'Hard', label: 'HARD (51-80)', color: 'bg-fuchsia-500' },
    { id: 'Extreme', label: 'EXTR (81-100)', color: 'bg-rose-500' },
  ];

  const handleLaunchLevel = (lvlNum: number) => {
    if (lvlNum > progress.unlockedLevels) {
      audioEngine.playClick();
      return; // Locked
    }
    audioEngine.playPowerup();
    onSelectLevel(lvlNum);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col overflow-hidden select-none">
      
      {/* Interactive Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* header row */}
      <div className="flex items-center justify-between z-10 mb-6 gap-4">
        <button
          onClick={() => {
            audioEngine.playClick();
            onBack();
          }}
          className="p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 rounded-2xl flex items-center justify-center cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-amber-300 tracking-wider">
            CAMPAIGN PORTAL
          </h2>
          <span className="text-[10px] font-mono text-sky-400 tracking-widest uppercase">
            100 PROGRESSIVE STAGES
          </span>
        </div>

        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-1.5 font-mono text-xs text-amber-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          LVL {progress.unlockedLevels}/100
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6 z-10 max-w-2xl mx-auto w-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                audioEngine.playClick();
                setActiveTab(tab.id);
              }}
              className={`py-2 px-3.5 text-xs font-bold tracking-wider rounded-xl cursor-pointer transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-br from-rose-500 to-amber-500 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-slate-900/60 border border-white/5 hover:bg-slate-900 hover:border-white/10 text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* PROGRESS METRICS BOX */}
      <div className="w-full max-w-4xl mx-auto bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-4.5 mb-6 z-10 flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400/20" />
          <span className="text-xs text-slate-300">
            CURRENT WARRIOR GEAR: <strong className="text-rose-400">BLADE TRAIL ACTIVE</strong>
          </span>
        </div>
        <div className="text-xs text-slate-400">
          Current Score Record: <strong className="text-sky-400 font-bold">{progress.highScore} pts</strong>
        </div>
      </div>

      {/* 100 LEVELS GRID */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full z-10 pr-1 select-none" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 p-1">
          {filteredLevels.map((lvl) => {
            const isUnlocked = lvl <= progress.unlockedLevels;
            const isTarget = lvl === progress.unlockedLevels;
            const conf = getLevelConfig(lvl);

            return (
              <motion.button
                key={lvl}
                whileHover={isUnlocked ? { scale: 1.05, y: -2 } : {}}
                whileTap={isUnlocked ? { scale: 0.95 } : {}}
                onClick={() => handleLaunchLevel(lvl)}
                className={`aspect-square relative flex flex-col items-center justify-between p-2.5 rounded-2xl border transition-all duration-300 outline-none ${
                  isUnlocked
                    ? isTarget
                      ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-2 ring-rose-500/20'
                      : getDifficultyColor(conf.difficulty) + ' cursor-pointer'
                    : 'bg-slate-950/60 border-slate-900 text-slate-600 shadow-inner'
                }`}
              >
                {/* Badge Indicator for difficulty tier */}
                <div className="absolute top-1.5 left-2 text-[7px] font-mono tracking-tighter uppercase opacity-85">
                  L{lvl}
                </div>

                {/* Main symbol or status */}
                <div className="my-auto flex flex-col items-center justify-center">
                  {!isUnlocked ? (
                    <Lock className="w-4 h-4 text-slate-700 mt-2" />
                  ) : isTarget ? (
                    <Play className="w-5 h-5 text-rose-500 fill-rose-500/20 mt-1 animate-pulse" />
                  ) : (
                    <Trophy className="w-4 h-4 text-amber-500/70 mt-1" />
                  )}
                  {isUnlocked && (
                    <span className="text-[10px] font-bold block mt-1">
                      {lvl}
                    </span>
                  )}
                </div>

                {/* Sub info */}
                {isUnlocked ? (
                  <div className="text-[7.5px] font-mono tracking-tight text-center truncate w-full text-slate-400">
                    Target: {conf.targetScore}
                  </div>
                ) : (
                  <div className="text-[7.5px] font-mono tracking-tight text-center text-slate-800">
                    Locked
                  </div>
                )}

                {/* Glow ring for levels tab target */}
                {isTarget && (
                  <span className="absolute -inset-[1px] rounded-2xl border border-rose-400 pointer-events-none animate-pulse" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
