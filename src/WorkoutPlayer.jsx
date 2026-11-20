import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  MUSCLE_GROUPS,
  TRAINING_MODALITIES,
  getMuscleDisplayName,
  getLocalizedStepText
} from './WorkoutEngine.js';
import Exercise3DCoach from './Exercise3DCoach.jsx';
import { computeSessionSummary } from './sessionSummary.js';

export { computeSessionSummary, getCompletedStepIndexes, getTrainedMuscleIds } from './sessionSummary.js';

const NOTIFY_ENABLED_STORAGE_KEY = 'kinetic_3d_notify_enabled';

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

function drawShareCard9x16({ summary, trainedMuscleIds = [], streakDays = 0, lang = 'th' }) {
  const canvas = document.createElement('canvas');
  canvas.width = 540;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 960);
  grad.addColorStop(0, '#09090b');
  grad.addColorStop(0.55, '#18181b');
  grad.addColorStop(1, '#1c120d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 540, 960);

  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(
    summary.credited === false ? 'ยืนนานนาน(YuenNanNan) • SESSION ENDED EARLY' : 'ยืนนานนาน(YuenNanNan) • WORKOUT COMPLETE',
    42,
    74
  );

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px sans-serif';
  ctx.fillText(`${summary.modality} SESSION`, 42, 122);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(
    new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', { dateStyle: 'medium' }),
    42,
    154
  );

  const cxFront = 160;
  const cxBack = 380;
  const baseY = 220;
  const isTrained = id => trainedMuscleIds.includes(id);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FRONT', cxFront, baseY - 10);
  ctx.fillText('BACK', cxBack, baseY - 10);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#27272a';
  [cxFront, cxBack].forEach(cx => {
    ctx.beginPath();
    ctx.arc(cx, baseY + 26, 24, 0, Math.PI * 2);
    ctx.fill();
  });

  const regions = [
    // Front 16-group anatomical map
    { id: 'neck_scm', x: cxFront - 11, y: baseY + 52, w: 22, h: 22 },
    { id: 'shoulders_anterior_lateral', x: cxFront - 64, y: baseY + 76, w: 26, h: 36 },
    { id: 'shoulders_anterior_lateral', x: cxFront + 38, y: baseY + 76, w: 26, h: 36 },
    { id: 'chest_upper_Mid', x: cxFront - 36, y: baseY + 78, w: 72, h: 46 },
    { id: 'lats_teres', x: cxFront - 44, y: baseY + 108, w: 10, h: 48 },
    { id: 'lats_teres', x: cxFront + 34, y: baseY + 108, w: 10, h: 48 },
    { id: 'abs_rectus', x: cxFront - 24, y: baseY + 128, w: 48, h: 86 },
    { id: 'serratus_obliques', x: cxFront - 40, y: baseY + 158, w: 14, h: 56 },
    { id: 'serratus_obliques', x: cxFront + 26, y: baseY + 158, w: 14, h: 56 },
    { id: 'biceps_brachialis', x: cxFront - 72, y: baseY + 116, w: 20, h: 62 },
    { id: 'biceps_brachialis', x: cxFront + 52, y: baseY + 116, w: 20, h: 62 },
    { id: 'forearms', x: cxFront - 76, y: baseY + 182, w: 18, h: 62 },
    { id: 'forearms', x: cxFront + 58, y: baseY + 182, w: 18, h: 62 },
    { id: 'hip_adductors', x: cxFront - 14, y: baseY + 224, w: 12, h: 68 },
    { id: 'hip_adductors', x: cxFront + 2, y: baseY + 224, w: 12, h: 68 },
    { id: 'quads', x: cxFront - 42, y: baseY + 224, w: 26, h: 102 },
    { id: 'quads', x: cxFront + 16, y: baseY + 224, w: 26, h: 102 },
    { id: 'calves_tibialis', x: cxFront - 36, y: baseY + 334, w: 24, h: 82 },
    { id: 'calves_tibialis', x: cxFront + 12, y: baseY + 334, w: 24, h: 82 },

    // Back 16-group anatomical map
    { id: 'neck_scm', x: cxBack - 11, y: baseY + 52, w: 22, h: 22 },
    { id: 'shoulders_posterior_traps', x: cxBack - 32, y: baseY + 62, w: 64, h: 30 },
    { id: 'shoulders_posterior_traps', x: cxBack - 64, y: baseY + 76, w: 28, h: 34 },
    { id: 'shoulders_posterior_traps', x: cxBack + 36, y: baseY + 76, w: 28, h: 34 },
    { id: 'rhomboids_erector', x: cxBack - 14, y: baseY + 94, w: 28, h: 120 },
    { id: 'lats_teres', x: cxBack - 42, y: baseY + 96, w: 24, h: 80 },
    { id: 'lats_teres', x: cxBack + 18, y: baseY + 96, w: 24, h: 80 },
    { id: 'triceps', x: cxBack - 72, y: baseY + 116, w: 20, h: 62 },
    { id: 'triceps', x: cxBack + 52, y: baseY + 116, w: 20, h: 62 },
    { id: 'forearms', x: cxBack - 76, y: baseY + 182, w: 18, h: 62 },
    { id: 'forearms', x: cxBack + 58, y: baseY + 182, w: 18, h: 62 },
    { id: 'glutes', x: cxBack - 40, y: baseY + 218, w: 38, h: 46 },
    { id: 'glutes', x: cxBack + 2, y: baseY + 218, w: 38, h: 46 },
    { id: 'hamstrings', x: cxBack - 40, y: baseY + 268, w: 32, h: 62 },
    { id: 'hamstrings', x: cxBack + 8, y: baseY + 268, w: 32, h: 62 },
    { id: 'calves_tibialis', x: cxBack - 36, y: baseY + 334, w: 26, h: 82 },
    { id: 'calves_tibialis', x: cxBack + 10, y: baseY + 334, w: 26, h: 82 }
  ];

  regions.forEach(r => {
    const active = isTrained(r.id);
    const meta = MUSCLE_GROUPS.find(m => m.id === r.id);
    ctx.fillStyle = active ? (meta?.color || '#f97316') : '#27272a';
    ctx.fillRect(r.x, r.y, r.w, r.h);
  });

  const statsY = 748;
  const boxes = [
    { label: 'DURATION', val: `${summary.durationMinutes} MIN`, color: '#f97316' },
    { label: 'BURNED', val: `${summary.estimatedKcal} KCAL`, color: '#10b981' },
    {
      label: 'STREAK',
      val: `🔥 ${summary.credited === false ? Math.max(0, streakDays) : Math.max(1, streakDays)} DAYS`,
      color: '#fbbf24'
    }
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
  const exerciseCount = Number(summary.workIntervals) || 0;
  ctx.fillText(
    `${exerciseCount} Exercises • Trained ${trainedMuscleIds.length} Muscle Groups • Science-Based 3D Anatomy`,
    42,
    895
  );

  return canvas.toDataURL('image/png');
}

function readInitialNotifyEnabled() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(NOTIFY_ENABLED_STORAGE_KEY);
      if (saved === '0') return false;
      if (saved === '1') return true;
    }
  } catch {}
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission === 'granted' : false;
}

