/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface LoginScreenProps {
  onLogin: (name: string) => void;
  savedName: string;
}

export default function LoginScreen({ onLogin, savedName }: LoginScreenProps) {
  const [name, setName] = useState(savedName || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    audioEngine.playClick();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please Enter a Warrior Name!');
      return;
    }
    onLogin(trimmed);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-radial from-slate-950 via-slate-900 to-black p-4 select-none">
      
      {/* Dynamic Animated Floating Neon Fruits in the Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 overflow-hidden">
        <motion.div 
          animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/10 w-16 h-16 rounded-full bg-red-600 blur-sm flex items-center justify-center text-4xl"
        >
          🍎
        </motion.div>
        <motion.div 
          animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/10 w-20 h-20 rounded-full bg-emerald-500 blur-md flex items-center justify-center text-5xl"
        >
          🍉
        </motion.div>
        <motion.div 
          animate={{ y: [0, -25, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 right-1/5 w-14 h-14 rounded-full bg-amber-500 blur-sm flex items-center justify-center text-3xl"
        >
          🍊
        </motion.div>
        <motion.div 
          animate={{ y: [0, 18, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/3 left-1/6 w-16 h-16 rounded-full bg-yellow-400 blur-xs flex items-center justify-center text-4xl"
        >
          🍌
        </motion.div>
      </div>

      {/* Grid of Glowing Background lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md z-10 px-4"
      >
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-4xl p-8 border border-white/10 shadow-[0_0_50px_rgba(244,63,94,0.15)] text-center relative overflow-hidden">
          
          {/* Top Neon Light Bars */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-amber-500 shadow-[0_2px_15px_rgba(239,68,68,0.7)]" />

          {/* Glowing Game Title */}
          <div className="mb-8 select-none">
            <motion.h1 
              initial={{ y: -30 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="text-5xl md:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-400 to-amber-400 font-sans"
              style={{ filter: "drop-shadow(0 0 15px rgba(244, 63, 94, 0.4))" }}
            >
              FRUIT NINJA
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs uppercase tracking-widest text-sky-400 mt-2 font-mono"
            >
              Ultimate Neon Arcade
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-left">
              <label htmlFor="playerName" className="block text-xs uppercase tracking-widest text-slate-400 font-mono font-bold pl-1">
                WARRIOR IDENTITY
              </label>
              <div className="relative">
                <input
                  id="playerName"
                  type="text"
                  maxLength={15}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter Your Name..."
                  className="w-full bg-slate-950/60 border border-white/10 rounded-2xl py-4.5 px-6 text-white text-lg placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all font-sans text-center font-semibold"
                  style={{ textShadow: name ? "0 0 8px rgba(255,255,255,0.3)" : "none" }}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <Sparkles className="w-5 h-5 animate-pulse text-rose-400" />
                </div>
              </div>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-rose-400 text-xs font-mono font-semibold pl-1"
                >
                  ⚠ {error}
                </motion.p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 25px rgba(244,63,94,0.5)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold tracking-wider py-4.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-shadow shadow-[0_4px_20px_rgba(244,63,94,0.3)] hover:from-rose-600 hover:to-amber-600 outline-none"
            >
              <span className="text-lg uppercase">CONTINUE</span>
              <Play className="w-5 h-5 fill-white" />
            </motion.button>
          </form>

          {/* Subtext info */}
          <p className="text-[10px] text-slate-500 font-mono mt-8 leading-relaxed">
            POWERED BY HTML5 CANVAS ENGINE & WEB AUDIO SYNTHESIZER
            <br />
            NO RE-DOWNLOADS • PROGRESS AUTOMATICALLY REGISTERED
          </p>

        </div>
      </motion.div>
    </div>
  );
}
