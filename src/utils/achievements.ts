/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Achievement } from '../types';

export const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_slice',
    title: 'First Blood',
    description: 'Slash your very first fruit!',
    requirement: 'Slice 1 fruit',
    rewardCoins: 50,
    icon: 'Sword',
  },
  {
    id: 'combo_initiate',
    title: 'Combo Initiate',
    description: 'Get a 3-fruit combo in a single strike!',
    requirement: '3x combo',
    rewardCoins: 100,
    icon: 'Zap',
  },
  {
    id: 'combo_master',
    title: 'Combo Master',
    description: 'Unleash a devastating 5-fruit combo!',
    requirement: '5x combo',
    rewardCoins: 250,
    icon: 'Crown',
  },
  {
    id: 'level_10',
    title: 'Rising Ninja',
    description: 'Unlock Level 10',
    requirement: 'Reach Level 10',
    rewardCoins: 150,
    icon: 'Sparkles',
  },
  {
    id: 'level_50',
    title: 'Grand Master',
    description: 'Unlock Level 50',
    requirement: 'Reach Level 50',
    rewardCoins: 500,
    icon: 'Flame',
  },
  {
    id: 'level_100',
    title: 'Fruit Shogun',
    description: 'Unlock Level 100',
    requirement: 'Reach Level 100',
    rewardCoins: 1000,
    icon: 'Trophy',
  },
  {
    id: 'bomb_dodger',
    title: 'Bomb Dodger',
    description: 'Hit 20 consecutive fruits without a single bomb interaction!',
    requirement: '20 fruit clean stretch',
    rewardCoins: 200,
    icon: 'ShieldAlert',
  },
  {
    id: 'coin_collector',
    title: 'Neon Collector',
    description: 'Earn a total of 500 Arcade Coins!',
    requirement: '500 coins',
    rewardCoins: 150,
    icon: 'Coins',
  },
  {
    id: 'all_blades',
    title: 'Blade Enthusiast',
    description: 'Unlock all custom element blades from the Arcade Store!',
    requirement: 'Unlock all 5 blades',
    rewardCoins: 400,
    icon: 'ShoppingBag',
  }
];

export interface BladeDefinition {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  price: number;
  effect: 'normal' | 'slow_motion' | 'double_points' | 'fire_blade';
  description: string;
}

export const BLADES: BladeDefinition[] = [
  {
    id: 'classic_steel',
    name: 'Classic Steel',
    color: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.6)',
    price: 0,
    effect: 'normal',
    description: 'Standard razor-sharp steel blade. Pure performance.'
  },
  {
    id: 'slow_motion_blade',
    name: 'Glacial Edge',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.8)',
    price: 200,
    effect: 'slow_motion',
    description: 'Slows down spawned fruits slightly when active (increases precision).'
  },
  {
    id: 'double_points_blade',
    name: 'Golden Katana',
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.8)',
    price: 350,
    effect: 'double_points',
    description: 'Doubles points on all combo slices!'
  },
  {
    id: 'fire_blade',
    name: 'Inferno Saber',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.8)',
    price: 500,
    effect: 'fire_blade',
    description: 'Burns bombs away! Slicing a bomb will only spark it off without blasting your lives (limited up to 1 use per match).'
  },
  {
    id: 'cosmic_rainbow_blade',
    name: 'Cosmic Rainbow',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    price: 800,
    effect: 'normal',
    description: 'A legendary cosmic energy katana that paints a shifting neon rainbow light trail on the screen and emits sparkling rainbow starbursts!'
  }
];
