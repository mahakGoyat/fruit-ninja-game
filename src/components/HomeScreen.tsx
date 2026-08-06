/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Play, List, Settings, HelpCircle, Trophy, Gift, Sparkles } from 'lucide-react';
import { UserProgress, GameSettings } from '../types';
import { audioEngine } from '../utils/audio';

interface HomeScreenProps {
  progress: UserProgress;
  settings: GameSettings;
  onNavigate: (screen: 'game' | 'levels' | 'settings' | 'tutorial' | 'leaderboard' | 'achievements') => void;
  onOpenDailyModal: () => void;
  isDailyAvailable: boolean;
}

export default function HomeScreen({
  progress,
  settings,
  onNavigate,
  onOpenDailyModal,
  isDailyAvailable,
}: HomeScreenProps) {
  
  const handleAction = (screen: 'game' | 'levels' | 'settings' | 'tutorial' | 'leaderboard' | 'achievements') => {
    audioEngine.playClick();
    onNavigate(screen);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between pb-8 pt-6 px-4 bg-slate-950 overflow-hidden select-none">
      
      {/* Background Neon Grids & Lights */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-rose-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-bl from-teal-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Ambient Fruits under overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-25 z-0">
        <motion.div 
          animate={{ y: [-10, 10, -10], rotate: [0, 360], x: [0, 15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute top-24 left-[15%] text-5xl"
        >
          🍓
        </motion.div>
        <motion.div 
          animate={{ y: [15, -15, 15], rotate: [360, 0], x: [0, -10, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 right-[10%] text-6xl"
        >
          🍍
        </motion.div>
        <motion.div 
          animate={{ y: [-20, 20, -20], rotate: [0, -360], x: [0, 8, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-24 left-[20%] text-5xl"
        >
          🍊
        </motion.div>
        <motion.div 
          animate={{ y: [10, -10, 10], rotate: [0, 360], x: [0, -12, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 left-[70%] text-4xl"
        >
          🍌
        </motion.div>
      </div>

      {/* HEADER SECTION: User Profile Info & Balance */}
      <motion.div 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-4xl z-10 flex flex-wrap justify-between items-center gap-4 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-4 md:px-8 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              {progress.name ? progress.name[0].toUpperCase() : 'N'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>
          <div>
            <div className="text-xs font-mono text-slate-400">WELCOME PLAYER</div>
            <div className="text-base font-black text-white tracking-wide flex items-center gap-1">
              {progress.name}
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="block text-[10px] font-mono text-slate-400">HIGH SCORE</span>
            <span className="text-base font-bold text-sky-400 font-mono tracking-wide">
              {progress.highScore.toLocaleString()}
            </span>
          </div>

          <div className="h-8 w-[1px] bg-white/10" />

          <div className="text-right">
            <span className="block text-[10px] font-mono text-slate-400">COINS</span>
            <span className="text-base font-bold text-amber-400 font-mono flex items-center justify-end gap-1">
              🪙 {progress.coins}
            </span>
          </div>

          <div className="h-8 w-[1px] bg-white/10" />

          <div className="text-right">
            <span className="block text-[10px] font-mono text-slate-400">UNLOCKED</span>
            <span className="text-base font-bold text-rose-400 font-mono">
              Lvl {progress.unlockedLevels}/100
            </span>
          </div>
        </div>
      </motion.div>

      {/* CENTRAL HERO BRANDING */}
      <div className="w-full max-w-md z-10 my-auto py-8">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="text-center mb-10"
        >
          <h2 
            className="text-6xl md:text-7xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 font-sans italic"
            style={{ filter: "drop-shadow(0 0 20px rgba(244, 63, 94, 0.45))" }}
          >
            FRUIT
            <br />
            NINJA
          </h2>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-sky-500/20 text-[10px] font-mono uppercase tracking-widest text-sky-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            V4.0 AMBIENT ARCADE ENGINE
          </div>
        </motion.div>

        {/* NAVIGATION GAME MENU BUTTONS */}
        <div className="space-y-4">
          
          {/* 1. START GAME: MAIN BIG BUTTON */}
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(244,63,94,0.6)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleAction('game')}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold tracking-wider py-4.5 rounded-2xl flex items-center justify-center gap-3 cursor-pointer shadow-[0_4px_25px_rgba(244,63,94,0.4)] transition-all outline-none"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
            <Play className="w-6 h-6 fill-white" />
            <span className="text-xl font-bold uppercase">START GAME</span>
          </motion.button>

          {/* 2. SUB NAVIGATION LINKS */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.9)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction('levels')}
              className="py-4 px-4 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:border-sky-500/20 shadow-md group outline-none"
            >
              <List className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">LEVELS</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.9)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction('settings')}
              className="py-4 px-4 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:border-amber-500/20 shadow-md group outline-none"
            >
              <Settings className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">SETTINGS</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.9)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction('tutorial')}
              className="py-4 px-4 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:border-emerald-500/20 shadow-md group outline-none"
            >
              <HelpCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">HOW TO PLAY</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.9)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction('leaderboard')}
              className="py-4 px-4 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:border-purple-500/20 shadow-md group outline-none"
            >
              <Trophy className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">LEADERBOARD</span>
            </motion.button>
          </div>

        </div>
      </div>

      {/* FOOTER: Interactive claimable Daily Reward Button */}
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm z-10"
      >
        <button
          onClick={() => {
            audioEngine.playPowerup();
            onOpenDailyModal();
          }}
          className={`w-full py-4.5 px-6 rounded-2xl border flex items-center justify-between pointer-events-auto cursor-pointer transition-all outline-none ${
            isDailyAvailable
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse'
              : 'bg-slate-900/40 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Gift className={`w-5 h-5 ${isDailyAvailable ? 'animate-bounce' : ''}`} />
            <div className="text-left">
              <span className="block text-[10px] uppercase tracking-widest font-mono font-bold text-slate-400">DAILY CHANCES</span>
              <span className="text-xs font-bold uppercase">{isDailyAvailable ? 'Claim Daily Reward Wheel!' : 'Daily claimed • Return tomorrow'}</span>
            </div>
          </div>
          {isDailyAvailable && (
            <span className="text-[10px] font-mono font-black italic bg-emerald-500 text-slate-950 py-0.5 px-2 rounded-md">READY</span>
          )}
        </button>

        <p className="text-[9px] text-center font-mono text-slate-600 mt-4 tracking-wider uppercase">
          © 2026 NEO-NINJA ARCADE INC. • SECURED VIA LOCAL STORAGE
        </p>
      </motion.div>

    </div>
  );
}
