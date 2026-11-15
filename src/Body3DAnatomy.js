import * as THREE from 'three';
import { MUSCLE_GROUPS } from './WorkoutEngine.js';

/**
 * ============================================================================
 * Body3DAnatomy.js (v2.1 — BioDigital Human × MSD Manual Muscular System Edition)
 * - Official BioDigital × MSD Manual Muscular System Embed URL (be=2PcB) & HumanAPI Bridge
 * - โมเดลกายวิภาค 3 มิติ Ecorché ความละเอียดสูงพร้อมกล้ามเนื้อใบหน้า/กะโหลก
 * - พังผืดและเอ็นสีขาวมุก (Galea Aponeurotica, Thoracolumbar Fascia,
 *   Linea Alba, Iliotibial Band, Patellar/Achilles Tendons, Wrist Retinaculum)
 * - รองรับเครื่องมือ Dissect (ผ่าตัดลอกชั้นกล้ามเนื้อ) และ Isolate (แยกดูมัดเดี่ยว)
 * ============================================================================
 */

export const MSD_MANUAL_REFERENCE_URL =
  'https://www.msdmanuals.com/home/multimedia/3dmodel/muscular-system';

export const BIODIGITAL_MSD_EMBED_URL =
  'https://human.biodigital.com/widget/?be=2PcB&background.colors=9,9,11,1,18,18,24,1&initial.hand-hint=true&ui-fullscreen=true&ui-center=true&ui-dissect=true&ui-zoom=true&ui-help=true&ui-tools-display=primary&ui-info=true&uaid=3YfOR';

export const BIODIGITAL_HUMAN_API_SCRIPT =
  'https://developer.biodigital.com/builds/api/2/human-api.min.js';

/**
 * แปลงชื่อโครงสร้างหรือ Object ID จาก BioDigital Human API (ละติน/อังกฤษ)
 * ให้ตรงกับ 16 กลุ่มมัดกล้ามเนื้อใน WorkoutEngine
 */
export function mapBioDigitalObjectToMuscleId(rawNameOrId = '') {
  const s = String(rawNameOrId).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!s) return null;

  // เช็คกล้ามเนื้อเฉพาะเจาะจงก่อน (เรียงลำดับจากจำเพาะที่สุดไปกว้าง)
  if (/(biceps femoris|semitendinosus|semimembranosus|hamstring)/.test(s)) return 'hamstrings';
  if (/(rectus femoris|vastus lateralis|vastus medialis|vastus intermedius|quadriceps|quad\b)/.test(s)) return 'quads';
  if (/(gastrocnemius|soleus|tibialis|fibularis|peroneus|achilles|calcaneal|calf|calves|plantaris)/.test(s)) return 'calves_tibialis';
  if (/(gluteus|gluteal|piriformis|gemellus|obturator|quadratus femoris|glute)/.test(s)) return 'glutes';
  if (/(iliopsoas|psoas|iliacus|tensor fasciae|iliotibial|sartorius|pectineus|adductor|gracilis|hip flexor)/.test(s)) return 'hip_adductors';

  if (/(rectus abdominis|pyramidalis|linea alba|abdominis|six pack)/.test(s)) return 'abs_rectus';
  if (/(serratus|external oblique|internal oblique|transversus abdominis|oblique)/.test(s)) return 'serratus_obliques';
  if (/(pectoralis|pectoral|subclavius|chest)/.test(s)) return 'chest_upper_Mid';

  if (/(latissimus|teres major|lats\b)/.test(s)) return 'lats_teres';
  if (/(rhomboid|erector spinae|iliocostalis|longissimus|spinalis|multifidus|quadratus lumborum|thoracolumbar)/.test(s)) return 'rhomboids_erector';
  if (/(posterior deltoid|rear deltoid|trapezius|infraspinatus|teres minor|levator scapulae|traps\b)/.test(s)) return 'shoulders_posterior_traps';
  if (/(deltoid|supraspinatus|subscapularis|anterior deltoid|lateral deltoid|shoulder)/.test(s)) return 'shoulders_anterior_lateral';

  if (/(biceps brachii|brachialis|coracobrachialis|biceps\b|bicep\b)/.test(s)) return 'biceps_brachialis';
  if (/(triceps|anconeus)/.test(s)) return 'triceps';
  if (/(brachioradialis|pronator|flexor carpi|extensor carpi|extensor digitorum|flexor digitorum|palmaris|supinator|forearm|retinaculum|thenar|hypothenar)/.test(s)) return 'forearms';

  if (/(sternocleidomastoid|splenius|scalene|platysma|omohyoid|sternohyoid|frontalis|temporalis|masseter|orbicularis|neck|cervical|zygomaticus|buccinator)/.test(s)) return 'neck_scm';

  return null;
}

