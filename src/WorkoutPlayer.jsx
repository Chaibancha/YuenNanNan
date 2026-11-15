import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MUSCLE_GROUPS, TRAINING_MODALITIES, MediaPreloader } from './WorkoutEngine.js';
import { BiomechanicalVideoLoopEngine } from './ExerciseVideoEngine.js';

/**
 * ============================================================================
 * WorkoutPlayer.jsx (v2.0)
 * - วิดีโอวนลูปเชิงกลศาสตร์ชีวภาพ (<video autoplay loop muted playsinline>) ทุกท่า/อุปกรณ์
 * - 7-Minute Workout SVG Ring Timer + Haptic Vibration
 * - Yoga Studio Pranayama Breath Pacer (วงกลมนำจังหวะลมหายใจ)
 * - JEFIT EMG Muscle Activation % Bars & Swap Exercise
 * - Daily Burn Live HR Zone Telemetry + Burn Rate + Wake Lock API
 * - Pre-load & Pre-warm วิดีโอท่าถัดไปล่วงหน้า 5 วินาที (Zero-Latency)
 * ============================================================================
 */
export default function WorkoutPlayer({
  schedule,
  onSwapStep,
  onActiveMuscleChange,
  onWorkoutComplete
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(schedule?.steps?.[0]?.duration || 40);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState(1.0);
  const [videoAngle, setVideoAngle] = useState('side');
  const [flashClass, setFlashClass] = useState('');
  const [toastData, setToastData] = useState(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [preloadedNextReady, setPreloadedNextReady] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [breathTick, setBreathTick] = useState(0);

  const audioCtxRef = useRef(null);
  const preloaderRef = useRef(new MediaPreloader());
  const videoEngineRef = useRef(null);
  const videoElRef = useRef(null);
  const fallbackCanvasRef = useRef(null);
  const wakeLockRef = useRef(null);
  const lastTickRef = useRef(null);
  const accMsRef = useRef(0);

  const steps = schedule?.steps || [];
  const currentStep = steps[currentIndex] || steps[0];
  const nextStep = steps[currentIndex + 1] || null;
  const isYogaMode = schedule?.modality === 'YOGA';

  // Mount Biomechanical Looping Video Stream Engine
  useEffect(() => {
    const engine = new BiomechanicalVideoLoopEngine({ width: 640, height: 390, fps: 30 });
    videoEngineRef.current = engine;
    if (videoElRef.current) {
      engine.attachToVideo(videoElRef.current, fallbackCanvasRef.current);
    }
    return () => {
      engine.stop();
    };
  }, []);

  // Sync current exercise step & equipment to Looping Video Engine
  useEffect(() => {
    if (videoEngineRef.current && currentStep) {
      videoEngineRef.current.setExerciseStep(currentStep, schedule?.selectedEquipment || ['bodyweight']);
    }
    if (onActiveMuscleChange && currentStep) {
      onActiveMuscleChange(currentStep.primaryMuscle);
    }
  }, [currentStep, schedule?.selectedEquipment, onActiveMuscleChange]);

  useEffect(() => {
    if (videoEngineRef.current) {
      videoEngineRef.current.setPlaybackRate(videoSpeed);
    }
  }, [videoSpeed]);

  useEffect(() => {
    if (videoEngineRef.current) {
      videoEngineRef.current.setCameraAngle(videoAngle);
    }
  }, [videoAngle]);

  // Reset on schedule regeneration
  useEffect(() => {
    setIsRunning(false);
    setCompletedSummary(null);
    setCurrentIndex(0);
    setRemainingSec(schedule?.steps?.[0]?.duration || 40);
    accMsRef.current = 0;
    preloaderRef.current.preloadUpcomingSteps(schedule?.steps || [], 0, 3);
  }, [schedule]);

  // Screen Wake Lock API for mobile workouts (Play Store / PWA readiness)
  useEffect(() => {
    let active = true;
    const manageWakeLock = async () => {
      if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
      try {
        if (isRunning && !wakeLockRef.current) {
          const lock = await navigator.wakeLock.request('screen');
          if (active) wakeLockRef.current = lock;
        } else if (!isRunning && wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
      } catch {}
    };
    manageWakeLock();
    return () => {
      active = false;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isRunning]);

  // Yoga Pranayama Breath Pacer Timer (12s cycle: 4s Inhale, 2s Hold, 6s Exhale)
  useEffect(() => {
    const id = setInterval(() => {
      setBreathTick(t => (t + 1) % 12);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const triggerHaptic = useCallback((pattern = [90]) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }, []);

  const playTone = useCallback(
    (freq = 880, durationMs = 140, waveType = 'sine', volume = 0.22) => {
      if (!soundEnabled) return;
      try {
        if (!audioCtxRef.current) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + durationMs / 1000);
      } catch {}
    },
    [soundEnabled]
  );

  const speakText = useCallback(
    text => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = isYogaMode ? 0.94 : 1.05;
        window.speechSynthesis.speak(utterance);
      } catch {}
    },
    [voiceEnabled, isYogaMode]
  );

  const sendBrowserNotification = useCallback(
    (title, body) => {
      if (!notifyEnabled || typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    },
    [notifyEnabled]
  );

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifyEnabled(perm === 'granted');
  };

  const triggerVisualAlert = useCallback((phaseType, title, subtitle) => {
    const isRest = phaseType === 'REST' || phaseType === 'COOLDOWN';
    setFlashClass(isRest ? 'ring-4 ring-cyan-500/60' : 'ring-4 ring-orange-500/70');
    setToastData({ title, subtitle, isRest });
    setTimeout(() => setFlashClass(''), 900);
    setTimeout(() => setToastData(null), 3400);
  }, []);

  // Pre-warm & Pre-load Next Step 5 seconds before transition
  useEffect(() => {
    if (!isRunning || !currentStep) return;

    if (remainingSec === 5 && nextStep) {
      setPreloadedNextReady(false);
      videoEngineRef.current?.prewarmStep(nextStep);
      preloaderRef.current.preloadUrl(nextStep.mediaUrl).then(() => {
        setPreloadedNextReady(true);
      });
      speakText(`อีก 5 วินาที เตรียมตัวท่า ${nextStep.nameTh}`);
    }

    if (remainingSec <= 3 && remainingSec >= 1) {
      playTone(isYogaMode ? 528 : 880, 120, 'triangle', 0.22);
      triggerHaptic([55]);
    }
  }, [remainingSec, isRunning, currentStep, nextStep, playTone, speakText, triggerHaptic, isYogaMode]);

  // Drift-free interval timer
  useEffect(() => {
    if (!isRunning) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const deltaMs = now - (lastTickRef.current || now);
      lastTickRef.current = now;
      accMsRef.current += deltaMs;

      if (accMsRef.current >= 1000) {
        const ticks = Math.floor(accMsRef.current / 1000);
        accMsRef.current -= ticks * 1000;

        setRemainingSec(prev => {
          if (prev - ticks > 0) return prev - ticks;

          const nextIdx = currentIndex + 1;
          if (nextIdx < steps.length) {
            const upcoming = steps[nextIdx];
            setCurrentIndex(nextIdx);
            setPreloadedNextReady(false);
            preloaderRef.current.preloadUpcomingSteps(steps, nextIdx, 2);
            videoEngineRef.current?.prewarmStep(steps[nextIdx + 1]);

            if (upcoming.type === 'REST' || upcoming.type === 'COOLDOWN') {
              playTone(523.25, 260, 'sine', 0.25);
              triggerHaptic([80, 50, 80]);
              triggerVisualAlert(upcoming.type, isYogaMode ? 'ปรับลมหายใจ (Pranayama)' : 'ช่วงพักฟื้นตัว', upcoming.nameTh);
              speakText(upcoming.nameTh);
              sendBrowserNotification('ช่วงพักฟื้นตัว', upcoming.nameTh);
            } else {
              playTone(isYogaMode ? 659.25 : 1174.66, 300, isYogaMode ? 'sine' : 'sawtooth', 0.26);
              triggerHaptic([140, 60, 140]);
              triggerVisualAlert(
                upcoming.type,
                upcoming.type === 'SPRINT' ? '⚡ ALL-OUT SPRINT!' : isYogaMode ? '🧘 อาสนะถัดไป' : '🔥 เริ่มฝึกท่าต่อไป!',
                upcoming.nameTh
              );
              speakText(`เริ่ม ${upcoming.nameTh}`);
              sendBrowserNotification(`เริ่มท่า: ${upcoming.nameTh}`, upcoming.formCues);
            }
            return upcoming.duration;
          } else {
            setIsRunning(false);
            playTone(1046.5, 500, 'triangle', 0.3);
            triggerHaptic([200, 100, 200]);
            triggerVisualAlert('COOLDOWN', '🎉 จบโปรแกรมสมบูรณ์!', 'บันทึกสถิติและฟื้นฟูกล้ามเนื้อเรียบร้อย');
            speakText('ยินดีด้วยครับ คุณออกกำลังกายครบตามเวลาเป้าหมายเรียบร้อยแล้ว');
            setCompletedSummary({
              durationMinutes: schedule.durationMinutes,
              estimatedKcal: schedule.summary?.estimatedKcal || 0,
              modality: schedule.modality
            });
            if (onWorkoutComplete) onWorkoutComplete(schedule);
            return 0;
          }
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, currentIndex, steps, playTone, speakText, sendBrowserNotification, triggerVisualAlert, triggerHaptic, isYogaMode, schedule, onWorkoutComplete]);

  const handleSelectStep = idx => {
    if (idx < 0 || idx >= steps.length) return;
    setCurrentIndex(idx);
    setRemainingSec(steps[idx].duration);
    accMsRef.current = 0;
    preloaderRef.current.preloadUpcomingSteps(steps, idx, 2);
  };

  const formatClock = sec => {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const elapsedBeforeCurrent = currentStep ? currentStep.startTimeSec : 0;
  const elapsedInCurrent = currentStep ? currentStep.duration - remainingSec : 0;
  const totalElapsedSec = elapsedBeforeCurrent + elapsedInCurrent;
  const totalRemainingSec = Math.max(0, (schedule?.totalSeconds || 0) - totalElapsedSec);
  const globalProgressPct = schedule?.totalSeconds ? Math.min(100, (totalElapsedSec / schedule.totalSeconds) * 100) : 0;
  const stepProgressPct = currentStep?.duration ? Math.min(100, ((currentStep.duration - remainingSec) / currentStep.duration) * 100) : 0;

  // 7-Minute Workout Circular SVG Ring Math
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - stepProgressPct / 100);

  // Daily Burn Simulated Live HR Zone Telemetry
  const modMeta = TRAINING_MODALITIES[schedule?.modality] || TRAINING_MODALITIES.HIIT;
  const [hrMin, hrMax] = modMeta.hrTargetBpm || [130, 168];
  const simulatedBpm = currentStep?.type === 'REST' || currentStep?.type === 'COOLDOWN'
    ? Math.round(hrMin * 0.88)
    : currentStep?.type === 'SPRINT'
    ? hrMax
    : Math.round(hrMin + (hrMax - hrMin) * (stepProgressPct / 100));

  // Yoga Breath Pacer Phase
  const breathPhase = breathTick < 4
    ? { label: 'สูดหายใจเข้าลึก (Inhale)', scale: 'scale-110', color: 'border-emerald-400 text-emerald-300' }
    : breathTick < 6
    ? { label: 'กลั้นลมหายใจ (Hold)', scale: 'scale-110', color: 'border-amber-400 text-amber-300' }
    : { label: 'ผ่อนลมหายใจออกช้าๆ (Exhale)', scale: 'scale-90', color: 'border-cyan-400 text-cyan-300' };

  const emgEntries = Object.entries(currentStep?.emgActivation || {});

  return (
    <div className="flex flex-col gap-5 pb-20 lg:pb-6">
      {/* Floating Smart Toast */}
      {toastData && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-none">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border-2 backdrop-blur-md flex items-center gap-3 ${
              toastData.isRest ? 'bg-zinc-900/95 border-cyan-500 text-cyan-300' : 'bg-zinc-900/95 border-orange-500 text-orange-300'
            }`}
          >
            <span className="text-2xl">{toastData.isRest ? '🧊' : '🔥'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-wider">{toastData.title}</p>
              <p className="text-sm font-bold text-white truncate">{toastData.subtitle}</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Burn Telemetry + Audio/Notification Header Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">เหลือรวม:</span>
            <span className="font-mono font-extrabold text-sm sm:text-base text-orange-400">
              {formatClock(totalRemainingSec)}
            </span>
          </div>

          {/* Daily Burn Live Heart Rate Telemetry */}
          <div className="bg-zinc-950 border border-rose-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="text-rose-500 animate-pulse">❤️</span>
            <span className="font-mono text-xs sm:text-sm font-extrabold text-white">{simulatedBpm} BPM</span>
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              • {schedule?.summary?.burnRatePerMin || 0} kcal/นาที
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(v => !v)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              soundEnabled ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {soundEnabled ? '🔔 เสียง: เปิด' : '🔕 เสียง: ปิด'}
          </button>

          <button
            type="button"
            onClick={() => setVoiceEnabled(v => !v)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              voiceEnabled ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {voiceEnabled ? '🗣️ พากย์: เปิด' : '🔇 พากย์: ปิด'}
          </button>

          <button
            type="button"
            onClick={requestNotificationPermission}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              notifyEnabled ? 'bg-purple-500/15 text-purple-300 border-purple-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {notifyEnabled ? '📲 แจ้งเตือน: เปิด' : '📲 แจ้งเตือน'}
          </button>
        </div>

        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-300"
            style={{ width: `${globalProgressPct}%` }}
          />
        </div>
      </div>

      {/* Workout Complete Celebration Card */}
      {completedSummary && (
        <div className="bg-gradient-to-r from-emerald-950/90 to-zinc-900 border border-emerald-500/50 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              SESSION COMPLETE • LOGGED TO JEFIT TRACKER
            </span>
            <h3 className="text-xl font-extrabold text-white mt-0.5">
              เยี่ยมมาก! คุณฝึกครบ {completedSummary.durationMinutes} นาที ({completedSummary.modality})
            </h3>
            <p className="text-xs text-zinc-300 mt-1">
              เผาผลาญพลังงานประมาณ {completedSummary.estimatedKcal} kcal และอัปเดตสถานะความล้าของกล้ามเนื้อแล้ว
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCompletedSummary(null);
              handleSelectStep(0);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-extrabold text-xs"
          >
            🔄 ฝึกซ้ำอีกรอบ
          </button>
        </div>
      )}

      {/* Main Live Stage + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LIVE WORKOUT STAGE (7 Cols) */}
        <div
          className={`lg:col-span-7 bg-zinc-900/95 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-2xl transition-all ${flashClass}`}
        >
          {/* Top Status + Video Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                  currentStep?.type === 'SPRINT'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : currentStep?.type === 'WORK'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    : currentStep?.type === 'WARMUP'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {currentStep?.roundLabel}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {currentIndex + 1}/{steps.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPromptModal(v => !v)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 border border-zinc-700"
            >
              ✨ AI Video Prompt
            </button>
          </div>

          <div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-tight">
              {currentStep?.nameTh}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">{currentStep?.nameEn}</p>
          </div>

          {/* LOOPING WORKOUT VIDEO + 7-MINUTE SVG RING TIMER */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
            {/* HTML5 Looping Video Stage */}
            <div className="sm:col-span-7 relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 min-h-[260px] flex flex-col justify-between">
              <video
                ref={videoElRef}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover min-h-[260px]"
              />
              <canvas ref={fallbackCanvasRef} width={640} height={390} className="hidden" />

              {/* Top Overlay Badges */}
              <div className="absolute top-12 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
                <span
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow"
                  style={{ backgroundColor: currentStep?.primaryMuscleColor || '#f97316' }}
                >
                  🎯 {currentStep?.primaryMuscleTh}
                </span>
                {remainingSec <= 5 && nextStep && (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500 text-zinc-950">
                    {preloadedNextReady ? '⚡ วิดีโอท่าถัดไปพร้อมแล้ว' : '⏳ กำลังเตรียมท่าถัดไป...'}
                  </span>
                )}
              </div>

              {/* Video Speed & Camera Angle Bar */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-2 bg-zinc-950/85 backdrop-blur-md border border-zinc-800 rounded-xl p-2">
                <div className="flex items-center gap-1">
                  {[0.5, 1.0, 1.5].map(sp => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setVideoSpeed(sp)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                        videoSpeed === sp ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'side', label: 'ข้าง (Side)' },
                    { id: 'front', label: 'หน้า (Front)' }
                  ].map(ang => (
                    <button
                      key={ang.id}
                      type="button"
                      onClick={() => setVideoAngle(ang.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        videoAngle === ang.id ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {ang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 7-Minute Ring Countdown + Yoga Pranayama Breath Pacer */}
            <div className="sm:col-span-5 bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-between gap-3">
              {/* SVG Progress Ring */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={ringRadius} stroke="#27272a" strokeWidth="8" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r={ringRadius}
                    stroke={currentStep?.type === 'REST' ? '#06b6d4' : isYogaMode ? '#10b981' : '#f97316'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringDashOffset}
                    className="transition-all duration-200"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                    {currentStep?.type === 'REST' ? 'REST' : isYogaMode ? 'ASANA' : 'WORK'}
                  </span>
                  <span
                    className={`font-mono font-extrabold text-3xl tracking-tight ${
                      remainingSec <= 3 && isRunning ? 'text-red-500 scale-110 transition-transform' : 'text-white'
                    }`}
                  >
                    {formatClock(remainingSec)}
                  </span>
                </div>
              </div>

              {/* Yoga Studio Pranayama Breath Pacer */}
              {(isYogaMode || currentStep?.type === 'REST' || currentStep?.type === 'COOLDOWN') && (
                <div
                  className={`w-full rounded-xl border px-2.5 py-2 text-center transition-all duration-700 ${breathPhase.color} bg-zinc-900/70`}
                >
                  <div className={`inline-block w-3 h-3 rounded-full border-2 mr-1.5 transition-transform duration-700 ${breathPhase.scale} ${breathPhase.color}`} />
                  <span className="text-[11px] font-bold">{breathPhase.label}</span>
                </div>
              )}

              {/* Play / Pause / Skip */}
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => handleSelectStep(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-bold text-zinc-200"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={() => setIsRunning(r => !r)}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition shadow-lg ${
                    isRunning ? 'bg-amber-500 text-zinc-950' : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25'
                  }`}
                >
                  {isRunning ? '⏸ หยุด' : '▶ เริ่มฝึก'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectStep(currentIndex + 1)}
                  disabled={currentIndex >= steps.length - 1}
                  className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-bold text-zinc-200"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>

          {/* Form Cues + JEFIT EMG Muscle Activation % Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-3">
              <p className="text-[11px] font-bold text-orange-400">การจัดระเบียบร่างกาย (Form Cue):</p>
              <p className="text-xs text-zinc-200 leading-relaxed mt-1">{currentStep?.formCues}</p>
            </div>

            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-3 space-y-1.5">
              <p className="text-[11px] font-bold text-cyan-400">JEFIT EMG Muscle Activation %:</p>
              {emgEntries.map(([mId, pct]) => {
                const meta = MUSCLE_GROUPS.find(m => m.id === mId);
                return (
                  <div key={mId} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className="text-zinc-300 truncate">{meta?.nameTh.split(' (')[0] || mId}</span>
                      <span className="font-mono text-orange-300">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: meta?.color || '#f97316' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {showPromptModal && currentStep?.aiPrompt && (
            <div className="bg-zinc-950 border border-orange-500/40 rounded-2xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400">🤖 AI Looping Video & Image Prompt Blueprint</span>
                <button type="button" onClick={() => setShowPromptModal(false)} className="text-zinc-400 hover:text-white">
                  ✕ ปิด
                </button>
              </div>
              <p className="font-mono text-[11px] text-zinc-200 bg-zinc-900 p-2 rounded-lg">
                {currentStep.aiPrompt.imagePrompt}
              </p>
              <p className="font-mono text-[11px] text-cyan-200 bg-zinc-900 p-2 rounded-lg">
                {currentStep.aiPrompt.motionLoopPrompt}
              </p>
            </div>
          )}

          {/* Up Next Preview */}
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between gap-3">
            {nextStep ? (
              <>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400">
                    ท่าถัดไป (UP NEXT • {nextStep.duration} วินาที)
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">{nextStep.nameTh}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{nextStep.nameEn}</p>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 shrink-0">
                  {nextStep.duration}s
                </span>
              </>
            ) : (
              <p className="text-xs font-bold text-emerald-400">🏁 นี่คือช่วงสุดท้ายของตารางฝึก!</p>
            )}
          </div>
        </div>

        {/* SCHEDULE TIMELINE & SWAP PANEL (5 Cols) */}
        <div className="lg:col-span-5 bg-zinc-900/95 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-3 max-h-[680px]">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              ตารางฝึกซ้อม ({schedule?.durationMinutes} นาที • {steps.length} ช่วง)
            </h3>
            <p className="text-[11px] text-zinc-400">
              แตะเพื่อข้ามไปยังช่วงเวลานั้น หรือกด 🔀 เพื่อสลับท่าใหม่ (Sworkit Swap)
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {steps.map((step, idx) => {
              const isCurrent = idx === currentIndex;
              const isSwappable = step.type === 'WORK' || step.type === 'SPRINT';
              return (
                <div
                  key={`${step.stepNumber}-${idx}`}
                  className={`p-2.5 rounded-2xl border transition flex items-center justify-between gap-2 ${
                    isCurrent
                      ? 'bg-orange-500/15 border-orange-500 ring-1 ring-orange-500'
                      : step.type === 'REST'
                      ? 'bg-zinc-950/50 border-zinc-800/60'
                      : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectStep(idx)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <span className="font-mono text-[11px] text-zinc-500 w-10 shrink-0">
                      {formatClock(step.startTimeSec)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            step.type === 'REST'
                              ? 'bg-cyan-500/15 text-cyan-300'
                              : step.type === 'WARMUP'
                              ? 'bg-amber-500/20 text-amber-300'
                              : step.type === 'COOLDOWN'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-orange-500/20 text-orange-300'
                          }`}
                        >
                          {step.roundLabel}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate">{step.primaryMuscleTh.split(' (')[0]}</span>
                      </div>
                      <p className="text-xs font-bold text-zinc-100 truncate mt-0.5">{step.nameTh}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSwappable && onSwapStep && (
                      <button
                        type="button"
                        onClick={() => onSwapStep(idx)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 border border-zinc-700"
                      >
                        🔀
                      </button>
                    )}
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800">
                      {step.duration}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
