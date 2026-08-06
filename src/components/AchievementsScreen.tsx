/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Sword, Zap, Crown, Trophy, Sparkles, Flame, Coins, ShieldAlert, ShoppingBag, Award, CheckCircle2 
} from 'lucide-react';
import { UserProgress, Achievement } from '../types';
import { ALL_ACHIEVEMENTS, BLADES, BladeDefinition } from '../utils/achievements';
import { audioEngine } from '../utils/audio';

interface AchievementsScreenProps {
  progress: UserProgress;
  onUpdateProgress: (updates: Partial<UserProgress>) => void;
  onBack: () => void;
}

export default function AchievementsScreen({ progress, onUpdateProgress, onBack }: AchievementsScreenProps) {
  const [activeTab, setActiveTab] = useState<'badges' | 'shop'>('badges');

  const getIcon = (iconName: string, unlocked: boolean) => {
    const sizeClasses = "w-5 h-5 shrink-0";
    const colorClass = unlocked ? "text-amber-400" : "text-slate-600";
    switch (iconName) {
      case 'Sword': return <Sword className={`${sizeClasses} ${colorClass}`} />;
      case 'Zap': return <Zap className={`${sizeClasses} ${colorClass}`} />;
      case 'Crown': return <Crown className={`${sizeClasses} ${colorClass}`} />;
      case 'Sparkles': return <Sparkles className={`${sizeClasses} ${colorClass}`} />;
      case 'Flame': return <Flame className={`${sizeClasses} ${colorClass}`} />;
      case 'Trophy': return <Trophy className={`${sizeClasses} ${colorClass}`} />;
      case 'ShieldAlert': return <ShieldAlert className={`${sizeClasses} ${colorClass}`} />;
      case 'Coins': return <Coins className={`${sizeClasses} ${colorClass}`} />;
      default: return <Award className={`${sizeClasses} ${colorClass}`} />;
    }
  };

  const handleClaimAchievement = (ach: Achievement) => {
    if (progress.achievements.includes(ach.id)) return; // Already claimed

    audioEngine.playPowerup();
    onUpdateProgress({
      coins: progress.coins + ach.rewardCoins,
      achievements: [...progress.achievements, ach.id]
    });
  };

  // Helper inside loop to check if condition met
  const isAwardUnlocked = (achId: string) => {
    switch (achId) {
      case 'first_slice':
        return progress.totalSlices >= 1;
      case 'combo_initiate':
        return progress.totalCombos >= 1;
      case 'combo_master':
        return progress.totalCombos >= 5; // e.g. had at least 5 combos
      case 'level_10':
        return progress.unlockedLevels >= 10;
      case 'level_50':
        return progress.unlockedLevels >= 50;
      case 'level_100':
        return progress.unlockedLevels >= 100;
      case 'bomb_dodger':
        return progress.totalSlices > 20 && progress.bombSplats === 0;
      case 'coin_collector':
        return progress.coins >= 500;
      case 'all_blades':
        return progress.unlockedBlades.length >= 5;
      default:
        return false;
    }
  };

  const handleBuyBlade = (blade: BladeDefinition) => {
    audioEngine.playClick();
    if (progress.unlockedBlades.includes(blade.id)) {
      // Just Equip
      onUpdateProgress({ equippedBlade: blade.id });
      audioEngine.playPowerup();
      return;
    }

    if (progress.coins < blade.price) {
      return; // Too expensive
    }

    // Buy
    const updatedUnlocks = [...progress.unlockedBlades, blade.id];
    let updatedCoins = progress.coins - blade.price;
    
    // Check if purchasing this unlocked the 'all_blades' badge
    let achievements = [...progress.achievements];
    if (updatedUnlocks.length >= 5 && !achievements.includes('all_blades')) {
      achievements.push('all_blades');
      updatedCoins += 400; // Reward coins
    }

    onUpdateProgress({
      coins: updatedCoins,
      unlockedBlades: updatedUnlocks,
      equippedBlade: blade.id,
      achievements
    });

    audioEngine.playPowerup();
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col justify-between overflow-hidden select-none">
      
      {/* Background neon style lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-6 z-10 gap-4">
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
          <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-300 tracking-wider">
            ARMORY & ACCOMPLISHMENTS
          </h2>
          <span className="text-[10px] font-mono text-fuchsia-400 tracking-widest uppercase">
            UPGRADES, STATS & MILESTONES
          </span>
        </div>

        {/* Currency Display */}
        <div className="py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-1.5 font-mono text-sm font-bold text-amber-400">
          🪙 {progress.coins}
        </div>
      </div>

      {/* DUAL MODE TABS SELECTOR */}
      <div className="flex max-w-sm mx-auto w-full border border-white/5 rounded-2xl p-1 bg-slate-900/60 backdrop-blur-md mb-6 z-10">
        <button
          onClick={() => {
            audioEngine.playClick();
            setActiveTab('badges');
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all pointer-events-auto cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'badges'
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg'
              : 'text-slate-400'
          }`}
        >
          <Award className="w-4 h-4" />
          BADGES
        </button>

        <button
          onClick={() => {
            audioEngine.playClick();
            setActiveTab('shop');
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all pointer-events-auto cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'shop'
              ? 'bg-gradient-to-r from-fuchsia-500 to-amber-500 text-slate-950 shadow-lg font-black'
              : 'text-slate-400'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          BLADE SHOP
        </button>
      </div>

      {/* CONTENT PANEL */}
      <div className="flex-1 max-w-4xl mx-auto w-full z-10 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        
        {/* ======================= TAB 1: BADGES GRID ======================= */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ALL_ACHIEVEMENTS.map((ach) => {
              const claimed = progress.achievements.includes(ach.id);
              const met = isAwardUnlocked(ach.id) || claimed;

              return (
                <div
                  key={ach.id}
                  className={`bg-slate-900/40 backdrop-blur-md border rounded-3xl p-5 flex items-start gap-4 transition-all duration-300 ${
                    claimed
                      ? 'border-emerald-500/20 bg-emerald-500/1'
                      : met
                        ? 'border-violet-500/30 bg-violet-500/5 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                        : 'border-white/5 opacity-80'
                  }`}
                >
                  {/* Badge Art Circular Icon */}
                  <div className={`p-3.5 rounded-2xl border ${
                    met ? 'bg-slate-950 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-slate-950/40 border-slate-900'
                  }`}>
                    {getIcon(ach.icon, met)}
                  </div>

                  {/* Descriptions and Claims action */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm font-bold tracking-wide ${met ? 'text-slate-200 font-extrabold' : 'text-slate-500'}`}>
                        {ach.title}
                      </h4>
                      {claimed && (
                        <span className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> CLAIMED
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      {ach.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-white/5">
                      <span className="text-slate-500">Req: {ach.requirement}</span>
                      
                      {claimed ? (
                        <span className="text-slate-500">🏆 Completed</span>
                      ) : met ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleClaimAchievement(ach)}
                          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-lg flex items-center gap-1 select-none pointer-events-auto cursor-pointer"
                        >
                          CLAIM 🪙{ach.rewardCoins}
                        </motion.button>
                      ) : (
                        <span className="text-slate-600 font-bold uppercase">Locked 🔒</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ======================= TAB 2: BLADES SHOP ======================= */}
        {activeTab === 'shop' && (
          <div className="space-y-6">
            
            {/* Passive details indicator */}
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 text-xs text-slate-300 leading-relaxed font-mono">
              ⚡ <strong>ARMORY RULE:</strong> Equipped blades replace your classic canvas trail colors and inject active combat modifiers in all games automatically! Only one blade can be held active at once.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BLADES.map((blade) => {
                const unlocked = progress.unlockedBlades.includes(blade.id);
                const active = progress.equippedBlade === blade.id;
                const canAfford = progress.coins >= blade.price;

                return (
                  <div
                    key={blade.id}
                    className={`bg-slate-900/40 backdrop-blur-md border rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                      active
                        ? 'border-amber-400 bg-amber-400/1 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                        : unlocked
                          ? 'border-white/10 bg-slate-950/20'
                          : 'border-white/5 opacity-85'
                    }`}
                  >
                    
                    {/* Glowing Light color indicators mimicking your trail */}
                    <div 
                      className="absolute top-0 left-0 w-full h-1" 
                      style={{ 
                        background: `linear-gradient(90deg, ${blade.color}, transparent)`,
                        boxShadow: `0 2px 10px ${blade.glowColor}`
                      }} 
                    />

                    {/* Blade Header */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center border"
                          style={{ borderColor: blade.color, boxShadow: `0 0 10px ${blade.glowColor}` }}
                        >
                          <Sword className="w-4 h-4" style={{ color: blade.color }} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white tracking-wide">{blade.name}</h4>
                          <span className="text-[9px] font-mono text-slate-500 uppercase">{blade.effect.replace('_', ' ')} trail modifier</span>
                        </div>
                      </div>

                      {active ? (
                        <span className="text-[10px] font-mono font-black italic bg-amber-400 text-slate-950 py-0.5 px-2 rounded">EQUIPPED</span>
                      ) : unlocked ? (
                        <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">OWNED</span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-0.5">
                          🪙 {blade.price}
                        </span>
                      )}
                    </div>

                    {/* Descr */}
                    <p className="text-xs text-slate-300 font-sans leading-relaxed mb-6">
                      {blade.description}
                    </p>

                    {/* Action button */}
                    <motion.button
                      whileHover={active ? {} : { scale: 1.02 }}
                      whileTap={active ? {} : { scale: 0.98 }}
                      onClick={() => handleBuyBlade(blade)}
                      disabled={active}
                      className={`w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider select-none pointer-events-auto cursor-pointer transition-all outline-none ${
                        active
                          ? 'bg-slate-950 border border-slate-800 text-slate-500 cursor-default'
                          : unlocked
                            ? 'bg-slate-800 hover:bg-slate-700 text-white'
                            : canAfford
                              ? 'bg-gradient-to-r from-fuchsia-500 to-amber-500 text-slate-950 font-black hover:brightness-110'
                              : 'bg-slate-900 border border-white/5 text-slate-600 cursor-default'
                      }`}
                    >
                      {active ? 'CURRENT BLADE' : unlocked ? 'EQUIP BLADE' : canAfford ? 'PURCHASE BLADE' : 'COINS REQUIRED'}
                    </motion.button>

                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

      <div className="w-full text-center mt-8">
        <span className="text-[10px] font-mono text-slate-600 uppercase">
          Fruit Ninja • Upgrades apply to regular waves instantly
        </span>
      </div>

    </div>
  );
}
