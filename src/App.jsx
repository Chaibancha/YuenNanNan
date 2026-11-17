import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  swapExerciseInSchedule,
  loadWorkoutStats,
  loadUserProfile,
  saveUserProfile,
  logCompletedWorkoutSession,
  recordSessionRpe,
  getMuscleRecoveryPercent,
  pickSmartRecoveredMuscles
} from './WorkoutEngine.js';

/**
 * ============================================================================
 * App.jsx (v2.1 — Unified React/Vite Studio Architecture)
 * - Goal-Based Quick Presets (FEAT-01) & 7-Day Challenge (FEAT-06)
 * - Quick Body Profile & Joint Safety Filter (FEAT-02)
 * - Active Session Confirmation Guard (CR-005)
 * - Smart Recovery Auto-Pick >=85% (FEAT-05) & Daily Streak / Weekly Goal (FEAT-06)
 * ============================================================================
 */
export default function App() {
  const [userProfile, setUserProfile] = useState(() => loadUserProfile());
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showGoalPresets, setShowGoalPresets] = useState(true);

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
  const [activeHighlightMuscle, setActiveHighlightMuscle] = useState(null);
  const [workoutStats, setWorkoutStats] = useState(() => loadWorkoutStats());

  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState(null);
  const [appToast, setAppToast] = useState(null);

  const showToastMessage = useCallback(msg => {
    setAppToast(msg);
    setTimeout(() => setAppToast(null), 2800);
  }, []);

  const recoveryStats = useMemo(() => {
    const map = {};
    MUSCLE_GROUPS.forEach(m => {
      map[m.id] = getMuscleRecoveryPercent(workoutStats, m.id);
    });
    return map;
  }, [workoutStats]);

  const [schedule, setSchedule] = useState(() =>
    generateTimeBoundedSchedule({
      selectedMuscles: ['chest_upper_Mid', 'lats_teres', 'quads', 'abs_rectus'],
      isFullBody: false,
      selectedEquipment: ['bodyweight', 'dumbbell', 'yoga_mat'],
      modality: 'HIIT',
      durationMinutes: 20,
      fitnessLevel: 'intermediate',
      lowImpactOnly: false,
      weightKg: loadUserProfile().weightKg,
      injuredJoints: loadUserProfile().injuredJoints
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

  const rebuildSchedule = useCallback(
    overrides => {
      const next = {
        selectedMuscles,
        isFullBody,
        selectedEquipment,
        modality,
        durationMinutes,
        fitnessLevel,
        lowImpactOnly,
        weightKg: userProfile.weightKg,
        injuredJoints: userProfile.injuredJoints,
        ...overrides
      };
      setSchedule(generateTimeBoundedSchedule(next));
    },
    [
      selectedMuscles,
      isFullBody,
      selectedEquipment,
      modality,
      durationMinutes,
      fitnessLevel,
      lowImpactOnly,
      userProfile.weightKg,
      userProfile.injuredJoints
    ]
  );

  useEffect(() => {
    rebuildSchedule({});
  }, [rebuildSchedule]);

  // CR-005 Active Workout Confirmation Guard
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

  // CR-009: If Full Body is active and user clicks 1 muscle, isolate ONLY that muscle
  const handleToggleMuscle = useCallback(
    muscleId => {
      if (isFullBody) {
        guardScheduleChange(`เปลี่ยนเป้าหมายเป็นเฉพาะ ${muscleId}`, () => {
          setActiveChallengeDay(null);
          setIsFullBody(false);
          setSelectedMuscles([muscleId]);
        });
        return;
      }
      if (selectedMuscles.includes(muscleId) && selectedMuscles.length <= 1) {
        showToastMessage('ต้องเลือกอย่างน้อย 1 มัดกล้ามเนื้อสำหรับจัดตาราง');
        return;
      }
      guardScheduleChange('ปรับเปลี่ยนมัดกล้ามเนื้อเป้าหมาย', () => {
        setActiveChallengeDay(null);
        setSelectedMuscles(prev =>
          prev.includes(muscleId) ? prev.filter(id => id !== muscleId) : [...prev, muscleId]
        );
      });
    },
    [isFullBody, selectedMuscles, guardScheduleChange, showToastMessage]
  );

  // Body-region pick from 3D Ecorché: atomically replace the muscle selection
  const handleSetMuscles = useCallback(
    nextIds => {
      const valid = MUSCLE_GROUPS.map(m => m.id).filter(id => nextIds.includes(id));
      if (valid.length === 0) {
        showToastMessage('ต้องเลือกอย่างน้อย 1 มัดกล้ามเนื้อสำหรับจัดตาราง');
        return;
      }
      guardScheduleChange('ปรับเปลี่ยนส่วนของร่างกายเป้าหมาย', () => {
        setActiveChallengeDay(null);
        setIsFullBody(valid.length === MUSCLE_GROUPS.length);
        setSelectedMuscles(valid);
      });
    },
    [guardScheduleChange, showToastMessage]
  );

  const handleToggleFullBody = useCallback(() => {
    guardScheduleChange('สลับโหมดทั่วร่างกาย (Full Body)', () => {
      setActiveChallengeDay(null);
      setIsFullBody(prev => {
        const next = !prev;
        if (next) setSelectedMuscles(MUSCLE_GROUPS.map(m => m.id));
        return next;
      });
    });
  }, [guardScheduleChange]);

  const handleSmartRecoveryPick = useCallback(() => {
    const readyMuscles = pickSmartRecoveredMuscles(workoutStats, 85);
    guardScheduleChange('จัดตารางจากมัดกล้ามเนื้อที่ฟื้นตัวพร้อมฝึก (>=85%)', () => {
      setActiveChallengeDay(null);
      setIsFullBody(false);
      setSelectedMuscles(readyMuscles);
      showToastMessage(`✨ เลือก ${readyMuscles.length} มัดกล้ามเนื้อที่ฟื้นตัวพร้อมฝึกแล้ว!`);
    });
  }, [workoutStats, guardScheduleChange, showToastMessage]);

  const handleToggleEquipment = useCallback(
    eqId => {
      if (selectedEquipment.includes(eqId) && selectedEquipment.length <= 1) {
        showToastMessage('ต้องเลือกอย่างน้อย 1 อุปกรณ์ (เช่น Bodyweight)');
        return;
      }
      guardScheduleChange('ปรับเปลี่ยนอุปกรณ์ฝึก', () => {
        setSelectedEquipment(prev =>
          prev.includes(eqId) ? prev.filter(id => id !== eqId) : [...prev, eqId]
        );
      });
    },
    [selectedEquipment, guardScheduleChange, showToastMessage]
  );

  const updateProfileField = patch => {
    const next = saveUserProfile({ ...userProfile, ...patch });
    setUserProfile(next);
  };

  const toggleInjuredJoint = jointId => {
    const exists = userProfile.injuredJoints.includes(jointId);
    const nextJoints = exists
      ? userProfile.injuredJoints.filter(j => j !== jointId)
      : [...userProfile.injuredJoints, jointId];
    guardScheduleChange('อัปเดตตัวกรองความปลอดภัยข้อต่อ', () => {
      updateProfileField({ injuredJoints: nextJoints });
    });
  };

  const applyGoalPreset = preset => {
    guardScheduleChange(`เริ่มโปรแกรม: ${preset.titleTh}`, () => {
      setActiveChallengeDay(null);
      setIsFullBody(preset.isFullBody);
      setSelectedMuscles(preset.selectedMuscles);
      setModality(preset.modality);
      setDurationMinutes(preset.durationMinutes);
      setLowImpactOnly(preset.lowImpactOnly);
      if (preset.modality === 'YOGA' && !selectedEquipment.includes('yoga_mat')) {
        setSelectedEquipment(prev => [...prev, 'yoga_mat']);
      }
      updateProfileField({ preferredGoal: preset.id });
      setActiveTab('workout');
      setMobileSection('workout');
    });
  };

  const launchChallengeDay = dayObj => {
    guardScheduleChange(`เริ่มภารกิจ ${dayObj.titleTh}`, () => {
      setActiveChallengeDay(dayObj.day);
      setIsFullBody(dayObj.isFullBody);
      setSelectedMuscles(dayObj.selectedMuscles);
      setModality(dayObj.modality);
      setDurationMinutes(dayObj.durationMinutes);
      setLowImpactOnly(dayObj.lowImpactOnly);
      if (dayObj.modality === 'YOGA' && !selectedEquipment.includes('yoga_mat')) {
        setSelectedEquipment(prev => [...prev, 'yoga_mat']);
      }
      setActiveTab('workout');
      setMobileSection('workout');
    });
  };

  const launch7MinQuickPreset = () => {
    guardScheduleChange('เริ่มโปรแกรมด่วน 7 นาที (ACSM)', () => {
      setActiveChallengeDay(null);
      setIsFullBody(true);
      setSelectedMuscles(MUSCLE_GROUPS.map(m => m.id));
      setModality('7MIN');
      setDurationMinutes(7);
      setActiveTab('workout');
      setMobileSection('workout');
    });
  };

  const launchYogaPreset = () => {
    guardScheduleChange('เริ่มโปรแกรม Yoga Flow 15 นาที', () => {
      setActiveChallengeDay(null);
      setIsFullBody(true);
      setSelectedMuscles(MUSCLE_GROUPS.map(m => m.id));
      if (!selectedEquipment.includes('yoga_mat')) {
        setSelectedEquipment(prev => [...prev, 'yoga_mat']);
      }
      setModality('YOGA');
      setLowImpactOnly(true);
      setDurationMinutes(15);
      setActiveTab('workout');
      setMobileSection('workout');
    });
  };

  const handleSwapStep = useCallback(stepIndex => {
    setSchedule(prev => swapExerciseInSchedule(prev, stepIndex));
  }, []);

  const handleWorkoutComplete = useCallback(
    (completedSched, details = {}) => {
      const updated = logCompletedWorkoutSession(completedSched, {
        completedSteps: details.completedSteps,
        completedChallengeDay: activeChallengeDay
      });
      setWorkoutStats(updated);
      setActiveChallengeDay(null);
    },
    [activeChallengeDay]
  );

  const handleRecordRpe = useCallback(
    rpeId => {
      const updated = recordSessionRpe(rpeId, schedule.modality, schedule.durationMinutes);
      setWorkoutStats(updated);
    },
    [schedule.modality, schedule.durationMinutes]
  );

  const weeklyProgressPct = Math.min(
    100,
    Math.round(((workoutStats.weeklyCompletedDays || 0) / Math.max(1, userProfile.weeklyGoalDays || 4)) * 100)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-20 lg:pb-6">
      {/* App-level Toast (minimum selection guard, smart pick, etc.) */}
      {appToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[75] w-[92%] max-w-md pointer-events-none">
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
                ⚠️ ยืนยันการเปลี่ยนตารางฝึก
              </span>
              <h3 className="text-lg font-extrabold text-white">คุณกำลังฝึกซ้อมค้างอยู่</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                การเปลี่ยนการตั้งค่า ({pendingConfirmAction.summaryText}) จะล้างเวลาและเริ่มต้นตารางใหม่ ต้องการดำเนินการต่อหรือไม่?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPendingConfirmAction(null)}
                className="min-h-[44px] py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200"
              >
                ยกเลิก (ฝึกต่อ)
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
                ยืนยันสร้างตารางใหม่
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
                KINETIC <span className="text-orange-500">MED-FIT 3D</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                BioDigital × MSD 3D Anatomy • Offline PWA • Joint-Safe Physiology
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Daily Streak & Quick 7-Min Streak Keeper (FEAT-06) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('stats');
                setMobileSection('stats');
              }}
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-zinc-900 border border-amber-500/40 text-amber-300 flex items-center gap-1"
            >
              <span>🔥</span>
              <span className="font-mono">{workoutStats.currentStreakDays || 0} วัน</span>
              <span className="hidden sm:inline text-[10px] text-zinc-400">
                ({workoutStats.weeklyCompletedDays || 0}/{userProfile.weeklyGoalDays} สัปดาห์นี้)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowProfileDrawer(v => !v)}
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-cyan-500/60"
            >
              👤 {userProfile.weightKg} kg
              {userProfile.injuredJoints.length > 0 && (
                <span className="ml-1 text-rose-400">• ระวัง {userProfile.injuredJoints.length} จุด</span>
              )}
            </button>

            <button
              type="button"
              onClick={launch7MinQuickPreset}
              className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition"
            >
              ⚡ 7 นาที
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
                { id: 'setup', label: '1. โมเดล 3D & ออกแบบตาราง' },
                { id: 'workout', label: `2. ฝึกซ้อมสด (${schedule.durationMinutes}m)` },
                { id: 'stats', label: '3. สถิติ & ภารกิจ 7 วัน' }
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
                <h2 className="text-base font-extrabold text-white">ข้อมูลร่างกายและตัวกรองป้องกันข้อต่อบาดเจ็บ</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileDrawer(false)}
                className="min-h-[36px] px-3 py-1 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs space-y-1">
                <span className="text-zinc-400 font-bold">น้ำหนักตัว (kg)</span>
                <input
                  type="number"
                  min={35}
                  max={200}
                  value={userProfile.weightKg}
                  onChange={e => updateProfileField({ weightKg: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white"
                />
              </label>
              <label className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs space-y-1">
                <span className="text-zinc-400 font-bold">ส่วนสูง (cm)</span>
                <input
                  type="number"
                  min={120}
                  max={230}
                  value={userProfile.heightCm}
                  onChange={e => updateProfileField({ heightCm: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white"
                />
              </label>
              <label className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs space-y-1">
                <span className="text-zinc-400 font-bold">อายุ (ปี)</span>
                <input
                  type="number"
                  min={12}
                  max={100}
                  value={userProfile.age}
                  onChange={e => updateProfileField({ age: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white"
                />
              </label>
              <label className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs space-y-1">
                <span className="text-zinc-400 font-bold">เป้าหมายสัปดาห์ (วัน)</span>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={userProfile.weeklyGoalDays}
                  onChange={e => updateProfileField({ weeklyGoalDays: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white"
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-300">
                ข้อต่อที่บาดเจ็บหรือต้องการหลีกเลี่ยง (ระบบจะกรองท่าที่กระทบข้อต่อนั้นออกอัตโนมัติ):
              </p>
              <div className="flex flex-wrap gap-2">
                {JOINT_STRESS_OPTIONS.map(joint => {
                  const selected = userProfile.injuredJoints.includes(joint.id);
                  return (
                    <button
                      key={joint.id}
                      type="button"
                      onClick={() => toggleInjuredJoint(joint.id)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selected
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {joint.icon} {joint.labelTh} {selected ? '✓ งดท่าหนัก' : ''}
                    </button>
                  );
                })}
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
              </div>
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
                    เริ่มต้นฝึกด่วนตามเป้าหมายชีวิตจริง (ไม่ต้องจำศัพท์กายวิภาค)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoalPresets(v => !v)}
                  className="min-h-[34px] px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  {showGoalPresets ? 'ซ่อนแถบด่วน ▲' : 'แสดงแถบด่วน ▼'}
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
                      <span className="text-xs sm:text-sm font-extrabold text-white">{preset.titleTh}</span>
                      <p className="text-[11px] text-zinc-400 leading-snug">{preset.subtitleTh}</p>
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
                  activeHighlightMuscle={activeHighlightMuscle}
                  recoveryStats={recoveryStats}
                />
              </div>

              {/* Right: Equipment, Modality, Low-Impact Filter & Summary */}
              <div className={`lg:col-span-7 flex flex-col gap-5 ${mobileSection === 'config' ? 'flex' : 'hidden lg:flex'}`}>
                {/* Multi-Select Equipment Filter (11 items) */}
                <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                        Equipment Filter • 11 รายการ
                      </span>
                      <h2 className="text-base font-extrabold text-white">เลือกอุปกรณ์ที่มีอยู่จริง</h2>
                    </div>
                    <span className="text-xs font-semibold text-zinc-400">เลือกแล้ว {selectedEquipment.length}</span>
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
                          <span className="text-xs font-bold leading-snug">{eq.nameTh}</span>
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
                      <h2 className="text-base font-extrabold text-white">รูปแบบการฝึก & การป้องกันข้อต่อ</h2>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        guardScheduleChange('สลับโหมด Low-Impact ถนอมข้อต่อ', () => setLowImpactOnly(v => !v))
                      }
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        lowImpactOnly
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {lowImpactOnly ? '🛡️ Low-Impact: เปิด (ถนอมข้อต่อ)' : '🦵 Low-Impact: ปิด'}
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
                            guardScheduleChange(`เปลี่ยนรูปแบบเป็น ${mod.id}`, () => {
                              setModality(mod.id);
                              if (mod.id === '7MIN') setDurationMinutes(7);
                            })
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
                                {proto.ratioLabel}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-zinc-300 mt-1">{mod.nameTh}</p>
                            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{mod.description}</p>
                          </div>
                          <p className="text-[10px] font-bold text-cyan-400 mt-2">{mod.hrZone}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Level & Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1.5">ระดับความฟิต:</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'beginner', label: 'ผู้เริ่มต้น' },
                          { id: 'intermediate', label: 'ปานกลาง' },
                          { id: 'advanced', label: 'ขั้นสูง' }
                        ].map(lv => (
                          <button
                            key={lv.id}
                            type="button"
                            onClick={() => guardScheduleChange(`ปรับระดับความฟิตเป็น ${lv.label}`, () => setFitnessLevel(lv.id))}
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
                      <label className="block text-xs font-bold text-zinc-400 mb-1.5">เวลาเป้าหมาย (นาที):</label>
                      <div className="grid grid-cols-6 gap-1">
                        {[7, 10, 15, 20, 30, 45].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => guardScheduleChange(`เปลี่ยนเวลาเป้าหมายเป็น ${mins} นาที`, () => setDurationMinutes(mins))}
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

                {/* Schedule Summary Launch */}
                <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-3">
                  {schedule.jointFilterFallbackUsed && (
                    <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                      ⚠️ ตัวกรองข้อต่อที่บาดเจ็บเหลือท่าน้อยมาก ระบบจึงแสดงท่าทางเลือกที่ปลอดภัยใกล้เคียงให้แทน
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        Exact Time-Bounded Schedule ({schedule.totalSeconds} วินาที • น้ำหนักอ้างอิง {userProfile.weightKg} kg)
                      </span>
                      <h3 className="text-base font-extrabold text-white">
                        ตาราง {schedule.durationMinutes} นาที • ~{schedule.summary.estimatedKcal} kcal ({schedule.summary.burnRatePerMin} kcal/นาที)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('workout');
                        setMobileSection('workout');
                      }}
                      className="min-h-[44px] w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25"
                    >
                      ▶ เข้าสู่โหมดวิดีโอฝึกจริง
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* LIVE WORKOUT TAB (Kept mounted via hidden class so timer & stream survive tab switches cleanly!) */}
        <div className={activeTab === 'workout' ? 'block' : 'hidden'}>
          <WorkoutPlayer
            schedule={schedule}
            developerMode={userProfile.developerMode}
            streakDays={workoutStats.currentStreakDays || 0}
            onSwapStep={handleSwapStep}
            onActiveMuscleChange={setActiveHighlightMuscle}
            onWorkoutComplete={handleWorkoutComplete}
            onRecordRpe={handleRecordRpe}
            onSessionActiveChange={setHasActiveSession}
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
                    สถิติการฝึกซ้อม ความต่อเนื่อง และระดับฟื้นตัว 16 มัดกล้ามเนื้อ
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleSmartRecoveryPick}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                >
                  ✨ จัดตารางจากมัดที่ฟื้นตัว (&gt;=85%)
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-400">เซสชันทั้งหมด</p>
                  <p className="font-mono text-2xl font-extrabold text-white mt-1">{workoutStats.totalSessions || 0}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-400">เวลา & เผาผลาญรวม</p>
                  <p className="font-mono text-lg font-extrabold text-emerald-400 mt-1">
                    {workoutStats.totalMinutes || 0}m • {workoutStats.totalKcal || 0} kcal
                  </p>
                </div>
                <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl p-4">
                  <p className="text-xs text-zinc-400">ฝึกต่อเนื่อง (Streak)</p>
                  <p className="font-mono text-2xl font-extrabold text-amber-400 mt-1">
                    🔥 {workoutStats.currentStreakDays || 0} วัน
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">สถิติสูงสุด {workoutStats.bestStreakDays || 0} วัน</p>
                </div>
                <div className="bg-zinc-950 border border-cyan-500/30 rounded-2xl p-4">
                  <p className="text-xs text-zinc-400">เป้าหมายสัปดาห์นี้</p>
                  <p className="font-mono text-2xl font-extrabold text-cyan-400 mt-1">
                    {workoutStats.weeklyCompletedDays || 0}/{userProfile.weeklyGoalDays} วัน
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
                        <span className="text-white truncate">{m.nameTh.split(' (')[0]}</span>
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
                  ภารกิจต่อเนื่อง 7 วัน พิชิตสุขภาพดีและแก้ออฟฟิศซินโดรม
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
                            DAY {dayItem.day} {done ? '✓ เสร็จแล้ว' : ''}
                          </span>
                          <span className="font-mono text-zinc-400">{dayItem.durationMinutes}m</span>
                        </div>
                        <p className="text-xs font-bold text-white mt-1">{dayItem.titleTh}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{dayItem.subtitleTh}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => launchChallengeDay(dayItem)}
                        className="min-h-[36px] w-full py-1.5 rounded-xl bg-zinc-800 hover:bg-orange-500 text-xs font-bold text-white transition"
                      >
                        {done ? '🔄 ฝึกซ้ำ' : '▶ เริ่มภารกิจวันนี้'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Play Store / Mobile-First Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 grid grid-cols-4 px-2 py-1.5">
        {[
          { id: '3d', tab: 'setup', icon: '🧬', label: '3D กายวิภาค' },
          { id: 'config', tab: 'setup', icon: '⚙️', label: 'จัดตาราง' },
          { id: 'workout', tab: 'workout', icon: '🎬', label: 'ฝึกซ้อมสด' },
          { id: 'stats', tab: 'stats', icon: '📊', label: 'สถิติ/7วัน' }
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
