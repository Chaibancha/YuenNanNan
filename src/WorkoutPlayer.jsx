import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MUSCLE_GROUPS, TRAINING_MODALITIES, MediaPreloader } from './WorkoutEngine.js';
import { BiomechanicalVideoLoopEngine } from './ExerciseVideoEngine.js';

const BREATH_CONFIG_BY_LEVEL = {
  beginner: { inhale: 4, hold: 2, exhale: 4 },
  intermediate: { inhale: 4, hold: 2, exhale: 6 },
  advanced: { inhale: 5, hold: 3, exhale: 7 }
};

export function getTimerModeLabel(stepType, modality) {
  switch (stepType) {
    case 'WARMUP':
      return 'WARM-UP';
    case 'SPRINT':
      return 'ALL-OUT SPRINT';
    case 'REST':
      return modality === 'YOGA' ? 'BREATH' : 'REST';
    case 'COOLDOWN':
      return 'COOL-DOWN';
    case 'WORK':
    default:
      return modality === 'YOGA' ? 'ASANA' : 'WORK';
  }
}

function drawShareCard9x16({ summary, trainedMuscleIds = [], streakDays = 0 }) {
  const canvas = document.createElement('canvas');
  canvas.width = 540;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 960);
  grad.addColorStop(0, '#09090b');
  grad.addColorStop(0.55, '#18181b');
  grad.addColorStop(1, '#1c120d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 540, 960);

  // Top Header Badge
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('KINETIC MED-FIT 3D • WORKOUT COMPLETE', 42, 74);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px sans-serif';
  ctx.fillText(`${summary.modality} SESSION`, 42, 122);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(new Date().toLocaleDateString('th-TH', { dateStyle: 'medium' }), 42, 154);

  // Stylized Anatomical Silhouette highlighting trained muscles
  const cx = 270;
  const baseY = 230;
  const isTrained = id => trainedMuscleIds.includes(id);

  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 3;
  // Head & Spine
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.arc(cx, baseY + 30, 28, 0, Math.PI * 2);
  ctx.fill();

  const regions = [
    { id: 'neck_scm', x: cx - 14, y: baseY + 62, w: 28, h: 24 },
    { id: 'shoulders_anterior_lateral', x: cx - 78, y: baseY + 86, w: 32, h: 42 },
    { id: 'shoulders_anterior_lateral', x: cx + 46, y: baseY + 86, w: 32, h: 42 },
    { id: 'chest_upper_Mid', x: cx - 44, y: baseY + 88, w: 88, h: 52 },
    { id: 'lats_teres', x: cx - 54, y: baseY + 130, w: 18, h: 58 },
    { id: 'lats_teres', x: cx + 36, y: baseY + 130, w: 18, h: 58 },
    { id: 'abs_rectus', x: cx - 32, y: baseY + 146, w: 64, h: 92 },
    { id: 'serratus_obliques', x: cx - 50, y: baseY + 188, w: 18, h: 50 },
    { id: 'serratus_obliques', x: cx + 32, y: baseY + 188, w: 18, h: 50 },
    { id: 'biceps_brachialis', x: cx - 84, y: baseY + 134, w: 24, h: 66 },
    { id: 'biceps_brachialis', x: cx + 60, y: baseY + 134, w: 24, h: 66 },
    { id: 'forearms', x: cx - 88, y: baseY + 206, w: 20, h: 68 },
    { id: 'forearms', x: cx + 68, y: baseY + 206, w: 20, h: 68 },
    { id: 'glutes', x: cx - 48, y: baseY + 244, w: 96, h: 36 },
    { id: 'quads', x: cx - 48, y: baseY + 286, w: 42, h: 102 },
    { id: 'quads', x: cx + 6, y: baseY + 286, w: 42, h: 102 },
    { id: 'calves_tibialis', x: cx - 42, y: baseY + 398, w: 30, h: 86 },
    { id: 'calves_tibialis', x: cx + 12, y: baseY + 398, w: 30, h: 86 }
  ];

  regions.forEach(r => {
    const active = isTrained(r.id);
    const meta = MUSCLE_GROUPS.find(m => m.id === r.id);
    ctx.fillStyle = active ? (meta?.color || '#f97316') : '#27272a';
    ctx.fillRect(r.x, r.y, r.w, r.h);
  });

  // Metrics Cards at bottom
  const statsY = 748;
  const boxes = [
    { label: 'DURATION', val: `${summary.durationMinutes} MIN`, color: '#f97316' },
    { label: 'BURNED', val: `${summary.estimatedKcal} KCAL`, color: '#10b981' },
    { label: 'STREAK', val: `🔥 ${Math.max(1, streakDays)} DAYS`, color: '#fbbf24' }
  ];

  boxes.forEach((b, idx) => {
    const bx = 42 + idx * 158;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(bx, statsY, 144, 98);
    ctx.strokeStyle = '#3f3f46';
    ctx.strokeRect(bx, statsY, 144, 98);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(b.label, bx + 14, statsY + 30);
    ctx.fillStyle = b.color;
    ctx.font = '800 22px monospace';
    ctx.fillText(b.val, bx + 14, statsY + 68);
  });

  ctx.fillStyle = '#d4d4d8';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`Trained ${trainedMuscleIds.length} Muscle Groups • Science-Based 3D Anatomy`, 42, 895);

  return canvas.toDataURL('image/png');
}

