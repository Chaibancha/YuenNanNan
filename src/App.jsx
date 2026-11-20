import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Body3DSelector from './Body3DSelector.jsx';
import WorkoutPlayer from './WorkoutPlayer.jsx';
import {
  MUSCLE_GROUPS,
  EQUIPMENT_CATALOG,
  TRAINING_MODALITIES,
  GOAL_PRESETS,
  SEVEN_DAY_CHALLENGE,
  JOINT_STRESS_OPTIONS,
  generateTimeBoundedSchedule,
  calculateScheduleMetrics,
  getAgeAdjustedHrTargetBpm,
  swapExerciseInSchedule,
  loadWorkoutStats,
  loadUserProfile,
  saveUserProfile,
  logCompletedWorkoutSession,
  recordSessionRpe,
  getMuscleRecoveryPercent,
  pickSmartRecoveredMuscles,
  getMuscleDisplayName,
  getLocalizedStepText
} from './WorkoutEngine.js';
import {
  validateProfileField,
  computeBodyMetrics,
  shouldShowDevUi,
  resolveDurationOnModalityChange,
  stashAfterManualDuration,
  getStepChip,
  getStepEquipmentLabels,
  getMuscleShortName
} from './profileValidation.js';

const THEME_STORAGE_KEY = 'kinetic_3d_theme';
const LANG_STORAGE_KEY = 'kinetic_3d_lang';

function readInitialTheme() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    }
  } catch {}
  return 'dark';
}

function readInitialLang() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'th') return saved;
    }
  } catch {}
  return 'th';
}

/**
 * ============================================================================
 * App.jsx (v2.2 — Unified React/Vite Studio Architecture)
 * - Dark / Light Theme Switcher + Thai / English Bilingual Toggle
 * - Goal-Based Quick Presets (FEAT-01) & 7-Day Challenge (FEAT-06)
 * - Quick Body Profile & Joint Safety Filter (FEAT-02)
 * - Active Session Confirmation Guard (CR-005)
 * - Smart Recovery Auto-Pick >=85% (FEAT-05) & Daily Streak / Weekly Goal (FEAT-06)
 * ============================================================================
 */
