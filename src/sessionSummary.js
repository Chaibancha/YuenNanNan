/**
 * sessionSummary.js — pure helpers (no JSX / npm imports) for the post-workout summary.
 *
 * Definition of a "completed" step (DEF-05):
 *   a step counts as completed when the user spent at least COMPLETION_THRESHOLD (50%)
 *   of its duration in it (either by letting the timer run through it naturally, or by
 *   staying on it for >= 50% before advancing). Steps the user skipped over (⏭ / timeline tap)
 *   with < 50% elapsed are NOT counted.
 *
 * `elapsedByStep` is a plain object / array: stepIndex -> seconds actually spent in that step
 * (the maximum reached across visits, capped to the step duration).
 */

export const COMPLETION_THRESHOLD = 0.5;

// Same MET weighting that WorkoutEngine.calculateScheduleMetrics uses (relative weights only).
const WORK_MET = { REHIT: 11.5, HIIT: 10.2, '7MIN': 9.8, CARDIO: 7.8, YOGA: 4.2 };

function isWorkType(type) {
  return type === 'WORK' || type === 'SPRINT';
}

function metForStep(step, modality) {
  if (isWorkType(step?.type)) return WORK_MET[modality] || 8.5;
  if (step?.type === 'REST') return modality === 'REHIT' ? 3.2 : 2.5;
  return 3.5; // WARMUP / COOLDOWN
}

function elapsedOf(elapsedByStep, idx, step) {
  const raw = Number(elapsedByStep?.[idx]) || 0;
  const dur = Number(step?.duration) || 0;
  return Math.max(0, Math.min(dur, raw));
}

/** Indexes of steps whose elapsed time reached >= 50% of their duration. */
export function getCompletedStepIndexes(steps = [], elapsedByStep = {}, threshold = COMPLETION_THRESHOLD) {
  const out = [];
  steps.forEach((step, idx) => {
    const dur = Number(step?.duration) || 0;
    if (dur <= 0) return;
    if (elapsedOf(elapsedByStep, idx, step) >= dur * threshold) out.push(idx);
  });
  return out;
}

/** Muscle ids trained = primary + secondary + emg-activated muscles of completed WORK/SPRINT steps. */
export function getTrainedMuscleIds(completedSteps = []) {
  const ordered = [];
  const push = id => {
    if (id && !ordered.includes(id)) ordered.push(id);
  };
  const work = completedSteps.filter(s => isWorkType(s?.type));
  work.forEach(s => push(s.primaryMuscle));
  work.forEach(s => (s.secondaryMuscles || []).forEach(push));
  work.forEach(s => Object.keys(s.emgActivation || {}).forEach(push));
  return ordered;
}

/**
 * Build the corrected summary.
 * @returns {{
 *  workCount:number, completedStepIndexes:number[], completedSteps:object[],
 *  actualSeconds:number, durationMinutes:number, estimatedKcal:number,
 *  trainedMuscleIds:string[], isFullSession:boolean, credited:boolean
 * }}
 */
export function computeSessionSummary({ steps = [], elapsedByStep = {}, modality, plannedMinutes = 0, plannedKcal = 0 }) {
  const completedStepIndexes = getCompletedStepIndexes(steps, elapsedByStep);
  const completedSteps = completedStepIndexes.map(i => steps[i]);
  const workCount = completedSteps.filter(s => isWorkType(s.type)).length;

  let actualSeconds = 0;
  let weightedElapsed = 0;
  let weightedPlanned = 0;
  let plannedSeconds = 0;
  steps.forEach((step, idx) => {
    const dur = Number(step?.duration) || 0;
    const el = elapsedOf(elapsedByStep, idx, step);
    const met = metForStep(step, modality);
    actualSeconds += el;
    plannedSeconds += dur;
    weightedElapsed += el * met;
    weightedPlanned += dur * met;
  });

  const isFullSession = plannedSeconds > 0 && actualSeconds >= plannedSeconds - 1e-6;
  const ratioKcal = weightedPlanned > 0 ? weightedElapsed / weightedPlanned : 0;

  let durationMinutes;
  let estimatedKcal;
  if (isFullSession) {
    durationMinutes = plannedMinutes || Math.max(1, Math.round(plannedSeconds / 60));
    estimatedKcal = Math.round(plannedKcal || 0);
  } else {
    durationMinutes = actualSeconds > 0 ? Math.max(1, Math.round(actualSeconds / 60)) : 0;
    estimatedKcal = actualSeconds > 0 ? Math.max(1, Math.round((plannedKcal || 0) * ratioKcal)) : 0;
    if (!plannedKcal) estimatedKcal = 0;
  }

  return {
    workCount,
    completedStepIndexes,
    completedSteps,
    actualSeconds: Math.round(actualSeconds),
    durationMinutes,
    estimatedKcal,
    trainedMuscleIds: getTrainedMuscleIds(completedSteps),
    isFullSession,
    // Only sessions with at least one completed WORK/SPRINT step earn stats / streak credit.
    credited: workCount > 0
  };
}
