/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { GameScreen, UserProgress, GameSettings } from './types';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import LevelSelector from './components/LevelSelector';
import SettingsMenu from './components/SettingsMenu';
import TutorialScreen from './components/TutorialScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import AchievementsScreen from './components/AchievementsScreen';
import GameCanvas from './components/GameCanvas';
import DailyRewardModal from './components/DailyRewardModal';
import { audioEngine } from './utils/audio';

const STORAGE_PROGRESS_KEY = 'fruit_ninja_v4_progress';
const STORAGE_SETTINGS_KEY = 'fruit_ninja_v4_settings';

const DEFAULT_PROGRESS: UserProgress = {
  name: '',
  unlockedLevels: 1,
  highScore: 0,
  totalSlices: 0,
  totalCombos: 0,
  bombSplats: 0,
  coins: 100, // Starts with some gold coins to explore the store!
  achievements: [],
  unlockedBlades: ['classic_steel'],
  equippedBlade: 'classic_steel',
};

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  fxVolume: 1.2,
  musicVolume: 0.35,
  vibrationEnabled: true,
  theme: 'neon',
};

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('login');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [isDailyAvailable, setIsDailyAvailable] = useState(false);

  // Core loaded profiles state
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  // 1. Initial State Hydration from local storage
  useEffect(() => {
    const rawProg = localStorage.getItem(STORAGE_PROGRESS_KEY);
    const rawSett = localStorage.getItem(STORAGE_SETTINGS_KEY);

    let progressLoaded = DEFAULT_PROGRESS;
    let settingsLoaded = DEFAULT_SETTINGS;

    if (rawProg) {
      try {
        progressLoaded = { ...DEFAULT_PROGRESS, ...JSON.parse(rawProg) };
      } catch (e) {
        console.warn('Invalid loaded progress data', e);
      }
    }
    
    if (rawSett) {
      try {
        settingsLoaded = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSett) };
      } catch (e) {
        console.warn('Invalid loaded settings data', e);
      }
    }

    setProgress(progressLoaded);
    setSettings(settingsLoaded);

    // Initialize audio node preferences dynamically
    audioEngine.setSettings(
      settingsLoaded.soundEnabled,
      settingsLoaded.fxVolume,
      settingsLoaded.musicVolume
    );

    // Route automatically to lobby workspace if name exists
    if (progressLoaded.name.trim()) {
      setScreen('home');
    } else {
      setScreen('login');
    }

    // Inspect if daily rewards wheel ready to claim (once per solar date)
    checkDailyChanceAvailability(progressLoaded);
  }, []);

  const checkDailyChanceAvailability = (prog: UserProgress) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (prog.lastDailyRewardClaimed !== todayStr) {
      setIsDailyAvailable(true);
    } else {
      setIsDailyAvailable(false);
    }
  };

  // 2. State-writing modifiers
  const updateProgress = (updates: Partial<UserProgress>) => {
    setProgress((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(next));
      checkDailyChanceAvailability(next);
      return next;
    });
  };

  const updateSettings = (updates: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(next));
      // Link dynamics feedback parameters
      audioEngine.setSettings(next.soundEnabled, next.fxVolume, next.musicVolume);
      return next;
    });
  };

  // 3. Audio chord controller linking screen shifts
  useEffect(() => {
    if (settings.soundEnabled && screen !== 'game') {
      audioEngine.startMusic();
    } else {
      audioEngine.stopMusic();
    }
  }, [screen, settings.soundEnabled]);

  // Handle user register completion
  const handleLoginCompleted = (name: string) => {
    updateProgress({ name });
    setScreen('home');
    audioEngine.playPowerup();
  };

  // Claim spinning reward
  const handleClaimDailyCoins = (amount: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    updateProgress({
      coins: progress.coins + amount,
      lastDailyRewardClaimed: todayStr
    });
  };

  return (
    <div className={`min-h-screen text-white select-none relative font-sans ${
      settings.theme === 'classic'
        ? 'bg-slate-950 text-amber-500'
        : settings.theme === 'dark'
          ? 'bg-black text-slate-300'
          : 'bg-slate-950 text-fuchsia-400'
    }`}>
      
      {/* SCREEN ROUTING */}
      {screen === 'login' && (
        <LoginScreen 
          savedName={progress.name} 
          onLogin={handleLoginCompleted} 
        />
      )}

      {screen === 'home' && (
        <HomeScreen
          progress={progress}
          settings={settings}
          onNavigate={(target) => setScreen(target)}
          onOpenDailyModal={() => setIsDailyOpen(true)}
          isDailyAvailable={isDailyAvailable}
        />
      )}

      {screen === 'levels' && (
        <LevelSelector
          progress={progress}
          onSelectLevel={(lvl) => {
            setSelectedLevel(lvl);
            setScreen('game');
          }}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'game' && (
        <GameCanvas
          levelNumber={selectedLevel}
          progress={progress}
          settings={settings}
          onUpdateProgress={updateProgress}
          onNavigateHome={() => setScreen('home')}
          onNavigateLevels={() => setScreen('levels')}
          onNextLevel={() => setSelectedLevel((prev) => Math.min(100, prev + 1))}
        />
      )}

      {screen === 'settings' && (
        <SettingsMenu
          settings={settings}
          onUpdateSettings={updateSettings}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'tutorial' && (
        <TutorialScreen
          onBack={() => setScreen('home')}
          onStartLevelOne={() => {
            setSelectedLevel(1);
            setScreen('game');
          }}
        />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen
          progress={progress}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'achievements' && (
        <AchievementsScreen
          progress={progress}
          onUpdateProgress={updateProgress}
          onBack={() => setScreen('home')}
        />
      )}

      {/* DAILY SPIN MODAL OVERLAY */}
      <AnimatePresence>
        {isDailyOpen && (
          <DailyRewardModal
            onClose={() => setIsDailyOpen(false)}
            onClaimCoins={handleClaimDailyCoins}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
