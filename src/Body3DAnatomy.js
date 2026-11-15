import * as THREE from 'three';
import { MUSCLE_GROUPS } from './WorkoutEngine.js';

/**
 * ============================================================================
 * Body3DAnatomy.js
 * โมดูลสร้างพื้นผิวเส้นใยกล้ามเนื้อลายทางการแพทย์ (Procedural Myofibril Striations),
 * โครงกระดูกกายวิภาคภายใน (Anatomical Skeletal Core) และมัดกล้ามเนื้อ 16 กลุ่มเชิงลึก
 * ใช้ร่วมกันระหว่าง React (Body3DSelector.jsx) และ Browser Module (Index.html)
 * ============================================================================
 */

export function createMedicalMuscleFiberTexture(baseHex = '#9f1d22', tendonHex = '#e7dfd8') {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base deep anatomical muscle tissue gradient (tendon -> belly -> tendon)
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, tendonHex);
  grad.addColorStop(0.14, baseHex);
  grad.addColorStop(0.5, baseHex);
  grad.addColorStop(0.86, baseHex);
  grad.addColorStop(1.0, tendonHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Longitudinal myofibril fascicle bundles (เส้นใยกล้ามเนื้อลายตามยาว)
  for (let x = 0; x < 256; x += 4) {
    const shade = x % 8 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(30,5,5,0.28)';
    ctx.strokeStyle = shade;
    ctx.lineWidth = x % 12 === 0 ? 1.8 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 3, 85, x - 3, 170, x, 256);
    ctx.stroke();
  }

  // Microscopic sarcomere cross-striations (ลายขวางใยกล้ามเนื้อ)
  for (let y = 18; y < 238; y += 6) {
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Aponeurosis / Fascia highlight sheen
  const fasciaGrad = ctx.createLinearGradient(0, 0, 256, 0);
  fasciaGrad.addColorStop(0, 'rgba(255,255,255,0.0)');
  fasciaGrad.addColorStop(0.5, 'rgba(255,235,230,0.16)');
  fasciaGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = fasciaGrad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createMedicalMuscleBumpTexture() {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let x = 0; x < 256; x += 5) {
    ctx.strokeStyle = x % 10 === 0 ? '#d4d4d4' : '#3a3a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  const bump = new THREE.CanvasTexture(canvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.needsUpdate = true;
  return bump;
}

/**
 * สร้างโมเดลกายวิภาค 3 มิติ (โครงกระดูกภายใน + มัดกล้ามเนื้อ 16 กลุ่ม)
 */
export function buildMedicalAnatomyGroup() {
  const bodyGroup = new THREE.Group();
  const muscleMeshes = [];

  const fiberTexture = createMedicalMuscleFiberTexture('#9b1b24', '#e5ddd5');
  const bumpTexture = createMedicalMuscleBumpTexture();

  // 1. โครงกระดูกกายวิภาคภายใน (Anatomical Skeletal Core)
  const boneMat = new THREE.MeshStandardMaterial({
    color: '#e7e0d2',
    roughness: 0.55,
    metalness: 0.08
  });

  const skeletonGroup = new THREE.Group();
  bodyGroup.add(skeletonGroup);

  // Cranium & Jaw (กะโหลกศีรษะ)
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.20, 28, 28), boneMat);
  cranium.scale.set(0.86, 1.05, 0.96);
  cranium.position.set(0, 2.34, -0.01);
  skeletonGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), boneMat);
  jaw.position.set(0, 2.18, 0.05);
  skeletonGroup.add(jaw);

  // Cervical, Thoracic & Lumbar Spine (กระดูกสันหลังข้อต่อ)
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const vertebra = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.055, 12), boneMat);
    const zCurve = Math.sin(t * Math.PI * 1.4) * 0.04 - 0.04;
    vertebra.position.set(0, 0.80 + t * 1.32, zCurve);
    skeletonGroup.add(vertebra);
  }

  // Sternum & Ribcage (กระดูกอกและซี่โครง 7 คู่)
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.04), boneMat);
  sternum.position.set(0, 1.62, 0.19);
  skeletonGroup.add(sternum);

  for (let r = 0; r < 6; r++) {
    const y = 1.42 + r * 0.075;
    const radiusX = 0.23 + Math.sin((r / 5) * Math.PI) * 0.08;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(radiusX, 0.016, 8, 28, Math.PI * 1.8), boneMat);
    rib.rotation.x = Math.PI / 2;
    rib.rotation.z = -Math.PI * 0.4;
    rib.scale.set(1.0, 0.68, 1.0);
    rib.position.set(0, y, 0.01);
    skeletonGroup.add(rib);
  }

  // Clavicles & Pelvis (กระดูกไหปลาร้าและเชิงกราน)
  [-1, 1].forEach(side => {
    const clavicle = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.24, 8, 12), boneMat);
    clavicle.rotation.z = side * (Math.PI / 2 - 0.12);
    clavicle.position.set(side * 0.22, 1.88, 0.13);
    skeletonGroup.add(clavicle);

    // Iliac Crest / Pelvis Wing
    const ilium = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), boneMat);
    ilium.scale.set(0.95, 0.72, 0.58);
    ilium.position.set(side * 0.16, 0.72, 0.0);
    skeletonGroup.add(ilium);

    // Arm & Leg Bones (Humerus, Radius/Ulna, Femur, Tibia/Fibula)
    const humerus = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.50, 12), boneMat);
    humerus.position.set(side * 0.56, 1.48, 0.0);
    humerus.rotation.z = side * 0.10;
    skeletonGroup.add(humerus);

    const radius = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.46, 12), boneMat);
    radius.position.set(side * 0.64, 1.00, 0.04);
    radius.rotation.z = side * 0.06;
    skeletonGroup.add(radius);

    const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.038, 0.72, 14), boneMat);
    femur.position.set(side * 0.22, 0.20, 0.0);
    skeletonGroup.add(femur);

    const patella = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 14), boneMat);
    patella.position.set(side * 0.22, -0.18, 0.08);
    skeletonGroup.add(patella);

    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.028, 0.66, 14), boneMat);
    tibia.position.set(side * 0.22, -0.52, 0.0);
    skeletonGroup.add(tibia);

    const footBones = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.26), boneMat);
    footBones.position.set(side * 0.22, -0.89, 0.08);
    skeletonGroup.add(footBones);
  });

  // 2. เยื่อพังผืดโปร่งแสงรอบโครงร่าง (Translucent Anatomical Fascia Shell)
  const fasciaMat = new THREE.MeshPhysicalMaterial({
    color: '#94a3b8',
    transparent: true,
    opacity: 0.12,
    roughness: 0.25,
    depthWrite: false
  });
  const torsoFascia = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.29, 1.12, 24), fasciaMat);
  torsoFascia.scale.set(1.18, 1.0, 0.72);
  torsoFascia.position.set(0, 1.34, 0);
  bodyGroup.add(torsoFascia);

  // 3. สร้างมัดกล้ามเนื้อทางการแพทย์ทั้ง 16 กลุ่ม (16 Detailed Muscle Groups)
  const sphereGeo = new THREE.SphereGeometry(1, 24, 24);
  const capsuleGeo = new THREE.CapsuleGeometry(1, 1, 14, 24);

  const addMuscleFiber = (muscleId, geo, pos, scale = [1, 1, 1], rot = [0, 0, 0]) => {
    const meta = MUSCLE_GROUPS.find(m => m.id === muscleId) || MUSCLE_GROUPS[0];
    const mat = new THREE.MeshStandardMaterial({
      map: fiberTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.035,
      color: '#a33238',
      emissive: '#000000',
      roughness: 0.42,
      metalness: 0.12,
      transparent: true,
      opacity: 0.96
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rot);
    mesh.userData = {
      muscleId,
      meta,
      baseColor: meta.color
    };
    bodyGroup.add(mesh);
    muscleMeshes.push(mesh);
  };

  [-1, 1].forEach(side => {
    // 1. neck_scm (Sternocleidomastoid & Splenius)
    addMuscleFiber('neck_scm', capsuleGeo, [side * 0.07, 2.04, 0.06], [0.036, 0.11, 0.036], [0.22, 0, side * 0.22]);
    addMuscleFiber('neck_scm', capsuleGeo, [side * 0.06, 2.04, -0.07], [0.042, 0.11, 0.042], [-0.15, 0, side * 0.12]);

    // 2. shoulders_anterior_lateral (Anterior & Lateral Deltoids)
    addMuscleFiber('shoulders_anterior_lateral', sphereGeo, [side * 0.48, 1.76, 0.08], [0.13, 0.15, 0.12], [0, 0, side * -0.22]);
    addMuscleFiber('shoulders_anterior_lateral', sphereGeo, [side * 0.54, 1.75, -0.01], [0.12, 0.16, 0.12], [0, 0, side * -0.18]);

    // 3. shoulders_posterior_traps (Rear Delts & Upper/Mid Trapezius)
    addMuscleFiber('shoulders_posterior_traps', sphereGeo, [side * 0.48, 1.75, -0.09], [0.12, 0.14, 0.11], [0, 0, side * 0.2]);
    addMuscleFiber('shoulders_posterior_traps', sphereGeo, [side * 0.16, 1.88, -0.14], [0.17, 0.14, 0.08], [0.25, 0, side * -0.35]);

    // 4. chest_upper_Mid (Clavicular Upper Chest + Sternal Main Pectoralis)
    addMuscleFiber('chest_upper_Mid', sphereGeo, [side * 0.17, 1.74, 0.19], [0.17, 0.09, 0.08], [0, side * 0.2, side * -0.22]);
    addMuscleFiber('chest_upper_Mid', sphereGeo, [side * 0.19, 1.61, 0.21], [0.19, 0.13, 0.09], [0, side * 0.15, side * -0.1]);

    // 5. serratus_obliques (Serratus Anterior slips + External Obliques)
    addMuscleFiber('serratus_obliques', sphereGeo, [side * 0.31, 1.40, 0.10], [0.075, 0.15, 0.11], [0, 0, side * 0.25]);
    addMuscleFiber('serratus_obliques', capsuleGeo, [side * 0.27, 1.12, 0.11], [0.075, 0.18, 0.095], [0, 0, side * -0.14]);

    // 7. lats_teres (Latissimus Dorsi & Teres Major)
    addMuscleFiber('lats_teres', sphereGeo, [side * 0.26, 1.46, -0.16], [0.19, 0.28, 0.09], [0, side * -0.2, side * 0.26]);
    addMuscleFiber('lats_teres', sphereGeo, [side * 0.34, 1.62, -0.13], [0.11, 0.10, 0.08], [0, 0, side * 0.3]);

    // 8. rhomboids_erector (Rhomboids & Erector Spinae Spinal Columns)
    addMuscleFiber('rhomboids_erector', sphereGeo, [side * 0.11, 1.62, -0.19], [0.11, 0.17, 0.07]);
    addMuscleFiber('rhomboids_erector', capsuleGeo, [side * 0.08, 1.15, -0.16], [0.068, 0.26, 0.075]);

    // 9. biceps_brachialis (Biceps Long/Short Heads + Brachialis)
    addMuscleFiber('biceps_brachialis', capsuleGeo, [side * 0.56, 1.44, 0.08], [0.068, 0.18, 0.068], [0, 0, side * 0.1]);
    addMuscleFiber('biceps_brachialis', capsuleGeo, [side * 0.61, 1.38, 0.03], [0.052, 0.15, 0.052], [0, 0, side * 0.1]);

    // 10. triceps (Long, Lateral & Medial Heads)
    addMuscleFiber('triceps', capsuleGeo, [side * 0.56, 1.44, -0.07], [0.072, 0.18, 0.072], [0, 0, side * 0.1]);
    addMuscleFiber('triceps', sphereGeo, [side * 0.62, 1.48, -0.06], [0.06, 0.14, 0.065]);

    // 11. forearms (Brachioradialis, Flexors & Extensors)
    addMuscleFiber('forearms', capsuleGeo, [side * 0.65, 1.02, 0.05], [0.064, 0.18, 0.064], [0, 0, side * 0.06]);
    addMuscleFiber('forearms', capsuleGeo, [side * 0.67, 1.00, -0.01], [0.056, 0.17, 0.056], [0, 0, side * 0.06]);

    // 12. glutes (Gluteus Maximus & Gluteus Medius)
    addMuscleFiber('glutes', sphereGeo, [side * 0.17, 0.64, -0.18], [0.17, 0.18, 0.14]);
    addMuscleFiber('glutes', sphereGeo, [side * 0.27, 0.77, -0.10], [0.11, 0.12, 0.11]);

    // 13. hip_adductors (Iliopsoas, TFL & Adductor Magnus)
    addMuscleFiber('hip_adductors', capsuleGeo, [side * 0.17, 0.56, 0.13], [0.075, 0.13, 0.075], [0, 0, side * -0.25]);
    addMuscleFiber('hip_adductors', capsuleGeo, [side * 0.12, 0.30, 0.04], [0.082, 0.20, 0.082], [0, 0, side * 0.15]);

    // 14. quads (Rectus Femoris + Vastus Lateralis + Vastus Medialis)
    addMuscleFiber('quads', capsuleGeo, [side * 0.22, 0.20, 0.12], [0.088, 0.26, 0.085], [0, 0, side * 0.03]);
    addMuscleFiber('quads', capsuleGeo, [side * 0.29, 0.20, 0.07], [0.078, 0.24, 0.085], [0, 0, side * -0.04]);
    addMuscleFiber('quads', sphereGeo, [side * 0.17, 0.02, 0.11], [0.072, 0.12, 0.078]);

    // 15. hamstrings (Biceps Femoris + Semitendinosus)
    addMuscleFiber('hamstrings', capsuleGeo, [side * 0.25, 0.20, -0.11], [0.082, 0.26, 0.082], [0, 0, side * 0.02]);
    addMuscleFiber('hamstrings', capsuleGeo, [side * 0.18, 0.20, -0.11], [0.076, 0.25, 0.076], [0, 0, side * 0.04]);

    // 16. calves_tibialis (Gastrocnemius Medial/Lateral + Tibialis Anterior)
    addMuscleFiber('calves_tibialis', sphereGeo, [side * 0.24, -0.42, -0.08], [0.075, 0.16, 0.085]);
    addMuscleFiber('calves_tibialis', sphereGeo, [side * 0.19, -0.42, -0.08], [0.07, 0.15, 0.08]);
    addMuscleFiber('calves_tibialis', capsuleGeo, [side * 0.24, -0.48, 0.06], [0.046, 0.18, 0.048]);
  });

  // 6. abs_rectus (Rectus Abdominis 8-pack segments along Linea Alba)
  [1.38, 1.24, 1.10, 0.94].forEach((yPos, rowIdx) => {
    [-1, 1].forEach(side => {
      const hScale = rowIdx === 3 ? 0.10 : 0.072;
      addMuscleFiber('abs_rectus', sphereGeo, [side * 0.082, yPos, 0.22], [0.078, hScale, 0.058]);
    });
  });

  return { bodyGroup, muscleMeshes };
}

