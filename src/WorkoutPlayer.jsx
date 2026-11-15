import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MediaPreloader, MUSCLE_GROUPS, EQUIPMENT_CATALOG } from './WorkoutEngine';

/**
 * ============================================================================
 * WorkoutPlayer.jsx
 * ระบบจับเวลาฝึกซ้อมแบบ Real-time, ระบบ Pre-load ภาพล่วงหน้า 5 วินาที (Zero-Latency),
 * ภาพสาธิตสมจริงพร้อมแอนิเมชันจำลองจังหวะการเคลื่อนไหว และระบบแจ้งเตือนอัจฉริยะ 4 ช่องทาง
 * (Visual Flash/Toast, Web Audio API Synthesizer, Text-to-Speech, Web Notifications)
 * ============================================================================
 */
export default function WorkoutPlayer({ schedule, onSwapStep, onActiveMuscleChange }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(schedule?.steps?.[0]?.duration || 40);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [flashClass, setFlashClass] = useState('');
  const [toastData, setToastData] = useState(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [preloadedNextReady, setPreloadedNextReady] = useState(false);

  const audioCtxRef = useRef(null);
  const preloaderRef = useRef(new MediaPreloader());
  const lastTickRef = useRef(null);
  const accMsRef = useRef(0);

  const steps = schedule?.steps || [];
  const currentStep = steps[currentIndex] || steps[0];
  const nextStep = steps[currentIndex + 1] || null;

  // รีเซ็ตสถานะเมื่อตารางฝึกเปลี่ยนใหม่
  useEffect(() => {
    setIsRunning(false);
    setCurrentIndex(0);
    const firstDur = schedule?.steps?.[0]?.duration || 40;
    setRemainingSec(firstDur);
    accMsRef.current = 0;
    preloaderRef.current.preloadUpcomingSteps(schedule?.steps || [], 0, 3);
  }, [schedule]);

  // แจ้งเตือนโมเดล 3D ให้ไฮไลต์กล้ามเนื้อมัดที่กำลังฝึกอยู่แบบ Real-time
  useEffect(() => {
    if (onActiveMuscleChange && currentStep) {
      onActiveMuscleChange(currentStep.primaryMuscle);
    }
  }, [currentStep, onActiveMuscleChange]);

  // Web Audio API Synthesizer สำหรับสร้างเสียงสัญญาณเตือนโดยไม่ง้อไฟล์ภายนอก
  const playTone = useCallback(
    (freq = 880, durationMs = 140, waveType = 'sine', volume = 0.22) => {
      if (!soundEnabled) return;
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
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
      } catch (err) {
        // Ignore audio context restriction errors before user gesture
      }
    },
    [soundEnabled]
  );

  // Text-to-Speech เสียงพากย์ภาษาไทยและอังกฤษ
  const speakText = useCallback(
    text => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Fallback if speech synthesis fails
      }
    },
    [voiceEnabled]
  );

  // Web Notifications API แจ้งเตือนผ่านระบบปฏิบัติการ/เบราว์เซอร์
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

  // ฟังก์ชันแสดง Visual Flash & Banner
  const triggerVisualAlert = useCallback((phaseType, title, subtitle) => {
    const isRest = phaseType === 'REST' || phaseType === 'COOLDOWN';
    setFlashClass(isRest ? 'ring-4 ring-cyan-500/60' : 'ring-4 ring-orange-500/70');
    setToastData({ title, subtitle, isRest });
    setTimeout(() => setFlashClass(''), 900);
    setTimeout(() => setToastData(null), 3500);
  }, []);

  // กลไก Pre-load รูปภาพล่วงหน้าอย่างน้อย 5 วินาที และนับถอยหลัง 3-2-1
  useEffect(() => {
    if (!isRunning || !currentStep) return;

    // Pre-fetch สื่อของท่าถัดไปทันทีเมื่อเหลือเวลา 5 วินาที (Zero-Latency Guarantee)
    if (remainingSec === 5 && nextStep) {
      setPreloadedNextReady(false);
      preloaderRef.current.preloadUrl(nextStep.mediaUrl).then(() => {
        setPreloadedNextReady(true);
      });
      speakText(`อีก 5 วินาที เตรียมตัวท่า ${nextStep.nameTh}`);
    }

    // เสียงเตือนนับถอยหลัง 3 - 2 - 1
    if (remainingSec <= 3 && remainingSec >= 1) {
      playTone(880, 130, 'triangle', 0.25);
    }
  }, [remainingSec, isRunning, currentStep, nextStep, playTone, speakText]);

  // ลูปจับเวลาความแม่นยำสูง (Drift-Free High-Resolution Timer)
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
          if (prev - ticks > 0) {
            return prev - ticks;
          }

          // เปลี่ยนไปยังท่าถัดไปโดยอัตโนมัติ
          const nextIdx = currentIndex + 1;
          if (nextIdx < steps.length) {
            const upcoming = steps[nextIdx];
            setCurrentIndex(nextIdx);
            setPreloadedNextReady(false);
            preloaderRef.current.preloadUpcomingSteps(steps, nextIdx, 2);

            if (upcoming.type === 'REST' || upcoming.type === 'COOLDOWN') {
              playTone(523.25, 280, 'sine', 0.28);
              triggerVisualAlert(upcoming.type, 'ช่วงพักฟื้นตัว (Recovery)', upcoming.nameTh);
              speakText(upcoming.nameTh);
              sendBrowserNotification('ช่วงพักฟื้นตัว', upcoming.nameTh);
            } else {
              playTone(1174.66, 320, 'sawtooth', 0.28);
              triggerVisualAlert(
                upcoming.type,
                upcoming.type === 'SPRINT' ? '⚡ ALL-OUT SPRINT!' : '🔥 เริ่มฝึกท่าต่อไป!',
                upcoming.nameTh
              );
              speakText(`เริ่ม ${upcoming.nameTh}`);
              sendBrowserNotification(`เริ่มท่า: ${upcoming.nameTh}`, upcoming.formCues);
            }
            return upcoming.duration;
          } else {
            // จบตารางการฝึกทั้งหมด
            setIsRunning(false);
            playTone(1046.5, 500, 'triangle', 0.3);
            triggerVisualAlert('COOLDOWN', '🎉 จบโปรแกรมสมบูรณ์!', 'คุณทำสำเร็จครบตามเวลาเป้าหมายแล้ว');
            speakText('ยินดีด้วยครับ คุณออกกำลังกายครบตามเวลาเป้าหมายเรียบร้อยแล้ว');
            return 0;
          }
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, currentIndex, steps, playTone, speakText, sendBrowserNotification, triggerVisualAlert]);

  const handleSelectStep = index => {
    if (index < 0 || index >= steps.length) return;
    setCurrentIndex(index);
    setRemainingSec(steps[index].duration);
    accMsRef.current = 0;
    preloaderRef.current.preloadUpcomingSteps(steps, index, 2);
  };

  const formatClock = sec => {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // คำนวณเวลาที่ผ่านไปและเวลาที่เหลือรวมทั้งตาราง
  const elapsedBeforeCurrent = currentStep ? currentStep.startTimeSec : 0;
  const elapsedInCurrent = currentStep ? currentStep.duration - remainingSec : 0;
  const totalElapsedSec = elapsedBeforeCurrent + elapsedInCurrent;
  const totalRemainingSec = Math.max(0, (schedule?.totalSeconds || 0) - totalElapsedSec);
  const globalProgressPct = schedule?.totalSeconds
    ? Math.min(100, (totalElapsedSec / schedule.totalSeconds) * 100)
    : 0;

  const stepProgressPct = currentStep?.duration
    ? Math.min(100, ((currentStep.duration - remainingSec) / currentStep.duration) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* แบนเนอร์แจ้งเตือนลอย (Floating Smart Alert Toast) */}
      {toastData && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-none">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border-2 backdrop-blur-md flex items-center gap-3 ${
              toastData.isRest
                ? 'bg-zinc-900/95 border-cyan-500 text-cyan-300'
                : 'bg-zinc-900/95 border-orange-500 text-orange-300'
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

      {/* แถบควบคุมระบบเสียง การแจ้งเตือน และความคืบหน้ารวม */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] text-zinc-400 mr-2">เวลาที่เหลือรวม:</span>
            <span className="font-mono font-extrabold text-sm sm:text-base text-orange-400">
              {formatClock(totalRemainingSec)}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
            <span>เผาผลาญคาดการณ์:</span>
            <span className="font-bold text-emerald-400">~{schedule?.summary?.estimatedKcal || 0} kcal</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(v => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              soundEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {soundEnabled ? '🔔 เสียงบี๊ป: เปิด' : '🔕 เสียงบี๊ป: ปิด'}
          </button>

          <button
            type="button"
            onClick={() => setVoiceEnabled(v => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              voiceEnabled
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {voiceEnabled ? '🗣️ เสียงพากย์: เปิด' : '🔇 เสียงพากย์: ปิด'}
          </button>

          <button
            type="button"
            onClick={requestNotificationPermission}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              notifyEnabled
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
            }`}
          >
            {notifyEnabled ? '📲 แจ้งเตือนเบราว์เซอร์: เปิด' : '📲 เปิดแจ้งเตือนเบราว์เซอร์'}
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-300"
            style={{ width: `${globalProgressPct}%` }}
          />
        </div>
      </div>

      {/* โครงสร้างหลัก: ซ้ายคือหน้าจอ Live Workout Stage, ขวาคือตารางฝึกพร้อมปุ่มสลับท่า */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LIVE WORKOUT STAGE (7 คอลัมน์) */}
        <div
          className={`lg:col-span-7 bg-zinc-900/95 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-2xl transition-all ${flashClass}`}
        >
          {/* แถวบน: ป้ายสถานะช่วงเวลา + ปุ่มดู AI Prompt */}
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
                ลำดับที่ {currentIndex + 1}/{steps.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPromptModal(v => !v)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 border border-zinc-700"
            >
              ✨ ดู AI Prompt ท่านี้
            </button>
          </div>

          {/* ชื่อท่าและคำแนะนำการจัดระเบียบร่างกาย */}
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {currentStep?.nameTh}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">{currentStep?.nameEn}</p>
          </div>

          {/* กรอบแสดงภาพสาธิตสมจริง + แอนิเมชันจำลองทิศทางแรง + นาฬิกานับถอยหลังขนาดใหญ่ */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* ภาพสาธิตสมจริง + Biomechanical Motion Overlay */}
            <div className="sm:col-span-7 relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 aspect-[16/11]">
              <img
                key={currentStep?.mediaUrl}
                src={currentStep?.mediaUrl}
                alt={currentStep?.nameEn}
                className="w-full h-full object-cover opacity-85 transition-opacity duration-200"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent" />

              {/* ป้ายกำกับมัดกล้ามเนื้อหลักและสถานะ Pre-load */}
              <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                <span
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow"
                  style={{ backgroundColor: currentStep?.primaryMuscleColor || '#f97316' }}
                >
                  🎯 {currentStep?.primaryMuscleTh}
                </span>
                {remainingSec <= 5 && nextStep && (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/90 text-zinc-950">
                    {preloadedNextReady ? '⚡ Pre-loaded ท่าถัดไปพร้อม' : '⏳ กำลังโหลดท่าถัดไป...'}
                  </span>
                )}
              </div>

              {/* แอนิเมชันจำลองเวกเตอร์การออกแรง (Biomechanical Vector Guide) */}
              <div className="absolute bottom-3 left-3 right-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-800/90 rounded-xl p-2.5">
                <p className="text-[11px] font-bold text-orange-400">
                  การจัดระเบียบร่างกาย (Biomechanical Cue):
                </p>
                <p className="text-xs text-zinc-200 leading-snug mt-0.5">{currentStep?.formCues}</p>
              </div>
            </div>

            {/* นาฬิกาจับเวลาขนาดใหญ่ + ตัวนับถอยหลัง 3-2-1 */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 h-full">
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                {currentStep?.type === 'REST' ? 'RECOVERY TIMER' : 'INTERVAL TIMER'}
              </span>

              <div
                className={`font-mono font-extrabold text-5xl sm:text-6xl my-2 tracking-tight ${
                  remainingSec <= 3
                    ? 'text-red-500 scale-105 transition-transform'
                    : currentStep?.type === 'REST'
                    ? 'text-cyan-400'
                    : 'text-white'
                }`}
              >
                {formatClock(remainingSec)}
              </div>

              {/* แถบความคืบหน้าของท่าปัจจุบัน */}
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden my-2">
                <div
                  className={`h-full transition-all duration-200 ${
                    currentStep?.type === 'REST' ? 'bg-cyan-400' : 'bg-orange-500'
                  }`}
                  style={{ width: `${stepProgressPct}%` }}
                />
              </div>

              {/* ปุ่มควบคุม Play / Pause / ข้ามท่า */}
              <div className="flex items-center gap-2 mt-2 w-full">
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
                  className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition shadow-lg ${
                    isRunning
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                      : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25'
                  }`}
                >
                  {isRunning ? '⏸ หยุดชั่วคราว' : '▶ เริ่มจับเวลา'}
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

          {/* แสดง AI Prompt Blueprint เมื่อผู้ใช้คลิกเปิดดู */}
          {showPromptModal && currentStep?.aiPrompt && (
            <div className="bg-zinc-950 border border-orange-500/40 rounded-2xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400">
                  🤖 AI Photorealistic Image & Motion Loop Prompt Blueprint
                </span>
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕ ปิด
                </button>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">Image Generation Prompt:</p>
                <p className="font-mono text-[11px] text-zinc-200 bg-zinc-900 p-2 rounded-lg mt-0.5">
                  {currentStep.aiPrompt.imagePrompt}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">Video-to-GIF Motion Loop Prompt:</p>
                <p className="font-mono text-[11px] text-cyan-200 bg-zinc-900 p-2 rounded-lg mt-0.5">
                  {currentStep.aiPrompt.motionLoopPrompt}
                </p>
              </div>
            </div>
          )}

          {/* ตัวอย่างท่าถัดไป (Up Next Preview Card) */}
          <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3 flex items-center justify-between gap-3">
            {nextStep ? (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={nextStep.mediaUrl}
                    alt={nextStep.nameEn}
                    className="w-14 h-14 rounded-xl object-cover border border-zinc-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400">
                      ท่าถัดไป (UP NEXT • {nextStep.duration} วินาที)
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-white truncate">{nextStep.nameTh}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{nextStep.nameEn}</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 shrink-0">
                  {nextStep.duration}s
                </span>
              </>
            ) : (
              <p className="text-xs font-bold text-emerald-400">
                🏁 นี่คือขั้นตอนสุดท้ายของตารางฝึก!
              </p>
            )}
          </div>
        </div>

        {/* SCHEDULE TIMELINE & SWAP EXERCISE PANEL (5 คอลัมน์) */}
        <div className="lg:col-span-5 bg-zinc-900/95 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-3 max-h-[640px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                ตารางฝึกซ้อม ({schedule?.durationMinutes} นาที • {steps.length} ช่วง)
              </h3>
              <p className="text-[11px] text-zinc-400">
                คลิกที่รายการเพื่อข้ามไปท่าที่ต้องการ หรือกด 🔀 เพื่อสลับท่าใหม่
              </p>
            </div>
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
                        <span className="text-[10px] text-zinc-400 truncate">{step.primaryMuscleTh}</span>
                      </div>
                      <p className="text-xs font-bold text-zinc-100 truncate mt-0.5">{step.nameTh}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSwappable && onSwapStep && (
                      <button
                        type="button"
                        onClick={() => onSwapStep(idx)}
                        title="สลับท่าออกกำลังกายนี้"
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 border border-zinc-700"
                      >
                        🔀 สลับท่า
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
