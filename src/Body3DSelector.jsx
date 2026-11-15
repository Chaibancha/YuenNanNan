import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MUSCLE_GROUPS } from './WorkoutEngine.js';
import { buildMedicalAnatomyGroup, applyMedicalViewModeColors } from './Body3DAnatomy.js';

/**
 * ============================================================================
 * Body3DSelector.jsx (v2.0 — Medical-Grade Striated Muscle Fiber 3D Selector)
 * รองรับ 3 โหมดกายวิภาคการแพทย์: Ecorché Fiber, X-Ray Skeletal, EMG Heatmap
 * และแสดงมัดกล้ามเนื้อเชิงลึกทั้ง 16 กลุ่ม พร้อมจุดยึดเกาะ (Origin/Insertion)
 * ============================================================================
 */
export default function Body3DSelector({
  selectedMuscles = [],
  isFullBody = false,
  onToggleMuscle,
  onToggleFullBody,
  activeHighlightMuscle = null,
  recoveryStats = {}
}) {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const muscleMeshesRef = useRef([]);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [cameraView, setCameraView] = useState('front');
  const [viewMode, setViewMode] = useState('ecorche'); // 'ecorche' | 'xray' | 'emg'
  const targetCameraPosRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 420;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07070b');

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 1.05, 5.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0.9, 0);
    controls.minDistance = 2.4;
    controls.maxDistance = 7.8;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.minPolarAngle = Math.PI * 0.12;
    controlsRef.current = controls;

    // Medical Studio 3-Point Lighting เพื่อขับเส้นใยกล้ามเนื้อ (Striation Bump Map)
    scene.add(new THREE.AmbientLight('#ffffff', 0.72));
    const keyLight = new THREE.DirectionalLight('#fff5eb', 1.65);
    keyLight.position.set(3.5, 5.5, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 0.95);
    rimLight.position.set(-4.2, 3.2, -4.2);
    scene.add(rimLight);

    const warmFill = new THREE.DirectionalLight('#fb7185', 0.55);
    warmFill.position.set(0, 1.8, -5.0);
    scene.add(warmFill);

    // แท่นสแกนกายวิภาคทางการแพทย์
    const gridHelper = new THREE.PolarGridHelper(1.55, 16, 6, 64, '#27272a', '#18181b');
    gridHelper.position.y = -0.95;
    scene.add(gridHelper);

    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.12, 1.18, 64),
      new THREE.MeshBasicMaterial({ color: '#f97316', side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -0.94;
    scene.add(ringMesh);

    const { bodyGroup, muscleMeshes } = buildMedicalAnatomyGroup();
    scene.add(bodyGroup);
    muscleMeshesRef.current = muscleMeshes;

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
        setHoveredMuscle(hits[0].object.userData.muscleId);
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
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 7) {
        const hits = getIntersects(e.clientX, e.clientY);
        if (hits.length > 0 && onToggleMuscle) {
          onToggleMuscle(hits[0].object.userData.muscleId);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointerup', handlePointerUp);

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

  useEffect(() => {
    applyMedicalViewModeColors({
      muscleMeshes: muscleMeshesRef.current,
      selectedMuscles,
      isFullBody,
      hoveredMuscle,
      activeHighlightMuscle,
      viewMode,
      recoveryStats
    });
  }, [selectedMuscles, isFullBody, hoveredMuscle, activeHighlightMuscle, viewMode, recoveryStats]);

  const rotateCameraTo = view => {
    setCameraView(view);
    if (view === 'front') targetCameraPosRef.current = new THREE.Vector3(0, 1.05, 5.2);
    else if (view === 'back') targetCameraPosRef.current = new THREE.Vector3(0, 1.05, -5.2);
    else targetCameraPosRef.current = new THREE.Vector3(4.6, 1.05, 2.2);
  };

  const adjustZoom = delta => {
    if (!cameraRef.current || !controlsRef.current) return;
    const dir = new THREE.Vector3().subVectors(cameraRef.current.position, controlsRef.current.target).normalize();
    const curDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
    const nextDist = Math.min(7.5, Math.max(2.5, curDist + delta));
    targetCameraPosRef.current = controlsRef.current.target.clone().addScaledVector(dir, nextDist);
  };

  const hoveredMeta = MUSCLE_GROUPS.find(m => m.id === hoveredMuscle);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xl">
      {/* Header + Full Body Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
            Medical Ecorché 3D Anatomy • 16 Muscle Groups
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-white">
            โมเดลใยกล้ามเนื้อทางการแพทย์ 3 มิติ
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

      {/* 3 Medical View Modes */}
      <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
        {[
          { id: 'ecorche', label: '🧬 ใยกล้ามเนื้อ (Ecorché)' },
          { id: 'xray', label: '🦴 X-Ray โครงกระดูก' },
          { id: 'emg', label: '🔥 EMG & ฟื้นตัว' }
        ].map(mode => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setViewMode(mode.id)}
            className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition ${
              viewMode === mode.id
                ? 'bg-orange-500 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative w-full h-[390px] sm:h-[450px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
        <div ref={mountRef} className="w-full h-full" />

        {/* Medical Hover Tooltip */}
        <div className="absolute top-3 left-3 right-3 pointer-events-none flex justify-between items-start gap-2">
          {hoveredMeta ? (
            <div className="bg-zinc-950/90 backdrop-blur-md border border-orange-500/70 px-3 py-2 rounded-xl shadow-xl max-w-xs">
              <p className="text-xs font-extrabold text-white">{hoveredMeta.nameTh}</p>
              <p className="text-[10px] font-semibold text-orange-300">{hoveredMeta.nameEn}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                จุดยึดเกาะ: {hoveredMeta.originInsertion}
              </p>
            </div>
          ) : (
            <div className="bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <p className="text-[11px] text-zinc-300">
                🖱️ ลากเพื่อหมุน 360° • คลิกที่ใยกล้ามเนื้อทั้ง 16 มัดเพื่อเลือกเป้าหมาย
              </p>
            </div>
          )}
        </div>

        {/* Camera Angle & Zoom Controls */}
        <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800">
            {[
              { id: 'front', label: 'หน้า' },
              { id: 'back', label: 'หลัง' },
              { id: 'side', label: 'เฉียง 360°' }
            ].map(cam => (
              <button
                key={cam.id}
                type="button"
                onClick={() => rotateCameraTo(cam.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  cameraView === cam.id ? 'bg-orange-500 text-white' : 'text-zinc-300 hover:text-white'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => adjustZoom(-0.7)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
            >
              ＋ ซูม
            </button>
            <button
              type="button"
              onClick={() => adjustZoom(0.7)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
            >
              － ซูม
            </button>
          </div>
        </div>
      </div>

      {/* 16 Muscle Group Quick-Select Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-400">
            เลือกกล้ามเนื้อละเอียด ({isFullBody ? 'ครบทั้งหมด 16 มัด' : `${selectedMuscles.length}/16 มัด`}):
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {MUSCLE_GROUPS.map(m => {
            const active = isFullBody || selectedMuscles.includes(m.id);
            const rec = recoveryStats[m.id] ?? 100;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggleMuscle(m.id)}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold border text-left transition flex items-center justify-between gap-1 ${
                  active
                    ? 'bg-zinc-800/95 text-white border-orange-500/80'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: active ? m.color : '#7f1d1d' }}
                  />
                  <span className="truncate">{m.nameTh.split(' (')[0]}</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 shrink-0">{rec}%</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