/**
 * โหลด BioDigital HumanAPI Script แบบไดนามิกสำหรับเชื่อม Iframe
 */
let humanApiPromise = null;
export function loadBioDigitalHumanAPI() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.HumanAPI) return Promise.resolve(window.HumanAPI);
  if (humanApiPromise) return humanApiPromise;

  humanApiPromise = new Promise(resolve => {
    const script = document.createElement('script');
    script.src = BIODIGITAL_HUMAN_API_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.HumanAPI || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return humanApiPromise;
}

/**
 * สร้าง Bridge รับ Event จาก BioDigital Human Viewer (ทั้ง HumanAPI และ postMessage)
 */
export function attachBioDigitalBridge(iframeId, onPickedMuscle, onRawLabel) {
  let disposed = false;
  let humanInstance = null;

  const handlePickedPayload = rawText => {
    if (!rawText || disposed) return;
    if (onRawLabel) onRawLabel(rawText);
    const mappedId = mapBioDigitalObjectToMuscleId(rawText);
    if (mappedId && onPickedMuscle) {
      onPickedMuscle(mappedId, rawText);
    }
  };

  loadBioDigitalHumanAPI().then(HumanAPI => {
    if (disposed || !HumanAPI) return;
    try {
      humanInstance = new HumanAPI(iframeId);
      humanInstance.on('scene.picked', event => {
        const label = event?.objectName || event?.displayName || event?.objectId || '';
        handlePickedPayload(label);
      });
    } catch {}
  });

  const onWindowMessage = evt => {
    if (disposed || !evt?.origin?.includes('biodigital.com')) return;
    try {
      const data = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
      const candidate =
        data?.objectName ||
        data?.displayName ||
        data?.name ||
        data?.payload?.objectName ||
        data?.payload?.objectId ||
        '';
      if (candidate) handlePickedPayload(candidate);
    } catch {}
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('message', onWindowMessage);
  }

  return {
    sendCameraPreset(side) {
      if (!humanInstance) return;
      try {
        if (side === 'front') {
          humanInstance.send('camera.set', { position: { x: 0, y: 95, z: 245 }, target: { x: 0, y: 95, z: 0 } });
        } else if (side === 'back') {
          humanInstance.send('camera.set', { position: { x: 0, y: 95, z: -245 }, target: { x: 0, y: 95, z: 0 } });
        }
      } catch {}
    },
    destroy() {
      disposed = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', onWindowMessage);
      }
    }
  };
}

