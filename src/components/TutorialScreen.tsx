/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Sword, Play, Zap, ShieldAlert, Heart } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface TutorialScreenProps {
  onBack: () => void;
  onStartLevelOne: () => void;
}

interface PracticeFruit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  emoji: string;
  color: string;
  isSliced: boolean;
  sliceProgress: number;
  rotation: number;
  rv: number;
}

export default function TutorialScreen({ onBack, onStartLevelOne }: TutorialScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [practiceScore, setPracticeScore] = useState(0);
  const [slashPath, setSlashPath] = useState<{ x: number; y: number; time: number }[]>([]);
  const isSlashedRef = useRef<boolean>(false);

  // Practice state
  const fruitsRef = useRef<PracticeFruit[]>([]);
  const lastSpawnRef = useRef<number>(0);

  const steps = [
    {
      icon: <Sword className="w-5 h-5 text-rose-400" />,
      text: 'Swipe fruits using mouse click & drag, or swipe touch paths recursively.',
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
      text: 'Avoid Bombs! Slicing them triggers massive damage or immediate defeat!',
    },
    {
      icon: <Zap className="w-5 h-5 text-sky-400" />,
      text: 'Slice multiple fruits in a single quick swipe to summon combo point bonuses.',
    },
    {
      icon: <Heart className="w-5 h-5 text-red-500" fill="currentColor" />,
      text: 'Do not let fruits drop without being cut. Miss too many, and you fail.',
    },
  ];

  useEffect(() => {
    // Basic Canvas size observer
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 320; // Explicit height for practice box
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Initial fruits spawn
    fruitsRef.current = [
      { x: 100, y: 300, vx: 2, vy: -11, size: 22, emoji: '🍉', color: '#10b981', isSliced: false, sliceProgress: 0, rotation: 0, rv: 0.05 },
      { x: 250, y: 340, vx: -0.5, vy: -12, size: 20, emoji: '🍊', color: '#f59e0b', isSliced: false, sliceProgress: 0, rotation: 0, rv: -0.06 },
    ];

    let animationFrameId: number;

    const loop = (timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw glowing practice guidelines grids
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 40; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 40; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Spawn random fruit if empty
      if (timestamp - lastSpawnRef.current > 3000 || fruitsRef.current.length === 0) {
        const fruitOptions = [
          { emoji: '🍎', color: '#ef4444' },
          { emoji: '🍌', color: '#eab308' },
          { emoji: '🍊', color: '#f97316' },
          { emoji: '🍉', color: '#22c55e' },
          { emoji: '🍓', color: '#f43f5e' }
        ];
        const chosen = fruitOptions[Math.floor(Math.random() * fruitOptions.length)];
        
        fruitsRef.current.push({
          x: 50 + Math.random() * (canvas.width - 100),
          y: canvas.height + 20,
          vx: (Math.random() - 0.5) * 3,
          vy: -8 - Math.random() * 5,
          size: 20,
          emoji: chosen.emoji,
          color: chosen.color,
          isSliced: false,
          sliceProgress: 0,
          rotation: Math.random() * Math.PI,
          rv: (Math.random() - 0.5) * 0.1
        });
        
        lastSpawnRef.current = timestamp;
      }

      // 2. Update and draw practice fruits
      fruitsRef.current.forEach((fr, idx) => {
        fr.x += fr.vx;
        fr.y += fr.vy;
        fr.vy += 0.25; // gravity
        fr.rotation += fr.rv;

        ctx.save();
        ctx.translate(fr.x, fr.y);
        ctx.rotate(fr.rotation);

        if (!fr.isSliced) {
          // Draw whole fruit
          ctx.font = '36px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fr.emoji, 0, 0);
        } else {
          // Sliced halves falling apart
          fr.sliceProgress += 1;
          ctx.font = '36px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Half 1
          ctx.save();
          ctx.translate(-fr.sliceProgress * 1.5, 0);
          ctx.beginPath();
          ctx.rect(-50, -50, 50, 100);
          ctx.clip();
          ctx.fillText(fr.emoji, 0, 0);
          ctx.restore();

          // Half 2
          ctx.save();
          ctx.translate(fr.sliceProgress * 1.5, 0);
          ctx.beginPath();
          ctx.rect(0, -50, 50, 100);
          ctx.clip();
          ctx.fillText(fr.emoji, 0, 0);
          ctx.restore();
        }
        ctx.restore();
      });

      // Remove off-screen fruits
      fruitsRef.current = fruitsRef.current.filter(
        (fr) => fr.y < canvas.height + 100 && (fr.sliceProgress < 30)
      );

      // Draw active swipe path
      if (slashPath.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 15;

        ctx.moveTo(slashPath[0].x, slashPath[0].y);
        for (let i = 1; i < slashPath.length; i++) {
          ctx.lineTo(slashPath[i].x, slashPath[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [slashPath]);

  // Handle path drawing and slicing intersection in sandbox
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isSlashedRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSlashPath([{ x, y, time: Date.now() }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSlashedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPath = [...slashPath, { x, y, time: Date.now() }].slice(-10); // keep last 10 points
    setSlashPath(newPath);

    // Intersection test
    if (newPath.length >= 2) {
      const p1 = newPath[newPath.length - 2];
      const p2 = newPath[newPath.length - 1];

      fruitsRef.current.forEach((fr) => {
        if (!fr.isSliced) {
          // Distance from line segment p1-p2 to fruit center (fr.x, fr.y)
          const dist = distToSegment({ x: fr.x, y: fr.y }, p1, p2);
          if (dist < 32) {
            fr.isSliced = true;
            // Play physical sound from our AudioEngine!
            audioEngine.playSplat();
            setPracticeScore((prev) => prev + 1);
          }
        }
      });
    }
  };

  const handlePointerUp = () => {
    isSlashedRef.current = false;
    setSlashPath([]);
  };

  // Distance helper
  function distToSegment(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
  }

  return (
    <div className="relative min-h-screen bg-slate-950 p-4 md:p-8 flex flex-col justify-between overflow-hidden select-none" ref={containerRef}>
      
      {/* Background patterns */}
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
          <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-sky-400 tracking-wider">
            HOW TO SLASH
          </h2>
          <span className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase">
            RECRUIT DOJO TRIAL
          </span>
        </div>

        <div className="w-11 h-11" /> {/* Spacer */}
      </div>

      {/* DETAILED CONTENT SECTION */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch my-auto z-10">
        
        {/* Left Side: Rules and guidelines Card */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-sky-500 shadow-md" />
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
              <h3 className="text-lg font-bold tracking-wide text-white uppercase">RECRUIT ENTRANCE</h3>
            </div>

            <div className="space-y-4">
              {steps.map((st, i) => (
                <div key={i} className="flex gap-3.5 items-start">
                  <div className="p-2 bg-slate-950 rounded-xl border border-white/5 shrink-0">
                    {st.icon}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans pt-0.5">
                    {st.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              audioEngine.playPowerup();
              onStartLevelOne();
            }}
            className="w-full mt-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black tracking-widest rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110"
          >
            <span>START CAMPAIGN</span>
            <Play className="w-4 h-4 fill-slate-950 stroke-none" />
          </motion.button>
        </div>

        {/* Right Side: Interactive Sandbox Dojo Trial */}
        <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-4.5 flex flex-col justify-between relative overflow-hidden text-center min-h-[360px]">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase">
              INTERACTIVE PRACTICING CANVAS
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              SLICES: {practiceScore}
            </span>
          </div>

          <div className="relative flex-1 bg-slate-950/80 rounded-2xl overflow-hidden border border-slate-900 cursor-crosshair">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full block"
            />
            {practiceScore === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4 bg-slate-950/20">
                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest animate-pulse">
                  ← Click and Drag cursor to Cut →
                </p>
              </div>
            )}
          </div>

          <p className="text-[9px] font-mono text-slate-500 mt-2 uppercase tracking-wide">
            Test cutting speed and trails without risking campaign stamina.
          </p>
        </div>

      </div>

      <div className="w-full text-center mt-6">
        <span className="text-[10px] font-mono text-slate-600 uppercase">
          Fruit Ninja • Neon Arcade Dojo
        </span>
      </div>

    </div>
  );
}