/**
 * ============================================================================
 * WorkoutPlayer.jsx (v2.2 — Pure 360° 3D Coach Edition)
 * - ใช้โมเดล 3 มิติหมุนดูได้ 360° เต็มรูปแบบ (ลบโหมด 2D ออกทั้งหมด)
 * - ปุ่มแจ้งเตือนสามารถกดเปิด-ปิดได้อิสระพร้อมจดจำค่าใน LocalStorage
 * - รองรับโหมดมืด/สว่าง และภาษาไทย/อังกฤษ
 * ============================================================================
 */
export default function WorkoutPlayer({
  schedule,
  isFullBody = false,
  developerMode = false,
  streakDays = 0,
  onSwapStep,
  onActiveMuscleChange,
  onWorkoutComplete,
  onRecordRpe,
  onSessionActiveChange,
  theme = 'dark',
  lang = 'th',
  isVisible = true
}) {
  const isEn = lang === 'en';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(schedule?.steps?.[0]?.duration || 40);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [notifyEnabled, setNotifyEnabled] = useState(readInitialNotifyEnabled);
  const [videoSpeed, setVideoSpeed] = useState(1.0);
  const [videoAngle, setVideoAngle] = useState('iso');
  const [flashClass, setFlashClass] = useState('');
  const [toastData, setToastData] = useState(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showSafetyTipsModal, setShowSafetyTipsModal] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showScheduleList, setShowScheduleList] = useState(true);
  const [preloadedNextReady, setPreloadedNextReady] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [selectedRpe, setSelectedRpe] = useState(null);
  const [breathTick, setBreathTick] = useState(0);
  const [bleBpm, setBleBpm] = useState(null);
  const [bleDeviceName, setBleDeviceName] = useState('');

  const audioCtxRef = useRef(null);
  const wakeLockRef = useRef(null);
  const lastTickRef = useRef(null);
  const accMsRef = useRef(0);
  const warned5SecStepRef = useRef(-1);
  const stepElapsedRef = useRef({});
  const remainingRef = useRef(schedule?.steps?.[0]?.duration || 40);
  const currentIndexRef = useRef(0);
  const notifyEnabledRef = useRef(notifyEnabled);
  const runSeqRef = useRef(0);
  const sessionCompletedRef = useRef(false);
  const toastTimerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const metronomeStateRef = useRef({ enabled: false, running: false });
  metronomeStateRef.current = { enabled: metronomeEnabled, running: isRunning };
  remainingRef.current = remainingSec;
  currentIndexRef.current = currentIndex;
  notifyEnabledRef.current = notifyEnabled;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

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

  // Resize Three.js 3D viewport whenever stage width changes (collapse/expand/focus)
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 40);
    return () => clearTimeout(t);
  }, [showScheduleList, focusMode]);

  // Sync active primary + secondary/EMG muscles back to Body3DSelector ONLY while actively running WORK/SPRINT
  useEffect(() => {
    if (!onActiveMuscleChange) return;
    if (isRunning && currentStep && (currentStep.type === 'WORK' || currentStep.type === 'SPRINT')) {
      onActiveMuscleChange({
        primary: currentStep.primaryMuscle,
        secondary: currentStep.secondaryMuscles || [],
        emg: currentStep.emgActivation || {}
      });
    } else {
      onActiveMuscleChange(null);
    }
  }, [isRunning, currentStep, onActiveMuscleChange]);

  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;
  const planResetKey =
    schedule?.planId ||
    `${schedule?.modality}-${schedule?.durationMinutes}-${schedule?.fitnessLevel}-${schedule?.lowImpactOnly}-${(schedule?.selectedMuscles || []).join(',')}-${(schedule?.selectedEquipment || []).join(',')}-${(schedule?.injuredJoints || []).join(',')}`;

  // Reset only on structural schedule change
  useEffect(() => {
    const activeSched = scheduleRef.current;
    const initDur = activeSched?.steps?.[0]?.duration || 40;
    sessionCompletedRef.current = false;
    runSeqRef.current += 1;
    currentIndexRef.current = 0;
    lastTickRef.current = null;
    setIsRunning(false);
    setCompletedSummary(null);
    setSelectedRpe(null);
    setCurrentIndex(0);
    setRemainingSec(initDur);
    setBreathTick(0);
    accMsRef.current = 0;
    warned5SecStepRef.current = -1;
    stepElapsedRef.current = {};
    remainingRef.current = initDur;
  }, [planResetKey]);

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

  // Sync Tempo Metronome directly with Exercise3DCoach contraction phase
  const handleTempoBeat = useCallback(
    phaseHalf => {
      if (metronomeStateRef.current.enabled && metronomeStateRef.current.running) {
        playTone(phaseHalf === 'concentric' ? 740 : 440, 45, 'sine', 0.12);
      }
    },
    [playTone]
  );

  const speakText = useCallback(
    text => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'en' ? 'en-US' : 'th-TH';
        utterance.rate = isYogaMode ? 0.94 : 1.05;
        window.speechSynthesis.speak(utterance);
      } catch {}
    },
    [voiceEnabled, isYogaMode, lang]
  );

  const sendBrowserNotification = useCallback((title, body) => {
    if (!notifyEnabledRef.current || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch {}
    }
  }, []);

  const triggerVisualAlert = useCallback((phaseType, title, subtitle, options = {}) => {
    if (!options.force && !notifyEnabledRef.current) return;
    const isRest = phaseType === 'REST' || phaseType === 'COOLDOWN';
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setFlashClass(isRest ? 'ring-4 ring-cyan-500/60' : 'ring-4 ring-orange-500/70');
    setToastData({ title, subtitle, isRest });
    flashTimerRef.current = setTimeout(() => {
      setFlashClass('');
      flashTimerRef.current = null;
    }, 900);
    toastTimerRef.current = setTimeout(() => {
      setToastData(null);
      toastTimerRef.current = null;
    }, 3400);
  }, []);

  // Toggle Notifications cleanly ON/OFF regardless of browser permission state
  const toggleNotification = async () => {
    const nextEnabled = !notifyEnabled;
    notifyEnabledRef.current = nextEnabled;
    setNotifyEnabled(nextEnabled);
    try {
      window.localStorage.setItem(NOTIFY_ENABLED_STORAGE_KEY, nextEnabled ? '1' : '0');
    } catch {}

    if (!nextEnabled) {
      triggerVisualAlert(
        'REST',
        isEn ? 'Notifications Turned OFF' : 'ปิดการแจ้งเตือนแล้ว',
        isEn ? 'Step alerts & popups are muted.' : 'ระบบจะงดแจ้งเตือนป๊อปอัปเมื่อเปลี่ยนท่า',
        { force: true }
      );
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      triggerVisualAlert(
        'WORK',
        isEn ? 'In-App Notifications ON' : 'เปิดแจ้งเตือนในแอปแล้ว',
        isEn ? 'Visual & audio cues active on step changes.' : 'แจ้งเตือนบนหน้าจอและเสียงเตือนพร้อมทำงานครับ',
        { force: true }
      );
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission();
        setNotifyPermission(perm);
        if (perm === 'granted') {
          triggerVisualAlert(
            'WORK',
            isEn ? 'Notifications Turned ON' : 'เปิดแจ้งเตือนเรียบร้อย',
            isEn ? 'Alerts active for exercise transitions.' : 'ระบบจะแจ้งเตือนเมื่อเปลี่ยนท่าออกกำลังกาย',
            { force: true }
          );
        } else {
          triggerVisualAlert(
            'WORK',
            isEn ? 'In-App Alerts ON (Browser Blocked)' : 'เปิดแจ้งเตือนในแอปแล้ว (เบราว์เซอร์บล็อก)',
            isEn ? 'Allow notifications in browser settings for OS popups.' : 'แจ้งเตือนในแอปทำงานปกติ • หากต้องการป๊อปอัปนอกแท็บให้อนุญาตในเบราว์เซอร์',
            { force: true }
          );
        }
      } catch {
        triggerVisualAlert(
          'WORK',
          isEn ? 'In-App Notifications ON' : 'เปิดแจ้งเตือนในแอปแล้ว',
          isEn ? 'Visual & audio cues active.' : 'แจ้งเตือนในแอปพร้อมทำงาน',
          { force: true }
        );
      }
      return;
    }

    if (Notification.permission === 'denied') {
      triggerVisualAlert(
        'WORK',
        isEn ? 'In-App Notifications ON' : 'เปิดแจ้งเตือนในแอปแล้ว',
        isEn
          ? 'Browser OS popups are blocked in site settings, but in-app alerts are ON.'
          : 'การแจ้งเตือนบนหน้าจอเปิดอยู่ (ป๊อปอัปเบราว์เซอร์ถูกปิดกั้นในการตั้งค่าเว็บไซต์)',
        { force: true }
      );
      return;
    }

    triggerVisualAlert(
      'WORK',
      isEn ? 'Notifications Turned ON' : 'เปิดแจ้งเตือนเรียบร้อย',
      isEn ? 'Alerts active for exercise transitions.' : 'ระบบจะแจ้งเตือนเมื่อเปลี่ยนท่าออกกำลังกาย',
      { force: true }
    );
  };

  // Web Bluetooth Heart Rate (0x180D / 0x2A37) connection
  const connectBleHeartRate = async () => {
    if (typeof navigator === 'undefined' || !navigator.bluetooth) {
      triggerVisualAlert(
        'REST',
        isEn ? 'Web Bluetooth Unsupported' : 'เบราว์เซอร์ไม่รองรับ Web Bluetooth',
        isEn ? 'Using science-based estimated HR Zone instead.' : 'ใช้โหมดประมาณการ HR Zone ตามหลักวิทยาศาสตร์แทน',
        { force: true }
      );
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
      triggerVisualAlert(
        'WORK',
        isEn ? 'Heart Rate Strap Connected' : 'เชื่อมต่อสายวัดหัวใจสำเร็จ',
        `${isEn ? 'Reading live BPM from' : 'กำลังอ่านค่า BPM สดจาก'} ${device.name || 'HR Sensor'}`,
        { force: true }
      );
    } catch {
      triggerVisualAlert(
        'REST',
        isEn ? 'BLE Connection Cancelled' : 'ยกเลิกการเชื่อมต่อ BLE',
        isEn ? 'Target & estimated HR remain active.' : 'ยังแสดงผลค่า HR เป้าหมายและ Est. BPM ตามปกติ',
        { force: true }
      );
    }
  };

  // Pre-warm & Pre-load Next Step reliably between 5s and 3s (CR-007)
  useEffect(() => {
    if (!isRunning || !currentStep) return;

    if (remainingSec <= 5 && remainingSec > 3 && nextStep && warned5SecStepRef.current !== currentIndex) {
      warned5SecStepRef.current = currentIndex;
      setPreloadedNextReady(true);
      const nextName = getLocalizedStepText(nextStep, lang).title;
      speakText(isEn ? `5 seconds, get ready for ${nextName}` : `อีก 5 วินาที เตรียมตัวท่า ${nextName}`);
    }

    if (remainingSec <= 3 && remainingSec >= 1) {
      playTone(isYogaMode ? 528 : 880, 120, 'triangle', 0.22);
      triggerHaptic([55]);
    }
  }, [remainingSec, currentIndex, isRunning, currentStep, nextStep, playTone, speakText, triggerHaptic, isYogaMode, isEn, lang]);

  // Drift-free interval timer (pure state updates outside React state updaters)
  useEffect(() => {
    if (!isRunning || steps.length === 0) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const interval = setInterval(() => {
      if (sessionCompletedRef.current) return;
      const now = performance.now();
      const deltaMs = now - (lastTickRef.current || now);
      lastTickRef.current = now;
      accMsRef.current += deltaMs;

      if (accMsRef.current < 1000) return;
      const ticks = Math.floor(accMsRef.current / 1000);
      accMsRef.current -= ticks * 1000;

      const idx = currentIndexRef.current;
      const curStep = steps[idx];
      const curDur = curStep?.duration || 0;
      const prevRem = remainingRef.current;

      if (prevRem - ticks > 0) {
        const nextRem = prevRem - ticks;
        remainingRef.current = nextRem;
        const spent = Math.max(0, curDur - nextRem);
        stepElapsedRef.current[idx] = Math.max(stepElapsedRef.current[idx] || 0, spent);
        setRemainingSec(nextRem);
        return;
      }

      stepElapsedRef.current[idx] = curDur;
      const nextIdx = idx + 1;
      if (nextIdx < steps.length) {
        const upcoming = steps[nextIdx];
        const upLoc = getLocalizedStepText(upcoming, lang);
        currentIndexRef.current = nextIdx;
        remainingRef.current = upcoming.duration;
        warned5SecStepRef.current = -1;
        setCurrentIndex(nextIdx);
        setRemainingSec(upcoming.duration);
        setPreloadedNextReady(true);

        if (upcoming.type === 'REST' || upcoming.type === 'COOLDOWN') {
          playTone(523.25, 260, 'sine', 0.25);
          triggerHaptic([80, 50, 80]);
          triggerVisualAlert(
            upcoming.type,
            isYogaMode
              ? isEn
                ? 'Pranayama Breath Recovery'
                : 'ปรับลมหายใจ (Pranayama)'
              : isEn
              ? 'Recovery Interval'
              : 'ช่วงพักฟื้นตัว',
            upLoc.title
          );
          speakText(upLoc.title);
          if (notifyEnabledRef.current) {
            sendBrowserNotification(isEn ? 'Recovery Interval' : 'ช่วงพักฟื้นตัว', upLoc.title);
          }
        } else {
          playTone(isYogaMode ? 659.25 : 1174.66, 300, isYogaMode ? 'sine' : 'sawtooth', 0.26);
          triggerHaptic([140, 60, 140]);
          triggerVisualAlert(
            upcoming.type,
            upcoming.type === 'SPRINT'
              ? '⚡ ALL-OUT SPRINT!'
              : isYogaMode
              ? isEn
                ? '🧘 Next Asana'
                : '🧘 อาสนะถัดไป'
              : isEn
              ? '🔥 Next Exercise!'
              : '🔥 เริ่มฝึกท่าต่อไป!',
            upLoc.title
          );
          speakText(isEn ? `Start ${upLoc.title}` : `เริ่ม ${upLoc.title}`);
          if (notifyEnabledRef.current) {
            sendBrowserNotification(isEn ? `Next: ${upLoc.title}` : `เริ่มท่า: ${upLoc.title}`, upLoc.cues);
          }
        }
        return;
      }

      if (sessionCompletedRef.current) return;
      sessionCompletedRef.current = true;
      remainingRef.current = 0;
      setRemainingSec(0);
      setIsRunning(false);
      setFocusMode(false);
      playTone(1046.5, 500, 'triangle', 0.3);
      triggerHaptic([200, 100, 200]);

      const computed = computeSessionSummary({
        steps,
        elapsedByStep: stepElapsedRef.current,
        modality: schedule.modality,
        plannedMinutes: schedule.durationMinutes,
        plannedKcal: schedule.summary?.estimatedKcal || 0
      });

      if (computed.credited) {
        triggerVisualAlert(
          'COOLDOWN',
          isEn ? '🎉 Workout Complete!' : '🎉 จบโปรแกรมสมบูรณ์!',
          isEn ? 'Stats and muscle recovery updated.' : 'บันทึกสถิติและฟื้นฟูกล้ามเนื้อเรียบร้อย'
        );
        speakText(
          isEn
            ? 'Congratulations, you have completed your workout session.'
            : 'ยินดีด้วยครับ คุณออกกำลังกายครบตามเวลาเป้าหมายเรียบร้อยแล้ว'
        );
      } else {
        triggerVisualAlert(
          'REST',
          isEn ? 'ℹ️ Session Ended (Skipped)' : 'ℹ️ จบเซสชัน (ข้ามท่าฝึก)',
          isEn ? 'No completed work intervals to credit yet.' : 'ยังไม่มีท่าฝึกที่ทำครบเวลา จึงยังไม่นับสถิติสะสม'
        );
      }

      const runId = `${schedule?.planId || 'plan'}_run_${runSeqRef.current}`;
      const summaryObj = {
        durationMinutes: computed.durationMinutes,
        estimatedKcal: computed.estimatedKcal,
        modality: schedule.modality,
        workIntervals: computed.workCount,
        trainedMuscleIds: computed.trainedMuscleIds,
        credited: computed.credited,
        actualSeconds: computed.actualSeconds,
        runId
      };
      setCompletedSummary(summaryObj);
      if (onWorkoutComplete) {
        onWorkoutComplete(schedule, {
          completedSteps: computed.completedSteps,
          durationMinutes: computed.durationMinutes,
          estimatedKcal: computed.estimatedKcal,
          credited: computed.credited,
          completionId: runId
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    isRunning,
    steps,
    playTone,
    speakText,
    sendBrowserNotification,
    triggerVisualAlert,
    triggerHaptic,
    isYogaMode,
    schedule,
    onWorkoutComplete,
    isEn,
    lang
  ]);

  const handleSelectStep = idx => {
    if (idx < 0 || idx >= steps.length) return;
    if (sessionCompletedRef.current) {
      sessionCompletedRef.current = false;
      runSeqRef.current += 1;
      stepElapsedRef.current = {};
      setCompletedSummary(null);
      setSelectedRpe(null);
    } else {
      const prevIdx = currentIndexRef.current;
      const curStep = steps[prevIdx];
      if (curStep) {
        const spent = Math.max(0, curStep.duration - remainingRef.current);
        stepElapsedRef.current[prevIdx] = Math.max(stepElapsedRef.current[prevIdx] || 0, spent);
      }
    }
    const nextDur = steps[idx].duration;
    currentIndexRef.current = idx;
    remainingRef.current = nextDur;
    setCurrentIndex(idx);
    setRemainingSec(nextDur);
    accMsRef.current = 0;
    lastTickRef.current = null;
    warned5SecStepRef.current = -1;
  };

  const handleRestartSession = () => {
    const initDur = steps[0]?.duration || 40;
    sessionCompletedRef.current = false;
    runSeqRef.current += 1;
    currentIndexRef.current = 0;
    remainingRef.current = initDur;
    accMsRef.current = 0;
    lastTickRef.current = null;
    warned5SecStepRef.current = -1;
    stepElapsedRef.current = {};
    setIsRunning(false);
    setCompletedSummary(null);
    setSelectedRpe(null);
    setCurrentIndex(0);
    setRemainingSec(initDur);
  };

  const handleTogglePlayPause = () => {
    if (isRunning) {
      setIsRunning(false);
      return;
    }
    if (
      sessionCompletedRef.current ||
      (steps.length > 0 && currentIndexRef.current >= steps.length - 1 && remainingRef.current <= 0)
    ) {
      const initDur = steps[0]?.duration || 40;
      sessionCompletedRef.current = false;
      runSeqRef.current += 1;
      currentIndexRef.current = 0;
      remainingRef.current = initDur;
      accMsRef.current = 0;
      lastTickRef.current = null;
      warned5SecStepRef.current = -1;
      stepElapsedRef.current = {};
      setCompletedSummary(null);
      setSelectedRpe(null);
      setCurrentIndex(0);
      setRemainingSec(initDur);
    }
    setIsRunning(true);
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
      trainedMuscleIds: completedSummary.trainedMuscleIds || [],
      streakDays,
      lang
    });
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `yuennannan-summary-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    triggerVisualAlert(
      'WORK',
      isEn ? '📸 9:16 Share Card Saved' : '📸 ดาวน์โหลดการ์ด 9:16 สำเร็จ',
      isEn ? 'Ready for Instagram Story / LINE / TikTok' : 'พร้อมแชร์ลง IG Story / LINE / TikTok',
      { force: true }
    );
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

  const modMeta = TRAINING_MODALITIES[schedule?.modality] || TRAINING_MODALITIES.HIIT;
  const [hrMin, hrMax] = schedule?.hrTargetBpm || modMeta.hrTargetBpm || [130, 168];
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

  const breathPhase =
    breathTick < breathTiming.inhale
      ? {
          label: isEn ? `Deep Inhale (${breathTiming.inhale}s)` : `สูดหายใจเข้าลึก (${breathTiming.inhale}s Inhale)`,
          scale: 'scale-110',
          color: 'border-emerald-400 text-emerald-300'
        }
      : breathTick < breathTiming.inhale + breathTiming.hold
      ? {
          label: isEn ? `Hold Breath (${breathTiming.hold}s)` : `กลั้นลมหายใจ (${breathTiming.hold}s Hold)`,
          scale: 'scale-110',
          color: 'border-amber-400 text-amber-300'
        }
      : {
          label: isEn ? `Slow Exhale (${breathTiming.exhale}s)` : `ผ่อนลมหายใจออกยาว (${breathTiming.exhale}s Exhale)`,
          scale: 'scale-90',
          color: 'border-cyan-400 text-cyan-300'
        };

  const emgEntries = Object.entries(currentStep?.emgActivation || {});
  const timerPhaseBadge = getTimerModeLabel(currentStep?.type, schedule?.modality);
  const isCurrentSwappable = currentStep?.type === 'WORK' || currentStep?.type === 'SPRINT';
  const curLoc = getLocalizedStepText(currentStep, lang);
  const nextLoc = getLocalizedStepText(nextStep, lang);

  return (
    <div className="flex flex-col gap-5 pb-20 lg:pb-6">
      {/* Floating Smart Toast */}
      {toastData && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-md pointer-events-none"
        >
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
            <span className="text-[11px] text-zinc-400">{isEn ? 'Remaining:' : 'เหลือรวม:'}</span>
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
              • {schedule?.summary?.burnRatePerMin || 0} {isEn ? 'kcal/min' : 'kcal/นาที'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(v => !v)}
            aria-pressed={soundEnabled}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              soundEnabled ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {soundEnabled ? (isEn ? '🔔 SFX' : '🔔 เสียง') : (isEn ? '🔕 Muted' : '🔕 ปิดเสียง')}
          </button>

          <button
            type="button"
            onClick={() => setVoiceEnabled(v => !v)}
            aria-pressed={voiceEnabled}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              voiceEnabled ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {voiceEnabled ? (isEn ? '🗣️ Voice' : '🗣️ โค้ชเสียง') : (isEn ? '🔇 No Voice' : '🔇 ปิดพากย์')}
          </button>

          <button
            type="button"
            onClick={() => setMetronomeEnabled(v => !v)}
            aria-pressed={metronomeEnabled}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              metronomeEnabled ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {metronomeEnabled ? (isEn ? '🎵 Tempo: ON' : '🎵 Tempo: เปิด') : (isEn ? '🎵 Tempo: OFF' : '🎵 Tempo: ปิด')}
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
            onClick={toggleNotification}
            aria-pressed={notifyEnabled}
            title={
              notifyPermission === 'denied'
                ? isEn
                  ? 'Toggle in-app notifications (browser popups blocked in site settings)'
                  : 'กดสลับเปิด/ปิดแจ้งเตือนในแอป'
                : isEn
                ? 'Toggle workout alerts'
                : 'กดเปิด-ปิดการแจ้งเตือน'
            }
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              notifyEnabled
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
          >
            {notifyEnabled
              ? isEn
                ? '📲 Notify: ON'
                : '📲 แจ้งเตือน: เปิด'
              : isEn
              ? '🔕 Notify: OFF'
              : '🔕 แจ้งเตือน: ปิด'}
          </button>
        </div>

        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-300"
            style={{ width: `${globalProgressPct}%` }}
          />
        </div>
      </div>

      {/* Post-Workout Summary Modal + 3-Level RPE Check-in + Shareable 9:16 Card */}
      {completedSummary && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border-2 border-emerald-500/60 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-extrabold text-emerald-400">
                {completedSummary.credited === false ? 'ℹ️ SESSION ENDED' : '🎉 SESSION COMPLETE'}
              </span>
              <h3 className="text-2xl font-extrabold text-white mt-2">
                {completedSummary.credited === false
                  ? isEn
                    ? 'Session Ended Without Completed Intervals'
                    : 'จบเซสชันโดยยังไม่มีท่าฝึกครบเวลา'
                  : isEn
                  ? 'Awesome! Target Workout Complete'
                  : 'ยอดเยี่ยม! ฝึกจบครบเป้าหมายแล้ว'}
              </h3>
              <p className="text-xs text-zinc-400">
                {completedSummary.credited === false
                  ? isEn
                    ? 'Most exercises were skipped, so stats and streak were not credited.'
                    : 'คุณข้ามท่าฝึกส่วนใหญ่ จึงยังไม่นับรวมเข้าสถิติสะสมและ Streak'
                  : isEn
                  ? 'Automatically logged to JEFIT Recovery & Streak.'
                  : 'บันทึกเข้าสู่สถิติ JEFIT Recovery และ Streak อัตโนมัติ'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <p className="text-[11px] text-zinc-400">{isEn ? 'Duration' : 'เวลารวม'}</p>
                <p className="font-mono text-lg font-extrabold text-orange-400">{completedSummary.durationMinutes}m</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <p className="text-[11px] text-zinc-400">{isEn ? 'Burned' : 'พลังงานเผาผลาญ'}</p>
                <p className="font-mono text-lg font-extrabold text-emerald-400">{completedSummary.estimatedKcal} kcal</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <p className="text-[11px] text-zinc-400">{isEn ? 'Exercises' : 'จำนวนท่าฝึก'}</p>
                <p className="font-mono text-lg font-extrabold text-white">
                  {completedSummary.workIntervals} {isEn ? 'sets' : 'ท่า'}
                </p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 space-y-1.5">
              <p className="text-[11px] font-bold text-zinc-400">
                {isEn ? 'Muscles Trained This Session:' : 'มัดกล้ามเนื้อที่ได้ฝึกในเซสชันนี้:'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(completedSummary.trainedMuscleIds || []).length > 0 ? (
                  (completedSummary.trainedMuscleIds || []).slice(0, 10).map(mId => (
                    <span
                      key={mId}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-200"
                    >
                      {getMuscleDisplayName(mId, lang)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400">
                    {isEn ? 'No completed intervals yet.' : 'ยังไม่มีท่าที่ฝึกครบในเซสชันนี้'}
                  </span>
                )}
              </div>
            </div>

            {/* 3-Level RPE Check-in */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-200 text-center">
                {isEn ? 'How did the session feel? (RPE Check-in)' : 'ประเมินความเหนื่อยของคุณ (RPE Check-in):'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'easy',
                    label: isEn ? '😊 Easy' : '😊 สบายมาก',
                    advice: isEn
                      ? 'Great! Try advancing your level or duration next time.'
                      : 'ครั้งหน้าสามารถเพิ่มเป็นระดับขั้นสูงหรือเพิ่มเวลาได้ครับ!'
                  },
                  {
                    id: 'just_right',
                    label: isEn ? '💦 Just Right' : '💦 กำลังดี',
                    advice: isEn
                      ? 'Optimal intensity for steady conditioning progress.'
                      : 'จังหวะและความหนักกำลังเหมาะสมสำหรับพัฒนาความฟิตครับ'
                  },
                  {
                    id: 'hard',
                    label: isEn ? '🥵 Very Hard' : '🥵 เหนื่อยสุด ๆ',
                    advice: isEn
                      ? 'Hydrate well and try Low-Impact or shorter duration next session.'
                      : 'พักดื่มน้ำและแนะนำเลือก Low-Impact หรือลดเวลาลงในเซสชันถัดไป'
                  }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedRpe(opt);
                      onRecordRpe?.(opt.id, completedSummary.durationMinutes, completedSummary.runId);
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

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDownloadShareCard}
                className="min-h-[44px] w-full py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold text-sm shadow-lg"
              >
                {isEn ? '📸 Save 9:16 Share Card (PNG)' : '📸 บันทึกการ์ดแชร์ผลฝึก (9:16 PNG)'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRestartSession}
                  className="min-h-[42px] py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white"
                >
                  {isEn ? '🔄 Repeat' : '🔄 ฝึกซ้ำอีกรอบ'}
                </button>
                <button
                  type="button"
                  onClick={handleRestartSession}
                  className="min-h-[42px] py-2 rounded-xl bg-emerald-500 text-zinc-950 font-extrabold text-xs"
                >
                  {isEn ? '✓ Done' : '✓ เสร็จสิ้น'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Live Stage + Collapsible Schedule Timeline (Side on Desktop, Bottom on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LIVE WORKOUT STAGE */}
        <div
          className={
            focusMode
              ? `fixed inset-0 z-50 bg-zinc-950 p-4 sm:p-6 overflow-y-auto flex flex-col justify-between gap-4 ${flashClass}`
              : `${
                  showScheduleList ? 'lg:col-span-7' : 'lg:col-span-12'
                } bg-zinc-900/95 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-2xl transition-all ${flashClass}`
          }
        >
          {/* Top Status + Focus Mode + Reset + Schedule Toggle + Safety/Dev Prompt Controls */}
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
                {curLoc.roundLabel}
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
                {isEn ? '🔄 Restart' : '🔄 เริ่มใหม่'}
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
                {focusMode
                  ? isEn
                    ? '✕ Exit Focus'
                    : '✕ ออกจากเต็มจอ'
                  : isEn
                  ? '⛶ Focus Mode'
                  : '⛶ โหมดเต็มจอ (Focus)'}
              </button>
              {!focusMode && (
                <button
                  type="button"
                  onClick={() => setShowScheduleList(v => !v)}
                  aria-expanded={showScheduleList}
                  className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
                    showScheduleList
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
                  }`}
                >
                  {showScheduleList
                    ? isEn
                      ? '📋 Hide List ▲'
                      : '📋 พับรายการท่า ▲'
                    : isEn
                    ? `📋 Schedule (${steps.length}) ▼`
                    : `📋 ดูรายการท่า (${steps.length}) ▼`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSafetyTipsModal(v => !v)}
                className="min-h-[36px] px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-cyan-300 border border-zinc-700"
              >
                {isEn ? '💡 Form Tips' : '💡 เคล็ดลับท่าฝึก'}
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
              {curLoc.title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">{curLoc.subtitle}</p>
          </div>

          {/* PURE 360° 3D EXERCISE STAGE + 7-MINUTE SVG RING TIMER */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch flex-1">
            <div
              className={`${
                showScheduleList && !focusMode ? 'sm:col-span-7' : 'sm:col-span-8'
              } rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex flex-col justify-between`}
            >
              <div
                className={`relative w-full aspect-[16/10] bg-zinc-950 flex items-center justify-center ${
                  focusMode
                    ? 'min-h-[300px] sm:min-h-[380px]'
                    : showScheduleList
                    ? 'min-h-[250px] sm:min-h-[290px]'
                    : 'min-h-[280px] sm:min-h-[380px]'
                }`}
              >
                <Exercise3DCoach
                  step={currentStep}
                  selectedEquipment={schedule?.selectedEquipment || ['bodyweight']}
                  selectedMuscles={schedule?.selectedMuscles || []}
                  isFullBody={isFullBody}
                  playbackRate={videoSpeed}
                  cameraAngle={videoAngle}
                  onCameraAngleChange={setVideoAngle}
                  onTempoBeat={handleTempoBeat}
                  isVisible={isVisible}
                  theme={theme}
                  lang={lang}
                />
              </div>

              {/* Dedicated Footer Bar below the 3D stage frame */}
              <div className="flex flex-col gap-2 bg-zinc-950 border-t border-zinc-800 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white keep-white-text shadow"
                    style={{ backgroundColor: currentStep?.primaryMuscleColor || '#f97316' }}
                  >
                    🎯 {curLoc.muscleName}
                  </span>

                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-orange-500/15 text-orange-300 border border-orange-500/40">
                    🎮 {isEn ? '360° Interactive 3D Coach' : 'โมเดล 3D หมุนได้ 360°'}
                  </span>

                  {remainingSec <= 5 && nextStep && (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500 text-zinc-950">
                      {preloadedNextReady
                        ? isEn
                          ? '⚡ Next Ready'
                          : '⚡ ท่าถัดไปพร้อมแล้ว'
                        : isEn
                        ? '⏳ Prepping Next...'
                        : '⏳ กำลังเตรียมท่าถัดไป...'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'iso', label: isEn ? '3D Iso' : 'เฉียง 3D' },
                      { id: 'side', label: isEn ? 'Side' : 'ข้าง (Side)' },
                      { id: 'front', label: isEn ? 'Front' : 'หน้า (Front)' },
                      { id: 'back', label: isEn ? 'Back' : 'หลัง (Back)' },
                      { id: 'top', label: isEn ? 'Top' : 'มุมสูง' }
                    ].map(ang => (
                      <button
                        key={ang.id}
                        type="button"
                        onClick={() => setVideoAngle(ang.id)}
                        className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                          videoAngle === ang.id ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {ang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 7-Minute Ring Countdown + Yoga Pranayama Breath Pacer */}
            <div
              className={`${
                showScheduleList && !focusMode ? 'sm:col-span-5' : 'sm:col-span-4'
              } bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-between gap-3`}
            >
              <div className={`relative ${focusMode ? 'w-48 h-48' : 'w-32 h-32'} flex items-center justify-center`}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={ringRadius} stroke={theme === 'light' ? '#cbd5e1' : '#27272a'} strokeWidth="8" fill="none" />
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

              {(isYogaMode || currentStep?.type === 'REST' || currentStep?.type === 'COOLDOWN') && (
                <div
                  className={`w-full rounded-xl border px-2.5 py-2 text-center transition-all duration-700 ${breathPhase.color} bg-zinc-900/70`}
                >
                  <div className={`inline-block w-3 h-3 rounded-full border-2 mr-1.5 transition-transform duration-700 ${breathPhase.scale} ${breathPhase.color}`} />
                  <span className="text-[11px] font-bold">{breathPhase.label}</span>
                </div>
              )}

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
                  onClick={handleTogglePlayPause}
                  className={`min-h-[48px] flex-1 py-3 px-4 rounded-xl font-extrabold text-sm sm:text-base transition shadow-lg ${
                    isRunning ? 'bg-amber-500 text-zinc-950' : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25'
                  }`}
                >
                  {isRunning ? (isEn ? '⏸ Pause' : '⏸ หยุด') : (isEn ? '▶ Start' : '▶ เริ่มฝึก')}
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
                  {isEn ? '🔀 Swap Exercise' : '🔀 สลับท่านี้เป็นท่าอื่น'}
                </button>
              )}
            </div>
          </div>

          {/* Form Cues + JEFIT EMG Muscle Activation % Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-3">
              <p className="text-[11px] font-bold text-orange-400">
                {isEn ? 'Form & Alignment Cue:' : 'การจัดระเบียบร่างกาย (Form Cue):'}
              </p>
              <p className={`${focusMode ? 'text-sm sm:text-base' : 'text-xs'} text-zinc-200 leading-relaxed mt-1`}>
                {curLoc.cues}
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
                        <span className="text-zinc-300 truncate">{getMuscleDisplayName(mId, lang)}</span>
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
                <span className="font-bold text-cyan-400">
                  {isEn ? '💡 Exercise Tips & Injury Prevention' : '💡 เคล็ดลับท่าฝึก & การป้องกันการบาดเจ็บ'}
                </span>
                <button type="button" onClick={() => setShowSafetyTipsModal(false)} className="text-zinc-400 hover:text-white">
                  {isEn ? '✕ Close' : '✕ ปิด'}
                </button>
              </div>
              <p className="text-zinc-200 leading-relaxed">
                {isEn ? (
                  <>
                    • Brace your core lightly before each concentric rep and avoid holding your breath under load.<br />
                    • If you feel sharp joint pain (knee/wrist/lower back), pause immediately and toggle the Joint Safety Filter in Setup.
                  </>
                ) : (
                  <>
                    • เกร็งแกนกลางลำตัวเบา ๆ ก่อนเริ่มทุกจังหวะออกแรง และไม่กลั้นหายใจในท่าที่ต้องต้านแรง<br />
                    • หากมีอาการเจ็บแปลบตามข้อต่อ (เข่า/ข้อมือ/หลังล่าง) ให้หยุดท่าทันทีหรือแตะตั้งค่าจุดบาดเจ็บในหน้าออกแบบตารางเพื่อกรองท่าอัตโนมัติ
                  </>
                )}
              </p>
            </div>
          )}

          {developerMode && showPromptModal && currentStep?.aiPrompt && (
            <div className="bg-zinc-950 border border-orange-500/40 rounded-2xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400">🤖 Developer: AI 3D Reference Prompt</span>
                <button type="button" onClick={() => setShowPromptModal(false)} className="text-zinc-400 hover:text-white">
                  {isEn ? '✕ Close' : '✕ ปิด'}
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
                    {isEn ? `UP NEXT • ${nextStep.duration}s` : `ท่าถัดไป (UP NEXT • ${nextStep.duration} วินาที)`}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">{nextLoc.title}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{nextLoc.subtitle}</p>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 shrink-0">
                  {nextStep.duration}s
                </span>
              </>
            ) : (
              <p className="text-xs font-bold text-emerald-400">
                {isEn ? '🏁 Final interval of this workout!' : '🏁 นี่คือช่วงสุดท้ายของตารางฝึก!'}
              </p>
            )}
          </div>
        </div>

        {/* SCHEDULE TIMELINE & SWAP PANEL (Side on Desktop, Bottom on Mobile, Collapsible) */}
        <div
          className={`${
            showScheduleList ? 'lg:col-span-5 max-h-[680px]' : 'lg:col-span-12'
          } bg-zinc-900/95 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-3`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowScheduleList(v => !v)}
              aria-expanded={showScheduleList}
              className="text-left flex-1 min-w-[200px]"
            >
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>
                  {isEn
                    ? `Workout Schedule (${schedule?.durationMinutes} min • ${steps.length} steps)`
                    : `ตารางฝึกซ้อม (${schedule?.durationMinutes} นาที • ${steps.length} ช่วง)`}
                </span>
                <span className="text-xs font-bold text-orange-400">
                  {showScheduleList ? '▲' : '▼'}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                {showScheduleList
                  ? isEn
                    ? 'Tap any step to jump there, or tap 🔀 to swap an exercise.'
                    : 'แตะเพื่อข้ามไปยังช่วงเวลานั้น หรือกด 🔀 เพื่อสลับท่าใหม่ (Sworkit Swap)'
                  : isEn
                  ? 'Schedule collapsed for wider 3D view — tap to expand.'
                  : 'พับรายการท่าไว้เพื่อให้จอมอเดล 3D กว้างขึ้น — แตะเพื่อกางดูรายการท่า'}
              </p>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowScheduleList(v => !v)}
                aria-expanded={showScheduleList}
                className="min-h-[34px] px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 transition"
              >
                {showScheduleList
                  ? isEn
                    ? 'Collapse ▲'
                    : 'พับเก็บ ▲'
                  : isEn
                  ? 'Expand ▼'
                  : 'กางออก ▼'}
              </button>
            </div>
          </div>

          {showScheduleList && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {steps.map((step, idx) => {
                const isCurrent = idx === currentIndex;
                const isSwappable = step.type === 'WORK' || step.type === 'SPRINT';
                const stepLoc = getLocalizedStepText(step, lang);
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
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              step.type === 'REST'
                                ? 'bg-cyan-500/15 text-cyan-300'
                                : step.type === 'WARMUP'
                                ? 'bg-amber-500/20 text-amber-300'
                                : step.type === 'COOLDOWN'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-orange-500/20 text-orange-300'
                            }`}
                          >
                            {stepLoc.roundLabel}
                          </span>
                          <span className="text-[10px] text-zinc-400 leading-tight">{stepLoc.muscleName}</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-100 line-clamp-2 leading-snug break-words mt-0.5">
                          {stepLoc.title}
                        </p>
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
          )}
        </div>
      </div>
    </div>
  );
}