export function createMedicalMuscleFiberTexture(baseHex = '#9f1d22', tendonHex = '#ebe5dc') {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Tissue belly to tendinous origin/insertion gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, tendonHex);
  grad.addColorStop(0.15, baseHex);
  grad.addColorStop(0.5, baseHex);
  grad.addColorStop(0.85, baseHex);
  grad.addColorStop(1.0, tendonHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Fine myofibril fascicle bundles
  for (let x = 0; x < 256; x += 3) {
    const shade = x % 6 === 0 ? 'rgba(255,245,240,0.22)' : 'rgba(25,4,6,0.30)';
    ctx.strokeStyle = shade;
    ctx.lineWidth = x % 9 === 0 ? 1.8 : 0.9;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 3, 85, x - 3, 170, x, 256);
    ctx.stroke();
  }

  // Sarcomere cross-striations
  for (let y = 16; y < 240; y += 5) {
    ctx.strokeStyle = 'rgba(0,0,0,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const fasciaGrad = ctx.createLinearGradient(0, 0, 256, 0);
  fasciaGrad.addColorStop(0, 'rgba(255,255,255,0.0)');
  fasciaGrad.addColorStop(0.5, 'rgba(255,240,235,0.18)');
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

  for (let x = 0; x < 256; x += 4) {
    ctx.strokeStyle = x % 8 === 0 ? '#dfdfdf' : '#353535';
    ctx.lineWidth = 1.6;
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
 * สร้างโมเดลกายวิภาค 3 มิติสไตล์ BioDigital / MSD Manual Muscular System
 * ประกอบด้วย โครงกระดูกภายใน + พังผืด/เอ็นสีขาวมุก + มัดกล้ามเนื้อ 16 กลุ่ม + กล้ามเนื้อศีรษะ/ใบหน้า
 */
export function buildMedicalAnatomyGroup() {
  const bodyGroup = new THREE.Group();
  const muscleMeshes = [];
  const tendonMeshes = [];

  const fiberTexture = createMedicalMuscleFiberTexture('#9b1b24', '#ebe5dc');
  const bumpTexture = createMedicalMuscleBumpTexture();

  // 1. โครงกระดูกกายวิภาคภายใน (Anatomical Skeletal Core)
  const boneMat = new THREE.MeshStandardMaterial({
    color: '#eae3d5',
    roughness: 0.52,
    metalness: 0.08
  });

  const skeletonGroup = new THREE.Group();
  bodyGroup.add(skeletonGroup);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.195, 28, 28), boneMat);
  cranium.scale.set(0.86, 1.04, 0.96);
  cranium.position.set(0, 2.34, -0.01);
  skeletonGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.13, 0.15), boneMat);
  jaw.position.set(0, 2.18, 0.05);
  skeletonGroup.add(jaw);

  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const vertebra = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.054, 12), boneMat);
    vertebra.position.set(0, 0.8 + t * 1.32, Math.sin(t * Math.PI * 1.4) * 0.04 - 0.04);
    skeletonGroup.add(vertebra);
  }

  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.44, 0.038), boneMat);
  sternum.position.set(0, 1.62, 0.19);
  skeletonGroup.add(sternum);

  for (let r = 0; r < 6; r++) {
    const y = 1.42 + r * 0.075;
    const radiusX = 0.23 + Math.sin((r / 5) * Math.PI) * 0.08;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(radiusX, 0.015, 8, 28, Math.PI * 1.8), boneMat);
    rib.rotation.x = Math.PI / 2;
    rib.rotation.z = -Math.PI * 0.4;
    rib.scale.set(1.0, 0.68, 1.0);
    rib.position.set(0, y, 0.01);
    skeletonGroup.add(rib);
  }

  [-1, 1].forEach(side => {
    const clavicle = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.24, 8, 12), boneMat);
    clavicle.rotation.z = side * (Math.PI / 2 - 0.12);
    clavicle.position.set(side * 0.22, 1.88, 0.13);
    skeletonGroup.add(clavicle);

    const ilium = new THREE.Mesh(new THREE.SphereGeometry(0.175, 16, 16), boneMat);
    ilium.scale.set(0.95, 0.72, 0.58);
    ilium.position.set(side * 0.16, 0.72, 0);
    skeletonGroup.add(ilium);

    const humerus = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.027, 0.5, 12), boneMat);
    humerus.position.set(side * 0.56, 1.48, 0);
    humerus.rotation.z = side * 0.1;
    skeletonGroup.add(humerus);

    const radius = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.021, 0.46, 12), boneMat);
    radius.position.set(side * 0.64, 1.0, 0.04);
    radius.rotation.z = side * 0.06;
    skeletonGroup.add(radius);

    const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.037, 0.72, 14), boneMat);
    femur.position.set(side * 0.22, 0.2, 0);
    skeletonGroup.add(femur);

    const patella = new THREE.Mesh(new THREE.SphereGeometry(0.053, 14, 14), boneMat);
    patella.position.set(side * 0.22, -0.18, 0.09);
    skeletonGroup.add(patella);

    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.027, 0.66, 14), boneMat);
    tibia.position.set(side * 0.22, -0.52, 0);
    skeletonGroup.add(tibia);

    const footBones = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.26), boneMat);
    footBones.position.set(side * 0.22, -0.89, 0.08);
    skeletonGroup.add(footBones);
  });

  // 2. พังผืดและเอ็นสีขาวมุกแบบ BioDigital (Tendons & Aponeuroses Layer)
  const sphereGeo = new THREE.SphereGeometry(1, 24, 24);
  const capsuleGeo = new THREE.CapsuleGeometry(1, 1, 14, 24);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  const addTendonFascia = (label, geo, pos, scale = [1, 1, 1], rot = [0, 0, 0]) => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#ebe6dc',
      emissive: '#18181b',
      emissiveIntensity: 0.1,
      roughness: 0.35,
      metalness: 0.12,
      transparent: true,
      opacity: 0.94
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rot);
    mesh.userData = { isTendon: true, label };
    bodyGroup.add(mesh);
    tendonMeshes.push(mesh);
  };

  // Galea Aponeurotica (พังผืดกะโหลกศีรษะสีขาวมุก)
  addTendonFascia('Galea Aponeurotica', sphereGeo, [0, 2.41, -0.02], [0.165, 0.12, 0.175]);
  // Linea Alba & Abdominal Aponeurosis (ร่องพังผืดหน้าท้อง)
  addTendonFascia('Linea Alba', boxGeo, [0, 1.18, 0.235], [0.026, 0.56, 0.022]);
  // Thoracolumbar Fascia (พังผืดข้าวหลามตัดหลังล่างจุดกำเนิด Lats)
  addTendonFascia('Thoracolumbar Fascia', sphereGeo, [0, 1.02, -0.175], [0.18, 0.26, 0.055]);

  [-1, 1].forEach(side => {
    // Iliotibial (IT) Band / Tract (แถบพังผืดด้านข้างต้นขา)
    addTendonFascia('Iliotibial Band', capsuleGeo, [side * 0.335, 0.25, 0.01], [0.032, 0.44, 0.048], [0, 0, side * -0.02]);
    // Patellar Tendon (เอ็นสะบ้าเข่า)
    addTendonFascia('Patellar Tendon', capsuleGeo, [side * 0.22, -0.22, 0.095], [0.034, 0.10, 0.026]);
    // Achilles (Calcaneal) Tendon (เอ็นร้อยหวายสีขาวมุก)
    addTendonFascia('Achilles Tendon', capsuleGeo, [side * 0.215, -0.68, -0.075], [0.03, 0.17, 0.034]);
    // Carpal / Extensor Retinaculum (พังผืดข้อมือ)
    addTendonFascia('Wrist Retinaculum', capsuleGeo, [side * 0.68, 0.74, 0.05], [0.046, 0.045, 0.042], [0, 0, side * 0.06]);
  });

  // 3. มัดกล้ามเนื้อทางการแพทย์ทั้ง 16 กลุ่ม + กล้ามเนื้อใบหน้า/ศีรษะ
  let meshSeq = 0;
  const addMuscleFiber = (muscleId, geo, pos, scale = [1, 1, 1], rot = [0, 0, 0], subLabel = '') => {
    const meta = MUSCLE_GROUPS.find(m => m.id === muscleId) || MUSCLE_GROUPS[0];
    const mat = new THREE.MeshStandardMaterial({
      map: fiberTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.038,
      color: '#a32c33',
      emissive: '#000000',
      roughness: 0.4,
      metalness: 0.14,
      transparent: true,
      opacity: 0.97
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rot);
    mesh.userData = {
      meshUid: `${muscleId}_${meshSeq++}`,
      muscleId,
      subLabel,
      meta,
      baseColor: meta.color
    };
    bodyGroup.add(mesh);
    muscleMeshes.push(mesh);
  };

  // Frontalis & Facial Head Striations (mapped to neck_scm cranial-cervical group)
  addMuscleFiber('neck_scm', sphereGeo, [0, 2.41, 0.155], [0.11, 0.055, 0.035], [0, 0, 0], 'Frontalis');
  addMuscleFiber('neck_scm', sphereGeo, [0, 2.22, 0.155], [0.075, 0.045, 0.035], [0, 0, 0], 'Orbicularis Oris');

  [-1, 1].forEach(side => {
    // Cranial Temporalis & Masseter + Neck SCM & Splenius
    addMuscleFiber('neck_scm', sphereGeo, [side * 0.145, 2.35, 0.03], [0.04, 0.085, 0.085], [0, 0, 0], 'Temporalis');
    addMuscleFiber('neck_scm', sphereGeo, [side * 0.115, 2.21, 0.08], [0.038, 0.06, 0.05], [0, 0, side * 0.15], 'Masseter');
    addMuscleFiber('neck_scm', capsuleGeo, [side * 0.07, 2.04, 0.06], [0.048, 0.125, 0.048], [0.22, 0, side * 0.22], 'Sternocleidomastoid');
    addMuscleFiber('neck_scm', capsuleGeo, [side * 0.06, 2.04, -0.07], [0.048, 0.125, 0.048], [-0.15, 0, side * 0.12], 'Splenius Capitis');

    // 2. Anterior & Lateral Deltoids
    addMuscleFiber('shoulders_anterior_lateral', sphereGeo, [side * 0.48, 1.76, 0.08], [0.13, 0.15, 0.12], [0, 0, side * -0.22], 'Anterior Deltoid');
    addMuscleFiber('shoulders_anterior_lateral', sphereGeo, [side * 0.54, 1.75, -0.01], [0.12, 0.16, 0.12], [0, 0, side * -0.18], 'Lateral Deltoid');

    // 3. Posterior Deltoid & Trapezius
    addMuscleFiber('shoulders_posterior_traps', sphereGeo, [side * 0.48, 1.75, -0.09], [0.12, 0.14, 0.11], [0, 0, side * 0.2], 'Posterior Deltoid');
    addMuscleFiber('shoulders_posterior_traps', sphereGeo, [side * 0.16, 1.88, -0.14], [0.17, 0.14, 0.08], [0.25, 0, side * -0.35], 'Upper Trapezius');

    // 4. Chest (Clavicular & Sternal Pectoralis Major)
    addMuscleFiber('chest_upper_Mid', sphereGeo, [side * 0.17, 1.74, 0.19], [0.17, 0.09, 0.08], [0, side * 0.2, side * -0.22], 'Pectoralis Clavicular');
    addMuscleFiber('chest_upper_Mid', sphereGeo, [side * 0.19, 1.61, 0.21], [0.19, 0.13, 0.09], [0, side * 0.15, side * -0.1], 'Pectoralis Sternal');

    // 5. Serratus Anterior & External Obliques
    addMuscleFiber('serratus_obliques', sphereGeo, [side * 0.31, 1.4, 0.1], [0.075, 0.15, 0.11], [0, 0, side * 0.25], 'Serratus Anterior');
    addMuscleFiber('serratus_obliques', capsuleGeo, [side * 0.27, 1.12, 0.11], [0.075, 0.18, 0.095], [0, 0, side * -0.14], 'External Oblique');

    // 7. Latissimus Dorsi & Teres Major
    addMuscleFiber('lats_teres', sphereGeo, [side * 0.26, 1.46, -0.16], [0.19, 0.28, 0.09], [0, side * -0.2, side * 0.26], 'Latissimus Dorsi');
    addMuscleFiber('lats_teres', sphereGeo, [side * 0.34, 1.62, -0.13], [0.11, 0.1, 0.08], [0, 0, side * 0.3], 'Teres Major');

    // 8. Rhomboids & Erector Spinae
    addMuscleFiber('rhomboids_erector', sphereGeo, [side * 0.11, 1.62, -0.19], [0.11, 0.17, 0.07], [0, 0, 0], 'Rhomboids');
    addMuscleFiber('rhomboids_erector', capsuleGeo, [side * 0.08, 1.15, -0.16], [0.068, 0.26, 0.075], [0, 0, 0], 'Erector Spinae');

    // 9. Biceps Brachii & Brachialis
    addMuscleFiber('biceps_brachialis', capsuleGeo, [side * 0.56, 1.44, 0.08], [0.068, 0.18, 0.068], [0, 0, side * 0.1], 'Biceps Brachii');
    addMuscleFiber('biceps_brachialis', capsuleGeo, [side * 0.61, 1.38, 0.03], [0.052, 0.15, 0.052], [0, 0, side * 0.1], 'Brachialis');

    // 10. Triceps Brachii
    addMuscleFiber('triceps', capsuleGeo, [side * 0.56, 1.44, -0.07], [0.072, 0.18, 0.072], [0, 0, side * 0.1], 'Triceps Long Head');
    addMuscleFiber('triceps', sphereGeo, [side * 0.62, 1.48, -0.06], [0.06, 0.14, 0.065], [0, 0, 0], 'Triceps Lateral Head');

    // 11. Forearms (Brachioradialis & Flexors/Extensors)
    addMuscleFiber('forearms', capsuleGeo, [side * 0.65, 1.02, 0.05], [0.076, 0.19, 0.076], [0, 0, side * 0.06], 'Brachioradialis');
    addMuscleFiber('forearms', capsuleGeo, [side * 0.67, 1.0, -0.01], [0.068, 0.18, 0.068], [0, 0, side * 0.06], 'Extensor Carpi');

    // 12. Gluteus Maximus & Medius
    addMuscleFiber('glutes', sphereGeo, [side * 0.17, 0.64, -0.18], [0.17, 0.18, 0.14], [0, 0, 0], 'Gluteus Maximus');
    addMuscleFiber('glutes', sphereGeo, [side * 0.27, 0.77, -0.1], [0.11, 0.12, 0.11], [0, 0, 0], 'Gluteus Medius');

    // 13. Hip Flexors & Adductors
    addMuscleFiber('hip_adductors', capsuleGeo, [side * 0.17, 0.56, 0.13], [0.075, 0.13, 0.075], [0, 0, side * -0.25], 'Iliopsoas & TFL');
    addMuscleFiber('hip_adductors', capsuleGeo, [side * 0.12, 0.3, 0.04], [0.082, 0.2, 0.082], [0, 0, side * 0.15], 'Adductor Magnus');

    // 14. Quadriceps (Rectus Femoris, Vastus Lateralis, Vastus Medialis)
    addMuscleFiber('quads', capsuleGeo, [side * 0.22, 0.2, 0.12], [0.088, 0.26, 0.085], [0, 0, side * 0.03], 'Rectus Femoris');
    addMuscleFiber('quads', capsuleGeo, [side * 0.29, 0.2, 0.07], [0.078, 0.24, 0.085], [0, 0, side * -0.04], 'Vastus Lateralis');
    addMuscleFiber('quads', sphereGeo, [side * 0.17, 0.02, 0.11], [0.072, 0.12, 0.078], [0, 0, 0], 'Vastus Medialis');

    // 15. Hamstrings
    addMuscleFiber('hamstrings', capsuleGeo, [side * 0.25, 0.2, -0.11], [0.082, 0.26, 0.082], [0, 0, side * 0.02], 'Biceps Femoris');
    addMuscleFiber('hamstrings', capsuleGeo, [side * 0.18, 0.2, -0.11], [0.076, 0.25, 0.076], [0, 0, side * 0.04], 'Semitendinosus');

    // 16. Calves & Tibialis Anterior
    addMuscleFiber('calves_tibialis', sphereGeo, [side * 0.24, -0.42, -0.08], [0.075, 0.16, 0.085], [0, 0, 0], 'Gastrocnemius Lateral');
    addMuscleFiber('calves_tibialis', sphereGeo, [side * 0.19, -0.42, -0.08], [0.07, 0.15, 0.08], [0, 0, 0], 'Gastrocnemius Medial');
    addMuscleFiber('calves_tibialis', capsuleGeo, [side * 0.24, -0.48, 0.06], [0.046, 0.18, 0.048], [0, 0, 0], 'Tibialis Anterior');
  });

  // 6. Rectus Abdominis 8-pack segments
  [1.38, 1.24, 1.1, 0.94].forEach((yPos, rowIdx) => {
    [-1, 1].forEach(side => {
      const hScale = rowIdx === 3 ? 0.1 : 0.072;
      addMuscleFiber('abs_rectus', sphereGeo, [side * 0.082, yPos, 0.22], [0.078, hScale, 0.058], [0, 0, 0], `Rectus Abdominis L${rowIdx + 1}`);
    });
  });

  return { bodyGroup, muscleMeshes, tendonMeshes };
}

