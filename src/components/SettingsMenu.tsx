/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Volume2, VolumeX, Shuffle, Smartphone, Sparkles, Sliders } from 'lucide-react';
import { GameSettings, ThemeType } from '../types';
import { audioEngine } from '../utils/audio';

interface SettingsMenuProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onBack: () => void;
}

export default function SettingsMenu({ settings, onUpdateSettings, onBack }: SettingsMenuProps) {
  
  const handleToggleSound = () => {
    audioEngine.playClick();
    const nextVal = !settings.soundEnabled;
    onUpdateSettings({ soundEnabled: nextVal });
    
    // Control live synth state
    if (!nextVal) {
      audioEngine.stopMusic();
    } else {
      audioEngine.startMusic();
    }
  };

  const handleToggleVibration = () => {
    audioEngine.playClick();
    const nextVal = !settings.vibrationEnabled;
    onUpdateSettings({ vibrationEnabled: nextVal });

    if (nextVal) {
      // Execute a real brief hardware haptic buzz if supported on cellphones!
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(80);
      }
    }
  };

  const handleThemeChange = (theme: ThemeType) => {
    audioEngine.playClick();
    onUpdateSettings({ theme });
  };

  const handleFxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = parseFloat(e.target.value);
    onUpdateSettings({ fxVolume: nextVol });
    // Play test click as feedback
    audioEngine.playClick();
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = parseFloat(e.target.value);
    onUpdateSettings({ musicVolume: nextVol });
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
            ARCADE CONSOLE
          </h2>
          <span className="text-[10px] font-mono text-rose-400 tracking-widest uppercase">
            CONTROLS, SOUNDS & INTERFACES
          </span>
        </div>

        <div className="w-11 h-11" />
      </div>

      {/* MAIN SETTINGS OPTIONS LAYOUT */}
      <div className="max-w-2xl mx-auto w-full bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 z-10 space-y-8 my-auto relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 shadow-md" />
        
        {/* Section 1: Sound System */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Sliders className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold tracking-widest text-slate-200 uppercase font-mono">
              SOUND & ACOUSTICS
            </h3>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Master Sound Toggle</span>
              <span className="text-xs text-slate-400">Enable synthesized effects and tracks</span>
            </div>
            <button
              onClick={handleToggleSound}
              className={`w-14 h-8 rounded-full pointer-events-auto cursor-pointer p-1 transition-colors duration-300 ${
                settings.soundEnabled ? 'bg-rose-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.soundEnabled && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-slate-400 pr-1">
                  <span>Slash Dynamics (FX)</span>
                  <span>{Math.round(settings.fxVolume * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="w-4 h-4 text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.fxVolume}
                    onChange={handleFxVolumeChange}
                    className="flex-1 accent-rose-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <Volume2 className="w-4 h-4 text-rose-400" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-slate-400 pr-1">
                  <span>Ambient Zen Chords (Music)</span>
                  <span>{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="w-4 h-4 text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.musicVolume}
                    onChange={handleMusicVolumeChange}
                    className="flex-1 accent-rose-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <Volume2 className="w-4 h-4 text-rose-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Vibration (Haptics) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Smartphone className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold tracking-widest text-slate-200 uppercase font-mono">
              HAPTICS SYSTEM
            </h3>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Vibe Slices Feedback</span>
              <span className="text-xs text-slate-400">Buzzer or screen shake on slice & explode</span>
            </div>
            <button
              onClick={handleToggleVibration}
              className={`w-14 h-8 rounded-full pointer-events-auto cursor-pointer p-1 transition-colors duration-300 ${
                settings.vibrationEnabled ? 'bg-sky-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                  settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 3: Visual Theme Presets */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Shuffle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold tracking-widest text-slate-200 uppercase font-mono">
              ARCADE INTERACTIVE THEME
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Theme 1: Neon Theme */}
            <button
              onClick={() => handleThemeChange('neon')}
              className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer outline-none relative overflow-hidden ${
                settings.theme === 'neon'
                  ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-slate-950/60 border-white/5 text-slate-300 hover:border-white/15'
              }`}
            >
              <span className="font-bold text-xs uppercase block">Neon Arcade</span>
              <span className="text-[10px] font-mono text-rose-400 mt-1 block">Fuchsia Glow</span>
            </button>

            {/* Theme 2: Dark Theme */}
            <button
              onClick={() => handleThemeChange('dark')}
              className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer outline-none relative overflow-hidden ${
                settings.theme === 'dark'
                  ? 'bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                  : 'bg-slate-950/60 border-white/5 text-slate-300 hover:border-white/15'
              }`}
            >
              <span className="font-bold text-xs uppercase block">Obsidian Noir</span>
              <span className="text-[10px] font-mono text-sky-400 mt-1 block">Minimal Space</span>
            </button>

            {/* Theme 3: Classic Theme */}
            <button
              onClick={() => handleThemeChange('classic')}
              className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer outline-none relative overflow-hidden ${
                settings.theme === 'classic'
                  ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-950/60 border-white/5 text-slate-300 hover:border-white/15'
              }`}
            >
              <span className="font-bold text-xs uppercase block">Classic Dojo</span>
              <span className="text-[10px] font-mono text-amber-500 mt-1 block">Wooden Hue</span>
            </button>
          </div>
        </div>

      </div>

      <div className="w-full text-center mt-8">
        <span className="text-[10px] font-mono text-slate-600 uppercase">
          Fruit Ninja • Saved states persist implicitly on local storage
        </span>
      </div>

    </div>
  );
}