/**
 * อัปเดตสีกล้ามเนื้อตามโหมดการแสดงผลทางการแพทย์ ('ecorche' | 'xray' | 'emg')
 */
export function applyMedicalViewModeColors({
  muscleMeshes,
  selectedMuscles,
  isFullBody,
  hoveredMuscle,
  activeHighlightMuscle,
  viewMode = 'ecorche',
  recoveryStats = {}
}) {
  muscleMeshes.forEach(mesh => {
    const { muscleId, baseColor } = mesh.userData;
    const isSelected = isFullBody || selectedMuscles.includes(muscleId);
    const isHovered = hoveredMuscle === muscleId;
    const isLive = activeHighlightMuscle === muscleId;

    if (viewMode === 'xray') {
      // โหมดโปร่งแสงเห็นโครงกระดูกสันหลังและซี่โครง
      mesh.material.opacity = isLive ? 0.85 : isSelected ? 0.55 : isHovered ? 0.42 : 0.20;
      if (isLive) {
        mesh.material.color.set('#f97316');
        mesh.material.emissive.set('#ea580c');
        mesh.material.emissiveIntensity = 0.75;
      } else if (isSelected) {
        mesh.material.color.set(baseColor);
        mesh.material.emissive.set(baseColor);
        mesh.material.emissiveIntensity = 0.42;
      } else {
        mesh.material.color.set('#38bdf8');
        mesh.material.emissive.set('#0284c7');
        mesh.material.emissiveIntensity = 0.15;
      }
      return;
    }

    if (viewMode === 'emg') {
      // โหมด EMG / Muscle Recovery Heatmap
      mesh.material.opacity = 0.96;
      const recScore = recoveryStats[muscleId] ?? 100;
      if (isLive) {
        mesh.material.color.set('#ef4444');
        mesh.material.emissive.set('#dc2626');
        mesh.material.emissiveIntensity = 0.85;
      } else if (isSelected) {
        mesh.material.color.set('#facc15');
        mesh.material.emissive.set('#eab308');
        mesh.material.emissiveIntensity = 0.45;
      } else {
        // Fresh 100% -> Emerald/Cyan; Fatigued < 70% -> Rose/Orange
        const heatHex = recScore >= 85 ? '#10b981' : recScore >= 65 ? '#f59e0b' : '#f43f5e';
        mesh.material.color.set(heatHex);
        mesh.material.emissive.set(heatHex);
        mesh.material.emissiveIntensity = isHovered ? 0.45 : 0.18;
      }
      return;
    }

    // ค่าเริ่มต้น: Ecorché Medical Striated Muscle Fiber Mode
    mesh.material.opacity = 0.97;
    if (isLive) {
      mesh.material.color.set('#fb923c');
      mesh.material.emissive.set('#ea580c');
      mesh.material.emissiveIntensity = 0.78;
    } else if (isSelected) {
      mesh.material.color.set(baseColor);
      mesh.material.emissive.set(baseColor);
      mesh.material.emissiveIntensity = isHovered ? 0.55 : 0.32;
    } else if (isHovered) {
      mesh.material.color.set('#dc2626');
      mesh.material.emissive.set('#b91c1c');
      mesh.material.emissiveIntensity = 0.25;
    } else {
      // สีเนื้อกล้ามเนื้อลายทางการแพทย์ธรรมชาติ (Deep Crimson Striated Tissue)
      mesh.material.color.set('#962b33');
      mesh.material.emissive.set('#2a080a');
      mesh.material.emissiveIntensity = 0.12;
    }
  });
}