/**
 * อัปเดตสีกล้ามเนื้อและพังผืดตามโหมด ('ecorche' | 'xray' | 'emg')
 * รวมถึงรองรับ Dissect (ลอกกล้ามเนื้อ) และ Isolate (แยกดูมัดเดี่ยว)
 */
export function applyMedicalViewModeColors({
  muscleMeshes,
  tendonMeshes = [],
  selectedMuscles,
  isFullBody,
  hoveredMuscle,
  activeHighlightMuscle,
  viewMode = 'ecorche',
  recoveryStats = {},
  dissectedMeshIds = [],
  isolatedMuscleId = null
}) {
  tendonMeshes.forEach(tMesh => {
    tMesh.visible = true;
    tMesh.material.opacity = viewMode === 'xray' || isolatedMuscleId ? 0.22 : 0.92;
  });

  muscleMeshes.forEach(mesh => {
    const { meshUid, muscleId, baseColor } = mesh.userData;

    // 1. BioDigital Dissect Tool: ซ่อนชิ้นกล้ามเนื้อที่ถูกลอกออก
    if (dissectedMeshIds.includes(meshUid)) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    const isSelected = isFullBody || selectedMuscles.includes(muscleId);
    const isHovered = hoveredMuscle === muscleId;
    const isLive = activeHighlightMuscle === muscleId;

    // 2. BioDigital Isolate Tool: โปร่งแสงมัดอื่นเพื่อโฟกัสเฉพาะมัดที่กำลังแยกศึกษา
    if (isolatedMuscleId && isolatedMuscleId !== muscleId) {
      mesh.material.opacity = 0.08;
      mesh.material.color.set('#3f3f46');
      mesh.material.emissive.set('#000000');
      mesh.material.emissiveIntensity = 0;
      return;
    }

    if (viewMode === 'xray') {
      mesh.material.opacity = isLive ? 0.85 : isSelected ? 0.55 : isHovered ? 0.42 : 0.2;
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
        const heatHex = recScore >= 85 ? '#10b981' : recScore >= 65 ? '#f59e0b' : '#f43f5e';
        mesh.material.color.set(heatHex);
        mesh.material.emissive.set(heatHex);
        mesh.material.emissiveIntensity = isHovered ? 0.45 : 0.18;
      }
      return;
    }

    // Default: BioDigital Ecorché Striated Muscle Fiber Mode
    mesh.material.opacity = 0.97;
    if (isolatedMuscleId === muscleId) {
      mesh.material.color.set(baseColor);
      mesh.material.emissive.set(baseColor);
      mesh.material.emissiveIntensity = 0.65;
    } else if (isLive) {
      mesh.material.color.set('#fb923c');
      mesh.material.emissive.set('#ea580c');
      mesh.material.emissiveIntensity = 0.78;
    } else if (isSelected) {
      mesh.material.color.set(baseColor);
      mesh.material.emissive.set(baseColor);
      mesh.material.emissiveIntensity = isHovered ? 0.55 : 0.34;
    } else if (isHovered) {
      mesh.material.color.set('#dc2626');
      mesh.material.emissive.set('#b91c1c');
      mesh.material.emissiveIntensity = 0.28;
    } else {
      mesh.material.color.set('#962b33');
      mesh.material.emissive.set('#2a080a');
      mesh.material.emissiveIntensity = 0.12;
    }
  });
}
