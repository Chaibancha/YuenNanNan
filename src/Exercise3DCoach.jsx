import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createMedicalMuscleFiberTexture, createMedicalMuscleBumpTexture, disposeThreeScene } from './Body3DAnatomy.js';
import { compute3DPoseJoints } from './exercise3DKinematics.js';
import { getMuscleDisplayName } from './WorkoutEngine.js';

const UP_VEC = new THREE.Vector3(0, 1, 0);
const SUPINE_POSES = new Set(['hip_thrust', 'bench_press']);
const PRONE_POSES = new Set(['pushup', 'pike_pushup', 'mountain_climber', 'yoga_cobra', 'yoga_downward_dog']);

/**
 * Orient a unit CapsuleGeometry(1, 1) mesh (total height = 3) cleanly between p1 and p2.
 */
function orientLimbMesh(mesh, p1, p2, radiusX, radiusZ = radiusX) {
  const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
  const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
  const dir = new THREE.Vector3().subVectors(v2, v1);
  const len = Math.max(0.001, dir.length());
  mesh.position.copy(v1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP_VEC, dir.clone().normalize());
  mesh.scale.set(radiusX, len / 2.65, radiusZ);
}

/**
 * Orient a unit SphereGeometry(1) or CapsuleGeometry(1, 1) along an axis vector.
 */
function orientAlongDir(mesh, dirVec, scaleX, scaleY, scaleZ) {
  mesh.quaternion.setFromUnitVectors(UP_VEC, dirVec);
  mesh.scale.set(scaleX, scaleY, scaleZ);
}

/**
 * Project `refVec` onto the plane orthogonal to `axisVec` so surface offsets stay anatomically valid in any pose.
 */
function projectOrthogonal(refVec, axisVec, fallbackVec = new THREE.Vector3(0, 0, 1)) {
  const out = refVec.clone().addScaledVector(axisVec, -refVec.dot(axisVec));
  if (out.lengthSq() < 1e-4) {
    out.copy(fallbackVec).addScaledVector(axisVec, -fallbackVec.dot(axisVec));
  }
  if (out.lengthSq() < 1e-4) {
    out.set(1, 0, 0);
  }
  return out.normalize();
}

/**
 * ============================================================================
 * Exercise3DCoach.jsx
 * โมเดลนักกีฬากายวิภาค 3 มิติแบบโต้ตอบหมุนดูท่าฝึกได้ 360° (Interactive 3D Form Coach)
 * - หมุนกล้อง ซูม และเปลี่ยนมุมมอง (เฉียง 3D / ข้าง / หน้า / หลัง / มุมสูง / หมุนอัตโนมัติ)
 * - แสดงแสงเรือง (Additive Neon EMG Glow) บนกล้ามเนื้อที่เลือกและกล้ามเนื้อที่เล่นโดนในท่านั้น
 * - จัดวางแกนลำตัว ศีรษะ และกล้ามเนื้อแยกตาม Local Anatomical Frame รองรับท่านอนหงาย/คว่ำถูกต้อง
 * ============================================================================
 */
