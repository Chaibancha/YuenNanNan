/**
 * ============================================================================
 * exercise3DKinematics.js
 * คำนวณพิกัดข้อต่อ 3 มิติ (x, y, z) สำหรับท่าออกกำลังกายและโยคะครบทุก poseType
 * - x: ซ้าย (-) / ขวา (+) หน่วยเมตรเทียบสัดส่วนหุ่น (ความสูงยืน ~1.72 หน่วย)
 * - y: ความสูงจากพื้นสตูดิโอ (พื้น y = 0)
 * - z: ด้านหลัง (-) / ด้านหน้า (+)
 * ไม่มี dependency ของ DOM หรือ Three.js เพื่อให้ทดสอบด้วย Node ESM ได้โดยตรง
 * ============================================================================
 */

export const SUPPORTED_3D_POSES = [
  'squat',
  'jump_squat',
  'thruster',
  'overhead_press',
  'pushup',
  'pike_pushup',
  'mountain_climber',
  'kettlebell_swing',
  'rdl_hinge',
  'bench_press',
  'tricep_dip',
  'hip_thrust',
  'pullup',
  'bent_row',
  'bicep_curl',
  'band_pull_apart',
  'indoor_bike',
  'jump_rope',
  'calf_raise',
  'russian_twist',
  'yoga_boat',
  'yoga_cobra',
  'yoga_downward_dog',
  'yoga_warrior',
  'yoga_seated_stretch'
];

function pt(x, y, z) {
  return { x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0 };
}