export default function App() {
  const [theme, setTheme] = useState(readInitialTheme);
  const [lang, setLang] = useState(readInitialLang);
  const isEn = lang === 'en';

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {}
  }, [lang]);

  const [userProfile, setUserProfile] = useState(() => loadUserProfile());
  const [profileDraft, setProfileDraft] = useState(() => {
    const p = loadUserProfile();
    return {
      weightKg: String(p.weightKg),
      heightCm: String(p.heightCm),
      age: String(p.age),
      weeklyGoalDays: String(p.weeklyGoalDays)
    };
  });
  const [profileErrors, setProfileErrors] = useState({});
  const profileDraftRef = useRef(profileDraft);
  profileDraftRef.current = profileDraft;

  useEffect(() => {
    setProfileErrors(prev => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      const next = {};
      keys.forEach(field => {
        const check = validateProfileField(field, profileDraftRef.current[field] ?? '', lang);
        if (!check.valid) next[field] = check.error;
      });
      return next;
    });
  }, [lang]);
  const [profileSavedAt, setProfileSavedAt] = useState(null);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showGoalPresets, setShowGoalPresets] = useState(true);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);
  const [pre7MinDurationStash, setPre7MinDurationStash] = useState(null);
  const showDevToggle = useMemo(
    () =>
      shouldShowDevUi(
        typeof window !== 'undefined' ? window.location.search : '',
        typeof window !== 'undefined' ? window.localStorage : null
      ),
    []
  );

  const [selectedMuscles, setSelectedMuscles] = useState([
    'chest_upper_Mid',
    'lats_teres',
    'quads',
    'abs_rectus'
  ]);
  const [isFullBody, setIsFullBody] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(['bodyweight', 'dumbbell', 'yoga_mat']);
  const [modality, setModality] = useState('HIIT');
  const [fitnessLevel, setFitnessLevel] = useState('intermediate');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [lowImpactOnly, setLowImpactOnly] = useState(false);
  const [activeChallengeDay, setActiveChallengeDay] = useState(null);

  const [activeTab, setActiveTab] = useState('setup'); // 'setup' | 'workout' | 'stats'
  const [mobileSection, setMobileSection] = useState('3d'); // '3d' | 'config' | 'workout' | 'stats'
  const [activeExerciseMuscles, setActiveExerciseMuscles] = useState(null);
  const [hoveredPreviewMuscles, setHoveredPreviewMuscles] = useState(null);
  const [workoutStats, setWorkoutStats] = useState(() => loadWorkoutStats());

  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState(null);
  const [appToast, setAppToast] = useState(null);
  const appToastTimerRef = useRef(null);

  const showToastMessage = useCallback(msg => {
    if (appToastTimerRef.current) clearTimeout(appToastTimerRef.current);
    setAppToast(msg);
    appToastTimerRef.current = setTimeout(() => {
      setAppToast(null);
      appToastTimerRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (appToastTimerRef.current) clearTimeout(appToastTimerRef.current);
    };
  }, []);

  const recoveryStats = useMemo(() => {
    const map = {};
    MUSCLE_GROUPS.forEach(m => {
      map[m.id] = getMuscleRecoveryPercent(workoutStats, m.id);
    });
    return map;
  }, [workoutStats]);

  const [planRevision, setPlanRevision] = useState(0);
  const profileMetricsRef = useRef({
    weightKg: userProfile.weightKg,
    heightCm: userProfile.heightCm,
    age: userProfile.age
  });
  profileMetricsRef.current = {
    weightKg: userProfile.weightKg,
    heightCm: userProfile.heightCm,
    age: userProfile.age
  };
  const isFirstStructuralRef = useRef(true);
  const isFirstMetricsRef = useRef(true);

  const [schedule, setSchedule] = useState(() =>
    generateTimeBoundedSchedule({
      selectedMuscles: ['chest_upper_Mid', 'lats_teres', 'quads', 'abs_rectus'],
      isFullBody: false,
      selectedEquipment: ['bodyweight', 'dumbbell', 'yoga_mat'],
      modality: 'HIIT',
      durationMinutes: 20,
      fitnessLevel: 'intermediate',
      lowImpactOnly: false,
      weightKg: userProfile.weightKg,
      heightCm: userProfile.heightCm,
      age: userProfile.age,
      injuredJoints: userProfile.injuredJoints
    })
  );

  // Sync Three.js viewport sizing whenever user switches back to 3D tab on mobile
  useEffect(() => {
    if (activeTab === 'setup' || mobileSection === '3d') {
      const t = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 40);
      return () => clearTimeout(t);
    }
  }, [activeTab, mobileSection]);

  // Structural schedule rebuild
  useEffect(() => {
    if (isFirstStructuralRef.current) {
      isFirstStructuralRef.current = false;
      return;
    }
    const { weightKg, heightCm, age } = profileMetricsRef.current;
    setSchedule(
      generateTimeBoundedSchedule({
        selectedMuscles,
        isFullBody,
        selectedEquipment,
        modality,
        durationMinutes,
        fitnessLevel,
        lowImpactOnly,
        weightKg,
        heightCm,
        age,
        injuredJoints: userProfile.injuredJoints
      })
    );
  }, [
    selectedMuscles,
    isFullBody,
    selectedEquipment,
    modality,
    durationMinutes,
    fitnessLevel,
    lowImpactOnly,
    userProfile.injuredJoints,
    planRevision
  ]);

  // In-place body metrics update
  useEffect(() => {
    if (isFirstMetricsRef.current) {
      isFirstMetricsRef.current = false;
      return;
    }
    setSchedule(prev => ({
      ...prev,
      weightKg: userProfile.weightKg,
      heightCm: userProfile.heightCm,
      age: userProfile.age,
      hrTargetBpm: getAgeAdjustedHrTargetBpm(prev.modality, userProfile.age),
      summary: calculateScheduleMetrics(prev.steps, prev.modality, userProfile.weightKg)
    }));
  }, [userProfile.weightKg, userProfile.heightCm, userProfile.age]);

  const guardScheduleChange = useCallback(
    (summaryText, actionFn) => {
      if (!hasActiveSession) {
        actionFn();
        return;
      }
      setPendingConfirmAction({ summaryText, apply: actionFn });
    },
    [hasActiveSession]
  );

  const handleToggleMuscle = useCallback(
    muscleId => {
      const shortName = getMuscleShortName(muscleId, MUSCLE_GROUPS, lang);
      if (isFullBody) {
        guardScheduleChange(
          isEn ? `Isolate ${shortName}` : `เปลี่ยนเป้าหมายเป็นเฉพาะ ${shortName}`,
          () => {
            setActiveChallengeDay(null);
            setIsFullBody(false);
            setSelectedMuscles([muscleId]);
            showToastMessage(
              isEn
                ? `Selected only ${shortName} • Tap Full Body to restore`
                : `เลือกเฉพาะ ${shortName} แล้ว • กด ทั่วร่างกาย เพื่อกลับ`
            );
          }
        );
        return;
      }
      if (selectedMuscles.includes(muscleId) && selectedMuscles.length <= 1) {
        showToastMessage(
          isEn ? 'Select at least 1 muscle group for your schedule.' : 'ต้องเลือกอย่างน้อย 1 มัดกล้ามเนื้อสำหรับจัดตาราง'
        );
        return;
      }
      guardScheduleChange(
        isEn ? 'Update target muscle groups' : 'ปรับเปลี่ยนมัดกล้ามเนื้อเป้าหมาย',
        () => {
          setActiveChallengeDay(null);
          setSelectedMuscles(prev =>
            prev.includes(muscleId) ? prev.filter(id => id !== muscleId) : [...prev, muscleId]
          );
        }
      );
    },
    [isFullBody, selectedMuscles, guardScheduleChange, showToastMessage, isEn, lang]
  );

  const handleSetMuscles = useCallback(
    nextIds => {
      const valid = MUSCLE_GROUPS.map(m => m.id).filter(id => nextIds.includes(id));
      if (valid.length === 0) {
        showToastMessage(
          isEn ? 'Select at least 1 muscle group for your schedule.' : 'ต้องเลือกอย่างน้อย 1 มัดกล้ามเนื้อสำหรับจัดตาราง'
        );
        return;
      }
      guardScheduleChange(
        isEn ? 'Update target body region' : 'ปรับเปลี่ยนส่วนของร่างกายเป้าหมาย',
        () => {
          setActiveChallengeDay(null);
          setIsFullBody(valid.length === MUSCLE_GROUPS.length);
          setSelectedMuscles(valid);
        }
      );
    },
    [guardScheduleChange, showToastMessage, isEn]
  );

  const handleToggleFullBody = useCallback(() => {
    guardScheduleChange(
      isEn ? 'Toggle Full Body mode' : 'สลับโหมดทั่วร่างกาย (Full Body)',
      () => {
        setActiveChallengeDay(null);
        setIsFullBody(prev => {
          const next = !prev;
          if (next) setSelectedMuscles(MUSCLE_GROUPS.map(m => m.id));
          return next;
        });
      }
    );
  }, [guardScheduleChange, isEn]);

  const handleSmartRecoveryPick = useCallback(() => {
    const readyMuscles = pickSmartRecoveredMuscles(workoutStats, 85);
    guardScheduleChange(
      isEn ? 'Auto-pick recovered muscles (>=85%)' : 'จัดตารางจากมัดกล้ามเนื้อที่ฟื้นตัวพร้อมฝึก (>=85%)',
      () => {
        setActiveChallengeDay(null);
        setIsFullBody(false);
        setSelectedMuscles(readyMuscles);
        showToastMessage(
          isEn
            ? `✨ Selected ${readyMuscles.length} recovered muscles!`
            : `✨ เลือก ${readyMuscles.length} มัดกล้ามเนื้อที่ฟื้นตัวพร้อมฝึกแล้ว!`
        );
      }
    );
  }, [workoutStats, guardScheduleChange, showToastMessage, isEn]);

  const handleToggleEquipment = useCallback(
    eqId => {
      if (selectedEquipment.includes(eqId) && selectedEquipment.length <= 1) {
        showToastMessage(
          isEn ? 'Select at least 1 equipment option (e.g. Bodyweight).' : 'ต้องเลือกอย่างน้อย 1 อุปกรณ์ (เช่น Bodyweight)'
        );
        return;
      }
      guardScheduleChange(
        isEn ? 'Update available equipment' : 'ปรับเปลี่ยนอุปกรณ์ฝึก',
        () => {
          setSelectedEquipment(prev =>
            prev.includes(eqId) ? prev.filter(id => id !== eqId) : [...prev, eqId]
          );
        }
      );
    },
    [selectedEquipment, guardScheduleChange, showToastMessage, isEn]
  );

  const syncProfileDraft = useCallback(profileObj => {
    setProfileDraft({
      weightKg: String(profileObj.weightKg),
      heightCm: String(profileObj.heightCm),
      age: String(profileObj.age),
      weeklyGoalDays: String(profileObj.weeklyGoalDays)
    });
    setProfileErrors({});
  }, []);

  const toggleProfileDrawer = useCallback(() => {
    setShowProfileDrawer(open => {
      syncProfileDraft(userProfile);
      if (!open) setProfileSavedAt(null);
      return !open;
    });
  }, [syncProfileDraft, userProfile]);

  const closeProfileDrawer = useCallback(() => {
    syncProfileDraft(userProfile);
    setShowProfileDrawer(false);
  }, [syncProfileDraft, userProfile]);

  const updateProfileField = useCallback((patch, options = {}) => {
    setUserProfile(prev => saveUserProfile({ ...prev, ...patch }));
    if (!options.silent) {
      setProfileSavedAt(Date.now());
    }
  }, []);

  const handleProfileInputChange = (field, rawValue) => {
    setProfileDraft(prev => ({ ...prev, [field]: rawValue }));
    const check = validateProfileField(field, rawValue, lang);
    if (!check.valid) {
      setProfileErrors(prev => ({ ...prev, [field]: check.error }));
      return;
    }
    setProfileErrors(prev => {
      const nextErr = { ...prev };
      delete nextErr[field];
      return nextErr;
    });
    updateProfileField({ [field]: check.value });
  };

  const toggleInjuredJoint = jointId => {
    guardScheduleChange(
      isEn ? 'Update joint injury safety filter' : 'อัปเดตตัวกรองความปลอดภัยข้อต่อ',
      () => {
        setUserProfile(prev => {
          const exists = prev.injuredJoints.includes(jointId);
          const nextJoints = exists
            ? prev.injuredJoints.filter(j => j !== jointId)
            : [...prev.injuredJoints, jointId];
          return saveUserProfile({ ...prev, injuredJoints: nextJoints });
        });
        setProfileSavedAt(Date.now());
      }
    );
  };

  const bodyMetrics = useMemo(
    () =>
      computeBodyMetrics({
        weightKg: userProfile.weightKg,
        heightCm: userProfile.heightCm,
        age: userProfile.age
      }),
    [userProfile.weightKg, userProfile.heightCm, userProfile.age]
  );

  const applyGoalPreset = preset => {
    guardScheduleChange(
      isEn ? `Start preset: ${preset.titleEn || preset.titleTh}` : `เริ่มโปรแกรม: ${preset.titleTh}`,
      () => {
        setActiveChallengeDay(null);
        setIsFullBody(preset.isFullBody);
        setSelectedMuscles(preset.selectedMuscles);
        setModality(preset.modality);
        setDurationMinutes(preset.durationMinutes);
        setLowImpactOnly(preset.lowImpactOnly);
        if (preset.modality === 'YOGA' && !selectedEquipment.includes('yoga_mat')) {
          setSelectedEquipment(prev => [...prev, 'yoga_mat']);
        }
        setPlanRevision(r => r + 1);
        updateProfileField({ preferredGoal: preset.id }, { silent: true });
        setActiveTab('workout');
        setMobileSection('workout');
      }
    );
  };

  const launchChallengeDay = dayObj => {
    guardScheduleChange(
      isEn ? `Start mission: ${dayObj.titleEn || dayObj.titleTh}` : `เริ่มภารกิจ ${dayObj.titleTh}`,
      () => {
        setActiveChallengeDay(dayObj.day);
        setIsFullBody(dayObj.isFullBody);
        setSelectedMuscles(dayObj.selectedMuscles);
        setModality(dayObj.modality);
        setDurationMinutes(dayObj.durationMinutes);
        setLowImpactOnly(dayObj.lowImpactOnly);
        if (dayObj.modality === 'YOGA' && !selectedEquipment.includes('yoga_mat')) {
          setSelectedEquipment(prev => [...prev, 'yoga_mat']);
        }
        setPlanRevision(r => r + 1);
        setActiveTab('workout');
        setMobileSection('workout');
      }
    );
  };

  const launch7MinQuickPreset = () => {
    guardScheduleChange(
      isEn ? 'Start 7-Minute ACSM Quick Preset' : 'เริ่มโปรแกรมด่วน 7 นาที (ACSM)',
      () => {
        setActiveChallengeDay(null);
        setIsFullBody(true);
        setSelectedMuscles(MUSCLE_GROUPS.map(m => m.id));
        setModality('7MIN');
        setDurationMinutes(7);
        setPlanRevision(r => r + 1);
        setActiveTab('workout');
        setMobileSection('workout');
      }
    );
  };

  const launchYogaPreset = () => {
    guardScheduleChange(
      isEn ? 'Start 15-Minute Yoga Flow' : 'เริ่มโปรแกรม Yoga Flow 15 นาที',
      () => {
        setActiveChallengeDay(null);
        setIsFullBody(true);
        setSelectedMuscles(MUSCLE_GROUPS.map(m => m.id));
        if (!selectedEquipment.includes('yoga_mat')) {
          setSelectedEquipment(prev => [...prev, 'yoga_mat']);
        }
        setModality('YOGA');
        setLowImpactOnly(true);
        setDurationMinutes(15);
        setPlanRevision(r => r + 1);
        setActiveTab('workout');
        setMobileSection('workout');
      }
    );
  };

  const handleSwapStep = useCallback(stepIndex => {
    setSchedule(prev => swapExerciseInSchedule(prev, stepIndex));
  }, []);

  const handleWorkoutComplete = useCallback(
    (completedSched, details = {}) => {
      const updated = logCompletedWorkoutSession(completedSched, {
        completedSteps: details.completedSteps,
        durationMinutes: details.durationMinutes,
        estimatedKcal: details.estimatedKcal,
        credited: details.credited,
        completedChallengeDay: details.credited === false ? null : activeChallengeDay,
        completionId: details.completionId
      });
      setWorkoutStats(updated);
      setActiveChallengeDay(null);
    },
    [activeChallengeDay]
  );

  const handleRecordRpe = useCallback(
    (rpeId, actualDurationMin = null, sessionKey = null) => {
      const updated = recordSessionRpe(
        rpeId,
        schedule.modality,
        actualDurationMin ?? schedule.durationMinutes,
        sessionKey
      );
      setWorkoutStats(updated);
    },
    [schedule.modality, schedule.durationMinutes]
  );

  const weeklyProgressPct = Math.min(
    100,
    Math.round(((workoutStats.weeklyCompletedDays || 0) / Math.max(1, userProfile.weeklyGoalDays || 4)) * 100)
  );

  const effectiveActiveMuscles = hoveredPreviewMuscles || (activeTab === 'workout' ? activeExerciseMuscles : null);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-20 lg:pb-6">
      {/* App-level Toast */}
      {appToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[75] w-[92%] max-w-md pointer-events-none"
        >
          <div className="bg-zinc-900/95 backdrop-blur-md border-2 border-amber-500 px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold text-amber-200 text-center">
            {appToast}
          </div>
        </div>
      )}

      {/* CR-005: Active Session Reset Confirmation Modal */}
      {pendingConfirmAction && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-amber-500/60 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                {isEn ? '⚠️ Confirm Schedule Change' : '⚠️ ยืนยันการเปลี่ยนตารางฝึก'}
              </span>
              <h3 className="text-lg font-extrabold text-white">
                {isEn ? 'Active Workout in Progress' : 'คุณกำลังฝึกซ้อมค้างอยู่'}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {isEn
                  ? `Changing settings (${pendingConfirmAction.summaryText}) will reset your current timer and rebuild the schedule. Continue?`
                  : `การเปลี่ยนการตั้งค่า (${pendingConfirmAction.summaryText}) จะล้างเวลาและเริ่มต้นตารางใหม่ ต้องการดำเนินการต่อหรือไม่?`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPendingConfirmAction(null)}
                className="min-h-[44px] py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200"
              >
                {isEn ? 'Cancel (Keep Training)' : 'ยกเลิก (ฝึกต่อ)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = pendingConfirmAction.apply;
                  setPendingConfirmAction(null);
                  fn();
                }}
                className="min-h-[44px] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-xs font-extrabold text-white"
              >
                {isEn ? 'Confirm & Rebuild' : 'ยืนยันสร้างตารางใหม่'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Sticky App Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 flex items-center justify-center font-extrabold text-white shadow-lg shadow-orange-500/25">
              3D
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white">
                ยืนนานนาน<span className="text-orange-500">(YuenNanNan)</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                BioDigital × MSD 3D Anatomy • Offline PWA • Joint-Safe Physiology
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Theme Toggle (Dark / Light) */}
            <button
              type="button"
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={isEn ? 'Toggle light or dark theme' : 'สลับโหมดมืด/สว่าง'}
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-orange-500/60 transition"
            >
              {theme === 'dark' ? (isEn ? '🌙 Dark' : '🌙 มืด') : (isEn ? '☀️ Light' : '☀️ สว่าง')}
            </button>

            {/* Language Toggle (Thai / English) */}
            <button
              type="button"
              onClick={() => setLang(l => (l === 'th' ? 'en' : 'th'))}
              aria-label={isEn ? 'Switch language to Thai' : 'สลับภาษา ไทย-อังกฤษ'}
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-cyan-500/60 transition"
            >
              {lang === 'th' ? '🇹🇭 ไทย' : '🇬🇧 EN'}
            </button>

            {/* Daily Streak & Weekly Goal */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('stats');
                setMobileSection('stats');
              }}
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-zinc-900 border border-amber-500/40 text-amber-300 flex items-center gap-1"
            >
              <span>🔥</span>
              <span className="font-mono">
                {workoutStats.currentStreakDays || 0} {isEn ? 'd' : 'วัน'}
              </span>
              <span className="hidden sm:inline text-[10px] text-zinc-400">
                ({workoutStats.weeklyCompletedDays || 0}/{userProfile.weeklyGoalDays}{' '}
                {isEn ? 'this wk' : 'สัปดาห์นี้'})
              </span>
            </button>

            <button
              type="button"
              onClick={toggleProfileDrawer}
              aria-expanded={showProfileDrawer}
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-cyan-500/60"
            >
              👤 {userProfile.weightKg} kg
              {userProfile.injuredJoints.length > 0 && (
                <span className="ml-1 text-rose-400">
                  • {isEn ? `${userProfile.injuredJoints.length} guarded` : `ระวัง ${userProfile.injuredJoints.length} จุด`}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={launch7MinQuickPreset}
              className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition"
            >
              {isEn ? '⚡ 7 Min' : '⚡ 7 นาที'}
            </button>

            <button
              type="button"
              onClick={launchYogaPreset}
              className="hidden sm:inline-flex min-h-[36px] items-center px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition"
            >
              🧘 Yoga Flow 15m
            </button>

            {/* Desktop Tab Switcher */}
            <div className="hidden lg:flex items-center gap-1 bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
              {[
                { id: 'setup', label: isEn ? '1. 3D Anatomy & Setup' : '1. โมเดล 3D & ออกแบบตาราง' },
                {
                  id: 'workout',
                  label: isEn ? `2. Live 3D Coach (${schedule.durationMinutes}m)` : `2. ฝึกซ้อมสด (${schedule.durationMinutes}m)`
                },
                { id: 'stats', label: isEn ? '3. Stats & 7-Day' : '3. สถิติ & ภารกิจ 7 วัน' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                    activeTab === tab.id ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-5 space-y-5">
        {/* FEAT-02: Quick Body Profile & Injury Safety Filter Drawer */}
        {showProfileDrawer && (
          <section className="bg-zinc-900/95 border border-cyan-500/40 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  Quick Body Profile & Injury Protection (Offline LocalStorage)
                </span>
                <h2 className="text-base font-extrabold text-white">
                  {isEn ? 'Body Metrics & Joint Injury Safety Filter' : 'ข้อมูลร่างกายและตัวกรองป้องกันข้อต่อบาดเจ็บ'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {profileSavedAt && Object.keys(profileErrors).length === 0 && (
                  <span role="status" aria-live="polite" className="text-[11px] font-bold text-emerald-400">
                    {isEn ? 'Auto-saved ✓' : 'บันทึกอัตโนมัติแล้ว ✓'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={closeProfileDrawer}
                  aria-label={isEn ? 'Close body profile drawer' : 'ปิดหน้าต่างข้อมูลร่างกาย'}
                  className="min-h-[38px] px-3 py-1 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300"
                >
                  {isEn ? '✕ Close' : '✕ ปิด'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  field: 'weightKg',
                  id: 'profile-weight-kg',
                  label: isEn ? 'Weight (kg)' : 'น้ำหนักตัว (kg)',
                  min: 35,
                  max: 200
                },
                {
                  field: 'heightCm',
                  id: 'profile-height-cm',
                  label: isEn ? 'Height (cm)' : 'ส่วนสูง (cm)',
                  min: 120,
                  max: 230
                },
                { field: 'age', id: 'profile-age-years', label: isEn ? 'Age (yrs)' : 'อายุ (ปี)', min: 12, max: 100 },
                {
                  field: 'weeklyGoalDays',
                  id: 'profile-weekly-goal',
                  label: isEn ? 'Weekly Goal (days)' : 'เป้าหมายสัปดาห์ (วัน)',
                  min: 1,
                  max: 7
                }
              ].map(cfg => (
                <div key={cfg.field} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs space-y-1">
                  <label htmlFor={cfg.id} className="block text-zinc-400 font-bold">
                    {cfg.label}
                  </label>
                  <input
                    id={cfg.id}
                    type="number"
                    min={cfg.min}
                    max={cfg.max}
                    value={profileDraft[cfg.field]}
                    aria-invalid={Boolean(profileErrors[cfg.field])}
                    onChange={e => handleProfileInputChange(cfg.field, e.target.value)}
                    className={`w-full bg-zinc-900 border rounded-xl px-2.5 py-1.5 font-mono font-bold text-white ${
                      profileErrors[cfg.field] ? 'border-rose-500' : 'border-zinc-700'
                    }`}
                  />
                  {profileErrors[cfg.field] && (
                    <p role="alert" className="text-[11px] text-rose-400 leading-snug">
                      {profileErrors[cfg.field]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] bg-zinc-950/90 border border-zinc-800 rounded-2xl px-3.5 py-2.5">
              <span className="text-zinc-400">{isEn ? 'Computed Metrics:' : 'ค่าคำนวณจากโปรไฟล์:'}</span>
              <span className="font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                BMI {bodyMetrics.bmi} ({isEn ? bodyMetrics.bmiCategoryEn : bodyMetrics.bmiCategoryTh})
              </span>
              <span className="font-mono font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                Max HR ~{bodyMetrics.maxHrBpm} BPM ({isEn ? 'Target' : 'โซนฝึก'} {schedule.hrTargetBpm?.[0]}–
                {schedule.hrTargetBpm?.[1]} BPM)
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-300">
                {isEn
                  ? 'Sensitive or injured joints (high-load exercises will be filtered out automatically):'
                  : 'ข้อต่อที่บาดเจ็บหรือต้องการหลีกเลี่ยง (ระบบจะกรองท่าที่กระทบข้อต่อนั้นออกอัตโนมัติ):'}
              </p>
              <div className="flex flex-wrap gap-2">
                {JOINT_STRESS_OPTIONS.map(joint => {
                  const selected = userProfile.injuredJoints.includes(joint.id);
                  return (
                    <button
                      key={joint.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleInjuredJoint(joint.id)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selected
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {joint.icon} {isEn ? joint.labelEn : joint.labelTh}{' '}
                      {selected ? (isEn ? '✓ Guarded' : '✓ งดท่าหนัก') : ''}
                    </button>
                  );
                })}
                {showDevToggle && (
                  <button
                    type="button"
                    onClick={() => updateProfileField({ developerMode: !userProfile.developerMode })}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition ml-auto ${
                      userProfile.developerMode
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    🛠️ Dev AI Prompts: {userProfile.developerMode ? 'ON' : 'OFF'}
                  </button>
                )}
              </div>
              {schedule.jointFilterFallbackUsed && (
                <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                  {isEn
                    ? '⚠️ Very few exercises remained after joint safety filtering, so safe alternative movements were selected.'
                    : '⚠️ ตัวกรองข้อต่อที่บาดเจ็บเหลือท่าในกลุ่มเป้าหมายน้อยมาก ระบบจึงเลือกท่าทางเลือกที่ปลอดภัยต่อข้อต่อของคุณให้แทน'}
                </p>
              )}
            </div>
          </section>
        )}

        {/* SETUP TAB */}
        {activeTab === 'setup' && (
          <div className="space-y-5">
            {/* FEAT-01: Goal-Based Quick Onboarding Presets */}
            <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                    3-Second Quick Start Presets
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-white">
                    {isEn
                      ? 'Start Instantly by Real-Life Goal (No Anatomy Jargon Required)'
                      : 'เริ่มต้นฝึกด่วนตามเป้าหมายชีวิตจริง (ไม่ต้องจำศัพท์กายวิภาค)'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoalPresets(v => !v)}
                  className="min-h-[34px] px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  {showGoalPresets
                    ? isEn
                      ? 'Hide Presets ▲'
                      : 'ซ่อนแถบด่วน ▲'
                    : isEn
                    ? 'Show Presets ▼'
                    : 'แสดงแถบด่วน ▼'}
                </button>
              </div>

              {showGoalPresets && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {GOAL_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyGoalPreset(preset)}
                      className={`p-3.5 rounded-2xl border bg-gradient-to-br ${preset.accentClass} to-zinc-950 text-left hover:scale-[1.01] transition flex flex-col justify-between gap-1`}
                    >
                      <span className="text-xs sm:text-sm font-extrabold text-white">
                        {isEn ? preset.titleEn || preset.titleTh : preset.titleTh}
                      </span>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {isEn ? preset.subtitleEn || preset.subtitleTh : preset.subtitleTh}
                      </p>
                      <span className="text-[10px] font-mono text-orange-300 mt-1">
                        {preset.modality} • {preset.durationMinutes}m {preset.lowImpactOnly ? '• Low-Impact' : ''} →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Dual-Engine Medical 3D Selector */}
              <div className={`lg:col-span-5 ${mobileSection === '3d' ? 'block' : 'hidden lg:block'}`}>
                <Body3DSelector
                  selectedMuscles={selectedMuscles}
                  isFullBody={isFullBody}
                  onToggleMuscle={handleToggleMuscle}
                  onSetMuscles={handleSetMuscles}
                  onToggleFullBody={handleToggleFullBody}
                  onSmartRecoveryPick={handleSmartRecoveryPick}
                  activeHighlightMuscle={effectiveActiveMuscles?.primary || null}
                  activeExerciseMuscles={effectiveActiveMuscles}
                  recoveryStats={recoveryStats}
                  hasActiveSession={hasActiveSession}
                  isVisible={activeTab === 'setup'}
                  theme={theme}
                  lang={lang}
                />
              </div>

              {/* Right: Equipment, Modality, Low-Impact Filter & Summary */}
              <div className={`lg:col-span-7 flex flex-col gap-5 ${mobileSection === 'config' ? 'flex' : 'hidden lg:flex'}`}>
                {/* Multi-Select Equipment Filter (11 items) */}
                <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                        {isEn ? 'Equipment Filter • 11 Options' : 'Equipment Filter • 11 รายการ'}
                      </span>
                      <h2 className="text-base font-extrabold text-white">
                        {isEn ? 'Select Your Available Equipment' : 'เลือกอุปกรณ์ที่มีอยู่จริง'}
                      </h2>
                    </div>
                    <span className="text-xs font-semibold text-zinc-400">
                      {isEn ? `Selected ${selectedEquipment.length}` : `เลือกแล้ว ${selectedEquipment.length}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EQUIPMENT_CATALOG.map(eq => {
                      const isSelected = selectedEquipment.includes(eq.id);
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => handleToggleEquipment(eq.id)}
                          className={`min-h-[44px] p-2.5 rounded-2xl border text-left transition flex items-center gap-2 ${
                            isSelected
                              ? 'bg-orange-500/15 border-orange-500 text-white shadow'
                              : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <span className="text-lg">{eq.icon}</span>
                          <span className="text-xs font-bold leading-snug">
                            {isEn ? eq.nameEn : eq.nameTh}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Modality Engine + Sworkit Low-Impact + Duration */}
                <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                        Modality & Joint-Safe Physiology
                      </span>
                      <h2 className="text-base font-extrabold text-white">
                        {isEn ? 'Training Modality & Joint Protection' : 'รูปแบบการฝึก & การป้องกันข้อต่อ'}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        guardScheduleChange(
                          isEn ? 'Toggle Low-Impact Joint-Safe mode' : 'สลับโหมด Low-Impact ถนอมข้อต่อ',
                          () => setLowImpactOnly(v => !v)
                        )
                      }
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        lowImpactOnly
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {lowImpactOnly
                        ? isEn
                          ? '🛡️ Low-Impact: ON (Joint-Safe)'
                          : '🛡️ Low-Impact: เปิด (ถนอมข้อต่อ)'
                        : isEn
                        ? '🦵 Low-Impact: OFF'
                        : '🦵 Low-Impact: ปิด'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {Object.values(TRAINING_MODALITIES).map(mod => {
                      const active = modality === mod.id;
                      const proto = mod.protocolsByLevel[fitnessLevel];
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() =>
                            guardScheduleChange(
                              isEn ? `Switch modality to ${mod.id}` : `เปลี่ยนรูปแบบเป็น ${mod.id}`,
                              () => {
                                const resolved = resolveDurationOnModalityChange({
                                  modality,
                                  duration: durationMinutes,
                                  stash: pre7MinDurationStash,
                                  next: mod.id
                                });
                                setModality(mod.id);
                                setDurationMinutes(resolved.duration);
                                setPre7MinDurationStash(resolved.stash);
                              }
                            )
                          }
                          className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                            active
                              ? 'bg-orange-500/15 border-orange-500 text-white ring-1 ring-orange-500'
                              : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-sm font-extrabold text-white">{mod.id}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-orange-300">
                                {isEn ? proto.ratioLabelEn || proto.ratioLabel : proto.ratioLabel}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-zinc-300 mt-1">
                              {isEn ? mod.nameEn : mod.nameTh}
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                              {isEn ? mod.descriptionEn || mod.description : mod.description}
                            </p>
                          </div>
                          <p className="text-[10px] font-bold text-cyan-400 mt-2">{mod.hrZone}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Level & Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span id="fitness-level-label" className="block text-xs font-bold text-zinc-400 mb-1.5">
                        {isEn ? 'Fitness Level:' : 'ระดับความฟิต:'}
                      </span>
                      <div role="group" aria-labelledby="fitness-level-label" className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'beginner', label: isEn ? 'Beginner' : 'ผู้เริ่มต้น' },
                          { id: 'intermediate', label: isEn ? 'Intermediate' : 'ปานกลาง' },
                          { id: 'advanced', label: isEn ? 'Advanced' : 'ขั้นสูง' }
                        ].map(lv => (
                          <button
                            key={lv.id}
                            type="button"
                            aria-pressed={fitnessLevel === lv.id}
                            onClick={() =>
                              guardScheduleChange(
                                isEn ? `Set fitness level to ${lv.label}` : `ปรับระดับความฟิตเป็น ${lv.label}`,
                                () => setFitnessLevel(lv.id)
                              )
                            }
                            className={`min-h-[38px] py-2 px-2 rounded-xl text-xs font-bold border transition ${
                              fitnessLevel === lv.id
                                ? 'bg-orange-500 text-white border-orange-400'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {lv.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span id="target-duration-label" className="block text-xs font-bold text-zinc-400 mb-1.5">
                        {isEn ? 'Target Duration (min):' : 'เวลาเป้าหมาย (นาที):'}
                      </span>
                      <div role="group" aria-labelledby="target-duration-label" className="grid grid-cols-6 gap-1">
                        {[7, 10, 15, 20, 30, 45].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            aria-pressed={durationMinutes === mins}
                            onClick={() =>
                              guardScheduleChange(
                                isEn ? `Set duration to ${mins} min` : `เปลี่ยนเวลาเป้าหมายเป็น ${mins} นาที`,
                                () => {
                                  setDurationMinutes(mins);
                                  setPre7MinDurationStash(stashAfterManualDuration());
                                }
                              )
                            }
                            className={`min-h-[38px] py-2 rounded-xl text-xs font-mono font-extrabold border transition ${
                              durationMinutes === mins
                                ? 'bg-orange-500 text-white border-orange-400'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Schedule Summary Launch + Collapsible Step Preview */}
                <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-3">
                  {schedule.jointFilterFallbackUsed && (
                    <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                      {isEn
                        ? '⚠️ Few target exercises matched your joint filter, so safe alternatives were substituted.'
                        : '⚠️ ตัวกรองข้อต่อที่บาดเจ็บเหลือท่าน้อยมาก ระบบจึงแสดงท่าทางเลือกที่ปลอดภัยใกล้เคียงให้แทน'}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        {isEn
                          ? `Exact Time-Bounded Schedule (${schedule.totalSeconds}s • Ref Weight ${userProfile.weightKg} kg)`
                          : `Exact Time-Bounded Schedule (${schedule.totalSeconds} วินาที • น้ำหนักอ้างอิง ${userProfile.weightKg} kg)`}
                      </span>
                      <h3 className="text-base font-extrabold text-white">
                        {isEn
                          ? `${schedule.durationMinutes}-Min Plan • ~${schedule.summary.estimatedKcal} kcal (${schedule.summary.burnRatePerMin} kcal/min • ${schedule.summary.workIntervals} exercises)`
                          : `ตาราง ${schedule.durationMinutes} นาที • ~${schedule.summary.estimatedKcal} kcal (${schedule.summary.burnRatePerMin} kcal/นาที • ${schedule.summary.workIntervals} ท่าฝึก)`}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setShowSchedulePreview(v => !v)}
                        className="min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-700 hover:border-zinc-500 text-xs font-extrabold text-zinc-200"
                      >
                        {isEn
                          ? `👀 Preview Steps (${schedule.steps.length}) ${showSchedulePreview ? '▲' : '▼'}`
                          : `👀 ดูตัวอย่างท่าในตาราง (${schedule.steps.length} ช่วง) ${showSchedulePreview ? '▲' : '▼'}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('workout');
                          setMobileSection('workout');
                        }}
                        className="min-h-[44px] flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25"
                      >
                        {isEn ? '▶ Enter Live 3D Workout' : '▶ เข้าสู่โหมดฝึกจริง 3D'}
                      </button>
                    </div>
                  </div>

                  {showSchedulePreview && (
                    <div
                      className="max-h-64 overflow-y-auto space-y-1.5 pr-1 pt-2 border-t border-zinc-800"
                      onMouseLeave={() => setHoveredPreviewMuscles(null)}
                    >
                      {schedule.steps.map((st, idx) => {
                        const chip = getStepChip(st.type);
                        const eqLabels = getStepEquipmentLabels(st, EQUIPMENT_CATALOG, lang);
                        const stLoc = getLocalizedStepText(st, lang);
                        return (
                          <div
                            key={`${st.stepNumber}-${idx}`}
                            onMouseEnter={() =>
                              setHoveredPreviewMuscles({
                                primary: st.primaryMuscle,
                                secondary: st.secondaryMuscles || [],
                                emg: st.emgActivation || {}
                              })
                            }
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/90 border border-zinc-800/80 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-mono text-[10px] text-zinc-500 w-5 shrink-0">{idx + 1}.</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  st.type === 'REST'
                                    ? 'bg-cyan-500/15 text-cyan-300'
                                    : st.type === 'WARMUP'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : st.type === 'COOLDOWN'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-orange-500/20 text-orange-300'
                                }`}
                              >
                                {chip.label}
                              </span>
                              <span className="font-bold text-zinc-100 line-clamp-1">{stLoc.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {eqLabels.length > 0 && (
                                <span className="hidden sm:inline text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                  {eqLabels.join(', ')}
                                </span>
                              )}
                              <span className="font-mono text-[11px] font-bold text-orange-300">{st.duration}s</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {/* LIVE WORKOUT TAB (Kept mounted via hidden class so timer & 3D state survive tab switches) */}
        <div className={activeTab === 'workout' ? 'block' : 'hidden'}>
          <WorkoutPlayer
            schedule={schedule}
            isFullBody={isFullBody}
            developerMode={userProfile.developerMode}
            streakDays={workoutStats.currentStreakDays || 0}
            onSwapStep={handleSwapStep}
            onActiveMuscleChange={setActiveExerciseMuscles}
            onWorkoutComplete={handleWorkoutComplete}
            onRecordRpe={handleRecordRpe}
            onSessionActiveChange={setHasActiveSession}
            isVisible={activeTab === 'workout'}
            theme={theme}
            lang={lang}
          />
        </div>

        {/* STATS, RECOVERY & 7-DAY CHALLENGE TAB */}
        {activeTab === 'stats' && (
          <div className="space-y-5">
            <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                    JEFIT Muscle Recovery & Consistency Streak
                  </span>
                  <h2 className="text-xl font-extrabold text-white mt-0.5">
                    {isEn
                      ? 'Training Stats, Streaks & 16-Muscle Recovery Status'
                      : 'สถิติการฝึกซ้อม ความต่อเนื่อง และระดับฟื้นตัว 16 มัดกล้ามเนื้อ'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleSmartRecoveryPick}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                >
                  {isEn ? '✨ Build Plan from Recovered (>=85%)' : '✨ จัดตารางจากมัดที่ฟื้นตัว (>=85%)'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-400">{isEn ? 'Total Sessions' : 'เซสชันทั้งหมด'}</p>
                  <p className="font-mono text-2xl font-extrabold text-white mt-1">{workoutStats.totalSessions || 0}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-400">{isEn ? 'Total Time & Burn' : 'เวลา & เผาผลาญรวม'}</p>
                  <p className="font-mono text-lg font-extrabold text-emerald-400 mt-1">
                    {workoutStats.totalMinutes || 0}m • {workoutStats.totalKcal || 0} kcal
                  </p>
                </div>
                <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl p-4">
                  <p className="text-xs text-zinc-400">{isEn ? 'Current Streak' : 'ฝึกต่อเนื่อง (Streak)'}</p>
                  <p className="font-mono text-2xl font-extrabold text-amber-400 mt-1">
                    🔥 {workoutStats.currentStreakDays || 0} {isEn ? 'days' : 'วัน'}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {isEn ? `Best ${workoutStats.bestStreakDays || 0} days` : `สถิติสูงสุด ${workoutStats.bestStreakDays || 0} วัน`}
                  </p>
                </div>
                <div className="bg-zinc-950 border border-cyan-500/30 rounded-2xl p-4">
                  <p className="text-xs text-zinc-400">{isEn ? 'Weekly Goal' : 'เป้าหมายสัปดาห์นี้'}</p>
                  <p className="font-mono text-2xl font-extrabold text-cyan-400 mt-1">
                    {workoutStats.weeklyCompletedDays || 0}/{userProfile.weeklyGoalDays} {isEn ? 'days' : 'วัน'}
                  </p>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${weeklyProgressPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {MUSCLE_GROUPS.map(m => {
                  const score = recoveryStats[m.id] ?? 100;
                  return (
                    <div key={m.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-white truncate">{getMuscleDisplayName(m, lang)}</span>
                        <span className={`font-mono ${score >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>{score}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${score}%`, backgroundColor: score >= 85 ? '#10b981' : '#f59e0b' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* US-502: Guided 7-Day Micro-Challenge */}
            <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Guided 7-Day Micro-Challenge
                </span>
                <h2 className="text-lg font-extrabold text-white mt-0.5">
                  {isEn
                    ? '7-Day Consistency Challenge for Health & Office Relief'
                    : 'ภารกิจต่อเนื่อง 7 วัน พิชิตสุขภาพดีและแก้ออฟฟิศซินโดรม'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {SEVEN_DAY_CHALLENGE.map(dayItem => {
                  const done = (workoutStats.completedChallengeDays || []).includes(dayItem.day);
                  return (
                    <div
                      key={dayItem.day}
                      className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-2 ${
                        done ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-extrabold">
                          <span className={done ? 'text-emerald-400' : 'text-orange-400'}>
                            DAY {dayItem.day} {done ? (isEn ? '✓ Done' : '✓ เสร็จแล้ว') : ''}
                          </span>
                          <span className="font-mono text-zinc-400">{dayItem.durationMinutes}m</span>
                        </div>
                        <p className="text-xs font-bold text-white mt-1">
                          {isEn ? dayItem.titleEn || dayItem.titleTh : dayItem.titleTh}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                          {isEn ? dayItem.subtitleEn || dayItem.subtitleTh : dayItem.subtitleTh}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => launchChallengeDay(dayItem)}
                        className="min-h-[36px] w-full py-1.5 rounded-xl bg-zinc-800 hover:bg-orange-500 text-xs font-bold text-white transition"
                      >
                        {done
                          ? isEn
                            ? '🔄 Repeat'
                            : '🔄 ฝึกซ้ำ'
                          : isEn
                          ? '▶ Start Mission'
                          : '▶ เริ่มภารกิจวันนี้'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 grid grid-cols-4 px-2 py-1.5">
        {[
          { id: '3d', tab: 'setup', icon: '🧬', label: isEn ? '3D Body' : '3D กายวิภาค' },
          { id: 'config', tab: 'setup', icon: '⚙️', label: isEn ? 'Setup' : 'จัดตาราง' },
          { id: 'workout', tab: 'workout', icon: '🎬', label: isEn ? '3D Coach' : 'ฝึกซ้อมสด' },
          { id: 'stats', tab: 'stats', icon: '📊', label: isEn ? 'Stats/7d' : 'สถิติ/7วัน' }
        ].map(nav => {
          const active = mobileSection === nav.id;
          return (
            <button
              key={nav.id}
              type="button"
              onClick={() => {
                setActiveTab(nav.tab);
                setMobileSection(nav.id);
              }}
              className={`min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition ${
                active ? 'text-orange-400 bg-orange-500/10' : 'text-zinc-400'
              }`}
            >
              <span className="text-lg">{nav.icon}</span>
              <span className="text-[10px] font-bold mt-0.5">{nav.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
