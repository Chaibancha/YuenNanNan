/**
 * Pure helpers for App.jsx (no JSX / npm imports) — unit-testable in plain Node ESM.
 * DEF-10 profile validation, DEF-11 dev-UI gate, DEF-14 duration restore + step preview,
 * DEF-08 muscle short name.
 */

export const PROFILE_FIELD_RULES = {
  weightKg: { label: 'น้ำหนัก', labelEn: 'Weight', unit: 'kg', unitEn: 'kg', min: 35, max: 200, integer: false },
  heightCm: { label: 'ส่วนสูง', labelEn: 'Height', unit: 'cm', unitEn: 'cm', min: 120, max: 230, integer: false },
  age: { label: 'อายุ', labelEn: 'Age', unit: 'ปี', unitEn: 'yrs', min: 12, max: 100, integer: true },
  weeklyGoalDays: { label: 'เป้าหมายสัปดาห์', labelEn: 'Weekly Goal', unit: 'วัน', unitEn: 'days', min: 1, max: 7, integer: true }
};

export function getProfileFieldHint(field, lang = 'th') {
  const r = PROFILE_FIELD_RULES[field];
  if (!r) return '';
  const isEn = lang === 'en';
  const lbl = isEn ? r.labelEn : r.label;
  const unit = isEn ? r.unitEn : r.unit;
  return `${lbl} ${r.min}–${r.max} ${unit}`;
}

/**
 * Validate one raw (string|number) profile input.
 * @returns {{valid:boolean, value:(number|null), error:(string|null)}}
 */
export function validateProfileField(field, raw, lang = 'th') {
  const isEn = lang === 'en';
  const r = PROFILE_FIELD_RULES[field];
  if (!r) {
    return { valid: false, value: null, error: isEn ? 'Unknown profile field' : 'ไม่รู้จักช่องข้อมูลนี้' };
  }
  const hint = getProfileFieldHint(field, lang);
  const lbl = isEn ? r.labelEn : r.label;
  const unit = isEn ? r.unitEn : r.unit;
  const text = raw === null || raw === undefined ? '' : String(raw).trim();
  if (text === '') {
    return {
      valid: false,
      value: null,
      error: isEn
        ? `Please enter ${lbl} (accepted range ${r.min}–${r.max} ${unit})`
        : `กรุณากรอก${lbl} (ช่วงที่ยอมรับ ${r.min}–${r.max} ${unit})`
    };
  }
  const num = Number(text);
  if (!Number.isFinite(num)) {
    return { valid: false, value: null, error: isEn ? `Invalid number — ${hint}` : `ค่าไม่ถูกต้อง — ${hint}` };
  }
  if (r.integer && !Number.isInteger(num)) {
    return { valid: false, value: null, error: isEn ? `Must be a whole number — ${hint}` : `ต้องเป็นจำนวนเต็ม — ${hint}` };
  }
  if (num < r.min || num > r.max) {
    return { valid: false, value: null, error: isEn ? `Out of range — ${hint}` : `อยู่นอกช่วงที่กำหนด — ${hint}` };
  }
  return { valid: true, value: num, error: null };
}

/** Validate a whole draft object of raw strings. Returns { errors, validValues }. */
export function validateProfileDraft(draft, lang = 'th') {
  const errors = {};
  const validValues = {};
  Object.keys(PROFILE_FIELD_RULES).forEach(field => {
    const res = validateProfileField(field, draft?.[field], lang);
    if (res.valid) validValues[field] = res.value;
    else errors[field] = res.error;
  });
  return { errors, validValues };
}

/** DEF-11: show developer toggle only with ?dev=1 or localStorage kinetic_dev_ui === '1'. */
export function shouldShowDevUi(search, storage) {
  try {
    const q = String(search || '');
    const params = new URLSearchParams(q.startsWith('?') ? q : `?${q}`);
    if (params.get('dev') === '1') return true;
  } catch {
    /* ignore */
  }
  try {
    if (storage && typeof storage.getItem === 'function' && storage.getItem('kinetic_dev_ui') === '1') {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * DEF-14a: remember the pre-7MIN duration and restore when leaving 7MIN.
 * @param {{modality:string,duration:number,stash:(number|null),next:string}} p
 * @returns {{duration:number, stash:(number|null)}}
 */
export function resolveDurationOnModalityChange({ modality, duration, stash = null, next }) {
  if (next === '7MIN') {
    if (modality === '7MIN') return { duration: 7, stash };
    return { duration: 7, stash: duration };
  }
  if (modality === '7MIN') {
    return { duration: stash !== null && stash !== undefined ? stash : duration, stash: null };
  }
  return { duration, stash: null };
}

/** Manual duration pick while on 7MIN cancels the restore (user's explicit choice wins). */
export function stashAfterManualDuration() {
  return null;
}

const STEP_CHIPS = {
  WARMUP: { label: 'WARM-UP', tone: 'amber' },
  WORK: { label: 'WORK', tone: 'orange' },
  SPRINT: { label: 'SPRINT', tone: 'rose' },
  REST: { label: 'REST', tone: 'cyan' },
  COOLDOWN: { label: 'COOL-DOWN', tone: 'emerald' }
};

export function getStepChip(type) {
  return STEP_CHIPS[type] || { label: String(type || 'STEP'), tone: 'zinc' };
}

/** DEF-14b: equipment used by a step, as localized names (equipmentUsed preferred, else equipment). */
export function getStepEquipmentLabels(step, catalog = [], lang = 'th') {
  const raw = step && (step.equipmentUsed ?? step.equipment);
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map(item => {
    const id = typeof item === 'string' ? item : item?.id || item?.nameTh || '';
    const found = catalog.find(c => c.id === id);
    if (lang === 'en') {
      return found?.nameEn || (typeof item === 'object' ? item?.nameEn || item?.nameTh : '') || id;
    }
    const name = found?.nameTh || (typeof item === 'object' ? item?.nameTh : '') || id;
    return String(name).split(' (')[0];
  });
}

/** DEF-08: Localized short muscle name from a MUSCLE_GROUPS-style list. */
export function getMuscleShortName(muscleId, groups = [], lang = 'th') {
  const m = groups.find(g => g.id === muscleId);
  if (!m) return String(muscleId);
  if (lang === 'en') return m.shortEn || m.nameEn;
  return String(m.nameTh).split(' (')[0];
}

/**
 * Compute BMI (Asia-Pacific / Thai Health classification) and Tanaka Max HR from body profile.
 */
export function computeBodyMetrics({ weightKg = 70, heightCm = 170, age = 30 } = {}) {
  const w = Math.min(200, Math.max(35, Number(weightKg) || 70));
  const hCm = Math.min(230, Math.max(120, Number(heightCm) || 170));
  const a = Math.min(100, Math.max(12, Number(age) || 30));
  const hM = hCm / 100;
  const bmi = Number((w / (hM * hM)).toFixed(1));
  let bmiCategoryTh = 'ปกติ (สมส่วน)';
  let bmiCategoryEn = 'Normal';
  if (bmi < 18.5) {
    bmiCategoryTh = 'น้ำหนักน้อย';
    bmiCategoryEn = 'Underweight';
  } else if (bmi >= 25.0) {
    bmiCategoryTh = 'อ้วน';
    bmiCategoryEn = 'Obese';
  } else if (bmi >= 23.0) {
    bmiCategoryTh = 'ท้วม / น้ำหนักเกิน';
    bmiCategoryEn = 'Overweight';
  }
  const maxHrBpm = Math.round(208 - 0.7 * a);
  return { bmi, bmiCategoryTh, bmiCategoryEn, maxHrBpm };
}
