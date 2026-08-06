/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, ArrowRight, Home, Heart, Award, ShieldAlert, Sparkles, Zap, Timer } from 'lucide-react';
import { LevelConfig, UserProgress, GameSettings } from '../types';
import { getLevelConfig } from '../utils/levels';
import { BLADES } from '../utils/achievements';
import { audioEngine } from '../utils/audio';

interface GameCanvasProps {
  levelNumber: number;
  progress: UserProgress;
  settings: GameSettings;
  onUpdateProgress: (updates: Partial<UserProgress>) => void;
  onNavigateHome: () => void;
  onNavigateLevels: () => void;
  onNextLevel: () => void;
}

interface PhysicsFruit {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  emoji: string;
  type: 'fruit' | 'bomb' | 'slow_motion_clock' | 'double_points_star';
  color: string;
  isSliced: boolean;
  sliceProgress: number; // For separating halves
  rotation: number;
  rv: number; // Rotational velocity
  halvesAngle: number; // Angle at which it was sliced
  missed?: boolean;
}

interface PhysicsParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity?: number;
  shape?: 'circle' | 'spark' | 'star' | 'frost' | 'puff';
  glow?: string;
  rotation?: number;
  rotSpeed?: number;
}

interface ComboIndicator {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

interface SplatStain {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  shapes: { dx: number; dy: number; r: number }[];
}

interface ShockwaveRing {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  width: number;
}

export default function GameCanvas({
  levelNumber,
  progress,
  settings,
  onUpdateProgress,
  onNavigateHome,
  onNavigateLevels,
  onNextLevel,
}: GameCanvasProps) {
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Level config details
  const config: LevelConfig = getLevelConfig(levelNumber);

  // States
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'victory' | 'defeat'>('playing');
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(config.duration);
  const [lives, setLives] = useState(config.maxMisses);
  const [totalFruitsSliced, setTotalFruitsSliced] = useState(0);

  // Active transient timers for blade powerups
  const [slowMoTime, setSlowMoTime] = useState(0); // in seconds
  const [doubleTime, setDoubleTime] = useState(0); // in seconds
  const [fireShieldUsed, setFireShieldUsed] = useState(false);

  // Blade trail properties
  const activeBlade = BLADES.find((b) => b.id === progress.equippedBlade) || BLADES[0];

  // Ref collections for animation loop
  const fruitsRef = useRef<PhysicsFruit[]>([]);
  const particlesRef = useRef<PhysicsParticle[]>([]);
  const combosRef = useRef<ComboIndicator[]>([]);
  const slashTrailRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const pointerDownRef = useRef<boolean>(false);

  // Slice tracking state for combo detection
  const sliceWindowRef = useRef<{ time: number; fruitId: string }[]>([]);
  const splatsRef = useRef<SplatStain[]>([]);
  const ringsRef = useRef<ShockwaveRing[]>([]);
  const shakeRef = useRef<number>(0);
  const lastSpokenTimeRef = useRef<number>(0);
  const flashColorRef = useRef<string>('');
  const flashAlphaRef = useRef<number>(0);

  // PAUSE / UNPAUSE handlers
  const handlePause = () => {
    audioEngine.playClick();
    setGameState('paused');
  };

  const handleResume = () => {
    audioEngine.playPowerup();
    setGameState('playing');
  };

  const handleRestart = () => {
    audioEngine.playPowerup();
    fruitsRef.current = [];
    particlesRef.current = [];
    combosRef.current = [];
    slashTrailRef.current = [];
    splatsRef.current = [];
    ringsRef.current = [];
    shakeRef.current = 0;
    setScore(0);
    setTimeRemaining(config.duration);
    setLives(config.maxMisses);
    setSlowMoTime(0);
    setDoubleTime(0);
    setFireShieldUsed(false);
    setGameState('playing');
  };

  // RESIZE HANDLING
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let resizeFrameId: number;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      // Defer size setting to avoid the sync ResizeObserver loop cyclic feedback warnings
      resizeFrameId = window.requestAnimationFrame(() => {
        const dpr = window.devicePixelRatio || 1;
        const width = parent.clientWidth;
        const height = parent.clientHeight;

        // Verify if sizing has actually changed to save execution overhead and prevent infinite loops
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.scale(dpr, dpr);
        }
      });
    };

    resize();
    const observer = new ResizeObserver(() => {
      // Trigger safely in next frame context
      resize();
    });
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (resizeFrameId) {
        window.cancelAnimationFrame(resizeFrameId);
      }
    };
  }, []);

  // COUNTER TIMERS LOOP (decrements every 1s)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });

      // Handle active power up durations
      setSlowMoTime((prev) => (prev > 0 ? prev - 1 : 0));
      setDoubleTime((prev) => (prev > 0 ? prev - 1 : 0));

    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // COMBAT ENGINE MATCH COMPLETE
  const triggerMatchEnded = (finalScore: number) => {
    if (finalScore >= config.targetScore) {
      // Victory! Unlock next level
      const nextLvl = Math.min(100, Math.max(progress.unlockedLevels, levelNumber + 1));
      
      // Calculate gained coins based on formula
      const earnedCoins = 30 + (levelNumber * 2) + Math.floor(finalScore / 10);
      const isRecord = finalScore > progress.highScore;

      // Unlock rising level badges
      let localAchievements = [...progress.achievements];
      if (nextLvl >= 10 && !localAchievements.includes('level_10')) localAchievements.push('level_10');
      if (nextLvl >= 50 && !localAchievements.includes('level_50')) localAchievements.push('level_50');
      if (nextLvl >= 100 && !localAchievements.includes('level_100')) localAchievements.push('level_100');
      if (totalFruitsSliced >= 1 && !localAchievements.includes('first_slice')) localAchievements.push('first_slice');

      onUpdateProgress({
        unlockedLevels: nextLvl,
        coins: progress.coins + earnedCoins,
        highScore: isRecord ? finalScore : progress.highScore,
        totalSlices: progress.totalSlices + totalFruitsSliced,
        achievements: localAchievements
      });

      // Save to local leaderboard
      const record: any = {
        name: progress.name || 'Anonymous',
        score: finalScore,
        level: levelNumber,
        date: new Date().toISOString().split('T')[0]
      };
      
      const storedLeader = localStorage.getItem('fruit_ninja_leaderboard');
      let leaderboard = storedLeader ? JSON.parse(storedLeader) : [];
      leaderboard.push(record);
       // Sort descending and cap top 10
      leaderboard.sort((a: any, b: any) => b.score - a.score);
      localStorage.setItem('fruit_ninja_leaderboard', JSON.stringify(leaderboard.slice(0, 10)));

      audioEngine.playCombo();
      setGameState('victory');
    } else {
      audioEngine.playBombExplosion();
      setGameState('defeat');
    }
  };

  // IMMEDIATE DEFEAT/LIVES OUT FUNCTION
  const triggerDefeat = () => {
    setGameState('defeat');
    audioEngine.playBombExplosion();

    // Still persist accumulated total slices stats
    onUpdateProgress({
      totalSlices: progress.totalSlices + totalFruitsSliced
    });
  };

  // WATCH LEVEL CONCLUSION OUTCOMES SAFELY (Avoids updating parent component while rendering)
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (lives <= 0) {
      triggerDefeat();
    } else if (timeRemaining <= 0) {
      triggerMatchEnded(score);
    }
  }, [lives, timeRemaining, gameState, score]);

  // FULL HTML5 CANVAS PHYSICS LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let lastTime = 0;

    const loop = (timestamp: number) => {
      if (gameState !== 'playing') return;
      
      // Calculate delta time relative to 60 FPS standard (16.67ms)
      let dt = 1.0;
      if (lastTime !== 0) {
        const elapsed = timestamp - lastTime;
        dt = elapsed / 16.67;
      }
      lastTime = timestamp;

      // Cap dt to prevent massive teleportation jumps when browser is backgrounded
      if (dt > 2.5) dt = 1.0;
      
      // Logical relative dimensions
      const virtualWidth = canvas.clientWidth;
      const virtualHeight = canvas.clientHeight;

      // 1. Spawning Mechanics
      const slowMotionActive = slowMoTime > 0;
      const speedMultiplier = slowMotionActive ? 0.55 : 1.0;

      // Interval speed from level configuration
      const spawnInterval = config.spawnInterval * (slowMotionActive ? 1.5 : 1.0);

      if (timestamp - lastSpawnTimeRef.current > spawnInterval) {
        spawnFruitPack(virtualWidth, virtualHeight);
        lastSpawnTimeRef.current = timestamp;
      }

      // Clear Screen
      ctx.clearRect(0, 0, virtualWidth, virtualHeight);

      // Draw beautiful dynamic theme visuals
      drawThemeBackground(ctx, virtualWidth, virtualHeight);

      // Render ambient fullscreen impact flashes for feedback
      if (flashAlphaRef.current > 0) {
        ctx.save();
        ctx.fillStyle = flashColorRef.current;
        ctx.globalAlpha = flashAlphaRef.current;
        ctx.fillRect(0, 0, virtualWidth, virtualHeight);
        ctx.restore();
        flashAlphaRef.current -= 0.045 * dt; // Smoothly fade the flash
      }

      // Draw persistent background fruit splat marks (splat drips on the wall with realistic sliding physics!)
      splatsRef.current.forEach((sp) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sp.alpha);
        ctx.fillStyle = sp.color;
        
        // Draw main central splat drip sliding down slowly under gravity
        sp.y += 0.04 * dt;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw splash droplet drops sliding down randomly for organic run behavior
        sp.shapes.forEach((drop) => {
          drop.dy += (0.015 + Math.random() * 0.03) * dt;
          
          ctx.beginPath();
          // Render droplets as vertical capsules stretched by gravity
          ctx.ellipse(
            sp.x + drop.dx,
            sp.y + drop.dy,
            drop.r,
            drop.r * 1.35, // drip stretch
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        });
        
        ctx.restore();
        
        // Very slowly fade away to keep canvas clutter-free
        sp.alpha -= 0.0016 * dt;
      });
      splatsRef.current = splatsRef.current.filter((sp) => sp.alpha > 0);

      // Update and draw expanding high-energy neon shockwave rings!
      ringsRef.current.forEach((rg) => {
        rg.radius += (rg.maxRadius - rg.radius) * 0.16 * dt + 1.5 * dt;
        rg.alpha -= 0.04 * dt;
        
        ctx.save();
        const currentAlpha = Math.max(0, rg.alpha);
        const currentWidth = rg.width * Math.max(0.2, rg.alpha);

        // 1. Draw outer wide neon glow circle (no slow shadowBlur filter, super fast!)
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = currentWidth * 2.5;
        ctx.globalAlpha = currentAlpha * 0.35;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.radius, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Draw inner hot-core white concentric circle
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, currentWidth * 0.6);
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      });
      ringsRef.current = ringsRef.current.filter((rg) => rg.alpha > 0);

      // Apply screen shake on foreground layer!
      ctx.save();
      if (shakeRef.current > 0.1) {
        const dx = (Math.random() - 0.5) * shakeRef.current;
        const dy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(dx, dy);
        
        // Decay the shake amount smoothly
        shakeRef.current *= Math.pow(0.85, dt);
      }

      // Clean old trailing points
      const nowTime = Date.now();
      slashTrailRef.current = slashTrailRef.current.filter((pt) => nowTime - pt.time < 220);

      // Update and draw floating combo lines
      combosRef.current.forEach((ind) => {
        ind.y -= 1 * dt;
        ind.alpha -= 0.012 * dt;
        ctx.save();
        ctx.globalAlpha = Math.max(0, ind.alpha);
        ctx.font = `italic 900 ${18 + Math.floor(ind.scale * 6)}px "Space Grotesk", "Inter", sans-serif`;
        
        // Deep backing stroke to make typography pop perfectly
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 4.5;
        ctx.strokeText(ind.text, ind.x, ind.y);
        
        ctx.fillStyle = ind.color;
        ctx.fillText(ind.text, ind.x, ind.y);
        ctx.restore();
      });
      combosRef.current = combosRef.current.filter((ind) => ind.alpha > 0);

      // 2. Physics updates for particles (handling custom gravity, shapes, glows, and rotators!)
      particlesRef.current.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity !== undefined ? p.gravity : 0.2) * dt; // Custom or standard gravity
        p.alpha -= p.decay * dt;
        
        if (p.rotation !== undefined && p.rotSpeed !== undefined) {
          p.rotation += p.rotSpeed * dt;
        }

        ctx.save();
        const pAlpha = Math.max(0, p.alpha);
        ctx.globalAlpha = pAlpha;

        if (p.shape === 'star') {
          // Draw a beautiful 4-point twinkling golden star
          ctx.translate(p.x, p.y);
          if (p.rotation !== undefined) ctx.rotate(p.rotation);

          // Star outer glow backpass
          if (p.glow) {
            ctx.save();
            ctx.fillStyle = p.glow;
            ctx.globalAlpha = pAlpha * 0.4;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
              ctx.lineTo(0, -p.radius * 3.3);
              ctx.lineTo(p.radius * 0.9, -p.radius * 0.9);
              ctx.rotate(Math.PI / 2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            ctx.lineTo(0, -p.radius * 2.2);
            ctx.lineTo(p.radius * 0.6, -p.radius * 0.6);
            ctx.rotate(Math.PI / 2);
          }
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'frost') {
          // Draw cold sub-zero ice crystal snowflake cross
          ctx.translate(p.x, p.y);
          if (p.rotation !== undefined) ctx.rotate(p.rotation);

          // Frost outer glow halo
          if (p.glow) {
            ctx.save();
            ctx.strokeStyle = p.glow;
            ctx.lineWidth = 3.5;
            ctx.globalAlpha = pAlpha * 0.35;
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0); ctx.lineTo(p.radius, 0);
            ctx.moveTo(0, -p.radius); ctx.lineTo(0, p.radius);
            ctx.moveTo(-p.radius * 0.6, -p.radius * 0.6); ctx.lineTo(p.radius * 0.6, p.radius * 0.6);
            ctx.moveTo(p.radius * 0.6, -p.radius * 0.6); ctx.lineTo(-p.radius * 0.6, p.radius * 0.6);
            ctx.stroke();
            ctx.restore();
          }

          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-p.radius, 0);
          ctx.lineTo(p.radius, 0);
          ctx.moveTo(0, -p.radius);
          ctx.lineTo(0, p.radius);
          
          // Cross diagonals
          ctx.moveTo(-p.radius * 0.6, -p.radius * 0.6);
          ctx.lineTo(p.radius * 0.6, p.radius * 0.6);
          ctx.moveTo(p.radius * 0.6, -p.radius * 0.6);
          ctx.lineTo(-p.radius * 0.6, p.radius * 0.6);
          ctx.stroke();
        } else if (p.shape === 'puff') {
          // Soft fiery smoke / volcanic ash puff
          if (p.glow) {
            ctx.save();
            ctx.fillStyle = p.glow;
            ctx.globalAlpha = pAlpha * 0.35;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.beginPath();
          ctx.fillStyle = p.color;
          ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Default organic circular splatter droplets
          if (p.glow) {
            ctx.save();
            ctx.fillStyle = p.glow;
            ctx.globalAlpha = pAlpha * 0.45;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.beginPath();
          ctx.fillStyle = p.color;
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);
      if (particlesRef.current.length > 60) {
        particlesRef.current = particlesRef.current.slice(-60);
      }

      // 3. Update and render active fruits & bombs
      fruitsRef.current.forEach((fr) => {
        fr.x += fr.vx * speedMultiplier * dt;
        fr.y += fr.vy * speedMultiplier * dt;
        fr.vy += 0.18 * speedMultiplier * dt; // Gravity pull down
        fr.rotation += fr.rv * speedMultiplier * dt;

        ctx.save();
        ctx.translate(fr.x, fr.y);
        ctx.rotate(fr.rotation);

        if (!fr.isSliced) {
          // Draw whole fruit emoji
          ctx.font = `${fr.radius * 2.2}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fr.emoji, 0, 0);

          // Add simple glow ring if it is a golden/blue power up
          if (fr.type === 'double_points_star') {
            // Draw a wider low-opacity golden ring
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
            ctx.lineWidth = 9;
            ctx.beginPath();
            ctx.arc(0, 0, fr.radius + 6, 0, Math.PI * 2);
            ctx.stroke();

            // Draw a bright sharp golden ring
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, fr.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
          } else if (fr.type === 'slow_motion_clock') {
            // Draw a wider low-opacity arctic blue ring
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
            ctx.lineWidth = 9;
            ctx.beginPath();
            ctx.arc(0, 0, fr.radius + 6, 0, Math.PI * 2);
            ctx.stroke();

            // Draw a bright sharp ice blue ring
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, fr.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          // Sliced halves splitting apart
          fr.sliceProgress += 1.6;
          ctx.font = `${fr.radius * 2.2}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Half 1
          ctx.save();
          ctx.rotate(fr.halvesAngle);
          ctx.translate(-fr.sliceProgress * 1.5, 0);
          ctx.beginPath();
          ctx.rect(-100, -100, 100, 200);
          ctx.clip();
          ctx.fillText(fr.emoji, 0, 0);
          ctx.restore();

          // Half 2
          ctx.save();
          ctx.rotate(fr.halvesAngle);
          ctx.translate(fr.sliceProgress * 1.5, 0);
          ctx.beginPath();
          ctx.rect(0, -100, 100, 200);
          ctx.clip();
          ctx.fillText(fr.emoji, 0, 0);
          ctx.restore();

          // Emit juice droplet trails behind falling cut pieces for incredible physics juice!
          if (Math.random() > 0.45 && fr.type !== 'bomb') {
            const dx1 = -fr.sliceProgress * 1.5;
            const h1x = fr.x + Math.cos(fr.halvesAngle) * dx1;
            const h1y = fr.y + Math.sin(fr.halvesAngle) * dx1;
            particlesRef.current.push({
              x: h1x,
              y: h1y,
              vx: (Math.random() - 0.5) * 1.4,
              vy: (Math.random() - 0.2) * 1.4,
              radius: 1.0 + Math.random() * 2.2,
              color: fr.color,
              alpha: 0.85,
              decay: 0.045 + Math.random() * 0.035,
              gravity: 0.16
            });

            const dx2 = fr.sliceProgress * 1.5;
            const h2x = fr.x + Math.cos(fr.halvesAngle) * dx2;
            const h2y = fr.y + Math.sin(fr.halvesAngle) * dx2;
            particlesRef.current.push({
              x: h2x,
              y: h2y,
              vx: (Math.random() - 0.5) * 1.4,
              vy: (Math.random() - 0.2) * 1.4,
              radius: 1.0 + Math.random() * 2.2,
              color: fr.color,
              alpha: 0.85,
              decay: 0.045 + Math.random() * 0.035,
              gravity: 0.16
            });
          }
        }
        ctx.restore();
      });

      // Handle fruits dropping off-screen without slice (loss of life)
      fruitsRef.current.forEach((fr) => {
        if (!fr.isSliced && !fr.missed && fr.y > virtualHeight + 50 && fr.vy > 0) {
          if (fr.type === 'fruit') {
            fr.missed = true;
            setLives((prev) => Math.max(0, prev - 1));
          }
        }
      });

      // Remove off-screen or faded sliced halves
      fruitsRef.current = fruitsRef.current.filter(
        (fr) => fr.y < virtualHeight + 100 && (fr.sliceProgress < 30)
      );

      // Draw Active Swipe Trail (High-performance tapered neon sword blade trail!)
      if (slashTrailRef.current.length > 1) {
        ctx.save();

        const len = slashTrailRef.current.length;

        // Custom renderer to draw a single unified tapered ribbon with zero overlapping breaks or cuts!
        const drawTaperedTrail = (maxWidth: number, color: string, opacity: number) => {
          ctx.save();
          ctx.fillStyle = color;
          ctx.globalAlpha = opacity;
          ctx.beginPath();

          const leftPts: { x: number; y: number }[] = [];
          const rightPts: { x: number; y: number }[] = [];

          for (let i = 0; i < len; i++) {
            const pt = slashTrailRef.current[i];
            let dx = 0;
            let dy = 0;

            if (i === 0) {
              const next = slashTrailRef.current[1];
              dx = next.x - pt.x;
              dy = next.y - pt.y;
            } else if (i === len - 1) {
              const prev = slashTrailRef.current[len - 2];
              dx = pt.x - prev.x;
              dy = pt.y - prev.y;
            } else {
              const prev = slashTrailRef.current[i - 1];
              const next = slashTrailRef.current[i + 1];
              dx = next.x - prev.x;
              dy = next.y - prev.y;
            }

            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) dist = 1;

            const nx = -dy / dist;
            const ny = dx / dist;

            // Smooth linear taper from 0 thickness (tail) to maxWidth (leading swipe finger)
            const taper = i / (len - 1);
            const thickness = maxWidth * taper;

            leftPts.push({ x: pt.x + nx * thickness / 2, y: pt.y + ny * thickness / 2 });
            rightPts.push({ x: pt.x - nx * thickness / 2, y: pt.y - ny * thickness / 2 });
          }

          // Start drafting the continuous shape from the ultra-sharp tail point
          ctx.moveTo(slashTrailRef.current[0].x, slashTrailRef.current[0].y);

          // Build left continuous boundary line
          for (let i = 1; i < len; i++) {
            ctx.lineTo(leftPts[i].x, leftPts[i].y);
          }

          // Draw a perfect circular round cap around the swipe leading head
          const headPt = slashTrailRef.current[len - 1];
          const prevPt = slashTrailRef.current[len - 2];
          const angle = Math.atan2(headPt.y - prevPt.y, headPt.x - prevPt.x);
          ctx.arc(headPt.x, headPt.y, maxWidth / 2, angle - Math.PI / 2, angle + Math.PI / 2, false);

          // Build right continuous boundary line back to the sharp tail point
          for (let i = len - 1; i >= 0; i--) {
            ctx.lineTo(rightPts[i].x, rightPts[i].y);
          }

          ctx.closePath();
          ctx.fill();
          ctx.restore();
        };

        // Draw 3 layers of razor-sharp glowing ribbon polygons
        let trailColor = activeBlade.color;
        let glowColor = activeBlade.color;
        if (activeBlade.id === 'cosmic_rainbow_blade') {
          trailColor = `hsl(${(Date.now() / 2.5) % 360}, 98%, 65%)`;
          glowColor = `hsl(${(Date.now() / 2.5 + 72) % 360}, 98%, 55%)`;
        }

        // Layer 1: Wide Outer Neon Color Backing Glow
        drawTaperedTrail(16, glowColor, 0.32);

        // Layer 2: Medium Inner Colored Razor Core Glow
        drawTaperedTrail(8, trailColor, 0.75);

        // Layer 3: Laser-Sharp White Central Core Cutting-Edge Line
        drawTaperedTrail(3.4, '#ffffff', 1.0);

        ctx.restore();
      }

      // Draw full-screen frost vignette when Slow Motion powerup is active!
      if (slowMoTime > 0) {
        ctx.save();
        const vignette = ctx.createRadialGradient(
          virtualWidth / 2, virtualHeight / 2, Math.min(virtualWidth, virtualHeight) * 0.35,
          virtualWidth / 2, virtualHeight / 2, Math.max(virtualWidth, virtualHeight) * 0.72
        );
        vignette.addColorStop(0, 'rgba(56, 189, 248, 0)');
        vignette.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
        vignette.addColorStop(1, 'rgba(14, 165, 233, 0.24)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, virtualWidth, virtualHeight);

        // Elegant subzero frosted scanline border
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
        ctx.lineWidth = 3.0;
        ctx.strokeRect(8, 8, virtualWidth - 16, virtualHeight - 16);

        // Subzero metadata text HUD
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillText('TIME FREEZE ACTIVE', 20, 30);
        ctx.fillText(`${Math.ceil(slowMoTime)}S SEC REMAINING`, virtualWidth - 120, 30);

        ctx.restore();
      }

      // Draw full-screen majestic golden sparks frame when Double Points is active!
      if (doubleTime > 0) {
        ctx.save();
        const goldVignette = ctx.createRadialGradient(
          virtualWidth / 2, virtualHeight / 2, Math.min(virtualWidth, virtualHeight) * 0.35,
          virtualWidth / 2, virtualHeight / 2, Math.max(virtualWidth, virtualHeight) * 0.72
        );
        goldVignette.addColorStop(0, 'rgba(251, 191, 36, 0)');
        goldVignette.addColorStop(0.5, 'rgba(251, 191, 36, 0.04)');
        goldVignette.addColorStop(1, 'rgba(217, 119, 6, 0.20)');
        ctx.fillStyle = goldVignette;
        ctx.fillRect(0, 0, virtualWidth, virtualHeight);

        // Golden status neon border
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(12, 12, virtualWidth - 24, virtualHeight - 24);

        ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillText('DOUBLE SCORE MULTIPLIER 2X', 20, virtualHeight - 20);
        ctx.restore();
      }

      // Restore foreground screen shake layer
      ctx.restore();

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, [gameState, slowMoTime, doubleTime, activeBlade]);

  // SPAWNING SYSTEM
  const spawnFruitPack = (width: number, height: number) => {
    // Play satisfying catapult launching sound for the fruit pack
    audioEngine.playLaunch();

    const isSpecialStageLevel = levelNumber > 15;
    
    // Determine progressive fruits count to launch upwards based on elapsed level time
    const elapsed = Math.max(0, config.duration - timeRemaining);
    let count = 1;

    if (elapsed < 6) {
      // In the first 6 seconds, always start friendly with exactly 1 or 2 fruits
      count = Math.random() > 0.5 ? 2 : 1;
    } else {
      // Gradually scale range of fruits as the match timer progresses
      const progressRatio = Math.min(1.0, elapsed / config.duration);

      if (config.difficulty === 'Easy') {
        // Easy: Starts with 1, occasionally 2 towards second half of the stage
        count = Math.random() < 0.7 - progressRatio * 0.3 ? 1 : 2;
      } else if (config.difficulty === 'Medium') {
        // Medium: Gradually transition from 1-2 to 1-3
        const maxLimit = progressRatio > 0.6 ? 3 : 2;
        count = Math.floor(Math.random() * maxLimit) + 1;
      } else if (config.difficulty === 'Hard') {
        // Hard: Transition from 1-2 to 2-3 mid duration, up to 2-4 late game
        let minLimit = 1;
        let maxLimit = 2;
        if (progressRatio > 0.3) {
          minLimit = 1; // 1-3
          maxLimit = 3;
        }
        if (progressRatio > 0.75) {
          minLimit = 2; // 2-4
          maxLimit = 4;
        }
        count = Math.floor(Math.random() * (maxLimit - minLimit + 1)) + minLimit;
      } else {
        // Extreme / Legendary difficulty modes and bosses: Starts at 1-2, mid game 2-4, final stretch 3-5 massive waves
        let minLimit = 1;
        let maxLimit = 2;
        if (progressRatio > 0.25) {
          minLimit = 2; // 2-4
          maxLimit = 4;
        }
        if (progressRatio > 0.65) {
          minLimit = 3; // 3-5
          maxLimit = 5;
        }
        count = Math.floor(Math.random() * (maxLimit - minLimit + 1)) + minLimit;
      }
    }

    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < config.bombChance;
      
      let type: 'fruit' | 'bomb' | 'slow_motion_clock' | 'double_points_star' = 'fruit';
      let emoji = '🍎';
      let color = '#ef4444';

      if (isBomb) {
        type = 'bomb';
        emoji = '💣';
        color = '#ffffff'; // Spark color
      } else {
        // Special powerup spawn chances (8% fallback)
        const randSpecial = Math.random();
        if (randSpecial < 0.05) {
          type = 'slow_motion_clock';
          emoji = '⏰';
          color = '#38bdf8';
        } else if (randSpecial > 0.95) {
          type = 'double_points_star';
          emoji = '⭐';
          color = '#fbbf24';
        } else {
          // Regular fruits list
          const list = [
            { emoji: '🍎', color: '#ef4444' }, // Apple
            { emoji: '🍌', color: '#facc15' }, // Banana
            { emoji: '🍊', color: '#f97316' }, // Orange
            { emoji: '🍉', color: '#22c55e' }, // Watermelon
            { emoji: '🍍', color: '#eab308' }, // Pineapple
            { emoji: '🍓', color: '#f43f5e' }  // Strawberry
          ];
          const choice = list[Math.floor(Math.random() * list.length)];
          emoji = choice.emoji;
          color = choice.color;
        }
      }

      // Physics parameters launch angle
      const targetX = width * 0.15 + Math.random() * (width * 0.7);
      const startX = targetX + (Math.random() - 0.5) * 80;
      const startY = height + 40;

      // Base gravity we simulate is 0.18.
      // We want the fruit to shoot up to a random peak in the upper section of screen (62% to 78% of viewport height)
      const riseDistance = height * (0.62 + Math.random() * 0.12);
      
      // Calculate exact vertical launch velocity using linear physics equations:
      // vy^2 = 2 * g * riseDistance  =>  vy = -Math.sqrt(2 * g * riseDistance)
      const baseGravity = 0.18;
      let vy = -Math.sqrt(2 * baseGravity * riseDistance);
      
      // Slightly more challenging on higher levels, but capped to keep it comfortable
      vy -= Math.min(2.5, levelNumber * 0.03);

      // Horizontal drift
      const vx = (targetX - startX) * 0.016 + (Math.random() - 0.5) * 1.5;

      fruitsRef.current.push({
        id: Math.random().toString(),
        x: startX,
        y: startY,
        vx,
        vy,
        radius: emoji === '🍉' ? 32 : emoji === '💣' ? 24 : 26,
        emoji,
        type,
        color,
        isSliced: false,
        sliceProgress: 0,
        rotation: Math.random() * Math.PI,
        rv: (Math.random() - 0.5) * 0.08,
        halvesAngle: 0
      });
    }
  };

  // BACKGROUND THEME DRAWER (Dynamically changes styling, colors, and pattern overlays for every single level!)
  const drawThemeBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // 1. Synthesize a unique epic realm title and matching emoji for every single level index (1600+ possibilities)
    const firstNames = [
      "Sakura", "Nebula", "Aurora", "Molten", "Quantum", "Obsidian", "Ethereal", "Celestial", 
      "Crimson", "Glacial", "Emerald", "Golden", "Abyssal", "Astral", "Prismatic", "Enchanted",
      "Shadow", "Solar", "Lunar", "Magnetic", "Sonic", "Mystic", "Divine", "Spectral", 
      "Cobalt", "Phoenix", "Tornado", "Diamond", "Plasma", "Whispering", "Cyber", "Overload",
      "Valkyrie", "Hyperion", "Titan", "Specter", "Chronos", "Aero", "Void", "Infinity"
    ];
    const secondNames = [
      "Dojo", "Starway", "Taiga", "Inferno", "Horizon", "Sanctuary", "Rift", "Chamber", 
      "Nexus", "Citadel", "Labyrinth", "Glade", "Spire", "Lagoon", "Void", "Canyon",
      "Temple", "Garden", "Vault", "Summit", "Cathedral", "Pass", "Oasis", "Fortress",
      "Ocean", "Plains", "Cliffs", "Peak", "Abyss", "Cascade", "Valley", "Dome",
      "Stronghold", "Crest", "Mesa", "Lair", "Hollow", "Reaches", "Plateau", "Tundra"
    ];
    const emojis = ["🌸", "🌌", "❄️", "🌋", "⚡", "🌀", "💫", "🪐", "🌊", "☄️", "🔮", "🏯", "💎", "🌙", "🔥", "✨", "🌟", "💠", "🍃", "🚀", "🏔️", "⛲"];

    const pickIndex1 = (levelNumber * 3) % firstNames.length;
    const pickIndex2 = (levelNumber * 7) % secondNames.length;
    const pickEmoji = (levelNumber * 11) % emojis.length;

    const realmName = `${firstNames[pickIndex1]} ${secondNames[pickIndex2]}`;
    const realmEmoji = emojis[pickEmoji];

    const animTime = Date.now() / 1000; // global fluid clock for weather simulations
    const levelSeed = levelNumber * 137.5; // golden ratio step guarantees maximum color distance for consecutive levels!
    const baseHue = levelSeed % 360;
    const secondaryHue = (baseHue + 115 + (levelNumber * 19) % 70) % 360; // broad beautiful contrasting hue

    let color1 = '';
    let color2 = '';
    let accentColor = '';
    let watermarkColor = '';
    let patternColor = '';

    // 2. Select visual themes
    if (settings.theme === 'classic') {
      // Warm, highly unique exotic oriental tapestry and craft wood tones (ebony, cherry, walnut, mahogany...)
      const woodHue = (levelNumber * 47) % 360;
      const saturation = 16 + (levelNumber % 14);
      const lightness = 5.5 + (levelNumber % 6.5);
      
      color1 = `hsl(${woodHue}, ${saturation}%, ${lightness}%)`;
      color2 = `hsl(${(woodHue + 22) % 360}, ${Math.max(8, saturation - 8)}%, ${Math.max(3, lightness - 2.5)}%)`;
      accentColor = `hsla(${woodHue}, 75%, 55%, 0.045)`;
      watermarkColor = `hsla(${woodHue}, 70%, 65%, 0.022)`;
      patternColor = `hsla(${woodHue}, 60%, 45%, 0.038)`;
    } else if (settings.theme === 'dark') {
      // Mystical Midnight Obsidian (deep rich pitch black paired with level-shifting ambient glow)
      color1 = `hsl(${baseHue}, 28%, 4.5%)`;
      color2 = `#010103`;
      accentColor = `hsla(${baseHue}, 80%, 55%, 0.035)`;
      watermarkColor = `hsla(${baseHue}, 85%, 70%, 0.018)`;
      patternColor = `hsla(${baseHue}, 75%, 60%, 0.024)`;
    } else {
      // Radiant Retro Cosmic Neon Waves
      color1 = `hsl(${baseHue}, 48%, 7%)`;
      color2 = `hsl(${secondaryHue}, 58%, 2.2%)`;
      accentColor = `hsla(${baseHue}, 85%, 60%, 0.045)`;
      watermarkColor = `hsla(${baseHue}, 90%, 75%, 0.024)`;
      patternColor = `hsla(${baseHue}, 80%, 60%, 0.04)`;
    }

    // 3. Render base background linear gradient
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 4. Render smooth ambient breathing core light pulse
    const pulseFactor = 0.62 + Math.sin(animTime / 3) * 0.05;
    const pulseRadius = Math.max(w, h) * pulseFactor;
    const radGlow = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, pulseRadius);
    radGlow.addColorStop(0, accentColor);
    radGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, w, h);

    // 5. Draw the level-exclusive geometric structure overlay (shifts between 8 distinct options per level!)
    ctx.save();
    
    const patternType = levelNumber % 8;
    switch (patternType) {
      case 0: {
        // Futuro-Cyber 3D Depth Perspective Grid
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 1;
        const vanishX = w / 2;
        const vanishY = -180;
        const linesCount = 14;
        for (let i = 0; i <= linesCount; i++) {
          const ratio = i / linesCount;
          const targetX = ratio * w;
          ctx.beginPath();
          ctx.moveTo(vanishX, vanishY);
          ctx.lineTo(targetX, h);
          ctx.stroke();
        }
        for (let i = 0; i < 9; i++) {
          const ratio = Math.pow(i / 9, 2); // quadratic spacing for immersive perspective depth
          const y = ratio * h;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        break;
      }
      
      case 1: {
        // Concentric Combat Target Focus Rings
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 1;
        const focusX = w / 2;
        const focusY = h / 2;
        const pulse = Math.sin(animTime * 1.5) * 6;
        for (let r = 80; r < Math.max(w, h); r += 90) {
          ctx.beginPath();
          ctx.arc(focusX, focusY, r + pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(w, h);
        ctx.moveTo(w, 0); ctx.lineTo(0, h);
        ctx.stroke();
        break;
      }

      case 2: {
        // Slanted Diagonal Rapid Lanes
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 1.2;
        const spacing = 80;
        const shift = (animTime * 25) % (spacing * 2);
        for (let x = -h; x < w + h; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x + shift, 0);
          ctx.lineTo(x - h + shift, h);
          ctx.stroke();
        }
        break;
      }

      case 3: {
        // Connected Constellation Matrix Graph (Dynamic starmap grid)
        const dotSpacing = 60;
        ctx.fillStyle = patternColor;
        for (let x = dotSpacing / 2; x < w; x += dotSpacing) {
          for (let y = dotSpacing / 2; y < h; y += dotSpacing) {
            const ox = x + Math.sin(x * 0.1 + levelNumber) * 10;
            const oy = y + Math.cos(y * 0.1 + levelNumber) * 10;
            ctx.beginPath();
            ctx.arc(ox, oy, 1.8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = patternColor;
            ctx.lineWidth = 0.4;
            if (x + dotSpacing < w) {
              ctx.beginPath();
              ctx.moveTo(ox, oy);
              ctx.lineTo(ox + dotSpacing + Math.sin((x+dotSpacing) * 0.1 + levelNumber) * 10, oy);
              ctx.stroke();
            }
          }
        }
        break;
      }

      case 4: {
        // Harmonious Sine-Wave Ocean Currents
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 1;
        const waveSpacing = 75;
        const amp = 15 + (levelNumber % 10);
        const freq = 0.006;
        for (let y = waveSpacing / 2; y < h; y += waveSpacing) {
          ctx.beginPath();
          for (let x = 0; x <= w + 10; x += 15) {
            const calcY = y + Math.sin(x * freq + animTime * 1.5 + levelNumber) * amp;
            if (x === 0) ctx.moveTo(x, calcY);
            else ctx.lineTo(x, calcY);
          }
          ctx.stroke();
        }
        break;
      }

      case 5: {
        // Modern Honeycomb Hexagon Matrix Cells
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 0.8;
        const size = 50 + (levelNumber % 3) * 10;
        const hSpacing = size * Math.sqrt(3);
        const vSpacing = size * 1.5;
        for (let i = -1; i < (w / hSpacing) + 2; i++) {
          for (let j = -1; j < (h / vSpacing) + 2; j++) {
            const cx = i * hSpacing + (j % 2 === 0 ? 0 : hSpacing / 2);
            const cy = j * vSpacing;
            
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const angle = (k * Math.PI) / 3;
              const x = cx + size * Math.cos(angle);
              const y = cy + size * Math.sin(angle);
              if (k === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
        break;
      }

      case 6: {
        // Zen Shoji Sliding Screen Slats
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 1.5;
        const gridSpacingX = 140;
        const gridSpacingY = 180;
        for (let x = 0; x < w; x += gridSpacingX) {
          ctx.beginPath();
          ctx.moveTo(x, 0); ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSpacingY) {
          ctx.beginPath();
          ctx.moveTo(0, y); ctx.lineTo(w, y);
          ctx.stroke();
        }
        break;
      }

      case 7: {
        // Celestial Sunburst Rays Beam
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 1;
        const focalX = w / 2;
        const focalY = h + 50;
        const rayCount = 18;
        for (let i = 0; i <= rayCount; i++) {
          const angle = Math.PI + (i / rayCount) * Math.PI + Math.sin(animTime * 0.15 + levelNumber) * 0.15;
          const endX = focalX + Math.cos(angle) * Math.max(w, h) * 1.5;
          const endY = focalY + Math.sin(angle) * Math.max(w, h) * 1.5;
          ctx.beginPath();
          ctx.moveTo(focalX, focalY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        break;
      }
    }

    // 6. Spawn environmental dynamic physics atmosphere particles (shifts across 6 unique particle styles!)
    const weatherType = levelNumber % 6;
    switch (weatherType) {
      case 0: {
        // Rising Molten Volcanic Sparks
        for (let i = 0; i < 20; i++) {
          const seedX = (i * 24391 + levelNumber * 100) % w;
          const riseSpeed = 0.8 + (i % 3) * 0.4;
          const x = (seedX + Math.sin(animTime * 0.7 + i) * 20) % w;
          const y = (h - (animTime * 40 * riseSpeed + i * 40)) % (h + 30);
          const radius = 1 + (i % 3) + Math.cos(animTime + i) * 0.5;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(249, 115, 22, 0.45)' : 'rgba(239, 68, 68, 0.45)';
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = i % 2 === 0 ? 'rgba(249, 115, 22, 0.1)' : 'rgba(239, 68, 68, 0.1)';
          ctx.beginPath();
          ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      
      case 1: {
        // Floating Oriental Sakura Rose Petals
        ctx.fillStyle = 'rgba(244, 63, 114, 0.45)';
        for (let i = 0; i < 15; i++) {
          const seedX = (i * 12347 + levelNumber * 250) % w;
          const seedY = (i * 98711) % h;
          const driftSpeedX = 0.5 + (i % 3) * 0.3;
          const driftSpeedY = 0.7 + (i % 2) * 0.3;
          const x = (seedX + animTime * 14 * driftSpeedX) % (w + 40) - 20;
          const y = (seedY + animTime * 18 * driftSpeedY) % (h + 40) - 20;
          ctx.beginPath();
          ctx.ellipse(x, y, 4, 8, Math.sin(animTime + i) * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 2: {
        // Deep Space Cosmic Twinkling Stars & Nebula Clouds
        for (let i = 0; i < 25; i++) {
          const starX = (i * 8763 + levelNumber * 123) % w;
          const starY = (i * 2381 + levelNumber * 56) % h;
          const sparkle = 0.2 + 0.8 * Math.abs(Math.sin(animTime * 2 + i));
          ctx.fillStyle = `rgba(255, 255, 255, ${sparkle * 0.35})`;
          ctx.beginPath();
          ctx.arc(starX, starY, 1 + (i % 2), 0, Math.PI * 2);
          ctx.fill();
        }
        const cloudX = w / 2 + Math.sin(animTime * 0.2) * 80;
        const cloudY = h / 2 + Math.cos(animTime * 0.15) * 50;
        ctx.fillStyle = `hsla(${baseHue}, 80%, 60%, 0.05)`;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, 160, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 3: {
        // Whispering Frozen Snow Drift Crystals
        ctx.fillStyle = 'rgba(224, 242, 254, 0.5)';
        for (let i = 0; i < 16; i++) {
          const seedX = (i * 6789 + levelNumber * 150) % w;
          const speed = 0.9 + (i % 3) * 0.4;
          const x = (seedX + Math.sin(animTime * 0.6 + i) * 16) % w;
          const y = (animTime * 25 * speed + i * 30) % (h + 20);
          ctx.beginPath();
          ctx.arc(x, y, 1.2 + (i % 2), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 4: {
        // Cyber Binary Stream Rain Drop Cascades
        ctx.fillStyle = `hsla(${baseHue}, 90%, 75%, 0.38)`;
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        for (let i = 0; i < 11; i++) {
          const streamX = (i * 8129 + levelNumber * 300) % w;
          const speed = 1.2 + (i % 3) * 0.6;
          const streamY = (animTime * 45 * speed + i * 70) % (h + 30);
          ctx.fillText(i % 3 === 0 ? '1' : i % 3 === 1 ? '0' : 'x', streamX, streamY);
        }
        break;
      }

      case 5: {
        // Glowing Ambient Biosphere Fireflies
        for (let i = 0; i < 14; i++) {
          const seedX = (i * 3821 + levelNumber * 90) % w;
          const seedY = (i * 7431 + levelNumber * 70) % h;
          const dx = Math.sin(animTime * 0.3 + i) * 35;
          const dy = Math.cos(animTime * 0.2 + i) * 35;
          const x = (seedX + dx + w) % w;
          const y = (seedY + dy + h) % h;
          const brightness = 0.3 + 0.7 * Math.abs(Math.sin(animTime * 0.8 + i));
          
          ctx.fillStyle = `hsla(${(baseHue + 60) % 360}, 90%, 70%, ${brightness * 0.25})`;
          ctx.beginPath();
          ctx.arc(x, y, 2.5 + (i % 2), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
    
    ctx.restore();

    // 4. Render gorgeous high-fidelity Level watermarks (shows level, target score, and difficulty)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Massive glowing level watermark block
    const isClassic = settings.theme === 'classic';
    ctx.font = `900 ${w < 600 ? '48px' : '72px'} "Space Grotesk", sans-serif`;
    ctx.fillStyle = watermarkColor;
    ctx.fillText(`LEVEL ${levelNumber}`, w / 2, h / 2 - 25);

    // Fine detail metadata block below the title with active Realm description!
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = isClassic 
      ? `hsla(${(levelNumber * 23) % 25 + 15}, 65%, 65%, 0.12)`
      : `hsla(${baseHue}, 75%, 70%, 0.08)`;
    
    ctx.fillText(
      `${realmEmoji} ${realmName.toUpperCase()} • TARGET: ${config.targetScore} PTS • DIFFICULTY: ${config.difficulty.toUpperCase()}`,
      w / 2,
      h / 2 + 20
    );
    
    ctx.restore();
  };

  // COLLISION DETECTION & PATH INTERSECTION FOR TRAIL SWIPE
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerDownRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    slashTrailRef.current = [{ x, y, time: Date.now() }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerDownRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newTrail = [...slashTrailRef.current, { x, y, time: Date.now() }].slice(-14);
    slashTrailRef.current = newTrail;

    // Emit elements blade glowing trail particles
    spawnBladeTrailParticles(x, y, activeBlade.id);

    // Detect swoosh action
    if (newTrail.length % 5 === 0) {
      audioEngine.playSwoosh();
    }

    // Intersection test against active fruits
    if (newTrail.length >= 2) {
      const p1 = newTrail[newTrail.length - 2];
      const p2 = newTrail[newTrail.length - 1];

      // Calculate path angle to align separator halves
      const pathAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      // Wider hit zone on touchscreens for ultimate slicing satisfaction
      const mobileBonus = rect.width < 768 ? 16 : 8;

      fruitsRef.current.forEach((fr) => {
        if (!fr.isSliced) {
          const dist = distToSegment({ x: fr.x, y: fr.y }, p1, p2);
          if (dist < fr.radius + mobileBonus) {
            sliceFruit(fr, pathAngle, x, y);
          }
        }
      });
    }
  };

  const handlePointerUp = () => {
    pointerDownRef.current = false;
    processActiveComboDetect();
  };

  // PERSISTENT BACKGROUND SPLAT GENERATOR
  const addSplatStain = (x: number, y: number, color: string, baseSize: number) => {
    const shapes: { dx: number; dy: number; r: number }[] = [];
    const dropletsCount = 2 + Math.floor(Math.random() * 3); // Highly optimized droplet counts (2 to 4)
    
    for (let i = 0; i < dropletsCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = (baseSize * 0.55) + Math.random() * (baseSize * 1.3);
      shapes.push({
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        r: 1.2 + Math.random() * (baseSize * 0.18)
      });
    }

    splatsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      size: baseSize + (Math.random() - 0.5) * 4,
      color,
      alpha: 0.65,
      shapes
    });

    // Keep background splat registry capped tightly (8 max instead of 25) to prevent lag
    if (splatsRef.current.length > 8) {
      splatsRef.current.shift();
    }
  };

  // THERME ELEMENT BLADE SPARKS EMITTER
  const spawnBladeTrailParticles = (x: number, y: number, bladeId: string) => {
    // Spawn particles on stroke
    const count = Math.random() > 0.40 ? 1 : 0;
    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      const pAngle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.5;
      const vx = Math.cos(pAngle) * speed;
      const vy = Math.sin(pAngle) * speed;

      if (bladeId === 'classic_steel') {
        particlesRef.current.push({
          x,
          y,
          vx: vx * 1.8,
          vy: vy * 1.8,
          radius: 1.0 + Math.random() * 1.2,
          color: '#f1f5f9',
          alpha: 0.9,
          decay: 0.05 + Math.random() * 0.05,
          gravity: 0.12,
          glow: '#ffffff',
          shape: 'circle'
        });
      } else if (bladeId === 'slow_motion_blade') {
        particlesRef.current.push({
          x,
          y,
          vx: vx * 0.8,
          vy: vy * 0.8 - 0.2,
          radius: 1.8 + Math.random() * 2.2,
          color: Math.random() > 0.5 ? '#f0f9ff' : '#0ea5e9',
          alpha: 0.95,
          decay: 0.02 + Math.random() * 0.02,
          gravity: 0.03,
          glow: '#38bdf8',
          shape: 'frost',
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.04
        });
      } else if (bladeId === 'double_points_blade') {
        particlesRef.current.push({
          x,
          y,
          vx: vx * 1.3,
          vy: vy * 1.3 - 0.3,
          radius: 2.2 + Math.random() * 2.0,
          color: '#fef08a',
          alpha: 1.0,
          decay: 0.025 + Math.random() * 0.02,
          gravity: 0.06,
          glow: '#fbbf24',
          shape: 'star',
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.08
        });
      } else if (bladeId === 'fire_blade') {
        const color = Math.random() > 0.6 ? '#f97316' : Math.random() > 0.35 ? '#f43f5e' : '#ef4444';
        particlesRef.current.push({
          x,
          y,
          vx: vx * 1.5,
          vy: vy * 1.5 - 0.8,
          radius: 1.8 + Math.random() * 2.2,
          color,
          alpha: 1.0,
          decay: 0.035 + Math.random() * 0.02,
          gravity: -0.06, // floats upwards!
          glow: '#ef4444',
          shape: Math.random() > 0.55 ? 'puff' : 'circle'
        });
      } else if (bladeId === 'cosmic_rainbow_blade') {
        const randHue = (Date.now() / 4 + Math.random() * 90) % 360;
        const color = `hsl(${randHue}, 100%, 65%)`;
        particlesRef.current.push({
          x,
          y,
          vx: vx * 1.6,
          vy: vy * 1.6 - 0.4,
          radius: 1.8 + Math.random() * 2.5,
          color,
          alpha: 1.0,
          decay: 0.025 + Math.random() * 0.035,
          gravity: 0.05,
          glow: color,
          shape: Math.random() > 0.4 ? 'star' : 'circle',
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.12
        });
      }
    }
  };

  const spawnShockwave = (x: number, y: number, color: string, maxRadius: number, width = 4) => {
    ringsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      radius: 5,
      maxRadius,
      color,
      alpha: 1.0,
      width
    });
  };

  // SLICE LOGIC MULTIPLIER
  const sliceFruit = (
    fr: PhysicsFruit,
    angle: number,
    sliceX: number,
    sliceY: number
  ) => {
    fr.isSliced = true;
    fr.halvesAngle = angle;

    // Acknowledge blade sound
    if (fr.type === 'bomb') {
      // If equipping the INFERNO FIRE BLADE: block one bomb block!
      if (activeBlade.id === 'fire_blade' && !fireShieldUsed) {
        setFireShieldUsed(true);
        fr.type = 'fruit'; // Convert into normal splatter
        fr.emoji = '🔥';
        fr.color = '#ef4444';
        
        // Spawn soft combo/chimes warning instead of boom
        audioEngine.playPowerup();
        shakeRef.current = Math.max(shakeRef.current, 10);
        spawnShockwave(fr.x, fr.y, '#ef4444', 120, 6); // Fire defense shield expansion!
        combosRef.current.push({
          id: Math.random().toString(),
          x: fr.x,
          y: fr.y - 20,
          text: '⚡ INFERNO BLOCK!',
          color: '#ef4444',
          alpha: 1.0,
          scale: 1.1
        });
        return;
      }

      audioEngine.playBombExplosion();
      // Massive screen shake for ultimate bomb blast impact!
      shakeRef.current = Math.max(shakeRef.current, 28);
      spawnShockwave(fr.x, fr.y, '#ffffff', 280, 10); // White-hot thermal bomb wave!
      
      flashColorRef.current = '#ff1e1e';
      flashAlphaRef.current = 0.5; // Strong red screen flash for bombs!

      // Bomb Blast: Subtract 1 life
      setLives((prev) => Math.max(0, prev - 1));

      // Spawn flash sparks indicators
      spawnSparks(fr.x, fr.y, '#ffffff');
    } else if (fr.type === 'slow_motion_clock') {
      audioEngine.playPowerup();
      shakeRef.current = Math.max(shakeRef.current, 14);
      setSlowMoTime(5); // 5s slow motion
      spawnShockwave(fr.x, fr.y, '#38bdf8', 160, 5); // Sub-zero ice blue wave!
      
      flashColorRef.current = '#38bdf8';
      flashAlphaRef.current = 0.35; // Frosted blue screen flash!

      const now = Date.now();
      if (now - lastSpokenTimeRef.current > 800) {
        audioEngine.speakWord('TIME FREEZE');
        lastSpokenTimeRef.current = now;
      }

      combosRef.current.push({
        id: Math.random().toString(),
        x: fr.x,
        y: fr.y - 15,
        text: '⏳ SLOW MOTION',
        color: '#38bdf8',
        alpha: 1.0,
        scale: 1.2
      });
    } else if (fr.type === 'double_points_star') {
      audioEngine.playPowerup();
      shakeRef.current = Math.max(shakeRef.current, 14);
      setDoubleTime(5); // 5s double points
      spawnShockwave(fr.x, fr.y, '#fbbf24', 160, 5); // Golden multiplier starburst!
      
      flashColorRef.current = '#fbbf24';
      flashAlphaRef.current = 0.35; // Sovereign golden screen flash!

      const now = Date.now();
      if (now - lastSpokenTimeRef.current > 800) {
        audioEngine.speakWord('DOUBLE SCORE');
        lastSpokenTimeRef.current = now;
      }

      combosRef.current.push({
        id: Math.random().toString(),
        x: fr.x,
        y: fr.y - 15,
        text: '✨ DOUBLE POINTS',
        color: '#fbbf24',
        alpha: 1.0,
        scale: 1.2
      });
    } else {
      // 12% Chance for a highly satisfying CRITICAL CUT!
      const isCritical = Math.random() < 0.12;

      // Track slice timing for combos
      sliceWindowRef.current.push({ time: Date.now(), fruitId: fr.id });

      const now = Date.now();
      if (isCritical) {
        // High-pitched double slicing and extra rewarding trigger sounds
        audioEngine.playCombo();
        shakeRef.current = Math.max(shakeRef.current, 18);
        spawnShockwave(fr.x, fr.y, '#eab308', 140, 6); // Intense golden-yellow critical shockwave!

        flashColorRef.current = '#fbbf24';
        flashAlphaRef.current = 0.38; // Awesome golden flash!

        let pointsAwarded = 10; // Extra points for dynamic skill!
        if (doubleTime > 0) pointsAwarded *= 2;
        setScore((prev) => prev + pointsAwarded);
        
        const nextSliced = totalFruitsSliced + 1;
        setTotalFruitsSliced(nextSliced);

        // Splat decals
        addSplatStain(fr.x, fr.y, fr.color, 38);

        // Spawn heavy volume juice splash particles
        spawnJuiceParticles(fr.x, fr.y, fr.color, true);

        // Exciting female announcer word triggers on critical hits
        if (now - lastSpokenTimeRef.current > 1000) {
          const critPool = ['CRITICAL', 'PERFECT', 'EXCELLENT', 'MAGNIFICENT', 'FABULOUS'];
          const word = critPool[Math.floor(Math.random() * critPool.length)];
          audioEngine.speakWord(word);
          lastSpokenTimeRef.current = now;
        }

        // Critical floating indicator
        combosRef.current.push({
          id: Math.random().toString(),
          x: fr.x,
          y: fr.y - 25,
          text: `🎯 CRITICAL CUT! +${pointsAwarded}`,
          color: '#eab308',
          alpha: 1.0,
          scale: 1.4
        });
      } else {
        // Standard slice
        audioEngine.playFruitSlice();
        shakeRef.current = Math.max(shakeRef.current, 6.5);
        spawnShockwave(fr.x, fr.y, fr.color, 75, 3); // Delicate juice splash expand ripple!

        flashColorRef.current = fr.color;
        flashAlphaRef.current = 0.14; // Mild fruit-tinted screen flash!

        let pointsAwarded = 1;
        if (doubleTime > 0) pointsAwarded *= 2;
        setScore((prev) => prev + pointsAwarded);
        
        const nextSliced = totalFruitsSliced + 1;
        setTotalFruitsSliced(nextSliced);

        // Splat decals
        addSplatStain(fr.x, fr.y, fr.color, 20);

        // Spawn normal volume juice splash particles
        spawnJuiceParticles(fr.x, fr.y, fr.color, false);

        // Speak a sweet exclamation rating and display nice animated text every 4 fruits sliced
        if (nextSliced > 0 && nextSliced % 4 === 0 && now - lastSpokenTimeRef.current > 1200) {
          const standardPool = ['NICE', 'TASTY', 'SWEET', 'JUICY', 'DELICIOUS', 'SPECTACULAR', 'SMOOTH'];
          const word = standardPool[Math.floor(Math.random() * standardPool.length)];
          audioEngine.speakWord(word);
          lastSpokenTimeRef.current = now;

          combosRef.current.push({
            id: Math.random().toString(),
            x: fr.x + (Math.random() - 0.5) * 30,
            y: fr.y - 25,
            text: `⭐ ${word}!`,
            color: '#10b981', // vibrant emerald neon indicator
            alpha: 1.0,
            scale: 1.3
          });
        }
      }
    }
  };

  // SPLATTER EMITTERS
  const spawnJuiceParticles = (x: number, y: number, color: string, heavy?: boolean) => {
    const particleCount = heavy ? 14 : 7;
    const maxSpeed = heavy ? 6.5 : 4.0;
    
    for (let i = 0; i < particleCount; i++) {
       const pAngle = Math.random() * Math.PI * 2;
       const pSpeed = 1.2 + Math.random() * maxSpeed;
       particlesRef.current.push({
         x,
         y,
         vx: Math.cos(pAngle) * pSpeed,
         vy: Math.sin(pAngle) * pSpeed - 1.5,
         radius: (heavy ? 2.5 : 1.8) + Math.random() * 3.5,
         color,
         alpha: 1.0,
         decay: (heavy ? 0.010 : 0.015) + Math.random() * 0.02
       });
    }
  };

  const spawnSparks = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
       const pAngle = Math.random() * Math.PI * 2;
       const pSpeed = 4.0 + Math.random() * 8.0;
       particlesRef.current.push({
         x,
         y,
         vx: Math.cos(pAngle) * pSpeed,
         vy: Math.sin(pAngle) * pSpeed,
         radius: 1.5 + Math.random() * 2.5,
         color: Math.random() > 0.4 ? '#fbbf24' : '#ef4444',
         alpha: 1.0,
         decay: 0.03 + Math.random() * 0.04
       });
    }
  };

  // MULTI FRUITS COMBOS PROCESSING
  const processActiveComboDetect = () => {
    const windowLimit = 350; // Milliseconds window for swipe combos
    const now = Date.now();
    
    // Clear old window
    sliceWindowRef.current = sliceWindowRef.current.filter((sl) => now - sl.time < windowLimit);
    
    const count = sliceWindowRef.current.length;
    if (count >= 3) {
      let bonusPoints = count === 3 ? 3 : count === 4 ? 6 : 10;
      
      // Golden blade double points combo activation!
      if (activeBlade.id === 'double_points_blade') {
        bonusPoints *= 2;
      }

      setScore((prev) => prev + bonusPoints);
      audioEngine.playCombo();

      // Satisfying combo camera screen-shake!
      shakeRef.current = Math.max(shakeRef.current, 13 + count * 2);

      // Trigger unique screen achievements metrics
      onUpdateProgress({
        totalCombos: progress.totalCombos + 1
      });

      // Randomized high-energy exclamation words for juicy satisfaction!
      const words = ['JUICY', 'AWESOME', 'SPLENDID', 'UNBELIEVABLE', 'GLORIOUS', 'MARVELOUS', 'CRISP SQUASH'];
      const randomWord = words[Math.floor(Math.random() * words.length)];

      const comboX = 120 + Math.random() * 80;
      const comboY = 190 + Math.random() * 40;
      const comboColor = count === 3 ? '#f43f5e' : count === 4 ? '#ec4899' : '#a855f7';

      // Spawn a massive expanding neon shockwave matching the score pop!
      spawnShockwave(comboX, comboY, comboColor, 240, 8);

      // Speak the awesome female announcer call for this combo list!
      const phrase = `${randomWord} COMBO!`;
      audioEngine.speakWord(phrase);
      lastSpokenTimeRef.current = Date.now();

      // Spawn neon banner
      combosRef.current.push({
        id: Math.random().toString(),
        x: comboX,
        y: comboY,
        text: `⚡ ${randomWord} x${count}! +${bonusPoints} Bonus!`,
        color: comboColor,
        alpha: 1.0,
        scale: 1.25 + count * 0.05
      });

      // Trigger a brilliant screen flash matching the combo theme
      flashColorRef.current = comboColor;
      flashAlphaRef.current = 0.42;

      // Spawn combo starburst sparks circles for visual majesty!
      for (let i = 0; i < 16; i++) {
        const pAngle = (i / 16) * Math.PI * 2;
        const pSpeed = 3.5 + Math.random() * 5.0;
        particlesRef.current.push({
          x: comboX,
          y: comboY,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed - 1.2,
          radius: 2.5 + Math.random() * 3.5,
          color: comboColor,
          alpha: 1.0,
          decay: 0.02 + Math.random() * 0.02,
          gravity: 0.12,
          glow: comboColor,
          shape: 'star',
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.14
        });
      }
    }

    // Reset slice window trackers
    sliceWindowRef.current = [];
  };

  // Math vector segment helpers
  function distToSegment(
    p: { x: number; y: number },
    v: { x: number; y: number },
    w: { x: number; y: number }
  ) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
  }

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col justify-between overflow-hidden select-none" ref={containerRef}>
      
      {/* HUD DASHBOARD HEADLINE DISPLAY */}
      <div className="absolute top-7 left-4 right-4 md:top-9 md:left-6 md:right-6 z-20 flex items-center justify-between pointer-events-none">
        
        {/* Left Stats Indicator */}
        <div className="py-2 px-3 md:py-2.5 md:px-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-2 md:gap-4 text-[11px] md:text-xs font-mono shadow-lg">
          <div className="text-slate-400">
            SCORE:{' '}
            <strong className="text-base md:text-xl font-black text-amber-400">
              {score}
            </strong>
            <span className="text-[9px] md:text-[10px] text-slate-500 pl-0.5 md:pl-1">
              / {config.targetScore}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Time Remaining */}
          <div className="flex items-center gap-1 md:gap-1.5 text-sky-400 font-bold">
            <Timer className="w-3.5 h-3.5 md:w-4 h-4 text-sky-400" />
            <span>{timeRemaining}S</span>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Sliced counter */}
          <div className="text-[9px] md:text-[10px] text-slate-400 hidden sm:block">
            SLICED: <strong className="text-slate-200">{totalFruitsSliced}</strong>
          </div>
        </div>

        {/* Right Life & Pause Switch indicators */}
        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          
          {/* Active transient effects banner */}
          <div className="flex items-center gap-1">
            {slowMoTime > 0 && (
              <span className="text-[8px] md:text-[9px] font-mono bg-sky-500/20 text-sky-400 py-1 md:py-1.5 px-2 md:px-3 rounded-xl border border-sky-500/30 animate-pulse">
                ⏳ SLOW
              </span>
            )}
            {doubleTime > 0 && (
              <span className="text-[8px] md:text-[9px] font-mono bg-amber-400/20 text-amber-400 py-1 md:py-1.5 px-2 md:px-3 rounded-xl border border-amber-400/30 animate-pulse">
                ✨ 2X
              </span>
            )}
          </div>

          {/* Hearts Life container */}
          <div className="py-2 px-2.5 md:py-2.5 md:px-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-1 shadow-lg">
            {Array.from({ length: config.maxMisses }).map((_, idx) => {
              const active = idx < lives;
              return (
                <Heart
                  key={idx}
                  className={`w-3.5 h-3.5 md:w-4.5 md:h-4.5 transition-colors ${
                    active ? 'text-rose-500 fill-rose-500' : 'text-slate-800'
                  }`}
                />
              );
            })}
          </div>

          <button
            onClick={handlePause}
            className="p-2.5 md:p-3.5 bg-slate-900/90 hover:bg-slate-800 active:scale-95 active:bg-slate-700 backdrop-blur-md border border-white/20 hover:border-white/35 rounded-2xl text-white cursor-pointer transition-all shadow-lg outline-none"
            title="Pause Game"
          >
            <Pause className="w-4 h-4 md:w-4.5 md:h-4.5" />
          </button>

        </div>
      </div>

      {/* CORE HTML5 PHYSICAL CANVAS INTERACTIVES */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full flex-1 block touch-none cursor-crosshair pb-safe"
        style={{ touchAction: 'none' }}
      />

      {/* PAUSE, DEFEAT & VICTORY PRESENTATIVE DIALOG OVERLAYS */}
      <AnimatePresence>
        {gameState !== 'playing' && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            
            {/* PAUSE SCREEN STATE */}
            {gameState === 'paused' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-slate-900 border border-white/5 rounded-4xl p-8 text-center shadow-[0_0_40px_rgba(56,189,248,0.15)] relative"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-500" />
                <h3 className="text-3xl font-black text-white tracking-widest uppercase italic mb-1">STABILIZED PAUSE</h3>
                <span className="block text-[10px] font-mono text-sky-400 tracking-widest uppercase mb-8">STAGE {levelNumber} IN SUSPENSION</span>

                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResume}
                    className="w-full py-4 bg-gradient-to-l from-sky-500 to-blue-500 text-white font-extrabold rounded-2xl cursor-pointer outline-none hover:shadow-lg"
                  >
                    RESUME SLASHING
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRestart}
                    className="w-full py-3.5 bg-slate-800 text-slate-300 font-bold border border-white/5 rounded-2xl cursor-pointer outline-none hover:bg-slate-750"
                  >
                    RESTART MATCH
                  </motion.button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        audioEngine.playClick();
                        onNavigateLevels();
                      }}
                      className="py-3 px-3 bg-slate-950/80 border border-white/5 rounded-xl text-xs font-mono text-slate-400 cursor-pointer hover:text-white"
                    >
                      LEVELS PORTAL
                    </button>
                    <button
                      onClick={() => {
                        audioEngine.playClick();
                        onNavigateHome();
                      }}
                      className="py-3 px-3 bg-slate-950/80 border border-white/5 rounded-xl text-xs font-mono text-slate-400 cursor-pointer hover:text-white"
                    >
                      EXIT TO LOBBY
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VICTORY COMPLETED SCREEN STATE */}
            {gameState === 'victory' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-sm bg-slate-900 border border-white/5 rounded-4xl p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.25)] relative"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />
                
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">
                  🏆
                </div>

                <h3 className="text-3xl font-black text-emerald-400 tracking-wider uppercase italic">VICTORY SECURED</h3>
                <span className="block text-[10px] font-mono text-slate-400 tracking-wider uppercase mb-6">STAGE {levelNumber} ACHIEVED</span>

                {/* Score Stats */}
                <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2 mb-8 text-left font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Slashed Score:</span>
                    <strong className="text-emerald-400">{score} pts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stage Target:</span>
                    <span className="text-slate-300">{config.targetScore} pts</span>
                  </div>
                  <div className="h-[1px] bg-white/5 my-1" />
                  <div className="flex justify-between items-center text-amber-400 font-bold">
                    <span>Arcade Claim:</span>
                    <span>+ 🪙 {30 + (levelNumber * 2) + Math.floor(score / 10)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {levelNumber < 100 ? (
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        audioEngine.playPowerup();
                        onNextLevel();
                        handleRestart(); // resets game stats and launches increments
                      }}
                      className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black tracking-widest rounded-2xl flex items-center justify-center gap-2 cursor-pointer outline-none"
                    >
                      <span>NEXT STAGE</span>
                      <ArrowRight className="w-4 h-4 fill-slate-950 stroke-none" />
                    </motion.button>
                  ) : (
                    <p className="text-xs font-mono text-amber-400 font-bold py-2">
                      🎉 CONGRATULATIONS! YOU HAVE UNLOCKED LEVEL 100!
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleRestart}
                      className="py-3 px-3 bg-slate-800 border border-white/5 rounded-xl text-xs font-mono text-slate-300 cursor-pointer hover:text-white"
                    >
                      REPLAY STAGE
                    </button>
                    <button
                      onClick={() => {
                        audioEngine.playClick();
                        onNavigateLevels();
                      }}
                      className="py-3 px-3 bg-slate-950 border border-white/5 rounded-xl text-xs font-mono text-slate-400 cursor-pointer hover:text-white"
                    >
                      CAMPAIGN PORTAL
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* DEFEAT SCREEN STATE */}
            {gameState === 'defeat' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-sm bg-slate-900 border border-white/5 rounded-4xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.25)] relative"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
                
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">
                  💥
                </div>

                <h3 className="text-3xl font-black text-rose-500 tracking-wider uppercase italic">STREAK BROKEN</h3>
                <span className="block text-[10px] font-mono text-slate-400 tracking-wider uppercase mb-6">MISSION TERMINATED</span>

                {/* Score Stats */}
                <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2 mb-8 text-left font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Your Score:</span>
                    <strong className="text-rose-400">{score} pts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Needed Score:</span>
                    <span className="text-slate-300">{config.targetScore} pts</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Missed Drops:</span>
                    <span>{config.maxMisses - lives} / {config.maxMisses}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(244,63,94,0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRestart}
                    className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold tracking-widest rounded-2xl flex items-center justify-center gap-2 cursor-pointer outline-none"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>RETRY STAGE</span>
                  </motion.button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        audioEngine.playClick();
                        onNavigateLevels();
                      }}
                      className="py-3 px-3 bg-slate-800 border border-white/5 rounded-xl text-xs font-mono text-slate-300 cursor-pointer hover:text-white"
                    >
                      CAMPAIGN PORTAL
                    </button>
                    <button
                      onClick={() => {
                        audioEngine.playClick();
                        onNavigateHome();
                      }}
                      className="py-3 px-3 bg-slate-950 border border-white/5 rounded-xl text-xs font-mono text-slate-400 cursor-pointer hover:text-white"
                    >
                      EXIT TO LOBBY
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
