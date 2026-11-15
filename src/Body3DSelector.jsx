import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MUSCLE_GROUPS } from './WorkoutEngine';

/**
 * ============================================================================
 * Body3DSelector.jsx
 * โมเดลร่างกายมนุษย์ 3 มิติแบบโปร่งแสงเห็นมัดกล้ามเนื้อชัดเจน (Translucent Anatomical 3D Mesh)
 * หมุนได้ 360 องศา ซูมเข้า-ออก สลับมุมมอง หน้า/หลัง และคลิกเลือกมัดกล้ามเนื้อด้วย Raycaster
 * ============================================================================
 */
export default function Body3DSelector({
  selectedMuscles = [],
  isFullBody = false,
  onToggleMuscle,
  onToggleFullBody,
  activeHighlightMuscle = null
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const muscleMeshesRef = useRef([]);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [cameraView, setCameraView] = useState('front'); // 'front' | 'back' | 'free'
  const targetCameraPosRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 420;
    const height = container.clientHeight || 520;

    // 1. สร้าง Scene, Camera และ WebGLRenderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#09090b');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.05, 5.4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. OrbitControls รองรับทั้งเมาส์และนิ้วสัมผัส (Touch)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0.85, 0);
    controls.minDistance = 2.6;
    controls.maxDistance = 8.0;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.minPolarAngle = Math.PI * 0.12;
    controlsRef.current = controls;

    // 3. ระบบไฟสตูดิโอ 3 ทิศทาง (3-Point Anatomical Studio Lighting)
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#fff7ed', 1.45);
    keyLight.position.set(3.5, 5.5, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 0.95);
    rimLight.position.set(-4.0, 3.5, -4.5);
    scene.add(rimLight);

    const backFillLight = new THREE.DirectionalLight('#f97316', 0.65);
    backFillLight.position.set(0, 2.0, -5.0);
    scene.add(backFillLight);

    // แท่นยืนเรืองแสง (Studio Holographic Platform)
    const gridHelper = new THREE.PolarGridHelper(1.55, 16, 6, 64, '#27272a', '#18181b');
    gridHelper.position.y = -0.95;
    scene.add(gridHelper);

    const ringGeo = new THREE.RingGeometry(1.15, 1.22, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#f97316',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const baseRing = new THREE.Mesh(ringGeo, ringMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -0.94;
    scene.add(baseRing);

    // 4. สร้างโครงร่างมนุษย์โปร่งแสง (Translucent Anatomical Body Shell)
    const bodyGroup = new THREE.Group();
    scene.add(bodyGroup);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#64748b',
      transparent: true,
      opacity: 0.22,
      roughness: 0.25,
      metalness: 0.1,
      transmission: 0.35,
      depthWrite: false
    });

    // ศีรษะ คอ แกนลำตัว และข้อต่อโปร่งแสง
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 28), glassMaterial);
    headMesh.scale.set(0.88, 1.12, 0.95);
    headMesh.position.set(0, 2.28, 0);
    bodyGroup.add(headMesh);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 20), glassMaterial);
    neckMesh.position.set(0, 2.02, 0);
    bodyGroup.add(neckMesh);

    const torsoCore = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.31, 1.15, 24), glassMaterial);
    torsoCore.scale.set(1.18, 1.0, 0.72);
    torsoCore.position.set(0, 1.35, 0);
    bodyGroup.add(torsoCore);

    const pelvisCore = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.34, 24), glassMaterial);
    pelvisCore.scale.set(1.15, 1.0, 0.78);
    pelvisCore.position.set(0, 0.65, 0);
    bodyGroup.add(pelvisCore);

    // แขนท่อนล่าง มือ และเท้าโปร่งแสง
    [-1, 1].forEach(side => {
      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.36, 12, 16), glassMaterial);
      forearm.position.set(side * 0.68, 0.92, 0.04);
      forearm.rotation.z = side * 0.08;
      bodyGroup.add(forearm);

      const ankleFoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.32), glassMaterial);
      ankleFoot.position.set(side * 0.23, -0.89, 0.08);
      bodyGroup.add(ankleFoot);
    });

    // 5. สร้างมัดกล้ามเนื้อทั้ง 10 ส่วนที่คลิกเลือกได้ (Interactive Anatomical Muscle Meshes)
    const createdMuscleMeshes = [];
    const addMusclePart = (muscleId, geometry, position, scale = [1, 1, 1], rotation = [0, 0, 0]) => {
      const meta = MUSCLE_GROUPS.find(m => m.id === muscleId) || MUSCLE_GROUPS[0];
      const mat = new THREE.MeshStandardMaterial({
        color: '#3f3f46',
        emissive: '#000000',
        roughness: 0.35,
        metalness: 0.2
      });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.rotation.set(...rotation);
      mesh.userData = {
        muscleId,
        nameTh: meta.nameTh,
        baseColor: meta.color
      };
      bodyGroup.add(mesh);
      createdMuscleMeshes.push(mesh);
    };

    const sphereGeo = new THREE.SphereGeometry(1, 24, 24);
    const capsuleGeo = new THREE.CapsuleGeometry(1, 1, 16, 24);

    // (1) CHEST - Pectoralis Major (ซ้าย/ขวา ด้านหน้า)
    [-1, 1].forEach(side => {
      addMusclePart('chest', sphereGeo, [side * 0.2, 1.64, 0.22], [0.21, 0.16, 0.11], [0, 0, side * -0.15]);
    });

    // (2) BACK - Latissimus Dorsi, Traps & Rhomboids (ด้านหลัง)
    [-1, 1].forEach(side => {
      addMusclePart('back', sphereGeo, [side * 0.22, 1.54, -0.21], [0.23, 0.32, 0.11], [0, 0, side * 0.18]);
      addMusclePart('back', sphereGeo, [side * 0.14, 1.84, -0.17], [0.16, 0.14, 0.09], [0, 0, 0]);
    });

    // (3) SHOULDERS - Anterior/Lateral/Posterior Deltoids (ซ้าย/ขวา)
    [-1, 1].forEach(side => {
      addMusclePart('shoulders', sphereGeo, [side * 0.52, 1.74, 0.02], [0.16, 0.18, 0.16], [0, 0, side * -0.2]);
    });

    // (4) BICEPS - Biceps Brachii (ต้นแขนด้านหน้า ซ้าย/ขวา)
    [-1, 1].forEach(side => {
      addMusclePart('biceps', capsuleGeo, [side * 0.59, 1.38, 0.09], [0.085, 0.22, 0.085], [0, 0, side * 0.1]);
    });

    // (5) TRICEPS - Triceps Brachii (ต้นแขนด้านหลัง ซ้าย/ขวา)
    [-1, 1].forEach(side => {
      addMusclePart('triceps', capsuleGeo, [side * 0.60, 1.38, -0.08], [0.09, 0.23, 0.09], [0, 0, side * 0.1]);
    });

    // (6) CORE / ABS - Rectus Abdominis (6-pack + Obliques ด้านหน้า)
    [1.38, 1.18, 0.98].forEach(yPos => {
      [-1, 1].forEach(side => {
        addMusclePart('core', sphereGeo, [side * 0.10, yPos, 0.23], [0.095, 0.085, 0.07]);
      });
    });
    [-1, 1].forEach(side => {
      addMusclePart('core', sphereGeo, [side * 0.27, 1.14, 0.12], [0.08, 0.24, 0.11]);
    });

    // (7) GLUTES - Gluteus Maximus (สะโพกด้านหลัง ซ้าย/ขวา)
    [-1, 1].forEach(side => {
      addMusclePart('glutes', sphereGeo, [side * 0.19, 0.64, -0.21], [0.19, 0.21, 0.16]);
    });

    // (8) QUADS - Quadriceps Femoris (ต้นขาด้านหน้า ซ้าย/ขวา)
    [-1, 1].forEach(side => {
      addMusclePart('quads', capsuleGeo, [side * 0.23, 0.12, 0.10], [0.145, 0.36, 0.135], [0, 0, side * 0.03]);
    });

    // (9) HAMSTRINGS - Biceps Femoris (ต้นขาด้านหลัง ซ้าย/ขวา)
    [-1, 1].forEach(side => {
      addMusclePart('hamstrings', capsuleGeo, [side * 0.23, 0.12, -0.10], [0.135, 0.35, 0.125], [0, 0, side * 0.03]);
    });

    // (10) CALVES - Gastrocnemius & Soleus (น่อง ซ้าย/ขวา)
    [-1, 1].forEach(side => {
      addMusclePart('calves', capsuleGeo, [side * 0.23, -0.52, -0.06], [0.105, 0.26, 0.11]);
    });

    muscleMeshesRef.current = createdMuscleMeshes;

    // 6. ระบบ Raycaster ตรวจจับการชี้เมาส์และคลิก/แตะหน้าจอมือถือ
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const getIntersects = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(muscleMeshesRef.current, false);
    };

    const handlePointerMove = e => {
      const hits = getIntersects(e.clientX, e.clientY);
      if (hits.length > 0) {
        const hitMuscle = hits[0].object.userData.muscleId;
        setHoveredMuscle(hitMuscle);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredMuscle(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const handlePointerDown = e => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = e => {
      const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      // ถ้าระยะลากน้อยกว่า 7px ให้ถือว่าเป็นการคลิกเลือกมัดกล้ามเนื้อ (ไม่ใช่การหมุนกล้อง)
      if (moveDist < 7) {
        const hits = getIntersects(e.clientX, e.clientY);
        if (hits.length > 0 && onToggleMuscle) {
          const clickedMuscleId = hits[0].object.userData.muscleId;
          onToggleMuscle(clickedMuscleId);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointerup', handlePointerUp);

    // 7. Animation Loop พร้อมระบบ Smooth Camera Transition
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      if (targetCameraPosRef.current) {
        camera.position.lerp(targetCameraPosRef.current, 0.12);
        if (camera.position.distanceTo(targetCameraPosRef.current) < 0.05) {
          targetCameraPosRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 420;
      const newH = container.clientHeight || 520;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      domElem.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
    };
  }, []);

  // อัปเดตสีไฮไลต์และการเรืองแสงของมัดกล้ามเนื้อเมื่อ State เปลี่ยนแปลง
  useEffect(() => {
    muscleMeshesRef.current.forEach(mesh => {
      const { muscleId, baseColor } = mesh.userData;
      const isSelected = isFullBody || selectedMuscles.includes(muscleId);
      const isHovered = hoveredMuscle === muscleId;
      const isLiveHighlighted = activeHighlightMuscle === muscleId;

      if (isLiveHighlighted) {
        mesh.material.color.set('#f97316');
        mesh.material.emissive.set('#ea580c');
        mesh.material.emissiveIntensity = 0.85;
      } else if (isSelected) {
        mesh.material.color.set(baseColor);
        mesh.material.emissive.set(baseColor);
        mesh.material.emissiveIntensity = isHovered ? 0.65 : 0.42;
      } else if (isHovered) {
        mesh.material.color.set(baseColor);
        mesh.material.emissive.set(baseColor);
        mesh.material.emissiveIntensity = 0.28;
      } else {
        mesh.material.color.set('#3f3f46');
        mesh.material.emissive.set('#000000');
        mesh.material.emissiveIntensity = 0;
      }
    });
  }, [selectedMuscles, isFullBody, hoveredMuscle, activeHighlightMuscle]);

  // ฟังก์ชันสลับมุมกล้อง หน้า / หลัง / ซูม
  const rotateCameraTo = view => {
    setCameraView(view);
    if (view === 'front') {
      targetCameraPosRef.current = new THREE.Vector3(0, 1.05, 5.4);
    } else if (view === 'back') {
      targetCameraPosRef.current = new THREE.Vector3(0, 1.05, -5.4);
    } else if (view === 'side') {
      targetCameraPosRef.current = new THREE.Vector3(4.8, 1.05, 2.2);
    }
  };

  const adjustZoom = delta => {
    if (!cameraRef.current || !controlsRef.current) return;
    const dir = new THREE.Vector3()
      .subVectors(cameraRef.current.position, controlsRef.current.target)
      .normalize();
    const currentDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
    const nextDist = Math.min(7.5, Math.max(2.8, currentDist + delta));
    targetCameraPosRef.current = controlsRef.current.target.clone().addScaledVector(dir, nextDist);
  };

  const hoveredMeta = MUSCLE_GROUPS.find(m => m.id === hoveredMuscle);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-2xl">
      {/* ส่วนหัวและปุ่มสลับโหมด Full Body */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
            Interactive 3D Anatomy Selector
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-white">
            คลิกเลือกมัดกล้ามเนื้อบนโมเดล 3 มิติ
          </h2>
        </div>

        <button
          type="button"
          onClick={onToggleFullBody}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
            isFullBody
              ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/25'
              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <span>🔥</span>
          <span>ทั่วร่างกาย (Full Body)</span>
        </button>
      </div>

      {/* กรอบแสดงโมเดล 3D WebGL */}
      <div className="relative w-full h-[400px] sm:h-[460px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/90">
        <div ref={mountRef} className="w-full h-full" />

        {/* ป้ายบอกชื่อกล้ามเนื้อที่กำลังชี้ (Hover Tooltip) */}
        <div className="absolute top-3 left-3 pointer-events-none">
          {hoveredMeta ? (
            <div className="bg-zinc-900/95 border border-orange-500/60 px-3 py-1.5 rounded-xl shadow-lg">
              <p className="text-xs font-bold text-white">{hoveredMeta.nameTh}</p>
              <p className="text-[10px] text-zinc-400">{hoveredMeta.nameEn}</p>
            </div>
          ) : (
            <div className="bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <p className="text-[11px] text-zinc-400">
                🖱️ ลากเพื่อหมุน 360° • คลิกที่มัดกล้ามเนื้อเพื่อเลือก/ยกเลิก
              </p>
            </div>
          )}
        </div>

        {/* ปุ่มควบคุมมุมกล้อง หน้า / หลัง / ซูม */}
        <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => rotateCameraTo('front')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                cameraView === 'front' ? 'bg-orange-500 text-white' : 'text-zinc-300 hover:text-white'
              }`}
            >
              ด้านหน้า (Front)
            </button>
            <button
              type="button"
              onClick={() => rotateCameraTo('back')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                cameraView === 'back' ? 'bg-orange-500 text-white' : 'text-zinc-300 hover:text-white'
              }`}
            >
              ด้านหลัง (Back)
            </button>
            <button
              type="button"
              onClick={() => rotateCameraTo('side')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                cameraView === 'side' ? 'bg-orange-500 text-white' : 'text-zinc-300 hover:text-white'
              }`}
            >
              มุมเฉียง 360°
            </button>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => adjustZoom(-0.8)}
              title="ซูมเข้า"
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
            >
              ＋ ซูมเข้า
            </button>
            <button
              type="button"
              onClick={() => adjustZoom(0.8)}
              title="ซูมออก"
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
            >
              － ซูมออก
            </button>
          </div>
        </div>
      </div>

      {/* ปุ่มลัดเลือกมัดกล้ามเนื้อทั้ง 10 มัด (เชื่อมต่อ State เดียวกับโมเดล 3D) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-400">
            มัดกล้ามเนื้อที่เลือก ({isFullBody ? 'ครบทุกส่วน 10 มัด' : `${selectedMuscles.length} มัด`}):
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {MUSCLE_GROUPS.map(m => {
            const active = isFullBody || selectedMuscles.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggleMuscle(m.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border text-left transition flex items-center gap-1.5 ${
                  active
                    ? 'bg-zinc-800/95 text-white border-orange-500/80'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: active ? m.color : '#52525b' }}
                />
                <span className="truncate">{m.nameTh}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
