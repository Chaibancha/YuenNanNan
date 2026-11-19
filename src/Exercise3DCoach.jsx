import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createMedicalMuscleFiberTexture, createMedicalMuscleBumpTexture } from './Body3DAnatomy.js';
import { compute3DPoseJoints } from './exercise3DKinematics.js';

const UP_VEC = new THREE.Vector3(0, 1, 0);

function orientLimbMesh(mesh, p1, p2, radiusX, radiusZ = radiusX) {
  const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
  const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
  const dir = new THREE.Vector3().subVectors(v2, v1);
  const len = Math.max(0.001, dir.length());
  mesh.position.copy(v1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP_VEC, dir.clone().normalize());
  mesh.scale.set(radiusX, len * 0.5, radiusZ);
}

/**
 * ============================================================================
 * Exercise3DCoach.jsx
 * โมเดลนักกีฬากายวิภาค 3 มิติแบบโต้ตอบหมุนดูท่าฝึกได้ 360° (Interactive 3D Form Coach)
 * - หมุนกล้อง ซูม และเปลี่ยนมุมมอง (เฉียง 3D / ข้าง / หน้า / หลัง / มุมสูง / หมุนอัตโนมัติ)
 * - แสดงเส้นใยกล้ามเนื้อที่ออกแรง (Primary & Secondary EMG Glow) ตามจังหวะ Concentric/Eccentric
 * - แสดงเส้นแกนกระดูกสันหลัง (Spine Alignment) และอุปกรณ์ 3 มิติครบทั้ง 11 ชนิด
 * ============================================================================
 */