/**
 * ============================================================================
 * WorkoutPlayer.jsx (v2.1)
 * - วิดีโอวนลูป + Safe Fallback Canvas (CR-004)
 * - Timer Mode Badge ครบ 6 สถานะ + 5s Warning Guard (CR-007)
 * - Live Target BPM / Est. BPM + Web Bluetooth 0x180D HR Monitor (CR-008 / US-403)
 * - Audio Tempo Metronome + Synced Pranayama Breath Pacer (US-402 / CR-010)
 * - Full-Screen Focus Mode (FEAT-03) + Post-Workout Summary Modal & 9:16 Share Card
 * ============================================================================
 */
export default function WorkoutPlayer({
  schedule,
  developerMode = false,
  streakDays = 0,
  onSwapStep,
  onActiveMuscleChange,
  onWorkoutComplete,
  onRecordRpe,
  onSessionActiveChange
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(schedule?.steps?.[0]?.duration || 40);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [notifyEnabled, setNotifyEnabled] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission === 'granted' : false
  );
  const [videoSpeed, setVideoSpeed] = useState(1.0);
  const [videoAngle, setVideoAngle] = useState('side');
  const [flashClass, setFlashClass] = useState('');
  const [toastData, setToastData] = useState(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showSafetyTipsModal, setShowSafetyTipsModal] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [preloadedNextReady, setPreloadedNextReady] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [selectedRpe, setSelectedRpe] = useState(null);
  const [breathTick, setBreathTick] = useState(0);
  const [bleBpm, setBleBpm] = useState(null);
  const [bleDeviceName, setBleDeviceName] = useState('');

  const audioCtxRef = useRef(null);
  const preloaderRef = useRef(new MediaPreloader());
  const videoEngineRef = useRef(null);
  const videoElRef = useRef(null);
  const fallbackCanvasRef = useRef(null);
  const wakeLockRef = useRef(null);
  const lastTickRef = useRef(null);
  const accMsRef = useRef(0);
  const warned5SecStepRef = useRef(-1);
  const completedStepIndicesRef = useRef(new Set());
  const metronomeStateRef = useRef({ enabled: false, running: false });
  metronomeStateRef.current = { enabled: metronomeEnabled, running: isRunning };

  const steps = schedule?.steps || [];
  const currentStep = steps[currentIndex] || steps[0];
  const nextStep = steps[currentIndex + 1] || null;
  const isYogaMode = schedule?.modality === 'YOGA';

  const breathTiming = useMemo(
    () => BREATH_CONFIG_BY_LEVEL[schedule?.fitnessLevel] || BREATH_CONFIG_BY_LEVEL.intermediate,
    [schedule?.fitnessLevel]
  );
  const totalBreathCycleSec = breathTiming.inhale + breathTiming.hold + breathTiming.exhale;

  // Report active workout status to App.jsx for reset confirmation guard (CR-005)
  useEffect(() => {
    const active = Boolean(isRunning || currentIndex > 0 || (currentStep && remainingSec < currentStep.duration));
    onSessionActiveChange?.(active);
  }, [isRunning, currentIndex, remainingSec, currentStep, onSessionActiveChange]);

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
    videoEngineRef.current?.setPlaybackRate(videoSpeed);
  }, [videoSpeed]);

  useEffect(() => {
    videoEngineRef.current?.setCameraAngle(videoAngle);
  }, [videoAngle]);

  // Reset on schedule regeneration
  useEffect(() => {
    setIsRunning(false);
    setCompletedSummary(null);
    setSelectedRpe(null);
    setCurrentIndex(0);
    setRemainingSec(schedule?.steps?.[0]?.duration || 40);
    setBreathTick(0);
    accMsRef.current = 0;
    warned5SecStepRef.current = -1;
    completedStepIndicesRef.current = new Set();
    preloaderRef.current.preloadUpcomingSteps(schedule?.steps || [], 0, 3);
  }, [schedule]);

  // Reset Breath Pacer to Inhale at every step change (CR-010)
  useEffect(() => {
    setBreathTick(0);
  }, [currentIndex]);

  // ESC closes Focus Mode cleanly
  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = e => {
      if (e.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode]);

  // Screen Wake Lock API for mobile workouts
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

  // Yoga Pranayama Breath Pacer Timer synced to fitness level ratio (CR-010)
  useEffect(() => {
    const id = setInterval(() => {
      setBreathTick(t => (t + 1) % totalBreathCycleSec);
    }, 1000);
    return () => clearInterval(id);
  }, [totalBreathCycleSec]);

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

  // Sync Tempo Metronome callback onto VideoLoopEngine (US-402)
  useEffect(() => {
    if (!videoEngineRef.current) return;
    videoEngineRef.current.setTempoCallback(phaseHalf => {
      if (metronomeStateRef.current.enabled && metronomeStateRef.current.running) {
        playTone(phaseHalf === 'concentric' ? 740 : 440, 45, 'sine', 0.12);
      }
    });
  }, [playTone]);

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

  const triggerVisualAlert = useCallback((phaseType, title, subtitle) => {
    const isRest = phaseType === 'REST' || phaseType === 'COOLDOWN';
    setFlashClass(isRest ? 'ring-4 ring-cyan-500/60' : 'ring-4 ring-orange-500/70');
    setToastData({ title, subtitle, isRest });
    setTimeout(() => setFlashClass(''), 900);
    setTimeout(() => setToastData(null), 3400);
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      triggerVisualAlert('REST', 'ไม่รองรับการแจ้งเตือนบนเบราว์เซอร์นี้', 'ใช้เสียงเตือนและสัญญาณสั่นแทนได้ครับ');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifyPermission(perm);
      setNotifyEnabled(perm === 'granted');
      if (perm === 'granted') {
        triggerVisualAlert('WORK', 'เปิดแจ้งเตือนเรียบร้อย', 'ระบบจะแจ้งเตือนเมื่อเปลี่ยนท่าออกกำลังกาย');
      } else {
        triggerVisualAlert('REST', 'การแจ้งเตือนถูกปิดกั้น', 'คุณสามารถอนุญาต Notification ได้ที่ตั้งค่าเว็บไซต์');
      }
    } catch {}
  };

  // Web Bluetooth Heart Rate (0x180D / 0x2A37) connection (US-403)
  const connectBleHeartRate = async () => {
    if (typeof navigator === 'undefined' || !navigator.bluetooth) {
      triggerVisualAlert('REST', 'เบราว์เซอร์ไม่รองรับ Web Bluetooth', 'ใช้โหมดประมาณการ HR Zone ตามหลักวิทยาศาสตร์แทน');
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }]
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic(0x2a37);
      await characteristic.startNotifications();
      setBleDeviceName(device.name || 'BLE HR Strap');
      characteristic.addEventListener('characteristicvaluechanged', event => {
        const value = event.target.value;
        const flags = value.getUint8(0);
        const rate16Bits = flags & 0x1;
        const hr = rate16Bits ? value.getUint16(1, true) : value.getUint8(1);
        setBleBpm(hr);
      });
      device.addEventListener('gattserverdisconnected', () => {
        setBleBpm(null);
        setBleDeviceName('');
      });
      triggerVisualAlert('WORK', 'เชื่อมต่อสายวัดหัวใจสำเร็จ', `กำลังอ่านค่า BPM สดจาก ${device.name || 'HR Sensor'}`);
    } catch {
      triggerVisualAlert('REST', 'ยกเลิกการเชื่อมต่อ BLE', 'ยังแสดงผลค่า HR เป้าหมายและ Est. BPM ตามปกติ');
    }
  };

  // Pre-warm & Pre-load Next Step reliably between 5s and 3s (CR-007)
  useEffect(() => {
    if (!isRunning || !currentStep) return;

    if (remainingSec <= 5 && remainingSec > 3 && nextStep && warned5SecStepRef.current !== currentIndex) {
      warned5SecStepRef.current = currentIndex;
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
  }, [remainingSec, currentIndex, isRunning, currentStep, nextStep, playTone, speakText, triggerHaptic, isYogaMode]);

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

          completedStepIndicesRef.current.add(currentIndex);
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
            setFocusMode(false);
            playTone(1046.5, 500, 'triangle', 0.3);
            triggerHaptic([200, 100, 200]);
            triggerVisualAlert('COOLDOWN', '🎉 จบโปรแกรมสมบูรณ์!', 'บันทึกสถิติและฟื้นฟูกล้ามเนื้อเรียบร้อย');
            speakText('ยินดีด้วยครับ คุณออกกำลังกายครบตามเวลาเป้าหมายเรียบร้อยแล้ว');

            const completedSteps = [...completedStepIndicesRef.current]
              .map(i => steps[i])
              .filter(Boolean);
            const workCount = (completedSteps.length > 0 ? completedSteps : steps).filter(
              s => s.type === 'WORK' || s.type === 'SPRINT'
            ).length;
            const summaryObj = {
              durationMinutes: schedule.durationMinutes,
              estimatedKcal: schedule.summary?.estimatedKcal || 0,
              modality: schedule.modality,
              workIntervals: workCount
            };
            setCompletedSummary(summaryObj);
            if (onWorkoutComplete) onWorkoutComplete(schedule, { completedSteps });
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
    warned5SecStepRef.current = -1;
    preloaderRef.current.preloadUpcomingSteps(steps, idx, 2);
  };

  const handleRestartSession = () => {
    setIsRunning(false);
    setCompletedSummary(null);
    setSelectedRpe(null);
    setCurrentIndex(0);
    setRemainingSec(steps[0]?.duration || 40);
    accMsRef.current = 0;
    warned5SecStepRef.current = -1;
    completedStepIndicesRef.current = new Set();
  };

  const formatClock = sec => {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleDownloadShareCard = () => {
    if (!completedSummary) return;
    const dataUrl = drawShareCard9x16({
      summary: completedSummary,
      trainedMuscleIds: schedule?.selectedMuscles || [],
      streakDays: streakDays + 1
    });
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `kinetic-medfit-summary-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    triggerVisualAlert('WORK', '📸 ดาวน์โหลดการ์ด 9:16 สำเร็จ', 'พร้อมแชร์ลง IG Story / LINE / TikTok');
  };

  const elapsedBeforeCurrent = currentStep ? currentStep.startTimeSec : 0;
  const elapsedInCurrent = currentStep ? currentStep.duration - remainingSec : 0;
  const totalElapsedSec = elapsedBeforeCurrent + elapsedInCurrent;
  const totalRemainingSec = Math.max(0, (schedule?.totalSeconds || 0) - totalElapsedSec);
  const globalProgressPct = schedule?.totalSeconds ? Math.min(100, (totalElapsedSec / schedule.totalSeconds) * 100) : 0;
  const stepProgressPct = currentStep?.duration ? Math.min(100, ((currentStep.duration - remainingSec) / currentStep.duration) * 100) : 0;

  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - stepProgressPct / 100);

  // HR Display Logic (CR-008 & US-403)
  const modMeta = TRAINING_MODALITIES[schedule?.modality] || TRAINING_MODALITIES.HIIT;
  const [hrMin, hrMax] = modMeta.hrTargetBpm || [130, 168];
  const simulatedBpm =
    currentStep?.type === 'REST' || currentStep?.type === 'COOLDOWN'
      ? Math.round(hrMin * 0.88)
      : currentStep?.type === 'SPRINT'
      ? hrMax
      : Math.round(hrMin + (hrMax - hrMin) * (stepProgressPct / 100));

  const bpmDisplayText =
    bleBpm !== null
      ? `BLE ${bleBpm} BPM`
      : isRunning
      ? `Est. ${simulatedBpm} BPM`
      : `🎯 ${hrMin}–${hrMax} BPM`;

  // Synced Yoga Breath Pacer Phase
  const breathPhase =
    breathTick < breathTiming.inhale
      ? { label: `สูดหายใจเข้าลึก (${breathTiming.inhale}s Inhale)`, scale: 'scale-110', color: 'border-emerald-400 text-emerald-300' }
      : breathTick < breathTiming.inhale + breathTiming.hold
      ? { label: `กลั้นลมหายใจ (${breathTiming.hold}s Hold)`, scale: 'scale-110', color: 'border-amber-400 text-amber-300' }
      : { label: `ผ่อนลมหายใจออกยาว (${breathTiming.exhale}s Exhale)`, scale: 'scale-90', color: 'border-cyan-400 text-cyan-300' };

  const emgEntries = Object.entries(currentStep?.emgActivation || {});
  const timerPhaseBadge = getTimerModeLabel(currentStep?.type, schedule?.modality);
  const isCurrentSwappable = currentStep?.type === 'WORK' || currentStep?.type === 'SPRINT';

  return (
    <div className="flex flex-col gap-5 pb-20 lg:pb-6">
      {/* Floating Smart Toast */}
      {toastData && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-md pointer-events-none">
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

      {/* Telemetry + Audio/Notification/BLE/Metronome Header Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">เหลือรวม:</span>
            <span className="font-mono font-extrabold text-sm sm:text-base text-orange-400">
              {formatClock(totalRemainingSec)}
            </span>
          </div>

          <div
            className={`bg-zinc-950 px-3 py-1.5 rounded-xl flex items-center gap-2 border ${
              bleBpm !== null ? 'border-emerald-500/50' : 'border-rose-500/30'
            }`}
          >
            <span className={`${isRunning || bleBpm !== null ? 'animate-pulse' : ''} text-rose-500`}>
              {bleBpm !== null ? '💚' : '❤️'}
            </span>
            <span className="font-mono text-xs sm:text-sm font-extrabold text-white">{bpmDisplayText}</span>
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              • {schedule?.summary?.burnRatePerMin || 0} kcal/นาที
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(v => !v)}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              soundEnabled ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {soundEnabled ? '🔔 เสียง' : '🔕 ปิดเสียง'}
          </button>

          <button
            type="button"
            onClick={() => setVoiceEnabled(v => !v)}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              voiceEnabled ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {voiceEnabled ? '🗣️ โค้ชเสียง' : '🔇 ปิดพากย์'}
          </button>

          <button
            type="button"
            onClick={() => setMetronomeEnabled(v => !v)}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              metronomeEnabled ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {metronomeEnabled ? '🎵 Tempo: เปิด' : '🎵 Tempo: ปิด'}
          </button>

          <button
            type="button"
            onClick={connectBleHeartRate}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              bleBpm !== null
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
            }`}
          >
            {bleBpm !== null ? `💓 ${bleDeviceName}` : '💓 BLE HR'}
          </button>

          <button
            type="button"
            onClick={requestNotificationPermission}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              notifyPermission === 'granted' && notifyEnabled
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                : notifyPermission === 'denied'
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
          >
            {notifyPermission === 'granted' && notifyEnabled
              ? '📲 แจ้งเตือน: เปิด'
              : notifyPermission === 'denied'
              ? '🚫 บล็อกแจ้งเตือน'
              : '📲 แจ้งเตือน'}
          </button>
        </div>

        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-300"
            style={{ width: `${globalProgressPct}%` }}
          />
        </div>
      </div>

      {/* Post-Workout Summary Modal + 3-Level RPE Check-in + Shareable 9:16 Card (FEAT-04 / FEAT-06) */}
      {completedSummary && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border-2 border-emerald-500/60 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-extrabold text-emerald-400">
                🎉 SESSION COMPLETE
              </span>
              <h3 className="text-2xl font-extrabold text-white mt-2">ยอดเยี่ยม! ฝึกจบครบเป้าหมายแล้ว</h3>
              <p className="text-xs text-zinc-400">
                บันทึกเข้าสู่สถิติ JEFIT Recovery และ Streak อัตโนมัติ
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <p className="text-[11px] text-zinc-400">เวลารวม</p>
                <p className="font-mono text-lg font-extrabold text-orange-400">{completedSummary.durationMinutes}m</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <p className="text-[11px] text-zinc-400">พลังงานเผาผลาญ</p>
                <p className="font-mono text-lg font-extrabold text-emerald-400">{completedSummary.estimatedKcal} kcal</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <p className="text-[11px] text-zinc-400">จำนวนท่าฝึก</p>
                <p className="font-mono text-lg font-extrabold text-white">{completedSummary.workIntervals} รอบ</p>
              </div>
            </div>

            {/* Trained Muscles Badges */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 space-y-1.5">
              <p className="text-[11px] font-bold text-zinc-400">มัดกล้ามเนื้อที่ได้ฝึกในเซสชันนี้:</p>
              <div className="flex flex-wrap gap-1.5">
                {(schedule?.selectedMuscles || []).slice(0, 8).map(mId => {
                  const meta = MUSCLE_GROUPS.find(m => m.id === mId);
                  return (
                    <span
                      key={mId}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-200"
                    >
                      {meta?.nameTh.split(' (')[0] || mId}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 3-Level RPE Check-in */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-200 text-center">
                ประเมินความเหนื่อยของคุณ (RPE Check-in):
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'easy', label: '😊 สบายมาก', advice: 'ครั้งหน้าสามารถเพิ่มเป็นระดับขั้นสูงหรือเพิ่มเวลาได้ครับ!' },
                  { id: 'just_right', label: '💦 กำลังดี', advice: 'จังหวะและความหนักกำลังเหมาะสมสำหรับพัฒนาความฟิตครับ' },
                  { id: 'hard', label: '🥵 เหนื่อยสุด ๆ', advice: 'พักดื่มน้ำและแนะนำเลือก Low-Impact หรือลดเวลาลงในเซสชันถัดไป' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedRpe(opt);
                      onRecordRpe?.(opt.id);
                    }}
                    className={`min-h-[44px] px-2 py-2 rounded-2xl text-xs font-extrabold border transition ${
                      selectedRpe?.id === opt.id
                        ? 'bg-orange-500 text-white border-orange-400 shadow'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {selectedRpe && (
                <p className="text-[11px] text-center text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-2">
                  {selectedRpe.advice}
                </p>
              )}
            </div>

            {/* Share Card 9:16 PNG & Close Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDownloadShareCard}
                className="min-h-[44px] w-full py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold text-sm shadow-lg"
              >
                📸 บันทึกการ์ดแชร์ผลฝึก (9:16 PNG)
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRestartSession}
                  className="min-h-[42px] py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white"
                >
                  🔄 ฝึกซ้ำอีกรอบ
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedSummary(null)}
                  className="min-h-[42px] py-2 rounded-xl bg-emerald-500 text-zinc-950 font-extrabold text-xs"
                >
                  ✓ เสร็จสิ้น
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Live Stage + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LIVE WORKOUT STAGE (Supports Full-Screen Focus Mode cleanly with zero stream re-mount) */}
        <div
          className={
            focusMode
              ? `fixed inset-0 z-50 bg-zinc-950 p-4 sm:p-6 overflow-y-auto flex flex-col justify-between gap-4 ${flashClass}`
              : `lg:col-span-7 bg-zinc-900/95 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-2xl transition-all ${flashClass}`
          }
        >
          {/* Top Status + Focus Mode + Reset + Safety/Dev Prompt Controls */}
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

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleRestartSession}
                className="min-h-[36px] px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 border border-zinc-700"
              >
                🔄 เริ่มใหม่
              </button>
              <button
                type="button"
                onClick={() => setFocusMode(v => !v)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-extrabold border transition ${
                  focusMode
                    ? 'bg-rose-500 text-white border-rose-400'
                    : 'bg-orange-500/15 text-orange-300 border-orange-500/40 hover:bg-orange-500/25'
                }`}
              >
                {focusMode ? '✕ ออกจากเต็มจอ' : '⛶ โหมดเต็มจอ (Focus)'}
              </button>
              <button
                type="button"
                onClick={() => setShowSafetyTipsModal(v => !v)}
                className="min-h-[36px] px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-cyan-300 border border-zinc-700"
              >
                💡 เคล็ดลับท่าฝึก
              </button>
              {developerMode && (
                <button
                  type="button"
                  onClick={() => setShowPromptModal(v => !v)}
                  className="min-h-[36px] px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-orange-300 border border-zinc-700"
                >
                  ✨ AI Prompt
                </button>
              )}
            </div>
          </div>

          <div>
            <h2 className={`${focusMode ? 'text-2xl sm:text-4xl' : 'text-lg sm:text-2xl'} font-extrabold text-white leading-tight`}>
              {currentStep?.nameTh}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">{currentStep?.nameEn}</p>
          </div>

          {/* LOOPING WORKOUT VIDEO + 7-MINUTE SVG RING TIMER */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch flex-1">
            {/* HTML5 Looping Video Stage + Safe Canvas Fallback (CR-004) */}
            <div
              className={`sm:col-span-7 relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex flex-col justify-between ${
                focusMode ? 'min-h-[320px] sm:min-h-[420px]' : 'min-h-[260px]'
              }`}
            >
              <video
                ref={videoElRef}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain bg-zinc-950 min-h-[260px]"
              />
              <canvas
                ref={fallbackCanvasRef}
                width={640}
                height={390}
                className="hidden w-full h-full object-contain bg-zinc-950 min-h-[260px]"
              />

              {/* Top Overlay Badges */}
              <div className="absolute top-14 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
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

              {/* Video Speed & Camera Angle Bar (>=36px touch targets - CR-009) */}
              <div className="relative sm:absolute sm:bottom-2.5 sm:left-2.5 sm:right-2.5 flex flex-wrap items-center justify-between gap-2 bg-zinc-950/90 backdrop-blur-md border-t sm:border border-zinc-800 sm:rounded-xl p-2">
                <div className="flex items-center gap-1.5">
                  {[0.5, 1.0, 1.5].map(sp => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setVideoSpeed(sp)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                        videoSpeed === sp ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'side', label: 'ข้าง (Side)' },
                    { id: 'front', label: 'หน้า (Front)' }
                  ].map(ang => (
                    <button
                      key={ang.id}
                      type="button"
                      onClick={() => setVideoAngle(ang.id)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition ${
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
              <div className={`relative ${focusMode ? 'w-48 h-48' : 'w-32 h-32'} flex items-center justify-center`}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
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
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    {timerPhaseBadge}
                  </span>
                  <span
                    className={`font-mono font-extrabold tracking-tight ${
                      focusMode ? 'text-5xl sm:text-6xl' : 'text-3xl'
                    } ${remainingSec <= 3 && isRunning ? 'text-red-500 scale-110 transition-transform' : 'text-white'}`}
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

              {/* Large Touch-Friendly Controls (>=44px) */}
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => handleSelectStep(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-sm font-bold text-zinc-200"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={() => setIsRunning(r => !r)}
                  className={`min-h-[48px] flex-1 py-3 px-4 rounded-xl font-extrabold text-sm sm:text-base transition shadow-lg ${
                    isRunning ? 'bg-amber-500 text-zinc-950' : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25'
                  }`}
                >
                  {isRunning ? '⏸ หยุด' : '▶ เริ่มฝึก'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectStep(currentIndex + 1)}
                  disabled={currentIndex >= steps.length - 1}
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-sm font-bold text-zinc-200"
                >
                  ⏭
                </button>
              </div>

              {focusMode && isCurrentSwappable && onSwapStep && (
                <button
                  type="button"
                  onClick={() => onSwapStep(currentIndex)}
                  className="min-h-[42px] w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 border border-zinc-700"
                >
                  🔀 สลับท่านี้เป็นท่าอื่น
                </button>
              )}
            </div>
          </div>

          {/* Form Cues + JEFIT EMG Muscle Activation % Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-3">
              <p className="text-[11px] font-bold text-orange-400">การจัดระเบียบร่างกาย (Form Cue):</p>
              <p className={`${focusMode ? 'text-sm sm:text-base' : 'text-xs'} text-zinc-200 leading-relaxed mt-1`}>
                {currentStep?.formCues}
              </p>
            </div>

            {!focusMode && (
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
            )}
          </div>

          {showSafetyTipsModal && (
            <div className="bg-zinc-950 border border-cyan-500/40 rounded-2xl p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400">💡 เคล็ดลับท่าฝึก & การป้องกันการบาดเจ็บ</span>
                <button type="button" onClick={() => setShowSafetyTipsModal(false)} className="text-zinc-400 hover:text-white">
                  ✕ ปิด
                </button>
              </div>
              <p className="text-zinc-200 leading-relaxed">
                • เกร็งแกนกลางลำตัวเบา ๆ ก่อนเริ่มทุกจังหวะออกแรง และไม่กลั้นหายใจในท่าที่ต้องต้านแรง<br />
                • หากมีอาการเจ็บแปลบตามข้อต่อ (เข่า/ข้อมือ/หลังล่าง) ให้หยุดท่าทันทีหรือแตะตั้งค่าจุดบาดเจ็บในหน้าออกแบบตารางเพื่อกรองท่าอัตโนมัติ
              </p>
            </div>
          )}

          {developerMode && showPromptModal && currentStep?.aiPrompt && (
            <div className="bg-zinc-950 border border-orange-500/40 rounded-2xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400">🤖 Developer: AI Looping Video & Image Prompt</span>
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
                        className="min-h-[36px] min-w-[36px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700"
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
