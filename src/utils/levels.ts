/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LevelConfig, Difficulty } from '../types';

export function getDifficulty(level: number): Difficulty {
  if (level <= 20) return 'Easy';
  if (level <= 50) return 'Medium';
  if (level <= 80) return 'Hard';
  return 'Extreme';
}

export function getLevelConfig(level: number): LevelConfig {
  const num = Math.min(100, Math.max(1, level));
  const diff = getDifficulty(num);

  // Progressive parameters based on level
  let targetScore = 35 + (num - 1) * 15; // Level 1 is 35, Level 100 is higher and scales with the rich fruit spawning
  if (num > 20) targetScore = Math.floor(targetScore * 1.15);
  if (num > 50) targetScore = Math.floor(targetScore * 1.2);
  if (num > 80) targetScore = Math.floor(targetScore * 1.25);

  // Round target to neat 5s or 10s
  targetScore = Math.round(targetScore / 5) * 5;

  // Duration in seconds (e.g., 30s to 75s)
  const duration = Math.min(75, 30 + Math.floor((num - 1) * 0.45));

  // speed progression: e.g. 2.5 (easy) to 6.5 (extreme)
  const fruitSpeed = Number((2.4 + (num - 1) * 0.05).toFixed(2));

  // bomb frequency progression: 0.05 to 0.4
  const bombChance = Number((0.05 + (num - 1) * 0.004).toFixed(3));

  // Spawn interval decreasing (1500ms down to 450ms)
  const spawnInterval = Math.max(450, 1500 - (num - 1) * 11);

  // Maximum allowed missed fruits before defeat (3 for easy/medium, 2 for hard, 1 for extreme)
  let maxMisses = 3;
  if (num > 50) maxMisses = 2;
  if (num > 80) maxMisses = 1;

  return {
    number: num,
    difficulty: diff,
    targetScore,
    duration,
    fruitSpeed,
    bombChance,
    spawnInterval,
    maxMisses,
  };
}