export default function Exercise3DCoach({
  step,
  selectedEquipment = ['bodyweight'],
  playbackRate = 1.0,
  cameraAngle = 'side',
  onCameraAngleChange
}) {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const targetCamPosRef = useRef(null);
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0.78, 0));

  const stepRef = useRef(step);
  stepRef.current = step;
  const equipRef = useRef(selectedEquipment);
  equipRef.current = selectedEquipment;
  const rateRef = useRef(playbackRate);
  rateRef.current = Number(playbackRate) || 1.0;

  const [autoOrbit, setAutoOrbit] = useState(false);
  const [showSpineGuide, setShowSpineGuide] = useState(true);
  const [phaseLabel, setPhaseLabel] = useState('ECCENTRIC (จังหวะควบคุม)');
  const autoOrbitRef = useRef(false);
  autoOrbitRef.current = autoOrbit;
  const showSpineGuideRef = useRef(true);
  showSpineGuideRef.current = showSpineGuide;

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
    const centerY = isFloorPose ? 0.48 : 0.88;
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
    scene.background = new THREE.Color('#08090f');

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
    scene.add(new THREE.AmbientLight('#ffffff', 0.85));
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

    // Map of body segments tagged with their anatomical muscle group IDs
    const bodyParts = {};
    const addTaggedPart = (key, geo, muscleIds) => {
      const mat = makeMuscleMat();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { muscleIds };
      athleteGroup.add(mesh);
      bodyParts[key] = mesh;
      return mesh;
    };

    // Core & Torso segments
    addTaggedPart('pelvis', sphereGeo, ['glutes', 'hip_adductors']);
    addTaggedPart('abdomen', unitCylGeo, ['abs_rectus', 'serratus_obliques', 'rhomboids_erector']);
    addTaggedPart('thorax', unitCylGeo, ['chest_upper_Mid', 'lats_teres', 'rhomboids_erector']);
    addTaggedPart('pectoralR', sphereGeo, ['chest_upper_Mid']);
    addTaggedPart('pectoralL', sphereGeo, ['chest_upper_Mid']);
    addTaggedPart('latR', sphereGeo, ['lats_teres', 'rhomboids_erector']);
    addTaggedPart('latL', sphereGeo, ['lats_teres', 'rhomboids_erector']);
    addTaggedPart('trapNeck', unitCylGeo, ['neck_scm', 'shoulders_posterior_traps']);

    // Deltoids & Arms
    addTaggedPart('deltR', sphereGeo, ['shoulders_anterior_lateral', 'shoulders_posterior_traps']);
    addTaggedPart('deltL', sphereGeo, ['shoulders_anterior_lateral', 'shoulders_posterior_traps']);
    addTaggedPart('upperArmR', unitCylGeo, ['biceps_brachialis', 'triceps']);
    addTaggedPart('upperArmL', unitCylGeo, ['biceps_brachialis', 'triceps']);
    addTaggedPart('forearmR', unitCylGeo, ['forearms']);
    addTaggedPart('forearmL', unitCylGeo, ['forearms']);

    // Glutes & Legs
    addTaggedPart('gluteR', sphereGeo, ['glutes']);
    addTaggedPart('gluteL', sphereGeo, ['glutes']);
    addTaggedPart('thighR', unitCylGeo, ['quads', 'hamstrings', 'hip_adductors']);
    addTaggedPart('thighL', unitCylGeo, ['quads', 'hamstrings', 'hip_adductors']);
    addTaggedPart('shinR', unitCylGeo, ['calves_tibialis']);
    addTaggedPart('shinL', unitCylGeo, ['calves_tibialis']);
    addTaggedPart('footR', unitCylGeo, ['calves_tibialis']);
    addTaggedPart('footL', unitCylGeo, ['calves_tibialis']);

    // Head + Face Visor (so user clearly sees head gaze direction in 3D)
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

    let reqId;
    const startTime = performance.now();
    let lastPhaseHalf = '';

    const animate = now => {
      reqId = requestAnimationFrame(animate);

      const curStep = stepRef.current;
      const kin = curStep?.videoKinematics || { poseType: 'squat', tempoSec: 1.5, equipRender: 'bodyweight' };
      const tempoMs = Math.max(450, (kin.tempoSec || 1.5) * 1000);
      const elapsed = (now - startTime) * rateRef.current;
      const cyclePhase = (elapsed % tempoMs) / tempoMs;
      const wave = 0.5 - 0.5 * Math.cos(cyclePhase * Math.PI * 2);
      const signedWave = Math.sin(cyclePhase * Math.PI * 2);

      const curHalf = wave > 0.52 ? 'CONCENTRIC (จังหวะออกแรง)' : 'ECCENTRIC (จังหวะควบคุม)';
      if (curHalf !== lastPhaseHalf) {
        lastPhaseHalf = curHalf;
        setPhaseLabel(curHalf);
      }

      // Compute 3D joint positions for current exercise pose
      const j = compute3DPoseJoints(kin.poseType, wave, signedWave, cyclePhase);

      // Update limbs & torso
      orientLimbMesh(bodyParts.abdomen, j.pelvis, j.spineMid, 0.13, 0.095);
      orientLimbMesh(bodyParts.thorax, j.spineMid, j.chest, 0.16, 0.11);
      orientLimbMesh(bodyParts.trapNeck, j.chest, j.head, 0.075, 0.075);

      bodyParts.pelvis.position.set(j.pelvis.x, j.pelvis.y, j.pelvis.z);
      bodyParts.pelvis.scale.set(0.145, 0.11, 0.115);

      // Pectorals & Lats attached around chest
      bodyParts.pectoralR.position.set(j.chest.x + 0.085, j.chest.y - 0.02, j.chest.z + 0.085);
      bodyParts.pectoralR.scale.set(0.085, 0.07, 0.055);
      bodyParts.pectoralL.position.set(j.chest.x - 0.085, j.chest.y - 0.02, j.chest.z + 0.085);
      bodyParts.pectoralL.scale.set(0.085, 0.07, 0.055);

      bodyParts.latR.position.set(j.spineMid.x + 0.12, j.spineMid.y + 0.04, j.spineMid.z - 0.06);
      bodyParts.latR.scale.set(0.075, 0.14, 0.065);
      bodyParts.latL.position.set(j.spineMid.x - 0.12, j.spineMid.y + 0.04, j.spineMid.z - 0.06);
      bodyParts.latL.scale.set(0.075, 0.14, 0.065);

      // Deltoids & Arms
      bodyParts.deltR.position.set(j.shoulderR.x, j.shoulderR.y, j.shoulderR.z);
      bodyParts.deltR.scale.set(0.072, 0.075, 0.072);
      bodyParts.deltL.position.set(j.shoulderL.x, j.shoulderL.y, j.shoulderL.z);
      bodyParts.deltL.scale.set(0.072, 0.075, 0.072);

      orientLimbMesh(bodyParts.upperArmR, j.shoulderR, j.elbowR, 0.054);
      orientLimbMesh(bodyParts.upperArmL, j.shoulderL, j.elbowL, 0.054);
      orientLimbMesh(bodyParts.forearmR, j.elbowR, j.handR, 0.044);
      orientLimbMesh(bodyParts.forearmL, j.elbowL, j.handL, 0.044);

      // Glutes & Legs
      bodyParts.gluteR.position.set(j.hipR.x, j.hipR.y, j.hipR.z - 0.045);
      bodyParts.gluteR.scale.set(0.085, 0.095, 0.085);
      bodyParts.gluteL.position.set(j.hipL.x, j.hipL.y, j.hipL.z - 0.045);
      bodyParts.gluteL.scale.set(0.085, 0.095, 0.085);

      orientLimbMesh(bodyParts.thighR, j.hipR, j.kneeR, 0.076);
      orientLimbMesh(bodyParts.thighL, j.hipL, j.kneeL, 0.076);
      orientLimbMesh(bodyParts.shinR, j.kneeR, j.ankleR, 0.056);
      orientLimbMesh(bodyParts.shinL, j.kneeL, j.ankleL, 0.056);
      orientLimbMesh(bodyParts.footR, j.ankleR, j.toeR, 0.042, 0.036);
      orientLimbMesh(bodyParts.footL, j.ankleL, j.toeL, 0.042, 0.036);

      // Head position & gaze direction
      headGroup.position.set(j.head.x, j.head.y, j.head.z);
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

      // Highlight Primary & Secondary Muscles with dynamic EMG glow
      const primaryId = curStep?.primaryMuscle || 'quads';
      const primaryColor = curStep?.primaryMuscleColor || '#f97316';
      const secondaryIds = curStep?.secondaryMuscles || [];
      const isRest = curStep?.type === 'REST' || curStep?.type === 'COOLDOWN';

      Object.values(bodyParts).forEach(mesh => {
        const ids = mesh.userData.muscleIds || [];
        const isPrimary = ids.includes(primaryId);
        const isSecondary = !isPrimary && ids.some(id => secondaryIds.includes(id));

        if (isRest) {
          mesh.material.color.set(isPrimary ? '#06b6d4' : '#52525b');
          mesh.material.emissive.set(isPrimary ? '#0891b2' : '#090d16');
          mesh.material.emissiveIntensity = isPrimary ? 0.35 + wave * 0.25 : 0.1;
        } else if (isPrimary) {
          mesh.material.color.set(primaryColor);
          mesh.material.emissive.set(primaryColor);
          mesh.material.emissiveIntensity = 0.42 + wave * 0.52;
        } else if (isSecondary) {
          mesh.material.color.set('#fbbf24');
          mesh.material.emissive.set('#d97706');
          mesh.material.emissiveIntensity = 0.2 + wave * 0.28;
        } else {
          mesh.material.color.set('#7f1d1d');
          mesh.material.emissive.set('#180406');
          mesh.material.emissiveIntensity = 0.1;
        }
      });

      // Resolve active equipment prop to render in 3D
      const stepEq = curStep?.equipmentUsed || curStep?.equipment || ['bodyweight'];
      const activeEquip =
        stepEq.find(eq => (equipRef.current || []).includes(eq)) ||
        kin.equipRender ||
        stepEq[0] ||
        'bodyweight';

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
      ].includes(kin.poseType);

      yogaMatMesh.visible = activeEquip === 'yoga_mat' || activeEquip === 'yoga_block' || isFloorPose;
      yogaBlockMesh.visible = activeEquip === 'yoga_block';
      benchGroup.visible =
        activeEquip === 'bench' ||
        activeEquip === 'bench_barbell' ||
        kin.poseType === 'bench_press' ||
        (kin.poseType === 'tricep_dip' && activeEquip === 'bench');
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

      // Smooth Camera Preset Transition or Auto-Orbit
      controls.target.lerp(targetLookAtRef.current, 0.12);
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

    reqId = requestAnimationFrame(animate);

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
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const zoomCamera = delta => {
    const cam = cameraRef.current;
    const ctr = controlsRef.current;
    if (!cam || !ctr) return;
    const dir = new THREE.Vector3().subVectors(cam.position, ctr.target).normalize();
    const dist = Math.min(4.8, Math.max(1.4, cam.position.distanceTo(ctr.target) + delta));
    targetCamPosRef.current = ctr.target.clone().addScaledVector(dir, dist);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between select-none">
      {/* Three.js Interactive 3D Viewport */}
      <div ref={mountRef} className="w-full h-full min-h-[240px] sm:min-h-[280px] cursor-grab active:cursor-grabbing" />

      {/* Top HUD Overlay: 360° Drag Hint + Contraction Phase */}
      <div className="pointer-events-none absolute top-2.5 inset-x-2.5 flex flex-wrap items-center justify-between gap-1.5">
        <span className="px-2.5 py-1 rounded-lg bg-zinc-950/85 border border-zinc-800 text-[10px] sm:text-[11px] font-bold text-cyan-300 shadow">
          👆 ลากหมุนดูท่า 3D ได้ 360° • เลื่อนซูมดูมุมข้อต่อ
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-zinc-950/85 border border-zinc-800 text-[10px] font-mono font-bold text-orange-300 shadow">
          {phaseLabel}
        </span>
      </div>

      {/* Bottom Floating Quick 3D Camera Tools inside Canvas */}
      <div className="absolute bottom-2.5 inset-x-2.5 flex flex-wrap items-center justify-between gap-1.5 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-1 bg-zinc-950/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800">
          {[
            { id: 'iso', label: 'เฉียง 3D' },
            { id: 'side', label: 'ข้าง' },
            { id: 'front', label: 'หน้า' },
            { id: 'back', label: 'หลัง' },
            { id: 'top', label: 'มุมสูง' }
          ].map(cam => (
            <button
              key={cam.id}
              type="button"
              onClick={() => {
                applyCameraPreset(cam.id);
                onCameraAngleChange?.(cam.id);
              }}
              className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                cameraAngle === cam.id ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-300 hover:text-white'
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-zinc-950/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setAutoOrbit(v => !v)}
            title="หมุนกล้องรอบตัวนักกีฬาอัตโนมัติ"
            className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-bold transition ${
              autoOrbit ? 'bg-orange-500 text-white' : 'text-zinc-300 hover:text-white'
            }`}
          >
            {autoOrbit ? '🔄 หมุนรอบ: เปิด' : '🔄 หมุนรอบ'}
          </button>
          <button
            type="button"
            onClick={() => setShowSpineGuide(v => !v)}
            title="แสดงเส้นแนวแกนกระดูกสันหลัง"
            className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-bold transition ${
              showSpineGuide ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🦴 แกนหลัง
          </button>
          <button
            type="button"
            onClick={() => zoomCamera(-0.45)}
            aria-label="ซูมเข้า"
            className="min-h-[32px] px-2 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => zoomCamera(0.45)}
            aria-label="ซูมออก"
            className="min-h-[32px] px-2 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
          >
            －
          </button>
        </div>
      </div>
    </div>
  );
}
