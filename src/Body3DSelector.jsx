import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MUSCLE_GROUPS } from './WorkoutEngine.js';
import {
  BIODIGITAL_MSD_EMBED_URL,
  MSD_MANUAL_REFERENCE_URL,
  attachBioDigitalBridge,
  buildMedicalAnatomyGroup,
  applyMedicalViewModeColors
} from './Body3DAnatomy.js';

/**
 * ============================================================================
 * Body3DSelector.jsx (v2.1 — Dual-Engine BioDigital × MSD Manual + Ecorché 3D)
 * รองรับทั้งโมเดล 3 มิติทางการแพทย์จาก BioDigital Human / MSD Manual (be=2PcB)
 * และโมเดล Three.js Ecorché พร้อมเครื่องมือ Select / Dissect / Isolate
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
  const tendonMeshesRef = useRef([]);
  const toolModeRef = useRef('select');
  const onToggleMuscleRef = useRef(onToggleMuscle);
  onToggleMuscleRef.current = onToggleMuscle;

  const [engineMode, setEngineMode] = useState('biodigital'); // 'biodigital' | 'ecorche'
  const [toolMode, setToolMode] = useState('select'); // 'select' | 'dissect' | 'isolate'
  const [dissectedMeshIds, setDissectedMeshIds] = useState([]);
  const [isolatedMuscleId, setIsolatedMuscleId] = useState(null);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [focusedMuscle, setFocusedMuscle] = useState(selectedMuscles[0] || 'chest_upper_Mid');
  const [bioLastLabel, setBioLastLabel] = useState('');
  const [cameraView, setCameraView] = useState('front');
  const [viewMode, setViewMode] = useState('ecorche');
  const targetCameraPosRef = useRef(null);
  const bridgeRef = useRef(null);

  toolModeRef.current = toolMode;

  // เชื่อมต่อ BioDigital HumanAPI Bridge กับ MSD Manual Muscular System Iframe
  useEffect(() => {
    const bridge = attachBioDigitalBridge(
      'biodigital-msd-iframe',
      (muscleId, rawLabel) => {
        setFocusedMuscle(muscleId);
        setBioLastLabel(rawLabel);
        if (onToggleMuscleRef.current) onToggleMuscleRef.current(muscleId);
      },
      rawLabel => setBioLastLabel(rawLabel)
    );
    bridgeRef.current = bridge;
    return () => bridge.destroy();
  }, []);

  // ติดตั้ง Three.js Ecorché Engine (เก็บไว้ใน DOM ตลอดเพื่อสลับโหมดแบบ Zero-Latency)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 420;
    const height = container.clientHeight || 480;

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
    controls.minDistance = 2.3;
    controls.maxDistance = 7.8;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.minPolarAngle = Math.PI * 0.12;
    controlsRef.current = controls;

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

    const { bodyGroup, muscleMeshes, tendonMeshes } = buildMedicalAnatomyGroup();
    scene.add(bodyGroup);
    muscleMeshesRef.current = muscleMeshes;
    tendonMeshesRef.current = tendonMeshes;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const getIntersects = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const visibleMeshes = muscleMeshesRef.current.filter(m => m.visible);
      return raycaster.intersectObjects(visibleMeshes, false);
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
        if (hits.length > 0) {
          const hitData = hits[0].object.userData;
          setFocusedMuscle(hitData.muscleId);
          if (toolModeRef.current === 'dissect') {
            setDissectedMeshIds(prev => [...prev, hitData.meshUid]);
          } else if (toolModeRef.current === 'isolate') {
            setIsolatedMuscleId(prev => (prev === hitData.muscleId ? null : hitData.muscleId));
          } else if (onToggleMuscleRef.current) {
            onToggleMuscleRef.current(hitData.muscleId);
          }
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
      const newH = container.clientHeight || 480;
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
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      domElem.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    applyMedicalViewModeColors({
      muscleMeshes: muscleMeshesRef.current,
      tendonMeshes: tendonMeshesRef.current,
      selectedMuscles,
      isFullBody,
      hoveredMuscle,
      activeHighlightMuscle,
      viewMode,
      recoveryStats,
      dissectedMeshIds,
      isolatedMuscleId
    });
  }, [
    selectedMuscles,
    isFullBody,
    hoveredMuscle,
    activeHighlightMuscle,
    viewMode,
    recoveryStats,
    dissectedMeshIds,
    isolatedMuscleId
  ]);

  const rotateCameraTo = view => {
    setCameraView(view);
    if (engineMode === 'biodigital') {
      bridgeRef.current?.sendCameraPreset(view);
      return;
    }
    if (view === 'front') targetCameraPosRef.current = new THREE.Vector3(0, 1.05, 5.2);
    else if (view === 'back') targetCameraPosRef.current = new THREE.Vector3(0, 1.05, -5.2);
    else targetCameraPosRef.current = new THREE.Vector3(4.6, 1.05, 2.2);
  };

  const adjustZoom = delta => {
    if (!cameraRef.current || !controlsRef.current) return;
    const dir = new THREE.Vector3().subVectors(cameraRef.current.position, controlsRef.current.target).normalize();
    const curDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
    const nextDist = Math.min(7.5, Math.max(2.3, curDist + delta));
    targetCameraPosRef.current = controlsRef.current.target.clone().addScaledVector(dir, nextDist);
  };

  const displayMeta =
    MUSCLE_GROUPS.find(m => m.id === (hoveredMuscle || focusedMuscle)) || MUSCLE_GROUPS[0];

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xl">
      {/* Header + Full Body Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
            BioDigital Human × MSD Manual Muscular System
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-white">
            โมเดลกล้ามเนื้อ 3 มิติทางการแพทย์ (16 มัดละเอียด)
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
          <span>ทั่วร่างกาย (16 มัด)</span>
        </button>
      </div>

      {/* Dual-Engine Switcher: BioDigital Official vs Interactive Ecorché */}
      <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
        <button
          type="button"
          onClick={() => setEngineMode('biodigital')}
          className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition ${
            engineMode === 'biodigital' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          🌐 BioDigital × MSD 3D Live
        </button>
        <button
          type="button"
          onClick={() => setEngineMode('ecorche')}
          className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition ${
            engineMode === 'ecorche' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          🧬 Ecorché 3D + Dissect
        </button>
      </div>

      {/* ENGINE 1: Official BioDigital × MSD Manual Muscular System Viewer */}
      <div className={engineMode === 'biodigital' ? 'flex flex-col gap-2.5' : 'hidden'}>
        <div className="relative w-full h-[430px] sm:h-[470px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
          <iframe
            id="biodigital-msd-iframe"
            title="MSD Manual & BioDigital Human 3D Muscular System"
            src={BIODIGITAL_MSD_EMBED_URL}
            className="w-full h-full border-0"
            allow="fullscreen; xr-spatial-tracking"
            loading="lazy"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2">
          <span>
            {bioLastLabel
              ? `🎯 ซิงค์กล้ามเนื้อจาก BioDigital: ${bioLastLabel}`
              : '👆 หมุน ซูม และใช้ Dissect บนโมเดล MSD Manual ด้านบน หรือกดปุ่มมัดกล้ามเนื้อด้านล่างเพื่อจัดตาราง'}
          </span>
          <a
            href={MSD_MANUAL_REFERENCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:underline font-semibold shrink-0"
          >
            อ้างอิง MSD Manual ↗
          </a>
        </div>
      </div>

      {/* ENGINE 2: BioDigital-Matched Three.js Ecorché + Dissect & Isolate */}
      <div className={engineMode === 'ecorche' ? 'flex flex-col gap-2.5' : 'hidden'}>
        {/* 3 Medical View Modes */}
        <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
          {[
            { id: 'ecorche', label: '🧬 ใยกล้ามเนื้อ' },
            { id: 'xray', label: '🦴 X-Ray กระดูก' },
            { id: 'emg', label: '🔥 EMG & ฟื้นตัว' }
          ].map(mode => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${
                viewMode === mode.id ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* BioDigital-style Dissect / Isolate Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-zinc-950 px-2.5 py-1.5 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-1">
            {[
              { id: 'select', label: '👆 เลือกฝึก' },
              { id: 'dissect', label: '🔪 Dissect (ลอกชั้น)' },
              { id: 'isolate', label: '🔍 Isolate (แยกมัด)' }
            ].map(tool => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setToolMode(tool.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                  toolMode === tool.id
                    ? 'bg-cyan-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-300 hover:text-white'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {(dissectedMeshIds.length > 0 || isolatedMuscleId) && (
            <button
              type="button"
              onClick={() => {
                setDissectedMeshIds([]);
                setIsolatedMuscleId(null);
              }}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40"
            >
              🔄 คืนค่าชั้น ({dissectedMeshIds.length})
            </button>
          )}
        </div>

        {/* 3D Canvas Viewport */}
        <div className="relative w-full h-[380px] sm:h-[430px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
          <div ref={mountRef} className="w-full h-full" />

          <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800">
              {[
                { id: 'front', label: 'หน้า' },
                { id: 'back', label: 'หลัง' },
                { id: 'side', label: '360°' }
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
      </div>

      {/* MSD Manual Medical Anatomical Reference Card */}
      <div className="bg-zinc-950/90 border border-orange-500/35 rounded-2xl p-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-white">{displayMeta.nameTh}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-orange-300 border border-zinc-800">
            {displayMeta.nameEn}
          </span>
        </div>
        <p className="text-[11px] text-cyan-300">
          จุดกำเนิด → จุดเกาะ (Origin/Insertion): <span className="text-zinc-300">{displayMeta.originInsertion}</span>
        </p>
        <p className="text-[11px] text-zinc-400 leading-snug">{displayMeta.description}</p>
      </div>

      {/* 16 Muscle Group Quick-Select Chips (Synced with both BioDigital & Ecorché) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-zinc-400">
            ซิงค์มัดกล้ามเนื้อเข้าตาราง ({isFullBody ? 'ครบทั้งหมด 16 มัด' : `${selectedMuscles.length}/16 มัด`}):
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
                onClick={() => {
                  setFocusedMuscle(m.id);
                  if (onToggleMuscle) onToggleMuscle(m.id);
                }}
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
