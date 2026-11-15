import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Body3DSelector from './Body3DSelector.jsx';
import WorkoutPlayer from './WorkoutPlayer.jsx';
import {
  MUSCLE_GROUPS,
  EQUIPMENT_CATALOG,
  TRAINING_MODALITIES,
  generateTimeBoundedSchedule,
  swapExerciseInSchedule,
  loadWorkoutStats,
  logCompletedWorkoutSession,
  getMuscleRecoveryPercent
} from './WorkoutEngine.js';

/**
 * ============================================================================
 * App.jsx (v2.0 — Play Store / Mobile-First Responsive & Full Studio Architecture)
 * เชื่อมโยง Medical 3D Muscle Selector (16 มัด), 11 Equipment Multi-Select,
 * HIIT / REHIT / Cardio / Yoga / 7-Minute Scientific Circuit,
 * JEFIT Recovery Dashboard และ Mobile Bottom Navigation Bar
 * ============================================================================
 */
export default function App() {
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
  const [activeTab, setActiveTab] = useState('setup'); // 'setup' | 'workout' | 'stats'
  const [mobileSection, setMobileSection] = useState('3d'); // '3d' | 'config' | 'workout' | 'stats'
  const [activeHighlightMuscle, setActiveHighlightMuscle] = useState(null);
  const [workoutStats, setWorkoutStats] = useState(() => loadWorkoutStats());

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
      lowImpactOnly: false
    })
  );

  useEffect(() => {
    setSchedule(
      generateTimeBoundedSchedule({
        selectedMuscles,
        isFullBody,
        selectedEquipment,
        modality,
        durationMinutes,
        fitnessLevel,
        lowImpactOnly
      })
    );
  }, [selectedMuscles, isFullBody, selectedEquipment, modality, durationMinutes, fitnessLevel, lowImpactOnly]);

  const handleToggleMuscle = useCallback(muscleId => {
    setIsFullBody(false);
    setSelectedMuscles(prev => {
      if (prev.includes(muscleId)) {
        return prev.length > 1 ? prev.filter(id => id !== muscleId) : prev;
      }
      return [...prev, muscleId];
    });
  }, []);

  const handleToggleFullBody = useCallback(() => {
    setIsFullBody(prev => {
      const next = !prev;
      if (next) setSelectedMuscles(MUSCLE_GROUPS.map(m => m.id));
      return next;
    });
  }, []);

  const handleToggleEquipment = useCallback(eqId => {
    setSelectedEquipment(prev => {
      if (prev.includes(eqId)) {
        return prev.length > 1 ? prev.filter(id => id !== eqId) : prev;
      }
      return [...prev, eqId];
    });
  }, []);

  const handleSwapStep = useCallback(stepIndex => {
    setSchedule(prev => swapExerciseInSchedule(prev, stepIndex));
  }, []);

  const handleWorkoutComplete = useCallback(completedSched => {
    const updated = logCompletedWorkoutSession(completedSched);
    setWorkoutStats(updated);
  }, []);

  const launch7MinQuickPreset = () => {
    setIsFullBody(true);
    setSelectedMuscles(MUSCLE_GROUPS.map(m => m.id));
    setModality('7MIN');
    setDurationMinutes(7);
    setActiveTab('workout');
    setMobileSection('workout');
  };

  const launchYogaPreset = () => {
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
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-16 lg:pb-0">
      {/* Top Sticky App Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 flex items-center justify-center font-extrabold text-white shadow-lg shadow-orange-500/25">
              3D
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white">
                KINETIC <span className="text-orange-500">MED-FIT 3D</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                16-Muscle Medical Anatomy • Looping Motion Video • HIIT / REHIT / Cardio / Yoga
              </p>
            </div>
          </div>

          {/* Desktop Tab Switcher + Quick Presets */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={launch7MinQuickPreset}
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition"
            >
              ⚡ 7-Minute Quick
            </button>
            <button
              type="button"
              onClick={launchYogaPreset}
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition"
            >
              🧘 Yoga Flow 15m
            </button>

            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
              {[
                { id: 'setup', label: '1. โมเดล 3D & ออกแบบตาราง' },
                { id: 'workout', label: `2. ฝึกซ้อมสด (${schedule.durationMinutes}m)` },
                { id: 'stats', label: '3. สถิติ & ฟื้นฟู (JEFIT)' }
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
        {activeTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Medical 3D Selector */}
            <div className={`lg:col-span-5 ${mobileSection === '3d' ? 'block' : 'hidden lg:block'}`}>
              <Body3DSelector
                selectedMuscles={selectedMuscles}
                isFullBody={isFullBody}
                onToggleMuscle={handleToggleMuscle}
                onToggleFullBody={handleToggleFullBody}
                activeHighlightMuscle={activeHighlightMuscle}
                recoveryStats={recoveryStats}
              />
            </div>

            {/* Right: Equipment, Modality, Low-Impact Filter & Summary */}
            <div className={`lg:col-span-7 flex flex-col gap-5 ${mobileSection === 'config' ? 'flex' : 'hidden lg:flex'}`}>
              {/* Quick Launch Cards (7-Min + Yoga Studio) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={launch7MinQuickPreset}
                  className="p-3.5 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-zinc-900 text-left hover:border-amber-400 transition"
                >
                  <span className="text-xs font-extrabold text-amber-400">⚡ 7-MINUTE WORKOUT PRESET</span>
                  <p className="text-sm font-bold text-white mt-0.5">ฝึกด่วน 7 นาทีตามหลัก ACSM</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">สลับกล้ามเนื้อบน-ล่าง-แกนกลางต่อเนื่อง</p>
                </button>
                <button
                  type="button"
                  onClick={launchYogaPreset}
                  className="p-3.5 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-zinc-900 text-left hover:border-emerald-400 transition"
                >
                  <span className="text-xs font-extrabold text-emerald-400">🧘 YOGA STUDIO FLOW PRESET</span>
                  <p className="text-sm font-bold text-white mt-0.5">โยคะคลายพังผืด + ลมหายใจ 15 นาที</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">พร้อม Pranayama Breath Pacer นำหายใจ</p>
                </button>
              </div>

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
                        className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2 ${
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
                      Modality & Sworkit Precision Timing
                    </span>
                    <h2 className="text-base font-extrabold text-white">รูปแบบการฝึก & การป้องกันข้อต่อ</h2>
                  </div>

                  {/* Sworkit Low-Impact Joint Friendly Toggle */}
                  <button
                    type="button"
                    onClick={() => setLowImpactOnly(v => !v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
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
                        onClick={() => {
                          setModality(mod.id);
                          if (mod.id === '7MIN') setDurationMinutes(7);
                        }}
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
                          onClick={() => setFitnessLevel(lv.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
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
                          onClick={() => setDurationMinutes(mins)}
                          className={`py-2 rounded-xl text-xs font-mono font-extrabold border transition ${
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Exact Time-Bounded Schedule ({schedule.totalSeconds} วินาทีพอดี)
                    </span>
                    <h3 className="text-base font-extrabold text-white">
                      ตาราง {schedule.durationMinutes} นาที • ~{schedule.summary.estimatedKcal} kcal
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('workout');
                      setMobileSection('workout');
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25"
                  >
                    ▶ เข้าสู่โหมดวิดีโอฝึกจริง
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'workout' && (
          <WorkoutPlayer
            schedule={schedule}
            onSwapStep={handleSwapStep}
            onActiveMuscleChange={setActiveHighlightMuscle}
            onWorkoutComplete={handleWorkoutComplete}
          />
        )}

        {activeTab === 'stats' && (
          <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                JEFIT Muscle Recovery & Daily Burn Analytics
              </span>
              <h2 className="text-xl font-extrabold text-white mt-0.5">
                สถิติการฝึกซ้อมและระดับการฟื้นตัวของกล้ามเนื้อทั้ง 16 มัด
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs text-zinc-400">จำนวนเซสชันทั้งหมด</p>
                <p className="font-mono text-2xl font-extrabold text-white mt-1">{workoutStats.totalSessions || 0}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs text-zinc-400">เวลารวมสะสม</p>
                <p className="font-mono text-2xl font-extrabold text-orange-400 mt-1">{workoutStats.totalMinutes || 0} นาที</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs text-zinc-400">พลังงานเผาผลาญสะสม</p>
                <p className="font-mono text-2xl font-extrabold text-emerald-400 mt-1">{workoutStats.totalKcal || 0} kcal</p>
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
        )}
      </main>

      {/* Play Store / Mobile-First Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 grid grid-cols-4 px-2 py-1.5">
        {[
          { id: '3d', tab: 'setup', icon: '🧬', label: '3D กายวิภาค' },
          { id: 'config', tab: 'setup', icon: '⚙️', label: 'จัดตาราง' },
          { id: 'workout', tab: 'workout', icon: '🎬', label: 'ฝึกซ้อมสด' },
          { id: 'stats', tab: 'stats', icon: '📊', label: 'สถิติ/ฟื้นฟู' }
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
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
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