export default function Exercise3DCoach({
  step,
  selectedEquipment = ['bodyweight'],
  selectedMuscles = [],
  isFullBody = false,
  playbackRate = 1.0,
  cameraAngle = 'side',
  onCameraAngleChange,
  onTempoBeat,
  isVisible = true,
  theme = 'dark',
  lang = 'th'
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const gridRef = useRef(null);
  const bodyPartsRef = useRef({});
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const targetCamPosRef = useRef(null);
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0.78, 0));
  const phaseBadgeRef = useRef(null);
  const phaseKindRef = useRef('eccentric');
  const loopControllerRef = useRef(null);

  const stepRef = useRef(step);
  stepRef.current = step;
  const equipRef = useRef(selectedEquipment);
  equipRef.current = selectedEquipment;
  const selectedMusclesRef = useRef(selectedMuscles);
  selectedMusclesRef.current = selectedMuscles;
  const isFullBodyRef = useRef(isFullBody);
  isFullBodyRef.current = isFullBody;
  const rateRef = useRef(playbackRate);
  rateRef.current = Number(playbackRate) || 1.0;
  const onTempoBeatRef = useRef(onTempoBeat);
  onTempoBeatRef.current = onTempoBeat;
  const langRef = useRef(lang);
  langRef.current = lang;
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  const [autoOrbit, setAutoOrbit] = useState(false);
  const [showSpineGuide, setShowSpineGuide] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const autoOrbitRef = useRef(false);
  autoOrbitRef.current = autoOrbit;
  const showSpineGuideRef = useRef(true);
  showSpineGuideRef.current = showSpineGuide;

  const isEn = lang === 'en';
  const formatPhaseLabel = (phase, isEnglish) =>
    phase === 'concentric'
      ? isEnglish
        ? 'CONCENTRIC (EXERTION)'
        : 'CONCENTRIC (จังหวะออกแรง)'
      : isEnglish
      ? 'ECCENTRIC (CONTROL)'
      : 'ECCENTRIC (จังหวะควบคุม)';

  // Map camera preset name to 3D coordinates
  const applyCameraPreset = preset => {
    const poseType = stepRef.current?.videoKinematics?.poseType || 'squat';
    const isFloorPose = [
      'pushup',
      'pike_pushup',
      'mountain_climber',
      'bench_press',
      'hip_thrust',
      'russian_twist',
      'yoga_boat',
      'yoga_cobra',
      'yoga_downward_dog',
      'yoga_seated_stretch'
    ].includes(poseType);
    const centerY = isFloorPose ? 0.42 : 0.88;
    targetLookAtRef.current = new THREE.Vector3(0, centerY, 0);

    switch (preset) {
      case 'front':
        targetCamPosRef.current = new THREE.Vector3(0, centerY + 0.25, 2.85);
        break;
      case 'back':
        targetCamPosRef.current = new THREE.Vector3(0, centerY + 0.25, -2.85);
        break;
      case 'top':
        targetCamPosRef.current = new THREE.Vector3(0.01, 3.1, 0.65);
        break;
      case 'iso':
        targetCamPosRef.current = new THREE.Vector3(2.05, centerY + 0.45, 2.05);
        break;
      case 'side':
      default:
        targetCamPosRef.current = new THREE.Vector3(2.75, centerY + 0.22, 0.35);
        break;
    }
  };

  useEffect(() => {
    applyCameraPreset(cameraAngle);
  }, [cameraAngle, step?.exerciseId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === 'light' ? '#e2e8f0' : '#08090f');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(2.35, 1.25, 1.85);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.82, 0);
    controls.minDistance = 1.35;
    controls.maxDistance = 5.5;
    controls.maxPolarAngle = Math.PI * 0.495;
    controlsRef.current = controls;

    // Studio Lighting
    scene.add(new THREE.AmbientLight('#ffffff', 0.92));
    const keyLight = new THREE.DirectionalLight('#fff7ed', 1.75);
    keyLight.position.set(3.5, 5.2, 3.8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.05);
    rimLight.position.set(-3.5, 3.0, -3.2);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight('#fb7185', 0.55);
    fillLight.position.set(0, 1.5, -4.0);
    scene.add(fillLight);

    // Studio Floor Grid + Stance Orientation Ring
    const grid = new THREE.PolarGridHelper(1.65, 16, 6, 64, '#27272a', '#18181b');
    grid.position.y = 0.002;
    scene.add(grid);
    gridRef.current = grid;

    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.12, 1.17, 64),
      new THREE.MeshBasicMaterial({ color: '#f97316', side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.005;
    scene.add(ringMesh);

    // Direction Arrow on Floor (+Z Forward Indicator)
    const dirArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.2, 16),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.65 })
    );
    dirArrow.rotation.x = Math.PI / 2;
    dirArrow.position.set(0, 0.015, 1.24);
    scene.add(dirArrow);

    const fiberTex = createMedicalMuscleFiberTexture('#9f1d22', '#ebe5dc');
    const bumpTex = createMedicalMuscleBumpTexture();

    const makeMuscleMat = () =>
      new THREE.MeshStandardMaterial({
        map: fiberTex,
        bumpMap: bumpTex,
        bumpScale: 0.032,
        color: '#99262d',
        emissive: '#180406',
        emissiveIntensity: 0.15,
        roughness: 0.38,
        metalness: 0.12
      });

    const jointMat = new THREE.MeshStandardMaterial({
      color: '#e4e4e7',
      roughness: 0.3,
      metalness: 0.2
    });

    const unitCylGeo = new THREE.CapsuleGeometry(1, 1, 8, 18);
    const sphereGeo = new THREE.SphereGeometry(1, 18, 16);
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    const athleteGroup = new THREE.Group();
    scene.add(athleteGroup);

    // Map of body segments tagged with their anatomical muscle group IDs + glow aura child
    const bodyParts = {};
    bodyPartsRef.current = bodyParts;
    const addTaggedPart = (key, geo, muscleIds) => {
      const mat = makeMuscleMat();
      const mesh = new THREE.Mesh(geo, mat);
      const glowMat = new THREE.MeshBasicMaterial({
        color: '#f97316',
        transparent: true,
        opacity: 0,
        blending: theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false
      });
      const glowMesh = new THREE.Mesh(geo, glowMat);
      if (geo === unitCylGeo) {
        glowMesh.scale.set(1.22, 1.03, 1.22);
      } else {
        glowMesh.scale.set(1.18, 1.18, 1.18);
      }
      mesh.add(glowMesh);
      mesh.userData = { muscleIds, glowMesh };
      athleteGroup.add(mesh);
      bodyParts[key] = mesh;
      return mesh;
    };

    // Core & Torso structural segments + distinct superficial muscle bellies
    addTaggedPart('pelvis', sphereGeo, ['glutes', 'hip_adductors']);
    addTaggedPart('abdomen', unitCylGeo, ['abs_rectus', 'serratus_obliques', 'rhomboids_erector']);
    addTaggedPart('absBelly', sphereGeo, ['abs_rectus']);
    addTaggedPart('obliqueR', sphereGeo, ['serratus_obliques']);
    addTaggedPart('obliqueL', sphereGeo, ['serratus_obliques']);
    addTaggedPart('thorax', unitCylGeo, ['chest_upper_Mid', 'lats_teres', 'rhomboids_erector']);
    addTaggedPart('pectoralR', sphereGeo, ['chest_upper_Mid']);
    addTaggedPart('pectoralL', sphereGeo, ['chest_upper_Mid']);
    addTaggedPart('latR', sphereGeo, ['lats_teres', 'rhomboids_erector']);
    addTaggedPart('latL', sphereGeo, ['lats_teres', 'rhomboids_erector']);
    addTaggedPart('trapNeck', unitCylGeo, ['neck_scm', 'shoulders_posterior_traps']);

    // Deltoids & Arms
    addTaggedPart('deltR', sphereGeo, ['shoulders_anterior_lateral', 'shoulders_posterior_traps']);
    addTaggedPart('deltL', sphereGeo, ['shoulders_anterior_lateral', 'shoulders_posterior_traps']);
    addTaggedPart('rearDeltR', sphereGeo, ['shoulders_posterior_traps']);
    addTaggedPart('rearDeltL', sphereGeo, ['shoulders_posterior_traps']);
    addTaggedPart('upperArmR', unitCylGeo, ['biceps_brachialis', 'triceps']);
    addTaggedPart('upperArmL', unitCylGeo, ['biceps_brachialis', 'triceps']);
    addTaggedPart('bicepR', sphereGeo, ['biceps_brachialis']);
    addTaggedPart('bicepL', sphereGeo, ['biceps_brachialis']);
    addTaggedPart('tricepR', sphereGeo, ['triceps']);
    addTaggedPart('tricepL', sphereGeo, ['triceps']);
    addTaggedPart('forearmR', unitCylGeo, ['forearms']);
    addTaggedPart('forearmL', unitCylGeo, ['forearms']);

    // Glutes & Legs
    addTaggedPart('gluteR', sphereGeo, ['glutes']);
    addTaggedPart('gluteL', sphereGeo, ['glutes']);
    addTaggedPart('thighR', unitCylGeo, ['quads', 'hamstrings', 'hip_adductors']);
    addTaggedPart('thighL', unitCylGeo, ['quads', 'hamstrings', 'hip_adductors']);
    addTaggedPart('quadR', sphereGeo, ['quads']);
    addTaggedPart('quadL', sphereGeo, ['quads']);
    addTaggedPart('hamstringR', sphereGeo, ['hamstrings']);
    addTaggedPart('hamstringL', sphereGeo, ['hamstrings']);
    addTaggedPart('shinR', unitCylGeo, ['calves_tibialis']);
    addTaggedPart('shinL', unitCylGeo, ['calves_tibialis']);
    addTaggedPart('calfR', sphereGeo, ['calves_tibialis']);
    addTaggedPart('calfL', sphereGeo, ['calves_tibialis']);
    addTaggedPart('footR', unitCylGeo, ['calves_tibialis']);
    addTaggedPart('footL', unitCylGeo, ['calves_tibialis']);

    // Head + Face Visor (uses headSpineDir as .up so supine/prone poses never invert)
    const headGroup = new THREE.Group();
    const cranium = new THREE.Mesh(sphereGeo, makeMuscleMat());
    cranium.scale.set(0.105, 0.125, 0.115);
    headGroup.add(cranium);
    const visor = new THREE.Mesh(
      boxGeo,
      new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.6 })
    );
    visor.scale.set(0.13, 0.035, 0.05);
    visor.position.set(0, 0.015, 0.095);
    headGroup.add(visor);
    athleteGroup.add(headGroup);

    // Joint spheres (knees, elbows, hands, ankles)
    const jointsMap = {};
    ['elbowR', 'elbowL', 'handR', 'handL', 'kneeR', 'kneeL', 'ankleR', 'ankleL'].forEach(k => {
      const m = new THREE.Mesh(sphereGeo, jointMat);
      const r = k.startsWith('hand') ? 0.042 : 0.046;
      m.scale.set(r, r, r);
      athleteGroup.add(m);
      jointsMap[k] = m;
    });

    // Spine & Posture Alignment Guide Line (Pelvis -> SpineMid -> Chest -> Head)
    const spineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3()
    ]);
    const spineLine = new THREE.Line(
      spineGeo,
      new THREE.LineBasicMaterial({ color: '#22d3ee', linewidth: 2, transparent: true, opacity: 0.85 })
    );
    scene.add(spineLine);

    // ==================== 3D EQUIPMENT PROPS ====================
    const propsGroup = new THREE.Group();
    scene.add(propsGroup);

    // 1. Yoga Mat
    const yogaMatMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.018, 1.82),
      new THREE.MeshStandardMaterial({ color: '#4338ca', roughness: 0.7 })
    );
    yogaMatMesh.position.set(0, 0.009, 0);
    propsGroup.add(yogaMatMesh);

    // 2. Yoga Block
    const yogaBlockMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.16),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.5 })
    );
    yogaBlockMesh.position.set(0, 0.07, 0.36);
    propsGroup.add(yogaBlockMesh);

    // 3. Bench
    const benchGroup = new THREE.Group();
    const benchPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.07, 1.16),
      new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.45 })
    );
    benchPad.position.set(0, 0.39, 0.05);
    benchGroup.add(benchPad);
    [-0.38, 0.44].forEach(zPos => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.36, 0.06),
        new THREE.MeshStandardMaterial({ color: '#52525b', metalness: 0.6, roughness: 0.3 })
      );
      leg.position.set(0, 0.18, zPos);
      benchGroup.add(leg);
    });
    propsGroup.add(benchGroup);

    // 4. Pull-Up Bar Rig
    const pullupGroup = new THREE.Group();
    const topBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1.18, 16),
      new THREE.MeshStandardMaterial({ color: '#d4d4d8', metalness: 0.8, roughness: 0.2 })
    );
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 1.94, 0);
    pullupGroup.add(topBar);
    [-0.56, 0.56].forEach(xPos => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.96, 16),
        new THREE.MeshStandardMaterial({ color: '#3f3f46', metalness: 0.5, roughness: 0.4 })
      );
      post.position.set(xPos, 0.98, 0);
      pullupGroup.add(post);
    });
    propsGroup.add(pullupGroup);

    // 5. Indoor Spin Bike
    const bikeGroup = new THREE.Group();
    const bikeSeatPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.86, 12),
      new THREE.MeshStandardMaterial({ color: '#52525b', metalness: 0.5 })
    );
    bikeSeatPost.position.set(0, 0.43, -0.22);
    bikeGroup.add(bikeSeatPost);
    const bikeSaddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.05, 0.26),
      new THREE.MeshStandardMaterial({ color: '#18181b' })
    );
    bikeSaddle.position.set(0, 0.84, -0.22);
    bikeGroup.add(bikeSaddle);
    const bikeHandlePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.05, 12),
      new THREE.MeshStandardMaterial({ color: '#52525b', metalness: 0.5 })
    );
    bikeHandlePost.position.set(0, 0.52, 0.4);
    bikeGroup.add(bikeHandlePost);
    const bikeHandleBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.46, 12),
      new THREE.MeshStandardMaterial({ color: '#e4e4e7' })
    );
    bikeHandleBar.rotation.z = Math.PI / 2;
    bikeHandleBar.position.set(0, 1.05, 0.4);
    bikeGroup.add(bikeHandleBar);
    const bikeWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.028, 12, 32),
      new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ea580c', emissiveIntensity: 0.35 })
    );
    bikeWheel.rotation.y = Math.PI / 2;
    bikeWheel.position.set(0, 0.32, 0.46);
    bikeGroup.add(bikeWheel);
    propsGroup.add(bikeGroup);

    // 6. Dumbbells (Left & Right)
    const makeDumbbell = () => {
      const g = new THREE.Group();
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.22, 12),
        new THREE.MeshStandardMaterial({ color: '#e4e4e7', metalness: 0.8, roughness: 0.2 })
      );
      handle.rotation.z = Math.PI / 2;
      g.add(handle);
      [-0.085, 0.085].forEach(xOff => {
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.038, 6),
          new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.35 })
        );
        plate.rotation.z = Math.PI / 2;
        plate.position.x = xOff;
        g.add(plate);
      });
      return g;
    };
    const dbR = makeDumbbell();
    const dbL = makeDumbbell();
    propsGroup.add(dbR);
    propsGroup.add(dbL);

    // 7. Kettlebell
    const kbGroup = new THREE.Group();
    const kbBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 18, 16),
      new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.35, metalness: 0.3 })
    );
    kbBall.position.y = -0.11;
    kbGroup.add(kbBall);
    const kbHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.015, 10, 24),
      new THREE.MeshStandardMaterial({ color: '#e4e4e7', metalness: 0.7 })
    );
    kbHandle.position.y = -0.02;
    kbGroup.add(kbHandle);
    propsGroup.add(kbGroup);

    // 8. Barbell
    const barbellGroup = new THREE.Group();
    const barShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 1.35, 16),
      new THREE.MeshStandardMaterial({ color: '#e4e4e7', metalness: 0.85, roughness: 0.2 })
    );
    barShaft.rotation.z = Math.PI / 2;
    barbellGroup.add(barShaft);
    [-0.52, -0.47, 0.47, 0.52].forEach(xOff => {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.032, 24),
        new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4 })
      );
      plate.rotation.z = Math.PI / 2;
      plate.position.x = xOff;
      barbellGroup.add(plate);
    });
    propsGroup.add(barbellGroup);

    // 9. Resistance Band Line
    const bandGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3()
    ]);
    const bandLine = new THREE.Line(
      bandGeo,
      new THREE.LineBasicMaterial({ color: '#22c55e', linewidth: 3 })
    );
    propsGroup.add(bandLine);

    // 10. Jump Rope Curve
    const ropePts = Array.from({ length: 21 }, () => new THREE.Vector3());
    const ropeGeo = new THREE.BufferGeometry().setFromPoints(ropePts);
    const ropeLine = new THREE.Line(
      ropeGeo,
      new THREE.LineBasicMaterial({ color: '#06b6d4', linewidth: 2 })
    );
    propsGroup.add(ropeLine);

    // Reusable vectors to avoid per-frame allocations
    const vPelvis = new THREE.Vector3();
    const vSpineMid = new THREE.Vector3();
    const vChest = new THREE.Vector3();
    const vHead = new THREE.Vector3();
    const vShoulderR = new THREE.Vector3();
    const vShoulderL = new THREE.Vector3();
    const vHipR = new THREE.Vector3();
    const vHipL = new THREE.Vector3();
    const vKneeR = new THREE.Vector3();
    const vKneeL = new THREE.Vector3();
    const vAnkleR = new THREE.Vector3();
    const vAnkleL = new THREE.Vector3();
    const vElbowR = new THREE.Vector3();
    const vElbowL = new THREE.Vector3();
    const spineDir = new THREE.Vector3();
    const headSpineDir = new THREE.Vector3();
    const worldRefDir = new THREE.Vector3();
    const rightDir = new THREE.Vector3();
    const thighDir = new THREE.Vector3();
    const shinDir = new THREE.Vector3();
    const armDir = new THREE.Vector3();

    let reqId = null;
    let accElapsedMs = 0;
    let lastNow = null;
    let lastPhaseKey = null;
    let isContextLost = false;

    const animate = now => {
      if (!isVisibleRef.current || isContextLost || (typeof document !== 'undefined' && document.hidden)) {
        reqId = null;
        lastNow = null;
        return;
      }
      reqId = requestAnimationFrame(animate);

      const dt = lastNow === null ? 0 : Math.min(100, Math.max(0, now - lastNow));
      lastNow = now;
      accElapsedMs += dt * rateRef.current;

      const curStep = stepRef.current;
      const kin = curStep?.videoKinematics || { poseType: 'squat', tempoSec: 1.5, equipRender: 'bodyweight' };
      const tempoMs = Math.max(450, (kin.tempoSec || 1.5) * 1000);
      const cyclePhase = (accElapsedMs % tempoMs) / tempoMs;
      const wave = 0.5 - 0.5 * Math.cos(cyclePhase * Math.PI * 2);
      const signedWave = Math.sin(cyclePhase * Math.PI * 2);
      const breathPulse = 0.5 + 0.5 * Math.sin(now * 0.004);

      const curPhaseKey = wave > 0.52 ? 'concentric' : 'eccentric';
      if (curPhaseKey !== lastPhaseKey) {
        if (lastPhaseKey !== null) {
          onTempoBeatRef.current?.(curPhaseKey);
        }
        lastPhaseKey = curPhaseKey;
        phaseKindRef.current = curPhaseKey;
        if (phaseBadgeRef.current) {
          phaseBadgeRef.current.textContent = formatPhaseLabel(curPhaseKey, langRef.current === 'en');
        }
      }

      // Equipment resolution for current pose (honors real selected equipment)
      const stepEq = curStep?.equipmentUsed || curStep?.equipment || ['bodyweight'];
      const isFloorBridge = kin.poseType === 'hip_thrust';
      const hasBenchEquip =
        !isFloorBridge &&
        (stepEq.includes('bench') || kin.equipRender === 'bench' || kin.equipRender === 'bench_barbell');
      const activeEquip = isFloorBridge
        ? (kin.equipRender || 'yoga_mat')
        : (stepEq.find(eq => (equipRef.current || []).includes(eq)) ||
           kin.equipRender ||
           stepEq[0] ||
           'bodyweight');

      // Compute 3D joint positions for current exercise pose with bench vs floor awareness
      const j = compute3DPoseJoints(kin.poseType, wave, signedWave, cyclePhase, { hasBench: hasBenchEquip });

      vPelvis.set(j.pelvis.x, j.pelvis.y, j.pelvis.z);
      vSpineMid.set(j.spineMid.x, j.spineMid.y, j.spineMid.z);
      vChest.set(j.chest.x, j.chest.y, j.chest.z);
      vHead.set(j.head.x, j.head.y, j.head.z);
      vShoulderR.set(j.shoulderR.x, j.shoulderR.y, j.shoulderR.z);
      vShoulderL.set(j.shoulderL.x, j.shoulderL.y, j.shoulderL.z);
      vHipR.set(j.hipR.x, j.hipR.y, j.hipR.z);
      vHipL.set(j.hipL.x, j.hipL.y, j.hipL.z);
      vKneeR.set(j.kneeR.x, j.kneeR.y, j.kneeR.z);
      vKneeL.set(j.kneeL.x, j.kneeL.y, j.kneeL.z);
      vAnkleR.set(j.ankleR.x, j.ankleR.y, j.ankleR.z);
      vAnkleL.set(j.ankleL.x, j.ankleL.y, j.ankleL.z);
      vElbowR.set(j.elbowR.x, j.elbowR.y, j.elbowR.z);
      vElbowL.set(j.elbowL.x, j.elbowL.y, j.elbowL.z);

      // Compute Local Anatomical Torso Coordinate Frame
      spineDir.subVectors(vChest, vPelvis);
      if (spineDir.lengthSq() < 1e-5) spineDir.set(0, 1, 0);
      spineDir.normalize();

      if (SUPINE_POSES.has(kin.poseType)) {
        worldRefDir.set(0, 1, 0);
      } else if (PRONE_POSES.has(kin.poseType)) {
        worldRefDir.set(0, -1, 0);
      } else {
        worldRefDir.set(0, 0, 1);
      }

      const anteriorDir = projectOrthogonal(worldRefDir, spineDir, new THREE.Vector3(0, 0, 1));
      const posteriorDir = anteriorDir.clone().negate();
      rightDir.subVectors(vShoulderR, vShoulderL);
      if (rightDir.lengthSq() < 1e-5) rightDir.set(1, 0, 0);
      rightDir.normalize();

      // Update limbs & torso
      orientLimbMesh(bodyParts.abdomen, j.pelvis, j.spineMid, 0.13, 0.095);
      orientLimbMesh(bodyParts.thorax, j.spineMid, j.chest, 0.155, 0.105);
      orientLimbMesh(bodyParts.trapNeck, j.chest, j.head, 0.072, 0.072);

      bodyParts.pelvis.position.copy(vPelvis);
      orientAlongDir(bodyParts.pelvis, spineDir, 0.145, 0.11, 0.115);

      // Superficial Abs & Obliques aligned with torso frame
      bodyParts.absBelly.position
        .copy(vPelvis)
        .lerp(vSpineMid, 0.55)
        .addScaledVector(anteriorDir, 0.085);
      orientAlongDir(bodyParts.absBelly, spineDir, 0.095, 0.14, 0.045);

      bodyParts.obliqueR.position
        .copy(vSpineMid)
        .addScaledVector(rightDir, 0.115)
        .addScaledVector(anteriorDir, 0.03);
      orientAlongDir(bodyParts.obliqueR, spineDir, 0.055, 0.125, 0.065);

      bodyParts.obliqueL.position
        .copy(vSpineMid)
        .addScaledVector(rightDir, -0.115)
        .addScaledVector(anteriorDir, 0.03);
      orientAlongDir(bodyParts.obliqueL, spineDir, 0.055, 0.125, 0.065);

      // Pectorals (anterior chest) & Lats (posterior back)
      bodyParts.pectoralR.position
        .copy(vChest)
        .addScaledVector(rightDir, 0.085)
        .addScaledVector(spineDir, -0.02)
        .addScaledVector(anteriorDir, 0.085);
      orientAlongDir(bodyParts.pectoralR, spineDir, 0.085, 0.07, 0.055);

      bodyParts.pectoralL.position
        .copy(vChest)
        .addScaledVector(rightDir, -0.085)
        .addScaledVector(spineDir, -0.02)
        .addScaledVector(anteriorDir, 0.085);
      orientAlongDir(bodyParts.pectoralL, spineDir, 0.085, 0.07, 0.055);

      bodyParts.latR.position
        .copy(vSpineMid)
        .addScaledVector(rightDir, 0.115)
        .addScaledVector(spineDir, 0.04)
        .addScaledVector(posteriorDir, 0.06);
      orientAlongDir(bodyParts.latR, spineDir, 0.075, 0.14, 0.06);

      bodyParts.latL.position
        .copy(vSpineMid)
        .addScaledVector(rightDir, -0.115)
        .addScaledVector(spineDir, 0.04)
        .addScaledVector(posteriorDir, 0.06);
      orientAlongDir(bodyParts.latL, spineDir, 0.075, 0.14, 0.06);

      // Deltoids & Rear Delts
      bodyParts.deltR.position.copy(vShoulderR);
      bodyParts.deltR.scale.set(0.072, 0.075, 0.072);
      bodyParts.deltL.position.copy(vShoulderL);
      bodyParts.deltL.scale.set(0.072, 0.075, 0.072);

      bodyParts.rearDeltR.position.copy(vShoulderR).addScaledVector(posteriorDir, 0.045);
      bodyParts.rearDeltR.scale.set(0.058, 0.062, 0.052);
      bodyParts.rearDeltL.position.copy(vShoulderL).addScaledVector(posteriorDir, 0.045);
      bodyParts.rearDeltL.scale.set(0.058, 0.062, 0.052);

      // Upper Arms + distinct Biceps & Triceps bellies
      orientLimbMesh(bodyParts.upperArmR, j.shoulderR, j.elbowR, 0.052);
      orientLimbMesh(bodyParts.upperArmL, j.shoulderL, j.elbowL, 0.052);

      armDir.subVectors(vElbowR, vShoulderR).normalize();
      const armAntR = projectOrthogonal(anteriorDir, armDir, new THREE.Vector3(0, 0, 1));
      bodyParts.bicepR.position.copy(vShoulderR).lerp(vElbowR, 0.5).addScaledVector(armAntR, 0.03);
      orientAlongDir(bodyParts.bicepR, armDir, 0.045, 0.11, 0.045);
      bodyParts.tricepR.position.copy(vShoulderR).lerp(vElbowR, 0.45).addScaledVector(armAntR, -0.032);
      orientAlongDir(bodyParts.tricepR, armDir, 0.045, 0.11, 0.045);

      armDir.subVectors(vElbowL, vShoulderL).normalize();
      const armAntL = projectOrthogonal(anteriorDir, armDir, new THREE.Vector3(0, 0, 1));
      bodyParts.bicepL.position.copy(vShoulderL).lerp(vElbowL, 0.5).addScaledVector(armAntL, 0.03);
      orientAlongDir(bodyParts.bicepL, armDir, 0.045, 0.11, 0.045);
      bodyParts.tricepL.position.copy(vShoulderL).lerp(vElbowL, 0.45).addScaledVector(armAntL, -0.032);
      orientAlongDir(bodyParts.tricepL, armDir, 0.045, 0.11, 0.045);

      orientLimbMesh(bodyParts.forearmR, j.elbowR, j.handR, 0.044);
      orientLimbMesh(bodyParts.forearmL, j.elbowL, j.handL, 0.044);

      // Glutes positioned along posterior torso direction (never protruding forward through mat in supine)
      bodyParts.gluteR.position
        .copy(vHipR)
        .addScaledVector(posteriorDir, 0.055)
        .addScaledVector(spineDir, -0.02);
      orientAlongDir(bodyParts.gluteR, spineDir, 0.088, 0.095, 0.085);

      bodyParts.gluteL.position
        .copy(vHipL)
        .addScaledVector(posteriorDir, 0.055)
        .addScaledVector(spineDir, -0.02);
      orientAlongDir(bodyParts.gluteL, spineDir, 0.088, 0.095, 0.085);

      // Thighs + distinct Quads & Hamstrings bellies
      orientLimbMesh(bodyParts.thighR, j.hipR, j.kneeR, 0.072);
      orientLimbMesh(bodyParts.thighL, j.hipL, j.kneeL, 0.072);

      const legUpRef = SUPINE_POSES.has(kin.poseType)
        ? new THREE.Vector3(0, 1, 0)
        : PRONE_POSES.has(kin.poseType)
        ? new THREE.Vector3(0, -1, 0)
        : new THREE.Vector3(0, 0, 1);

      thighDir.subVectors(vKneeR, vHipR).normalize();
      const thighAntR = projectOrthogonal(legUpRef, thighDir, anteriorDir);
      bodyParts.quadR.position.copy(vHipR).lerp(vKneeR, 0.5).addScaledVector(thighAntR, 0.036);
      orientAlongDir(bodyParts.quadR, thighDir, 0.062, 0.15, 0.058);
      bodyParts.hamstringR.position.copy(vHipR).lerp(vKneeR, 0.5).addScaledVector(thighAntR, -0.036);
      orientAlongDir(bodyParts.hamstringR, thighDir, 0.058, 0.145, 0.055);

      thighDir.subVectors(vKneeL, vHipL).normalize();
      const thighAntL = projectOrthogonal(legUpRef, thighDir, anteriorDir);
      bodyParts.quadL.position.copy(vHipL).lerp(vKneeL, 0.5).addScaledVector(thighAntL, 0.036);
      orientAlongDir(bodyParts.quadL, thighDir, 0.062, 0.15, 0.058);
      bodyParts.hamstringL.position.copy(vHipL).lerp(vKneeL, 0.5).addScaledVector(thighAntL, -0.036);
      orientAlongDir(bodyParts.hamstringL, thighDir, 0.058, 0.145, 0.055);

      // Shins + Calves
      orientLimbMesh(bodyParts.shinR, j.kneeR, j.ankleR, 0.052);
      orientLimbMesh(bodyParts.shinL, j.kneeL, j.ankleL, 0.052);

      shinDir.subVectors(vAnkleR, vKneeR).normalize();
      const shinPostR = projectOrthogonal(posteriorDir, shinDir, new THREE.Vector3(0, 0, -1));
      bodyParts.calfR.position.copy(vKneeR).lerp(vAnkleR, 0.38).addScaledVector(shinPostR, 0.032);
      orientAlongDir(bodyParts.calfR, shinDir, 0.048, 0.12, 0.052);

      shinDir.subVectors(vAnkleL, vKneeL).normalize();
      const shinPostL = projectOrthogonal(posteriorDir, shinDir, new THREE.Vector3(0, 0, -1));
      bodyParts.calfL.position.copy(vKneeL).lerp(vAnkleL, 0.38).addScaledVector(shinPostL, 0.032);
      orientAlongDir(bodyParts.calfL, shinDir, 0.048, 0.12, 0.052);

      orientLimbMesh(bodyParts.footR, j.ankleR, j.toeR, 0.042, 0.036);
      orientLimbMesh(bodyParts.footL, j.ankleL, j.toeL, 0.042, 0.036);

      // Head position & gaze direction with anatomically aligned .up vector
      headSpineDir.subVectors(vHead, vChest);
      if (headSpineDir.lengthSq() < 1e-5) headSpineDir.copy(spineDir);
      headSpineDir.normalize();
      headGroup.up.copy(headSpineDir);
      headGroup.position.copy(vHead);
      headGroup.lookAt(j.lookAt.x, j.lookAt.y, j.lookAt.z);

      // Joint spheres
      ['elbowR', 'elbowL', 'handR', 'handL', 'kneeR', 'kneeL', 'ankleR', 'ankleL'].forEach(k => {
        jointsMap[k].position.set(j[k].x, j[k].y, j[k].z);
      });

      // Spine Alignment Guide
      spineLine.visible = showSpineGuideRef.current;
      if (spineLine.visible) {
        const posAttr = spineGeo.attributes.position;
        posAttr.setXYZ(0, j.pelvis.x, j.pelvis.y, j.pelvis.z);
        posAttr.setXYZ(1, j.spineMid.x, j.spineMid.y, j.spineMid.z);
        posAttr.setXYZ(2, j.chest.x, j.chest.y, j.chest.z);
        posAttr.setXYZ(3, j.head.x, j.head.y, j.head.z);
        posAttr.needsUpdate = true;
      }

      // Highlight & Neon-Glow Selected Muscles + Active Worked Muscles (Primary & Secondary EMG)
      const primaryId = curStep?.primaryMuscle || 'quads';
      const primaryColor = curStep?.primaryMuscleColor || '#f97316';
      const secondaryIds = curStep?.secondaryMuscles || [];
      const emgMap = curStep?.emgActivation || {};
      const selSet = new Set(selectedMusclesRef.current || []);
      const isRest = curStep?.type === 'REST' || curStep?.type === 'COOLDOWN';

      Object.values(bodyParts).forEach(mesh => {
        const ids = mesh.userData.muscleIds || [];
        const glow = mesh.userData.glowMesh;
        const isPrimary = ids.includes(primaryId);
        const isSecondary =
          !isPrimary && (ids.some(id => secondaryIds.includes(id)) || ids.some(id => (emgMap[id] || 0) > 0));
        const isSelected = !isFullBodyRef.current && ids.some(id => selSet.has(id));

        if (isRest) {
          if (isPrimary) {
            mesh.material.color.set('#22d3ee');
            mesh.material.emissive.set('#06b6d4');
            mesh.material.emissiveIntensity = 0.52 + wave * 0.35;
            if (glow) {
              glow.material.color.set('#22d3ee');
              glow.material.opacity = 0.22 + wave * 0.16;
            }
          } else if (isSelected) {
            mesh.material.color.set('#38bdf8');
            mesh.material.emissive.set('#0284c7');
            mesh.material.emissiveIntensity = 0.36 + breathPulse * 0.15;
            if (glow) {
              glow.material.color.set('#38bdf8');
              glow.material.opacity = 0.15 + breathPulse * 0.08;
            }
          } else {
            mesh.material.color.set('#52525b');
            mesh.material.emissive.set('#090d16');
            mesh.material.emissiveIntensity = 0.1;
            if (glow) glow.material.opacity = 0;
          }
        } else if (isPrimary) {
          mesh.material.color.set(primaryColor);
          mesh.material.emissive.set(primaryColor);
          mesh.material.emissiveIntensity = 0.78 + wave * 0.85;
          if (glow) {
            glow.material.color.set(isSelected ? '#fde047' : primaryColor);
            glow.material.opacity = 0.28 + wave * 0.32;
          }
        } else if (isSecondary) {
          mesh.material.color.set('#fbbf24');
          mesh.material.emissive.set('#f59e0b');
          mesh.material.emissiveIntensity = 0.45 + wave * 0.45;
          if (glow) {
            glow.material.color.set(isSelected ? '#38bdf8' : '#fbbf24');
            glow.material.opacity = 0.18 + wave * 0.2;
          }
        } else if (isSelected) {
          mesh.material.color.set('#38bdf8');
          mesh.material.emissive.set('#0ea5e9');
          mesh.material.emissiveIntensity = 0.48 + breathPulse * 0.2;
          if (glow) {
            glow.material.color.set('#38bdf8');
            glow.material.opacity = 0.2 + breathPulse * 0.1;
          }
        } else if (isFullBodyRef.current) {
          mesh.material.color.set('#b91c1c');
          mesh.material.emissive.set('#7f1d1d');
          mesh.material.emissiveIntensity = 0.22 + breathPulse * 0.08;
          if (glow) {
            glow.material.color.set('#fb923c');
            glow.material.opacity = 0.07;
          }
        } else {
          mesh.material.color.set('#7f1d1d');
          mesh.material.emissive.set('#180406');
          mesh.material.emissiveIntensity = 0.1;
          if (glow) glow.material.opacity = 0;
        }
      });

      const isFloorPose = [
        'pushup',
        'pike_pushup',
        'mountain_climber',
        'hip_thrust',
        'russian_twist',
        'yoga_boat',
        'yoga_cobra',
        'yoga_downward_dog',
        'yoga_seated_stretch'
      ].includes(kin.poseType) || ((kin.poseType === 'bench_press' || kin.poseType === 'tricep_dip') && !hasBenchEquip);

      yogaMatMesh.visible = activeEquip === 'yoga_mat' || activeEquip === 'yoga_block' || isFloorPose;
      yogaBlockMesh.visible = activeEquip === 'yoga_block';
      benchGroup.visible =
        hasBenchEquip &&
        (kin.poseType === 'bench_press' ||
          kin.poseType === 'tricep_dip' ||
          activeEquip === 'bench' ||
          activeEquip === 'bench_barbell');
      pullupGroup.visible = activeEquip === 'pullup_bar' || kin.poseType === 'pullup';
      bikeGroup.visible = activeEquip === 'bike' || kin.poseType === 'indoor_bike';
      if (bikeGroup.visible) {
        bikeWheel.rotation.x = cyclePhase * Math.PI * 4;
      }

      dbR.visible = activeEquip === 'dumbbell';
      dbL.visible = activeEquip === 'dumbbell';
      if (dbR.visible) {
        dbR.position.set(j.handR.x, j.handR.y, j.handR.z);
        dbL.position.set(j.handL.x, j.handL.y, j.handL.z);
      }

      kbGroup.visible = activeEquip === 'kettlebell';
      if (kbGroup.visible) {
        kbGroup.position.set(
          (j.handR.x + j.handL.x) * 0.5,
          (j.handR.y + j.handL.y) * 0.5,
          (j.handR.z + j.handL.z) * 0.5
        );
      }

      barbellGroup.visible = activeEquip === 'barbell' || activeEquip === 'bench_barbell';
      if (barbellGroup.visible) {
        barbellGroup.position.set(
          (j.handR.x + j.handL.x) * 0.5,
          (j.handR.y + j.handL.y) * 0.5,
          (j.handR.z + j.handL.z) * 0.5
        );
      }

      bandLine.visible = activeEquip === 'band';
      if (bandLine.visible) {
        const bAttr = bandGeo.attributes.position;
        bAttr.setXYZ(0, j.handL.x, j.handL.y, j.handL.z);
        bAttr.setXYZ(1, 0, j.chest.y, 0.55);
        bAttr.setXYZ(2, j.handR.x, j.handR.y, j.handR.z);
        bAttr.needsUpdate = true;
      }

      ropeLine.visible = activeEquip === 'jump_rope' || kin.poseType === 'jump_rope';
      if (ropeLine.visible) {
        const rAttr = ropeGeo.attributes.position;
        const ropeAng = cyclePhase * Math.PI * 2;
        const peakY = j.pelvis.y + Math.cos(ropeAng) * 0.92;
        const peakZ = Math.sin(ropeAng) * 0.65;
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const x = j.handL.x * (1 - t) + j.handR.x * t;
          const archFactor = Math.sin(t * Math.PI);
          const y = j.handL.y * (1 - archFactor) + peakY * archFactor;
          const z = j.handL.z * (1 - archFactor) + peakZ * archFactor;
          rAttr.setXYZ(i, x, Math.max(0.01, y), z);
        }
        rAttr.needsUpdate = true;
      }

      // Smooth Camera Preset Transition (stops once reached so user Pan works freely)
      if (targetLookAtRef.current) {
        controls.target.lerp(targetLookAtRef.current, 0.14);
        if (controls.target.distanceTo(targetLookAtRef.current) < 0.02) {
          targetLookAtRef.current = null;
        }
      }
      if (targetCamPosRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.14);
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.04) {
          targetCamPosRef.current = null;
        }
      }
      controls.autoRotate = autoOrbitRef.current;
      controls.autoRotateSpeed = 2.4;
      controls.update();

      renderer.render(scene, camera);
    };

    const startLoop = () => {
      if (reqId === null && isVisibleRef.current && !isContextLost && !(typeof document !== 'undefined' && document.hidden)) {
        lastNow = null;
        reqId = requestAnimationFrame(animate);
      }
    };
    const stopLoop = () => {
      if (reqId !== null) {
        cancelAnimationFrame(reqId);
        reqId = null;
      }
      lastNow = null;
    };
    loopControllerRef.current = { startLoop, stopLoop };

    const handleVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    const handleContextLost = e => {
      e.preventDefault();
      isContextLost = true;
      setContextLost(true);
      stopLoop();
    };
    const handleContextRestored = () => {
      isContextLost = false;
      setContextLost(false);
      startLoop();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    startLoop();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 520;
      const newH = container.clientHeight || 320;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      stopLoop();
      loopControllerRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      disposeThreeScene(scene);
      renderer.dispose();
    };
  }, []);

  // Pause/resume WebGL animation loop when tab visibility changes
  useEffect(() => {
    if (isVisible) {
      loopControllerRef.current?.startLoop();
      const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
      return () => clearTimeout(t);
    } else {
      loopControllerRef.current?.stopLoop();
    }
  }, [isVisible]);

  // Update phase badge label immediately on language switch
  useEffect(() => {
    if (phaseBadgeRef.current) {
      phaseBadgeRef.current.textContent = formatPhaseLabel(phaseKindRef.current, lang === 'en');
    }
  }, [lang]);

  // Sync 3D studio background, floor grid & glow blending with Dark/Light theme (after mount)
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(theme === 'light' ? '#e2e8f0' : '#08090f');
    }
    if (gridRef.current) {
      const mats = Array.isArray(gridRef.current.material) ? gridRef.current.material : [gridRef.current.material];
      mats.forEach(mat => {
        if (mat?.color) {
          mat.color.set(theme === 'light' ? '#94a3b8' : '#27272a');
        }
      });
    }
    const targetBlend = theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending;
    Object.values(bodyPartsRef.current).forEach(mesh => {
      const glow = mesh.userData?.glowMesh;
      if (glow?.material && glow.material.blending !== targetBlend) {
        glow.material.blending = targetBlend;
        glow.material.needsUpdate = true;
      }
    });
  }, [theme]);

  const zoomCamera = delta => {
    const cam = cameraRef.current;
    const ctr = controlsRef.current;
    if (!cam || !ctr) return;
    const dir = new THREE.Vector3().subVectors(cam.position, ctr.target).normalize();
    const dist = Math.min(4.8, Math.max(1.4, cam.position.distanceTo(ctr.target) + delta));
    targetCamPosRef.current = ctr.target.clone().addScaledVector(dir, dist);
  };

  const primaryLabel = step?.primaryMuscle ? getMuscleDisplayName(step.primaryMuscle, lang) : '';
  const secondaryLabels = (step?.secondaryMuscles || [])
    .slice(0, 2)
    .map(id => getMuscleDisplayName(id, lang));

  return (
    <div className="relative w-full h-full flex flex-col justify-between select-none">
      {/* Three.js Interactive 3D Viewport */}
      <div ref={mountRef} className="w-full h-full min-h-[240px] sm:min-h-[280px] cursor-grab active:cursor-grabbing" />

      {contextLost && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/90 text-xs font-bold text-amber-300 px-4 text-center">
          {isEn ? 'Restoring 3D graphics context…' : 'กำลังกู้คืนการแสดงผลกราฟิก 3D…'}
        </div>
      )}

      {/* Top HUD Overlay: 360° Drag Hint + Contraction Phase + Glowing Muscle Legend */}
      <div className="pointer-events-none absolute top-2.5 inset-x-2.5 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950/85 border border-zinc-800 text-[10px] sm:text-[11px] font-bold text-cyan-300 shadow">
            {isEn ? '👆 Drag to rotate 360° • Scroll to zoom' : '👆 ลากหมุนดูท่า 3D ได้ 360° • เลื่อนซูมดูมุมข้อต่อ'}
          </span>
          <span
            ref={phaseBadgeRef}
            className="px-2.5 py-1 rounded-lg bg-zinc-950/85 border border-zinc-800 text-[10px] font-mono font-bold text-orange-300 shadow"
          >
            {formatPhaseLabel(phaseKindRef.current, isEn)}
          </span>
        </div>

        {/* Active Muscle Glow Indicator Bar */}
        {primaryLabel && (
          <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
            <span className="px-2 py-0.5 rounded-md bg-zinc-950/85 border border-orange-500/50 text-orange-300 shadow">
              ✨ {isEn ? 'Primary Glow' : 'เรืองแสงหลัก'}: {primaryLabel}
            </span>
            {secondaryLabels.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-950/85 border border-amber-500/40 text-amber-300 shadow">
                ⚡ {isEn ? 'Secondary' : 'กล้ามเสริม'}: {secondaryLabels.join(', ')}
              </span>
            )}
            {!isFullBody && selectedMuscles.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-950/85 border border-cyan-500/40 text-cyan-300 shadow">
                💎 {isEn ? 'Selected' : 'ที่เลือก'}: {selectedMuscles.length}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom-Right Compact Controls (Orbit / Spine / Zoom — Camera presets sit cleanly in footer bar) */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center justify-end pointer-events-auto">
        <div className="flex items-center gap-1 bg-zinc-950/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setAutoOrbit(v => !v)}
            title={isEn ? 'Auto-rotate 360° around athlete' : 'หมุนกล้องรอบตัวนักกีฬาอัตโนมัติ'}
            className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-bold transition ${
              autoOrbit ? 'bg-orange-500 text-white' : 'text-zinc-300 hover:text-white'
            }`}
          >
            {autoOrbit ? (isEn ? '🔄 Orbit: ON' : '🔄 หมุนรอบ: เปิด') : (isEn ? '🔄 Orbit' : '🔄 หมุนรอบ')}
          </button>
          <button
            type="button"
            onClick={() => setShowSpineGuide(v => !v)}
            title={isEn ? 'Toggle spine alignment line' : 'แสดงเส้นแนวแกนกระดูกสันหลัง'}
            className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-bold transition ${
              showSpineGuide ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isEn ? '🦴 Spine' : '🦴 แกนหลัง'}
          </button>
          <button
            type="button"
            onClick={() => zoomCamera(-0.45)}
            aria-label={isEn ? 'Zoom in' : 'ซูมเข้า'}
            className="min-h-[32px] px-2 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => zoomCamera(0.45)}
            aria-label={isEn ? 'Zoom out' : 'ซูมออก'}
            className="min-h-[32px] px-2 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
          >
            －
          </button>
        </div>
      </div>
    </div>
  );
}