function mid(a, b) {
  return pt((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
}

/**
 * คำนวณพิกัดข้อต่อ 3 มิติของนักกีฬาในแต่ละเฟรม
 * @param {string} poseType
 * @param {number} wave 0..1 (0 = จุดเริ่มต้น/ผ่อน, 1 = จุดออกแรงสูงสุด/ย่อสุด)
 * @param {number} signedWave -1..1
 * @param {number} cyclePhase 0..1
 */
export function compute3DPoseJoints(poseType = 'squat', wave = 0, signedWave = 0, cyclePhase = 0) {
  // Default athletic standing neutral pose (facing +z)
  let pelvis = pt(0, 0.92, 0);
  let spineMid = pt(0, 1.16, 0);
  let chest = pt(0, 1.38, 0);
  let neck = pt(0, 1.52, 0.01);
  let head = pt(0, 1.66, 0.02);
  let lookAt = pt(0, 1.66, 0.6);

  let shoulderR = pt(0.22, 1.44, 0);
  let shoulderL = pt(-0.22, 1.44, 0);
  let elbowR = pt(0.27, 1.14, 0.04);
  let elbowL = pt(-0.27, 1.14, 0.04);
  let handR = pt(0.29, 0.86, 0.1);
  let handL = pt(-0.29, 0.86, 0.1);

  let hipR = pt(0.12, 0.9, 0);
  let hipL = pt(-0.12, 0.9, 0);
  let kneeR = pt(0.14, 0.48, 0.04);
  let kneeL = pt(-0.14, 0.48, 0.04);
  let ankleR = pt(0.14, 0.07, 0);
  let ankleL = pt(-0.14, 0.07, 0);
  let toeR = pt(0.15, 0.02, 0.16);
  let toeL = pt(-0.15, 0.02, 0.16);

  switch (poseType) {
    case 'squat':
    case 'jump_squat': {
      const isJump = poseType === 'jump_squat';
      const drop = wave * 0.36;
      const jumpLift = isJump ? Math.max(0, -signedWave) * 0.26 : 0;
      const hipBack = -wave * 0.22;
      const chestFwd = wave * 0.1;

      pelvis = pt(0, 0.92 - drop + jumpLift, hipBack);
      chest = pt(0, 1.38 - drop * 0.88 + jumpLift, hipBack + chestFwd + 0.12 * wave);
      spineMid = mid(pelvis, chest);
      neck = pt(0, chest.y + 0.13, chest.z + 0.02);
      head = pt(0, chest.y + 0.27, chest.z + 0.04);
      lookAt = pt(0, head.y, head.z + 0.8);

      shoulderR = pt(0.22, chest.y + 0.04, chest.z);
      shoulderL = pt(-0.22, chest.y + 0.04, chest.z);

      const armSwing = isJump && jumpLift > 0.04 ? -0.18 : 0.22 + wave * 0.16;
      elbowR = pt(0.24, chest.y - 0.16, chest.z + armSwing * 0.6);
      elbowL = pt(-0.24, chest.y - 0.16, chest.z + armSwing * 0.6);
      handR = pt(0.16, chest.y - 0.08 + wave * 0.12, chest.z + armSwing);
      handL = pt(-0.16, chest.y - 0.08 + wave * 0.12, chest.z + armSwing);

      hipR = pt(0.13, pelvis.y - 0.02, pelvis.z);
      hipL = pt(-0.13, pelvis.y - 0.02, pelvis.z);
      kneeR = pt(0.2, 0.48 - drop * 0.18 + jumpLift, 0.06 + wave * 0.18);
      kneeL = pt(-0.2, 0.48 - drop * 0.18 + jumpLift, 0.06 + wave * 0.18);
      ankleR = pt(0.18, 0.07 + jumpLift, 0);
      ankleL = pt(-0.18, 0.07 + jumpLift, 0);
      toeR = pt(0.22, 0.02 + jumpLift * 0.8, 0.16);
      toeL = pt(-0.22, 0.02 + jumpLift * 0.8, 0.16);
      break;
    }

    case 'thruster': {
      const squatPhase = wave < 0.5 ? 1 - wave * 2 : 0;
      const pressPhase = wave >= 0.5 ? (wave - 0.5) * 2 : 0;
      const drop = squatPhase * 0.35;
      const hipBack = -squatPhase * 0.2;

      pelvis = pt(0, 0.92 - drop, hipBack);
      chest = pt(0, 1.38 - drop * 0.88, hipBack * 0.4);
      spineMid = mid(pelvis, chest);
      neck = pt(0, chest.y + 0.13, chest.z + 0.01);
      head = pt(0, chest.y + 0.27, chest.z + 0.03);
      lookAt = pt(0, head.y + pressPhase * 0.1, head.z + 0.8);

      shoulderR = pt(0.22, chest.y + 0.04, chest.z);
      shoulderL = pt(-0.22, chest.y + 0.04, chest.z);
      elbowR = pt(0.28 - pressPhase * 0.05, chest.y - 0.08 + pressPhase * 0.32, chest.z + 0.16 * (1 - pressPhase));
      elbowL = pt(-0.28 + pressPhase * 0.05, elbowR.y, elbowR.z);
      handR = pt(0.23, chest.y + 0.08 + pressPhase * 0.52, chest.z + 0.14 * (1 - pressPhase));
      handL = pt(-0.23, handR.y, handR.z);

      hipR = pt(0.13, pelvis.y - 0.02, pelvis.z);
      hipL = pt(-0.13, pelvis.y - 0.02, pelvis.z);
      kneeR = pt(0.19, 0.48 - drop * 0.16, 0.05 + squatPhase * 0.18);
      kneeL = pt(-0.19, kneeR.y, kneeR.z);
      ankleR = pt(0.17, 0.07, 0);
      ankleL = pt(-0.17, 0.07, 0);
      toeR = pt(0.2, 0.02, 0.16);
      toeL = pt(-0.2, 0.02, 0.16);
      break;
    }

    case 'overhead_press': {
      const dip = wave < 0.22 ? (1 - wave / 0.22) * 0.1 : 0;
      pelvis = pt(0, 0.92 - dip, 0);
      chest = pt(0, 1.38 - dip, 0);
      spineMid = mid(pelvis, chest);
      neck = pt(0, chest.y + 0.13, 0.01);
      head = pt(0, chest.y + 0.27, 0.02);
      lookAt = pt(0, head.y + 0.08, 0.8);

      shoulderR = pt(0.22, chest.y + 0.04, 0);
      shoulderL = pt(-0.22, chest.y + 0.04, 0);
      elbowR = pt(0.32 - wave * 0.08, chest.y - 0.06 + wave * 0.34, 0.12 * (1 - wave));
      elbowL = pt(-0.32 + wave * 0.08, elbowR.y, elbowR.z);
      handR = pt(0.24, chest.y + 0.08 + wave * 0.54, 0.1 * (1 - wave));
      handL = pt(-0.24, handR.y, handR.z);

      kneeR = pt(0.15, 0.48 - dip * 0.4, 0.04 + dip * 0.5);
      kneeL = pt(-0.15, kneeR.y, kneeR.z);
      break;
    }

    case 'pushup':
    case 'pike_pushup': {
      const isPike = poseType === 'pike_pushup';
      const drop = wave * 0.22;

      handR = pt(0.25, 0.04, 0.48);
      handL = pt(-0.25, 0.04, 0.48);
      toeR = pt(0.13, 0.02, isPike ? -0.46 : -0.74);
      toeL = pt(-0.13, 0.02, isPike ? -0.46 : -0.74);
      ankleR = pt(0.13, 0.09, isPike ? -0.42 : -0.7);
      ankleL = pt(-0.13, 0.09, isPike ? -0.42 : -0.7);

      const shoulderY = isPike ? 0.52 - drop : 0.44 - drop;
      const shoulderZ = isPike ? 0.34 + drop * 0.3 : 0.42;
      const pelvisY = isPike ? 0.88 - drop * 0.2 : 0.35 - drop * 0.65;
      const pelvisZ = isPike ? -0.04 : -0.14;

      pelvis = pt(0, pelvisY, pelvisZ);
      chest = pt(0, shoulderY, shoulderZ);
      spineMid = mid(pelvis, chest);
      neck = pt(0, chest.y + (isPike ? -0.06 : 0.02), chest.z + 0.12);
      head = pt(0, chest.y + (isPike ? -0.14 : 0.03), chest.z + 0.22);
      lookAt = pt(0, 0, chest.z + 0.35);

      shoulderR = pt(0.21, chest.y, chest.z);
      shoulderL = pt(-0.21, chest.y, chest.z);
      elbowR = pt(0.32 + wave * 0.05, (chest.y + 0.05) * 0.55, chest.z - 0.12);
      elbowL = pt(-0.32 - wave * 0.05, elbowR.y, elbowR.z);

      hipR = pt(0.12, pelvis.y, pelvis.z);
      hipL = pt(-0.12, pelvis.y, pelvis.z);
      kneeR = mid(hipR, ankleR);
      kneeL = mid(hipL, ankleL);
      break;
    }

    case 'mountain_climber': {
      handR = pt(0.24, 0.04, 0.48);
      handL = pt(-0.24, 0.04, 0.48);
      pelvis = pt(0, 0.42, -0.12);
      chest = pt(0, 0.48, 0.42);
      spineMid = mid(pelvis, chest);
      neck = pt(0, 0.51, 0.53);
      head = pt(0, 0.53, 0.64);
      lookAt = pt(0, 0.1, 0.8);

      shoulderR = pt(0.21, chest.y, chest.z);
      shoulderL = pt(-0.21, chest.y, chest.z);
      elbowR = pt(0.24, 0.26, 0.45);
      elbowL = pt(-0.24, 0.26, 0.45);

      hipR = pt(0.12, pelvis.y, pelvis.z);
      hipL = pt(-0.12, pelvis.y, pelvis.z);

      const driveR = wave;
      const driveL = 1 - wave;
      kneeR = pt(0.13, 0.23 + driveR * 0.06, -0.38 + driveR * 0.56);
      ankleR = pt(0.13, 0.08 + driveR * 0.1, -0.68 + driveR * 0.48);
      toeR = pt(0.13, 0.02 + driveR * 0.08, ankleR.z - 0.05);

      kneeL = pt(-0.13, 0.23 + driveL * 0.06, -0.38 + driveL * 0.56);
      ankleL = pt(-0.13, 0.08 + driveL * 0.1, -0.68 + driveL * 0.48);
      toeL = pt(-0.13, 0.02 + driveL * 0.08, ankleL.z - 0.05);
      break;
    }

    case 'kettlebell_swing':
    case 'rdl_hinge': {
      const isSwing = poseType === 'kettlebell_swing';
      const hinge = 1 - wave; // 1 = hinged back, 0 = tall hip lock
      pelvis = pt(0, 0.9 - hinge * 0.08, -hinge * 0.24);
      chest = pt(0, 1.38 - hinge * 0.34, hinge * 0.26);
      spineMid = mid(pelvis, chest);
      neck = pt(0, chest.y + 0.11, chest.z + 0.08 * hinge + 0.02);
      head = pt(0, chest.y + 0.22, chest.z + 0.15 * hinge + 0.04);
      lookAt = pt(0, head.y - 0.15 * hinge, head.z + 0.8);

      shoulderR = pt(0.22, chest.y + 0.03, chest.z);
      shoulderL = pt(-0.22, chest.y + 0.03, chest.z);

      if (isSwing) {
        const swingZ = -0.18 * hinge + wave * 0.52;
        const swingY = 0.42 * hinge + wave * 1.24;
        handR = pt(0.08, swingY, swingZ);
        handL = pt(-0.08, swingY, swingZ);
        elbowR = mid(shoulderR, handR);
        elbowL = mid(shoulderL, handL);
      } else {
        const barY = 0.38 + wave * 0.44;
        const barZ = 0.16 - wave * 0.04;
        handR = pt(0.22, barY, barZ);
        handL = pt(-0.22, barY, barZ);
        elbowR = mid(shoulderR, handR);
        elbowL = mid(shoulderL, handL);
      }

      hipR = pt(0.14, pelvis.y - 0.02, pelvis.z);
      hipL = pt(-0.14, pelvis.y - 0.02, pelvis.z);
      kneeR = pt(0.16, 0.47 - hinge * 0.03, 0.04);
      kneeL = pt(-0.16, 0.47 - hinge * 0.03, 0.04);
      ankleR = pt(0.16, 0.07, 0);
      ankleL = pt(-0.16, 0.07, 0);
      toeR = pt(0.18, 0.02, 0.16);
      toeL = pt(-0.18, 0.02, 0.16);
      break;
    }

    case 'bench_press': {
      // Lying supine on 3D bench (bench top at y = 0.42)
      pelvis = pt(0, 0.48, -0.22);
      chest = pt(0, 0.5, 0.24);
      spineMid = mid(pelvis, chest);
      neck = pt(0, 0.5, 0.38);
      head = pt(0, 0.52, 0.52);
      lookAt = pt(0, 1.5, 0.24);

      shoulderR = pt(0.22, 0.5, 0.24);
      shoulderL = pt(-0.22, 0.5, 0.24);
      elbowR = pt(0.36 - wave * 0.1, 0.44 + wave * 0.26, 0.2);
      elbowL = pt(-0.36 + wave * 0.1, elbowR.y, 0.2);
      handR = pt(0.24, 0.62 + wave * 0.42, 0.22);
      handL = pt(-0.24, handR.y, 0.22);

      hipR = pt(0.14, 0.46, -0.24);
      hipL = pt(-0.14, 0.46, -0.24);
      kneeR = pt(0.24, 0.44, -0.58);
      kneeL = pt(-0.24, 0.44, -0.58);
      ankleR = pt(0.24, 0.07, -0.62);
      ankleL = pt(-0.24, 0.07, -0.62);
      toeR = pt(0.26, 0.02, -0.76);
      toeL = pt(-0.26, 0.02, -0.76);
      break;
    }

    case 'tricep_dip': {
      const dip = wave * 0.22;
      handR = pt(0.22, 0.42, -0.18);
      handL = pt(-0.22, 0.42, -0.18);
      pelvis = pt(0, 0.42 - dip, 0.05);
      chest = pt(0, 0.82 - dip, -0.02);
      spineMid = mid(pelvis, chest);
      neck = pt(0, chest.y + 0.12, 0);
      head = pt(0, chest.y + 0.25, 0.02);
      lookAt = pt(0, head.y, 0.8);

      shoulderR = pt(0.21, chest.y, -0.02);
      shoulderL = pt(-0.21, chest.y, -0.02);
      elbowR = pt(0.23, 0.62 - dip * 0.5, -0.28 - wave * 0.08);
      elbowL = pt(-0.23, elbowR.y, elbowR.z);

      hipR = pt(0.12, pelvis.y, pelvis.z);
      hipL = pt(-0.12, pelvis.y, pelvis.z);
      kneeR = pt(0.13, 0.28 - dip * 0.25, 0.36);
      kneeL = pt(-0.13, kneeR.y, 0.36);
      ankleR = pt(0.13, 0.07, 0.68);
      ankleL = pt(-0.13, 0.07, 0.68);
      toeR = pt(0.13, 0.09, 0.8);
      toeL = pt(-0.13, 0.09, 0.8);
      break;
    }

    case 'hip_thrust': {
      const lift = wave * 0.32;
      pelvis = pt(0, 0.14 + lift, -0.04);
      chest = pt(0, 0.2, 0.4);
      spineMid = mid(pelvis, chest);
      neck = pt(0, 0.22, 0.52);
      head = pt(0, 0.25, 0.64);
      lookAt = pt(0, 1.2, 0.2);

      shoulderR = pt(0.21, 0.2, 0.38);
      shoulderL = pt(-0.21, 0.2, 0.38);
      elbowR = pt(0.28, 0.12, 0.16);
      elbowL = pt(-0.28, 0.12, 0.16);
      handR = pt(0.16, pelvis.y + 0.06, -0.04);
      handL = pt(-0.16, pelvis.y + 0.06, -0.04);

      hipR = pt(0.13, pelvis.y, pelvis.z);
      hipL = pt(-0.13, pelvis.y, pelvis.z);
      kneeR = pt(0.16, 0.48, -0.44);
      kneeL = pt(-0.16, 0.48, -0.44);
      ankleR = pt(0.16, 0.07, -0.48);
      ankleL = pt(-0.16, 0.07, -0.48);
      toeR = pt(0.17, 0.02, -0.62);
      toeL = pt(-0.17, 0.02, -0.62);
      break;
    }

    case 'pullup': {
      const pull = wave * 0.42;
      handR = pt(0.32, 1.92, 0);
      handL = pt(-0.32, 1.92, 0);
      chest = pt(0, 1.32 + pull, 0.04);
      pelvis = pt(0, 0.84 + pull, 0.02);
      spineMid = mid(pelvis, chest);
      neck = pt(0, chest.y + 0.13, 0.04);
      head = pt(0, chest.y + 0.26, 0.05);
      lookAt = pt(0, 1.95, 0.4);

      shoulderR = pt(0.22, chest.y + 0.04, 0.02);
      shoulderL = pt(-0.22, chest.y + 0.04, 0.02);
      elbowR = pt(0.38, chest.y + 0.24 - wave * 0.16, -0.04);
      elbowL = pt(-0.38, elbowR.y, -0.04);

      hipR = pt(0.12, pelvis.y, pelvis.z);
      hipL = pt(-0.12, pelvis.y, pelvis.z);
      kneeR = pt(0.13, pelvis.y - 0.38, 0.06);
      kneeL = pt(-0.13, kneeR.y, 0.06);
      ankleR = pt(0.12, kneeR.y - 0.34, -0.08);
      ankleL = pt(-0.12, ankleR.y, -0.08);
      toeR = pt(0.12, ankleR.y - 0.06, -0.02);
      toeL = pt(-0.12, toeR.y, -0.02);
      break;
    }

    case 'bent_row': {
      pelvis = pt(0, 0.84, -0.2);
      chest = pt(0, 1.12, 0.22);
      spineMid = mid(pelvis, chest);
      neck = pt(0, 1.2, 0.34);
      head = pt(0, 1.28, 0.46);
      lookAt = pt(0, 0.6, 0.9);

      shoulderR = pt(0.22, 1.12, 0.22);
      shoulderL = pt(-0.22, 1.12, 0.22);
      elbowR = pt(0.26, 0.86 + wave * 0.32, 0.18 - wave * 0.22);
      elbowL = pt(-0.26, elbowR.y, elbowR.z);
      handR = pt(0.22, 0.56 + wave * 0.36, 0.24 - wave * 0.14);
      handL = pt(-0.22, handR.y, handR.z);

      hipR = pt(0.13, pelvis.y, pelvis.z);
      hipL = pt(-0.13, pelvis.y, pelvis.z);
      kneeR = pt(0.15, 0.46, 0.05);
      kneeL = pt(-0.15, 0.46, 0.05);
      break;
    }

    case 'bicep_curl': {
      elbowR = pt(0.26, 1.1, 0.03);
      elbowL = pt(-0.26, 1.1, 0.03);
      const curlArcZ = 0.08 + Math.sin(wave * Math.PI) * 0.26;
      const curlY = 0.82 + wave * 0.54;
      handR = pt(0.25, curlY, curlArcZ);
      handL = pt(-0.25, curlY, curlArcZ);
      break;
    }

    case 'band_pull_apart': {
      elbowR = pt(0.24 + wave * 0.22, 1.38, 0.28 * (1 - wave));
      elbowL = pt(-0.24 - wave * 0.22, 1.38, 0.28 * (1 - wave));
      handR = pt(0.18 + wave * 0.42, 1.4, 0.46 - wave * 0.38);
      handL = pt(-0.18 - wave * 0.42, 1.4, 0.46 - wave * 0.38);
      break;
    }

    case 'indoor_bike': {
      const ang = cyclePhase * Math.PI * 2;
      pelvis = pt(0, 0.88, -0.2);
      chest = pt(0, 1.24, 0.14);
      spineMid = mid(pelvis, chest);
      neck = pt(0, 1.35, 0.24);
      head = pt(0, 1.46, 0.32);
      lookAt = pt(0, 1.35, 0.9);

      shoulderR = pt(0.21, 1.24, 0.14);
      shoulderL = pt(-0.21, 1.24, 0.14);
      handR = pt(0.18, 1.06, 0.4);
      handL = pt(-0.18, 1.06, 0.4);
      elbowR = pt(0.23, 1.12, 0.26);
      elbowL = pt(-0.23, 1.12, 0.26);

      hipR = pt(0.12, pelvis.y, pelvis.z);
      hipL = pt(-0.12, pelvis.y, pelvis.z);

      const crankY = 0.34;
      const crankZ = 0.04;
      const r = 0.16;
      ankleR = pt(0.13, crankY + Math.sin(ang) * r, crankZ + Math.cos(ang) * r);
      ankleL = pt(-0.13, crankY + Math.sin(ang + Math.PI) * r, crankZ + Math.cos(ang + Math.PI) * r);
      toeR = pt(0.13, ankleR.y - 0.02, ankleR.z + 0.12);
      toeL = pt(-0.13, ankleL.y - 0.02, ankleL.z + 0.12);
      kneeR = pt(0.14, (hipR.y + ankleR.y) * 0.5 + 0.12, (hipR.z + ankleR.z) * 0.5 + 0.18);
      kneeL = pt(-0.14, (hipL.y + ankleL.y) * 0.5 + 0.12, (hipL.z + ankleL.z) * 0.5 + 0.18);
      break;
    }

    case 'jump_rope': {
      const hop = Math.abs(Math.sin(cyclePhase * Math.PI)) * 0.14;
      pelvis = pt(0, 0.92 + hop, 0);
      chest = pt(0, 1.38 + hop, 0);
      spineMid = mid(pelvis, chest);
      neck = pt(0, 1.52 + hop, 0.01);
      head = pt(0, 1.66 + hop, 0.02);

      shoulderR = pt(0.22, 1.44 + hop, 0);
      shoulderL = pt(-0.22, 1.44 + hop, 0);
      elbowR = pt(0.28, 1.14 + hop, 0.02);
      elbowL = pt(-0.28, 1.14 + hop, 0.02);
      handR = pt(0.38, 1.02 + hop, 0.08);
      handL = pt(-0.38, 1.02 + hop, 0.08);

      hipR = pt(0.12, 0.9 + hop, 0);
      hipL = pt(-0.12, 0.9 + hop, 0);
      kneeR = pt(0.13, 0.48 + hop, 0.03);
      kneeL = pt(-0.13, 0.48 + hop, 0.03);
      ankleR = pt(0.13, 0.07 + hop, 0);
      ankleL = pt(-0.13, 0.07 + hop, 0);
      toeR = pt(0.13, 0.02 + hop * 0.85, 0.15);
      toeL = pt(-0.13, 0.02 + hop * 0.85, 0.15);
      break;
    }

    case 'calf_raise': {
      const raise = wave * 0.11;
      pelvis = pt(0, 0.92 + raise, 0);
      chest = pt(0, 1.38 + raise, 0);
      spineMid = mid(pelvis, chest);
      neck = pt(0, 1.52 + raise, 0.01);
      head = pt(0, 1.66 + raise, 0.02);
      shoulderR = pt(0.22, 1.44 + raise, 0);
      shoulderL = pt(-0.22, 1.44 + raise, 0);
      elbowR = pt(0.27, 1.14 + raise, 0.04);
      elbowL = pt(-0.27, 1.14 + raise, 0.04);
      handR = pt(0.28, 0.88 + raise, 0.08);
      handL = pt(-0.28, 0.88 + raise, 0.08);
      hipR = pt(0.12, 0.9 + raise, 0);
      hipL = pt(-0.12, 0.9 + raise, 0);
      kneeR = pt(0.14, 0.48 + raise, 0.03);
      kneeL = pt(-0.14, 0.48 + raise, 0.03);
      ankleR = pt(0.14, 0.07 + raise, -0.02);
      ankleL = pt(-0.14, 0.07 + raise, -0.02);
      toeR = pt(0.14, 0.02, 0.16);
      toeL = pt(-0.14, 0.02, 0.16);
      break;
    }

    case 'russian_twist':
    case 'yoga_boat': {
      const isTwist = poseType === 'russian_twist';
      const twistX = isTwist ? signedWave * 0.28 : 0;
      const lift = wave * 0.08;

      pelvis = pt(0, 0.1, -0.08);
      chest = pt(twistX * 0.35, 0.48 + lift * 0.3, -0.34);
      spineMid = mid(pelvis, chest);
      neck = pt(twistX * 0.4, chest.y + 0.12, -0.38);
      head = pt(twistX * 0.45, chest.y + 0.24, -0.4);
      lookAt = pt(twistX, 0.5, 0.6);

      shoulderR = pt(chest.x + 0.2, chest.y + 0.02, -0.34 - twistX * 0.2);
      shoulderL = pt(chest.x - 0.2, chest.y + 0.02, -0.34 + twistX * 0.2);

      if (isTwist) {
        handR = pt(twistX + 0.06, 0.28, 0.04);
        handL = pt(twistX - 0.06, 0.28, 0.04);
        elbowR = pt(chest.x + 0.22, 0.34, -0.14);
        elbowL = pt(chest.x - 0.22, 0.34, -0.14);
      } else {
        handR = pt(0.2, 0.48 + lift, 0.26);
        handL = pt(-0.2, 0.48 + lift, 0.26);
        elbowR = mid(shoulderR, handR);
        elbowL = mid(shoulderL, handL);
      }

      hipR = pt(0.11, 0.1, -0.06);
      hipL = pt(-0.11, 0.1, -0.06);
      kneeR = pt(0.12, 0.44 + lift, 0.22);
      kneeL = pt(-0.12, 0.44 + lift, 0.22);
      ankleR = pt(0.11, 0.52 + lift * 1.3, 0.56);
      ankleL = pt(-0.11, 0.52 + lift * 1.3, 0.56);
      toeR = pt(0.11, ankleR.y + 0.08, 0.66);
      toeL = pt(-0.11, ankleL.y + 0.08, 0.66);
      break;
    }

    case 'yoga_cobra': {
      const arch = wave * 0.34;
      pelvis = pt(0, 0.08, -0.08);
      chest = pt(0, 0.16 + arch, 0.36);
      spineMid = pt(0, 0.1 + arch * 0.45, 0.14);
      neck = pt(0, chest.y + 0.11, 0.42);
      head = pt(0, chest.y + 0.23, 0.46);
      lookAt = pt(0, head.y + 0.2, 1.0);

      shoulderR = pt(0.21, chest.y, 0.36);
      shoulderL = pt(-0.21, chest.y, 0.36);
      handR = pt(0.24, 0.04, 0.38);
      handL = pt(-0.24, 0.04, 0.38);
      elbowR = pt(0.26, (chest.y + 0.04) * 0.5, 0.28);
      elbowL = pt(-0.26, elbowR.y, 0.28);

      hipR = pt(0.12, 0.08, -0.1);
      hipL = pt(-0.12, 0.08, -0.1);
      kneeR = pt(0.13, 0.07, -0.46);
      kneeL = pt(-0.13, 0.07, -0.46);
      ankleR = pt(0.13, 0.06, -0.82);
      ankleL = pt(-0.13, 0.06, -0.82);
      toeR = pt(0.13, 0.02, -0.94);
      toeL = pt(-0.13, 0.02, -0.94);
      break;
    }

    case 'yoga_downward_dog': {
      const pedal = wave * 0.1;
      handR = pt(0.23, 0.04, 0.56);
      handL = pt(-0.23, 0.04, 0.56);
      pelvis = pt(0, 0.94, -0.04);
      chest = pt(0, 0.54, 0.32);
      spineMid = mid(pelvis, chest);
      neck = pt(0, 0.44, 0.41);
      head = pt(0, 0.35, 0.48);
      lookAt = pt(0, 0.15, -0.4);

      shoulderR = pt(0.21, chest.y, chest.z);
      shoulderL = pt(-0.21, chest.y, chest.z);
      elbowR = mid(shoulderR, handR);
      elbowL = mid(shoulderL, handL);

      hipR = pt(0.12, pelvis.y, pelvis.z);
      hipL = pt(-0.12, pelvis.y, pelvis.z);
      kneeR = pt(0.13, 0.46, -0.26 + pedal * 0.4);
      kneeL = pt(-0.13, 0.46, -0.26 + (0.1 - pedal) * 0.4);
      ankleR = pt(0.13, 0.05 + pedal, -0.58);
      ankleL = pt(-0.13, 0.05 + (0.1 - pedal), -0.58);
      toeR = pt(0.13, 0.02, -0.46);
      toeL = pt(-0.13, 0.02, -0.46);
      break;
    }

    case 'yoga_warrior': {
      const sink = wave * 0.14;
      pelvis = pt(0, 0.78 - sink, 0);
      chest = pt(0, 1.24 - sink, 0.02);
      spineMid = mid(pelvis, chest);
      neck = pt(0, chest.y + 0.13, 0.02);
      head = pt(0, chest.y + 0.27, 0.03);
      lookAt = pt(0, head.y + 0.1, 0.9);

      shoulderR = pt(0.21, chest.y + 0.04, 0.02);
      shoulderL = pt(-0.21, chest.y + 0.04, 0.02);
      elbowR = pt(0.24, chest.y + 0.26 + wave * 0.1, 0.04);
      elbowL = pt(-0.24, elbowR.y, 0.04);
      handR = pt(0.2, chest.y + 0.54 + wave * 0.16, 0.02);
      handL = pt(-0.2, handR.y, 0.02);

      hipR = pt(0.12, pelvis.y, 0.04);
      hipL = pt(-0.12, pelvis.y, -0.04);
      kneeR = pt(0.13, 0.46 - sink * 0.2, 0.44);
      ankleR = pt(0.13, 0.07, 0.46);
      toeR = pt(0.13, 0.02, 0.6);

      kneeL = pt(-0.13, 0.42 - sink * 0.3, -0.28);
      ankleL = pt(-0.13, 0.08, -0.58);
      toeL = pt(-0.13, 0.02, -0.48);
      break;
    }

    case 'yoga_seated_stretch':
    default: {
      const sway = signedWave * 0.07;
      pelvis = pt(0, 0.1, 0);
      chest = pt(sway * 0.5, 0.56, 0);
      spineMid = mid(pelvis, chest);
      neck = pt(sway * 0.8, 0.7, 0.01);
      head = pt(sway * 1.2, 0.84, 0.02);
      lookAt = pt(sway, 0.84, 0.8);

      shoulderR = pt(chest.x + 0.21, 0.6, 0);
      shoulderL = pt(chest.x - 0.21, 0.6, 0);
      elbowR = pt(0.28, 0.36, 0.08);
      elbowL = pt(-0.28, 0.36, 0.08);
      handR = pt(0.32, 0.16, 0.18);
      handL = pt(-0.32, 0.16, 0.18);

      hipR = pt(0.12, 0.1, 0.02);
      hipL = pt(-0.12, 0.1, 0.02);
      kneeR = pt(0.34, 0.12, 0.18);
      kneeL = pt(-0.34, 0.12, 0.18);
      ankleR = pt(0.1, 0.06, 0.24);
      ankleL = pt(-0.1, 0.06, 0.24);
      toeR = pt(0.02, 0.05, 0.26);
      toeL = pt(-0.02, 0.05, 0.26);
      break;
    }
  }

  return {
    pelvis,
    spineMid,
    chest,
    neck,
    head,
    lookAt,
    shoulderR,
    shoulderL,
    elbowR,
    elbowL,
    handR,
    handL,
    hipR,
    hipL,
    kneeR,
    kneeL,
    ankleR,
    ankleL,
    toeR,
    toeL
  };
}
