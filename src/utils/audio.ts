/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private musicVolumeNode: GainNode | null = null;
  private fxVolumeNode: GainNode | null = null;
  
  private musicIntervalId: any = null;
  private isMusicPlaying = false;
  private enabled = true;
  private fxVol = 1.2;
  private musicVol = 0.35;
  private lastSpeakTime = 0;

  // New pre-recorded audio assets loaded from public directory
  private musicAudio: HTMLAudioElement | null = null;
  private splatBuffer: AudioBuffer | null = null;
  private isSplatLoading = false;

  constructor() {
    this.setupUserInteractionListener();
  }

  private setupUserInteractionListener() {
    if (typeof window === 'undefined') return;
    const resumeAudio = () => {
      this.initCtx();
      this.initMusic();
      if (this.isMusicPlaying && this.musicAudio && this.musicAudio.paused) {
        this.musicAudio.play().catch((e) => console.warn("Interactive play of background music failed", e));
      }
      // Remove listeners safely
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('touchstart', resumeAudio);
  }

  private resumeBackgroundMusicIfActive() {
    this.initMusic();
    if (this.isMusicPlaying && this.enabled && this.musicAudio && this.musicAudio.paused) {
      this.musicAudio.volume = this.musicVol;
      this.musicAudio.play().catch((e) => console.warn("Failed to resume background music automatically", e));
    }
  }

  private initCtx() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch((e) => console.warn("Audio Context resume failed", e));
      }
      this.resumeBackgroundMusicIfActive();
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch((e) => console.warn("Audio Context resume failed", e));
      }
      
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.connect(this.ctx.destination);
      this.masterVolume.gain.setValueAtTime(this.enabled ? 1 : 0, this.ctx.currentTime);

      this.fxVolumeNode = this.ctx.createGain();
      this.fxVolumeNode.connect(this.masterVolume);
      this.fxVolumeNode.gain.setValueAtTime(this.fxVol, this.ctx.currentTime);

      this.musicVolumeNode = this.ctx.createGain();
      this.musicVolumeNode.connect(this.masterVolume);
      this.musicVolumeNode.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);

      this.initMusic();
      this.resumeBackgroundMusicIfActive();

      // Async fetch and decode the premium real fruit splat sound effect
      this.loadSplatAudio();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  private initMusic() {
    if (this.musicAudio) return;
    if (typeof window !== 'undefined') {
      try {
        this.musicAudio = new Audio('/fruit_ninja.mp3');
        this.musicAudio.loop = true;
        this.musicAudio.volume = this.enabled ? this.musicVol : 0;
      } catch (e) {
        console.warn("Failed to create background music audio element", e);
      }
    }
  }

  private loadSplatAudio() {
    if (this.splatBuffer || this.isSplatLoading || !this.ctx) return;
    this.isSplatLoading = true;
    fetch('/057386742-game-fruit-splat-01.m4a')
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch splat sound");
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (!this.ctx) return;
        return this.ctx.decodeAudioData(arrayBuffer);
      })
      .then((decodedBuffer) => {
        if (decodedBuffer) {
          this.splatBuffer = decodedBuffer;
          console.log("Custom real fruit splat audio element decoded successfully.");
        }
      })
      .catch((err) => {
        console.warn("Could not load premium splat sound file, falling back to procedural audio", err);
      })
      .finally(() => {
        this.isSplatLoading = false;
      });
  }

  setSettings(enabled: boolean, fxVol: number, musicVol: number) {
    this.enabled = enabled;
    this.fxVol = fxVol;
    this.musicVol = musicVol;

    if (this.musicAudio) {
      const targetMusicVol = (this.enabled && this.isMusicPlaying) ? this.musicVol : 0;
      this.musicAudio.volume = targetMusicVol;
    }

    if (!this.ctx) return;

    if (this.masterVolume) {
      this.masterVolume.gain.setValueAtTime(this.enabled ? 1 : 0, this.ctx.currentTime);
    }
    if (this.fxVolumeNode) {
      this.fxVolumeNode.gain.setValueAtTime(this.fxVol, this.ctx.currentTime);
    }
    if (this.musicVolumeNode) {
      const targetMusicVol = this.isMusicPlaying ? this.musicVol : 0;
      this.musicVolumeNode.gain.setValueAtTime(targetMusicVol, this.ctx.currentTime);
    }
  }

  playClick() {
    this.initCtx();
    if (!this.ctx || !this.enabled || this.fxVol === 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.fxVolumeNode!);

    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.40, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playSwoosh() {
    this.initCtx();
    if (!this.ctx || !this.enabled || this.fxVol === 0) return;

    // Synthesize a white noise swoosh of a sword slicing air
    const bufferSize = this.ctx.sampleRate * 0.15; // 150ms buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filterNode = this.ctx.createBiquadFilter();
    filterNode.type = 'bandpass';
    filterNode.frequency.setValueAtTime(800, this.ctx.currentTime);
    filterNode.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.15);
    filterNode.Q.setValueAtTime(3, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.70, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);

    noiseNode.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.fxVolumeNode!);

    noiseNode.start();
  }

  playLaunch() {
    this.initCtx();
    if (!this.ctx || !this.enabled || this.fxVol === 0) return;

    const now = this.ctx.currentTime;
    
    // Low-pitched rising physical swoosh representing a physical launching/spring propulsion
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.22);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + 0.22);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1.10, now + 0.04); // loud spring-loaded thunk launch
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.22); // fade out

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.fxVolumeNode!);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  playFruitSlice() {
    this.initCtx();
    if (!this.ctx || !this.enabled || this.fxVol === 0) return;

    // Trigger the custom real fruit splat sound effect alongside the blade ring
    this.playSplat();

    const now = this.ctx.currentTime;
    // Premium natural variation so consecutive cuts sound unique
    const pitchJitter = 0.94 + Math.random() * 0.18;
    const duration = 0.15; // smooth realistic duration of steel shearing

    // 1. WAVE SHAPER (Saturating distortion curve to add rich metallic texture and gritty "clash")
    const shaper = this.ctx.createWaveShaper();
    const makeCurve = (amount = 35) => {
      const n = 2048;
      const curve = new Float32Array(n);
      const deg = Math.PI / 180;
      for (let i = 0; i < n; ++i) {
        const x = (i * 2) / n - 1;
        curve[i] = ((3 + amount) * x * 15 * deg) / (Math.PI + amount * Math.abs(x));
      }
      return curve;
    };
    shaper.curve = makeCurve(45);
    shaper.connect(this.fxVolumeNode!);

    // 2. HIGH-RES METALLIC BEATING HARMONICS (Simulates natural steel vibration/ring)
    // Tuning frequencies in pairs to produce physical acoustic wave beating (extremely realistic sound of real metal!)
    const metalModes = [
      { f: 1500, b: 1515, gain: 0.35 }, // Blade body structural ring
      { f: 2800, b: 2825, gain: 0.45 }, // Cutting edge scream
      { f: 5500, b: 5540, gain: 0.28 }, // Razor-sharp sheen
      { f: 8800, b: 8870, gain: 0.18 }  // Glassy high-end resonance
    ];

    metalModes.forEach((mode) => {
      if (!this.ctx) return;
      
      // Primary frequency wave
      const osc1 = this.ctx.createOscillator();
      // Beating frequency wave to create natural pulsing/metallic ringing
      const osc2 = this.ctx.createOscillator();
      
      const oscGain = this.ctx.createGain();
      const hpFilter = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      const start1 = mode.f * pitchJitter;
      const start2 = mode.b * pitchJitter;
      const end1 = (mode.f / 2.8) * pitchJitter;
      const end2 = (mode.b / 2.8) * pitchJitter;

      osc1.frequency.setValueAtTime(start1, now);
      osc1.frequency.exponentialRampToValueAtTime(end1, now + 0.10);

      osc2.frequency.setValueAtTime(start2, now);
      osc2.frequency.exponentialRampToValueAtTime(end2, now + 0.10);

      // Clean, bright highpass filter to keep only razor-sharp high frequencies
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(2600, now);
      hpFilter.Q.setValueAtTime(1.8, now);

      // Instant attack, exponential decay for sword blade cut
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(mode.gain * 1.5, now + 0.003);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(hpFilter);
      osc2.connect(hpFilter);
      hpFilter.connect(oscGain);
      oscGain.connect(shaper); // Send through WaveShaper for realistic grit/bite!

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);
    });

    // 3. CINEMATIC AIR WHISTLE SWOOSH (Simulates the blade whipping through the air)
    try {
      const bufferSize = this.ctx.sampleRate * 0.11; // 110ms snappy whoosh
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      // Clean frequency sweep representing air friction acceleration
      bandpass.frequency.setValueAtTime(4500 * pitchJitter, now);
      bandpass.frequency.exponentialRampToValueAtTime(11500 * pitchJitter, now + 0.07);
      bandpass.Q.setValueAtTime(7.0, now); // Razor-sharp whistling air resonance Q

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(4.2, now + 0.003); // Loud cinematic whip wave
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(shaper); // Air swoosh also gets realistic raw saturation

      noiseSource.start(now);
    } catch (e) {
      console.warn("Swoosh play failed", e);
    }

    // 4. ORGANIC FIBER TEAR CRACKLE (Produces the physical skin slice contact texture)
    try {
      const bufferSize = this.ctx.sampleRate * 0.05; // 50ms ultra fast skin tear
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const tearSource = this.ctx.createBufferSource();
      tearSource.buffer = buffer;

      const tearFilter = this.ctx.createBiquadFilter();
      tearFilter.type = 'highpass';
      tearFilter.frequency.setValueAtTime(8000, now);

      const tearGain = this.ctx.createGain();
      tearGain.gain.setValueAtTime(0, now);
      tearGain.gain.linearRampToValueAtTime(1.8, now + 0.002);
      tearGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      tearSource.connect(tearFilter);
      tearFilter.connect(tearGain);
      tearGain.connect(this.fxVolumeNode!); // Keep raw and crisp, direct output

      tearSource.start(now);
    } catch (e) {
      console.warn("Tear play failed", e);
    }

    // 5. CRISP SUBTLE SKIN SWELL POP
    const popOsc = this.ctx.createOscillator();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(520 * pitchJitter, now);
    popOsc.frequency.exponentialRampToValueAtTime(220 * pitchJitter, now + 0.06);

    const popGain = this.ctx.createGain();
    popGain.gain.setValueAtTime(0.25, now);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    popOsc.connect(popGain);
    popGain.connect(this.fxVolumeNode!);

    popOsc.start(now);
    popOsc.stop(now + 0.07);
  }

  playSplat() {
    this.initCtx();
    if (!this.ctx || !this.enabled || this.fxVol === 0) return;

    if (this.splatBuffer) {
      try {
        const now = this.ctx.currentTime;
        const source = this.ctx.createBufferSource();
        source.buffer = this.splatBuffer;

        // Realistic pitch variation so repeating splats sound organic and unique
        const pitchJitter = 0.85 + Math.random() * 0.30;
        source.playbackRate.setValueAtTime(pitchJitter, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(7500, now);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(1.15, now);

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.fxVolumeNode!);

        source.start(now);
        return;
      } catch (err) {
        console.warn("Error playing pre-recorded splat, falling back to procedural", err);
      }
    }

    // Squelchy, juicy organic splat using brief noise + pitching down triangle oscillator
    const now = this.ctx.currentTime;
    const pitchJitter = 0.82 + Math.random() * 0.36;
    
    // 1. Organic pop frequency sweep
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300 * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(40 * pitchJitter, now + 0.15);

    // 2. Filter to make it sound squishy
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600 * pitchJitter, now);
    filter.frequency.exponentialRampToValueAtTime(80 * pitchJitter, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.10, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.fxVolumeNode!);

    osc.start();
    osc.stop(now + 0.16);
  }

  playBombExplosion() {
    this.initCtx();
    if (!this.ctx || !this.enabled || this.fxVol === 0) return;

    const now = this.ctx.currentTime;

    // Low-frequency rumbling boom
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(10, now + 0.8);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(1.60, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    // Crackle noise of explosion
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(50, now + 0.5);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.10, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(oscGain);
    oscGain.connect(this.fxVolumeNode!);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.fxVolumeNode!);

    osc.start();
    osc.stop(now + 0.8);

    noise.start();
    noise.stop(now + 0.5);
  }

  playCombo() {
    this.initCtx();
    if (!this.ctx || !this.enabled || this.fxVol === 0) return;

    const now = this.ctx.currentTime;
    
    // Play a shiny pentatonic glockenspiel arpeggio (3 quick tones)
    const tones = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    tones.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.fxVolumeNode!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  }

  playPowerup() {
    this.initCtx();
    if (!this.ctx || !this.enabled || this.fxVol === 0) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.4);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.4);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.fxVolumeNode!);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  startMusic() {
    this.initCtx();
    this.initMusic();
    
    this.isMusicPlaying = true;
    
    if (this.musicAudio) {
      const targetVolume = this.enabled ? this.musicVol : 0;
      this.musicAudio.volume = targetVolume;
      
      // Ensure the loop property is set to true on the HTML5 audio element
      this.musicAudio.loop = true;

      this.musicAudio.play()
        .then(() => {
          if (this.isFallbackSynthRunning) {
            this.stopProceduralSynth();
          }
        })
        .catch((e) => {
          console.warn("Background music play failed/blocked, starting procedural fallback soundtrack", e);
          this.startProceduralSynth();
        });

      // Catch error events like empty file or unsupported format corruptions
      this.musicAudio.onerror = () => {
        console.warn("Background music audio format error, activating procedural fallback looping music");
        this.startProceduralSynth();
      };
    } else {
      this.startProceduralSynth();
    }
  }

  private isFallbackSynthRunning = false;

  private startProceduralSynth() {
    if (this.isFallbackSynthRunning || !this.ctx) return;
    this.isFallbackSynthRunning = true;

    if (this.musicVolumeNode) {
      this.musicVolumeNode.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
    }

    let step = 0;
    const pentatonic = [220.00, 246.94, 277.18, 329.63, 369.99, 440.00, 493.88]; // A3, B3, C#4, E4, F#4, A4, B4
    const chords = [
      [146.83, 220.00, 277.18], // Dmaj7 core
      [164.81, 220.00, 329.63], // Amaj9 core
      [110.00, 164.81, 246.94], // Asus2 core
      [130.81, 196.00, 329.63]  // Cmaj
    ];

    const playAmbientStep = () => {
      if (!this.ctx || !this.isMusicPlaying || !this.enabled || !this.isFallbackSynthRunning) return;
      const now = this.ctx.currentTime;

      // Play soft pad root notes on beat 0, 8, 16
      if (step % 8 === 0) {
        const chordIdx = Math.floor(step / 8) % chords.length;
        const notes = chords[chordIdx];
        notes.forEach((freq) => {
          if (!this.ctx || !this.musicVolumeNode) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.04, now + 1.0); // Slow fade-in
          gain.gain.exponentialRampToValueAtTime(0.001, now + 3.8); // Slow release
          
          osc.connect(gain);
          gain.connect(this.musicVolumeNode);
          
          osc.start(now);
          osc.stop(now + 4);
        });
      }

      // Random gentle synth melody note
      if (Math.random() > 0.3) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const freqIndex = Math.floor(Math.random() * pentatonic.length);
        const freq = pentatonic[freqIndex] * (Math.random() > 0.7 ? 2 : 1); // Random key or octave jump

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        // Gentle filter to keep it beautiful
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicVolumeNode!);

        osc.start(now);
        osc.stop(now + 1.3);
      }

      step = (step + 1) % 32;
    };

    // Run custom scheduler every 500ms
    playAmbientStep();
    this.musicIntervalId = setInterval(playAmbientStep, 500);
  }

  private stopProceduralSynth() {
    this.isFallbackSynthRunning = false;
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  speakWord(text: string) {
    if (!this.enabled || this.fxVol === 0) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const now = Date.now();
        // Skip speaking if previous voice feedback started less than 650ms ago
        // Excessive cancel() and Speak() calls can halt browser main thread
        if (now - this.lastSpeakTime < 650) {
          return;
        }
        this.lastSpeakTime = now;

        // Cancel existing queues so voice responds instantly with no delay lag
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find high-quality female/girl voice in current browser context
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => {
          const name = v.name.toLowerCase();
          return (
            name.toLowerCase().includes('female') || 
            name.toLowerCase().includes('girl') || 
            name.toLowerCase().includes('samantha') || 
            name.toLowerCase().includes('zira') || 
            name.toLowerCase().includes('karen') || 
            name.toLowerCase().includes('hazel') ||
            name.toLowerCase().includes('google us english') ||
            name.toLowerCase().includes('google uk english female')
          );
        }) || voices.find(v => v.lang.startsWith('en'));

        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }

        // Beautiful stylized female gamer voice attributes
        utterance.pitch = 1.32; // Higher pitch for enthusiastic female feel
        utterance.rate = 1.15;  // Energetic fast announcement rate
        utterance.volume = Math.min(1.0, this.fxVol * 0.85);

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("Speech Synthesis call failed", e);
    }
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicAudio) {
      this.musicAudio.pause();
    }
    if (this.musicVolumeNode && this.ctx) {
      this.musicVolumeNode.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.stopProceduralSynth();
  }
}

export const audioEngine = new AudioEngine();
