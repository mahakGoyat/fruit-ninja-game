/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Extreme';

export interface LevelConfig {
  number: number;
  difficulty: Difficulty;
  targetScore: number;
  duration: number; // in seconds
  fruitSpeed: number;
  bombChance: number; // 0 to 1
  spawnInterval: number; // in ms
  maxMisses: number;
}

export interface UserProgress {
  name: string;
  unlockedLevels: number; // 1 to 100
  highScore: number;
  totalSlices: number;
  totalCombos: number;
  bombSplats: number;
  coins: number;
  lastDailyRewardClaimed?: string; // ISO string or date representation
  achievements: string[]; // unlocked achievement IDs
  unlockedBlades: string[]; // blade types
  equippedBlade: string; // current active blade
}

export type ThemeType = 'neon' | 'dark' | 'classic';

export interface GameSettings {
  soundEnabled: boolean;
  fxVolume: number;
  musicVolume: number;
  vibrationEnabled: boolean;
  theme: ThemeType;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  requirement: string;
  rewardCoins: number;
  icon: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  level: number;
  date: string;
}

export interface ActivePowerup {
  type: 'slow_motion' | 'double_points' | 'fire_blade';
  timeLeft: number; // in ms
  duration: number; // default duration
}

export type GameScreen = 
  | 'login'
  | 'home'
  | 'levels'
  | 'game'
  | 'settings'
  | 'tutorial'
  | 'leaderboard'
  | 'achievements';
