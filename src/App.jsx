import React, { useState, useEffect, useCallback } from 'react';
import Body3DSelector from './Body3DSelector';
import WorkoutPlayer from './WorkoutPlayer';
import {
  MUSCLE_GROUPS,
  EQUIPMENT_CATALOG,
  TRAINING_MODALITIES,
  generateTimeBoundedSchedule,
  swapExerciseInSchedule
} from './WorkoutEngine';

/**
 * ============================================================================
 * App.jsx
 * คอมโพเนนต์หลักที่เชื่อมโยง 3D Muscle Selector, Multi-Select Equipment Filter,
 * Training Modality Engine (HIIT / REHIT / Cardio), Time-Bounded Schedule Generator
 * และหน้าจอ Live Workout Player เข้าด้วยกันอย่างสมบูรณ์
 * ============================================================================
 */
export default function App() {
  const [selectedMuscles, setSelectedMuscles] = useState(['chest', 'back', 'quads', 'core']);
  const [isFullBody, setIsFullBody] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(['bodyweight', 'dumbbell', 'bench']);
  const [modality, setModality] = useState('HIIT');
  const [fitnessLevel, setFitnessLevel] = useState('intermediate');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [activeTab, setActiveTab] = useState('setup'); // 'setup' | 'workout'
  const [activeHighlightMuscle, setActiveHighlightMuscle] = useState(null);

  const [schedule, setSchedule] = useState(() =>
    generateTimeBoundedSchedule({
      selectedMuscles: ['chest', 'back', 'quads', 'core'],
      isFullBody: false,
      selectedEquipment: ['bodyweight', 'dumbbell', 'bench'],
      modality: 'HIIT',
      durationMinutes: 20,
      fitnessLevel: 'intermediate'
    })
  );

  // อัปเดตตารางฝึกอัตโนมัติเมื่อผู้ใช้เปลี่ยนเงื่อนไข
  useEffect(() => {
    const nextSchedule = generateTimeBoundedSchedule({
      selectedMuscles,
      isFullBody,
      selectedEquipment,
      modality,
      durationMinutes,
      fitnessLevel
    });
    setSchedule(nextSchedule);
  }, [selectedMuscles, isFullBody, selectedEquipment, modality, durationMinutes, fitnessLevel]);

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
      if (next) {
        setSelectedMuscles(MUSCLE_GROUPS.map(m => m.id));
      }
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-extrabold text-white shadow-lg shadow-orange-500/20">
              3D
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                KINETIC <span className="text-orange-500">3D STUDIO</span>
              </h1>
              <p className="text-xs text-zinc-400">
                Interactive 3D Muscle Selector • HIIT / REHIT / Cardio Science Engine
              </p>
            </div>
          </div>

          {/* ปุ่มสลับมุมมอง Setup vs Live Workout Player */}
          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('setup')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                activeTab === 'setup'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              1. ออกแบบตาราง & โมเดล 3D
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('workout')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                activeTab === 'workout'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              2. เริ่มฝึกจริง & จับเวลา ({schedule.durationMinutes} นาที)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-6">
        {activeTab === 'setup' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ซ้าย: โมเดลร่างกาย 3 มิติ (5 คอลัมน์) */}
            <div className="lg:col-span-5">
              <Body3DSelector
                selectedMuscles={selectedMuscles}
                isFullBody={isFullBody}
                onToggleMuscle={handleToggleMuscle}
                onToggleFullBody={handleToggleFullBody}
                activeHighlightMuscle={activeHighlightMuscle}
              />
            </div>

            {/* ขวา: แผงตั้งค่าอุปกรณ์ โหมดการฝึก เวลาเป้าหมาย และตัวอย่างตารางฝึก (7 คอลัมน์) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* 1. Multi-Select Equipment Filter */}
              <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                      Step 2 • Multi-Select Equipment Filter
                    </span>
                    <h2 className="text-base font-extrabold text-white">
                      เลือกอุปกรณ์ที่มีอยู่จริง (เลือกได้หลายรายการ)
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-zinc-400">
                    เลือกแล้ว {selectedEquipment.length} รายการ
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
                        className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2.5 ${
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

              {/* 2. Training Modality Engine (HIIT / REHIT / Cardio) & Fitness Level */}
              <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                    Step 3 • Exercise Physiology Modality & Time
                  </span>
                  <h2 className="text-base font-extrabold text-white">
                    เลือกรูปแบบการฝึก ระดับความฟิต และเวลาเป้าหมาย
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {Object.values(TRAINING_MODALITIES).map(mod => {
                    const active = modality === mod.id;
                    const proto = mod.protocolsByLevel[fitnessLevel];
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setModality(mod.id)}
                        className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                          active
                            ? 'bg-orange-500/15 border-orange-500 text-white ring-1 ring-orange-500'
                            : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-white">{mod.id}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-orange-300">
                              {proto.ratioLabel}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-zinc-300 mt-1">{mod.nameTh}</p>
                          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{mod.description}</p>
                        </div>
                        <p className="text-[10px] font-bold text-cyan-400 mt-2">{mod.hrZone}</p>
                      </button>
                    );
                  })}
                </div>

                {/* เลือกระดับความฟิต และ กรอบเวลา (10, 15, 20, 30, 45 นาที) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                      ระดับความฟิตของผู้ฝึก (Fitness Level):
                    </label>
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
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition ${
                            fitnessLevel === lv.id
                              ? 'bg-orange-500 text-white border-orange-400'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {lv.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                      เวลาเป้าหมายรวม (Time-Bounded Duration):
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[10, 15, 20, 30, 45].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDurationMinutes(mins)}
                          className={`py-2 rounded-xl text-xs font-mono font-extrabold border transition ${
                            durationMinutes === mins
                              ? 'bg-orange-500 text-white border-orange-400'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. สรุปตารางฝึกที่คำนวณได้พอดีเวลา (Schedule Summary & Launch Button) */}
              <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Time-Bounded Schedule Ready ({schedule.totalSeconds} วินาทีพอดี)
                    </span>
                    <h3 className="text-base font-extrabold text-white">
                      สรุปโครงสร้างตารางฝึก {schedule.durationMinutes} นาที ({schedule.modality})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('workout')}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition"
                  >
                    ▶ เข้าสู่โหมดจับเวลาฝึกจริง
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5">
                    <span className="text-[11px] text-zinc-400">วอร์มอัพ (Warm-up)</span>
                    <p className="font-mono text-sm font-extrabold text-amber-400 mt-0.5">
                      {schedule.summary.warmupSec} วินาที
                    </p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5">
                    <span className="text-[11px] text-zinc-400">ช่วงออกแรงฝึก (Work/Sprint)</span>
                    <p className="font-mono text-sm font-extrabold text-orange-400 mt-0.5">
                      {schedule.summary.workSec} วินาที ({schedule.summary.workIntervals} รอบ)
                    </p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5">
                    <span className="text-[11px] text-zinc-400">พัก/ฟื้นตัว (Rest/Recovery)</span>
                    <p className="font-mono text-sm font-extrabold text-cyan-400 mt-0.5">
                      {schedule.summary.restSec} วินาที
                    </p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5">
                    <span className="text-[11px] text-zinc-400">คูลดาวน์ (Cool-down)</span>
                    <p className="font-mono text-sm font-extrabold text-purple-400 mt-0.5">
                      {schedule.summary.cooldownSec} วินาที
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <WorkoutPlayer
            schedule={schedule}
            onSwapStep={handleSwapStep}
            onActiveMuscleChange={setActiveHighlightMuscle}
          />
        )}
      </main>
    </div>
  );
}
