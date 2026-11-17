import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MUSCLE_GROUPS } from './WorkoutEngine.js';
import {
  BIODIGITAL_MSD_EMBED_URL,
  MSD_MANUAL_REFERENCE_URL,
  attachBioDigitalBridge,
  buildMedicalAnatomyGroup,
  applyMedicalViewModeColors,
  emphasizeMuscleMeshes,
  BODY_REGIONS,
  getRegionForMuscle,
  getSubMuscleLabel
} from './Body3DAnatomy.js';

/**
 * ============================================================================
 * Body3DSelector.jsx (v2.1 — Dual-Engine BioDigital × MSD Manual + Ecorché 3D)
 * รองรับทั้งโมเดล 3 มิติทางการแพทย์จาก BioDigital Human / MSD Manual (be=2PcB)
 * และโมเดล Three.js Ecorché พร้อมเครื่องมือ Select / Dissect / Isolate
 * โหมด Ecorché เลือกได้ 2 ระดับ: "ส่วนของร่างกาย" (Region) และ "มัดกล้ามเนื้อเดี่ยว" (Muscle)
 * ============================================================================
 */
const ENGINE_MODE_STORAGE_KEY = 'kinetic_3d_engine_mode';
const BIODIGITAL_LOAD_TIMEOUT_MS = 8000;

function readInitialEngineMode() {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'ecorche';
    const saved = window.localStorage.getItem(ENGINE_MODE_STORAGE_KEY);
    if (saved === 'ecorche' || saved === 'biodigital') return saved;
  } catch {}
  return 'biodigital';
}

const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export default function Body3DSelector({
  selectedMuscles = [],
  isFullBody = false,
  onToggleMuscle,
  onSetMuscles,
  onToggleFullBody,
  onSmartRecoveryPick,
  activeHighlightMuscle = null,
  recoveryStats = {}
}) {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const muscleMeshesRef = useRef([]);
  const tendonMeshesRef = useRef([]);
  const toolModeRef = useRef('select');
  const onToggleMuscleRef = useRef(onToggleMuscle);
  onToggleMuscleRef.current = onToggleMuscle;
  const onSetMusclesRef = useRef(onSetMuscles);
  onSetMusclesRef.current = onSetMuscles;
  const selectedMusclesRef = useRef(selectedMuscles);
  selectedMusclesRef.current = selectedMuscles;
  const isFullBodyRef = useRef(isFullBody);
  isFullBodyRef.current = isFullBody;
  const pickModeRef = useRef('muscle');

  const [pickMode, setPickMode] = useState('muscle'); // 'muscle' (มัดเดี่ยว) | 'region' (ส่วนของร่างกาย)
  const [hoveredMeshUid, setHoveredMeshUid] = useState(null);
  const [pickedMesh, setPickedMesh] = useState(null); // { meshUid, muscleId, subLabel }
  const [pickedRegionId, setPickedRegionId] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, th, en, groupTh }
  pickModeRef.current = pickMode;

  // เลือก/ยกเลิก "ส่วนของร่างกาย" ทั้งส่วน (ซิงค์เข้าตารางฝึกแบบ atomic ผ่าน onSetMuscles)
  const selectRegionRef = useRef(null);
  selectRegionRef.current = regionId => {
    const region = BODY_REGIONS.find(r => r.id === regionId);
    if (!region) return;
    setPickedRegionId(regionId);
    setFocusedMuscle(region.muscleIds[0]);
    const ids = region.muscleIds;
    const current = isFullBodyRef.current ? [] : selectedMusclesRef.current;
    const allIn = ids.every(id => current.includes(id));
    const next = allIn ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])];
    if (onSetMusclesRef.current) onSetMusclesRef.current(next);
    else ids.forEach(id => onToggleMuscleRef.current?.(id));
  };

  // ค่าเริ่มต้น: ออฟไลน์ → Ecorché, ไม่เช่นนั้นใช้ตัวเลือกล่าสุดจาก localStorage (ถ้าไม่มี → biodigital)
  const [engineMode, setEngineModeState] = useState(readInitialEngineMode); // 'biodigital' | 'ecorche'
  const setEngineMode = mode => {
    setEngineModeState(mode);
    try {
      window.localStorage.setItem(ENGINE_MODE_STORAGE_KEY, mode);
    } catch {}
  };
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [hint, setHint] = useState(null); // { kind: 'min1' | 'exitFull', id }
  const hintTimerRef = useRef(null);
  const showHintRef = useRef(null);
  showHintRef.current = kind => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint({ kind, id: Date.now() });
    hintTimerRef.current = setTimeout(() => setHint(null), 2000);
  };
  // ตรวจว่าการกดมัดนี้เป็น no-op (มัดสุดท้ายที่เลือก) หรือออกจากโหมดทั่วร่างกาย → แสดง hint ในพื้นที่
  const hintForMuscleClickRef = useRef(null);
  hintForMuscleClickRef.current = muscleId => {
    if (isFullBodyRef.current) {
      showHintRef.current?.('exitFull');
    } else if (selectedMusclesRef.current.length === 1 && selectedMusclesRef.current[0] === muscleId) {
      showHintRef.current?.('min1');
    }
  };
  useEffect(() => () => hintTimerRef.current && clearTimeout(hintTimerRef.current), []);

  const [toolMode, setToolMode] = useState('select'); // 'select' | 'dissect' | 'isolate'
  const [orbitLocked, setOrbitLocked] = useState(false);
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

  // โหลด BioDigital iframe: ถ้าไม่ onLoad ภายใน ~8 วินาที (หรือออฟไลน์) → แสดง fallback
  useEffect(() => {
    if (engineMode !== 'biodigital' || iframeLoaded) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIframeFailed(true);
      return;
    }
    const t = setTimeout(() => setIframeFailed(true), BIODIGITAL_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [engineMode, iframeLoaded, iframeKey]);

  const retryBioDigital = () => {
    setIframeLoaded(false);
    setIframeFailed(false);
    setIframeKey(k => k + 1);
  };

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !orbitLocked;
    }
  }, [orbitLocked]);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
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

    const buildTip = (e, hitData) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const sub = getSubMuscleLabel(hitData.subLabel);
      return {
        x: Math.min(Math.max(8, e.clientX - rect.left + 14), rect.width - 8),
        y: Math.max(8, e.clientY - rect.top - 10),
        th: sub.th,
        en: sub.en,
        groupTh: (hitData.meta?.nameTh || '').split(' (')[0]
      };
    };

    const handlePointerMove = e => {
      const hits = getIntersects(e.clientX, e.clientY);
      if (hits.length > 0) {
        const hitData = hits[0].object.userData;
        setHoveredMuscle(hitData.muscleId);
        setHoveredMeshUid(hitData.meshUid);
        setTooltip(buildTip(e, hitData));
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredMuscle(null);
        setHoveredMeshUid(null);
        setTooltip(null);
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
          setHoveredMuscle(hitData.muscleId);
          setHoveredMeshUid(hitData.meshUid);
          setTooltip(buildTip(e, hitData));
          setFocusedMuscle(hitData.muscleId);
          if (toolModeRef.current === 'dissect') {
            setDissectedMeshIds(prev => [...prev, hitData.meshUid]);
          } else if (toolModeRef.current === 'isolate') {
            setIsolatedMuscleId(prev => (prev === hitData.muscleId ? null : hitData.muscleId));
          } else {
            setPickedMesh({ meshUid: hitData.meshUid, muscleId: hitData.muscleId, subLabel: hitData.subLabel });
            if (pickModeRef.current === 'region') {
              const region = getRegionForMuscle(hitData.muscleId);
              if (region) selectRegionRef.current?.(region.id);
            } else {
              setPickedRegionId(null);
              hintForMuscleClickRef.current?.(hitData.muscleId);
              onToggleMuscleRef.current?.(hitData.muscleId);
            }
          }
        } else {
          setPickedMesh(null);
        }
      }
    };

    const handlePointerLeave = () => {
      setHoveredMuscle(null);
      setHoveredMeshUid(null);
      setTooltip(null);
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointerup', handlePointerUp);
    domElem.addEventListener('pointerleave', handlePointerLeave);

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
      domElem.removeEventListener('pointerleave', handlePointerLeave);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (engineMode !== 'ecorche') return;
    const t = setTimeout(() => {
      const container = mountRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth || 420;
      const newH = container.clientHeight || 430;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    }, 30);
    return () => clearTimeout(t);
  }, [engineMode]);

  useEffect(() => {
    applyMedicalViewModeColors({
      muscleMeshes: muscleMeshesRef.current,
      tendonMeshes: tendonMeshesRef.current,
      selectedMuscles,
      isFullBody,
      hoveredMuscle: null,
      activeHighlightMuscle,
      viewMode,
      recoveryStats,
      dissectedMeshIds,
      isolatedMuscleId
    });
    const hoverRegion = BODY_REGIONS.find(r => r.id === hoveredRegionId);
    const pickedRegion = BODY_REGIONS.find(r => r.id === pickedRegionId);
    // โหมดส่วนของร่างกาย: ชี้มัดไหนก็ไฮไลต์ทั้งส่วนที่มัดนั้นสังกัด
    const hoveredMeshMuscle = muscleMeshesRef.current.find(m => m.userData.meshUid === hoveredMeshUid)?.userData.muscleId;
    const hoverRegionByMesh = pickMode === 'region' && hoveredMeshMuscle ? getRegionForMuscle(hoveredMeshMuscle) : null;
    emphasizeMuscleMeshes({
      muscleMeshes: muscleMeshesRef.current,
      hoveredMeshUid: pickMode === 'muscle' ? hoveredMeshUid : null,
      pickedMeshUid: pickMode === 'muscle' ? pickedMesh?.meshUid : null,
      hoveredRegionIds: (hoverRegion || hoverRegionByMesh)?.muscleIds || [],
      pickedRegionIds: pickMode === 'region' ? pickedRegion?.muscleIds || [] : []
    });
  }, [
    selectedMuscles,
    isFullBody,
    hoveredMeshUid,
    pickedMesh,
    hoveredRegionId,
    pickedRegionId,
    pickMode,
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
          className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
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
          className={`min-h-[40px] py-2 px-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition ${
            engineMode === 'biodigital' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          🌐 BioDigital × MSD 3D Live
        </button>
        <button
          type="button"
          onClick={() => setEngineMode('ecorche')}
          className={`min-h-[40px] py-2 px-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition ${
            engineMode === 'ecorche' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          🧬 Ecorché 3D + Dissect
        </button>
      </div>

      {/* ENGINE 1: Official BioDigital × MSD Manual Muscular System Viewer */}
      <div className={engineMode === 'biodigital' ? 'flex flex-col gap-2.5' : 'hidden'}>
        {/* กล่องครอบ iframe: isolate + contain:paint + clip-path กัน compositing layer ของหน้าที่สามรั่วออกนอกกรอบ */}
        <div
          className="relative z-0 isolate w-full h-[430px] sm:h-[470px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800"
          style={{ contain: 'paint', isolation: 'isolate', clipPath: 'inset(0 round 1rem)' }}
        >
          <iframe
            key={iframeKey}
            id="biodigital-msd-iframe"
            title="MSD Manual & BioDigital Human 3D Muscular System"
            src={BIODIGITAL_MSD_EMBED_URL}
            className="absolute inset-0 z-0 w-full h-full border-0"
            allow="fullscreen; xr-spatial-tracking"
            onLoad={() => {
              setIframeLoaded(true);
              setIframeFailed(false);
            }}
            onError={() => setIframeFailed(true)}
          />

          {!iframeLoaded && !iframeFailed && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950"
              role="status"
              aria-live="polite"
            >
              <div className="w-10 h-10 rounded-full border-2 border-orange-500/30 border-t-orange-400 animate-spin" />
              <span className="text-xs font-bold text-zinc-300">กำลังโหลดโมเดล BioDigital…</span>
              <div className="w-40 h-2 rounded-full bg-zinc-800 animate-pulse" />
              <div className="w-28 h-2 rounded-full bg-zinc-800 animate-pulse" />
            </div>
          )}

          {iframeFailed && !iframeLoaded && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950 px-5 text-center">
              <span className="text-3xl">📡</span>
              <p className="text-sm font-extrabold text-white">โหลดโมเดล BioDigital ไม่สำเร็จ</p>
              <p className="text-[11px] text-zinc-400 leading-snug max-w-xs">
                หน้า BioDigital ต้องใช้อินเทอร์เน็ตและอาจโหลดช้า คุณสามารถใช้โมเดล Ecorché 3D ที่ทำงานออฟไลน์ได้แทน
              </p>
              <button
                type="button"
                onClick={() => setEngineMode('ecorche')}
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-extrabold bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-400 transition"
              >
                สลับไปโมเดล Ecorché 3D (ใช้งานออฟไลน์ได้)
              </button>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={retryBioDigital}
                  className="min-h-[40px] px-3 py-2 rounded-xl text-[11px] font-bold bg-zinc-900 text-zinc-300 border border-zinc-700 hover:text-white transition"
                >
                  🔄 ลองโหลดใหม่
                </button>
                <a
                  href={MSD_MANUAL_REFERENCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] inline-flex items-center px-3 py-2 rounded-xl text-[11px] font-bold text-orange-300 border border-orange-500/40 hover:underline"
                >
                  เปิด MSD Manual ในแท็บใหม่ ↗
                </a>
              </div>
            </div>
          )}
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
            className="inline-flex items-center min-h-[40px] text-orange-400 hover:underline font-semibold shrink-0"
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
              className={`min-h-[40px] py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${
                viewMode === mode.id ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* BioDigital-style Dissect / Isolate / Orbit Lock Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-zinc-950 px-2.5 py-2 rounded-2xl border border-zinc-800">
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'select', label: '👆 เลือกฝึก' },
              { id: 'dissect', label: '🔪 Dissect (ลอกชั้น)' },
              { id: 'isolate', label: '🔍 Isolate (แยกมัด)' }
            ].map(tool => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setToolMode(tool.id)}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                  toolMode === tool.id
                    ? 'bg-cyan-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-300 hover:text-white'
                }`}
              >
                {tool.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setOrbitLocked(v => !v)}
              className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                orbitLocked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
              }`}
            >
              {orbitLocked ? '🔒 ล็อกหมุน 3D (เลื่อนจอ)' : '🔓 หมุน 3D อิสระ'}
            </button>
          </div>

          {(dissectedMeshIds.length > 0 || isolatedMuscleId) && (
            <button
              type="button"
              onClick={() => {
                setDissectedMeshIds([]);
                setIsolatedMuscleId(null);
              }}
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40"
            >
              🔄 คืนค่าชั้น ({[
                dissectedMeshIds.length > 0 ? `ซ่อน ${dissectedMeshIds.length} ชิ้น` : null,
                isolatedMuscleId ? 'แยก 1 มัด' : null
              ].filter(Boolean).join(' • ')})
            </button>
          )}
        </div>

        {/* BioDigital/MSD-style selection granularity: ส่วนของร่างกาย vs มัดกล้ามเนื้อเดี่ยว */}
        <div className="flex flex-col gap-1.5 bg-zinc-950 px-2.5 py-2 rounded-2xl border border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-zinc-400">โหมดการกดเลือกบนโมเดล</span>
            <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-0.5 rounded-xl">
              {[
                { id: 'muscle', label: '🎯 มัดเดี่ยว' },
                { id: 'region', label: '🧍 ส่วนของร่างกาย' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPickMode(opt.id);
                    setPickedMesh(null);
                    setPickedRegionId(null);
                  }}
                  className={`min-h-[40px] px-2.5 rounded-lg text-[11px] font-bold transition ${
                    pickMode === opt.id ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className={`flex gap-1 overflow-x-auto pb-1 -mx-0.5 px-0.5 pr-10 ${NO_SCROLLBAR}`}>
            {BODY_REGIONS.map(region => {
              const allIn = !isFullBody ? region.muscleIds.every(id => selectedMuscles.includes(id)) : true;
              const active = isFullBody || allIn;
              return (
                <button
                  key={region.id}
                  type="button"
                  onMouseEnter={() => setHoveredRegionId(region.id)}
                  onMouseLeave={() => setHoveredRegionId(null)}
                  onClick={() => {
                    setPickMode('region');
                    setPickedMesh(null);
                    rotateCameraTo(region.view);
                    selectRegionRef.current?.(region.id);
                  }}
                  className={`shrink-0 min-h-[40px] px-2.5 rounded-xl text-[11px] font-bold border transition flex items-center gap-1 ${
                    active
                      ? 'bg-orange-500/20 text-orange-200 border-orange-500/60'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                  } ${pickedRegionId === region.id ? 'ring-1 ring-cyan-400' : ''}`}
                  title={region.nameEn}
                >
                  <span>{region.icon}</span>
                  <span>{region.nameTh}</span>
                </button>
              );
            })}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 bottom-1 w-10 rounded-r-xl bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent"
            />
          </div>
          <p className="text-[10px] text-zinc-500 leading-snug">
            {pickMode === 'muscle'
              ? 'ชี้ที่โมเดลเพื่อดูชื่อกล้ามเนื้อรายมัด แล้วกดเพื่อเลือกมัดนั้น (ซิงค์กลุ่มเข้าตารางฝึก)'
              : 'กดมัดไหนก็ได้เพื่อเลือก/ยกเลิกทั้งส่วนของร่างกาย หรือกดชิปด้านบน'}
          </p>
        </div>

        {/* 3D Canvas Viewport */}
        <div className="relative w-full h-[380px] sm:h-[430px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
          <div
            ref={mountRef}
            className="w-full h-full"
            style={{ touchAction: orbitLocked ? 'pan-y' : 'none' }}
          />

          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 max-w-[220px] px-2.5 py-1.5 rounded-lg bg-zinc-950/95 border border-orange-500/60 shadow-xl"
              style={{ left: tooltip.x, top: tooltip.y, transform: 'translateY(-100%)' }}
            >
              <div className="text-[11px] font-extrabold text-white leading-tight">{tooltip.th}</div>
              <div className="text-[10px] font-mono text-orange-300 leading-tight">{tooltip.en}</div>
              <div className="text-[10px] text-zinc-400 leading-tight">กลุ่ม: {tooltip.groupTh}</div>
            </div>
          )}

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
                  className={`min-h-[40px] px-3 py-1 rounded-lg text-xs font-bold transition ${
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
                className="min-h-[40px] px-3 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
              >
                ＋ ซูม
              </button>
              <button
                type="button"
                onClick={() => adjustZoom(0.7)}
                className="min-h-[40px] px-3 py-1 rounded-lg text-xs font-bold text-zinc-200 hover:bg-zinc-800"
              >
                － ซูม
              </button>
            </div>
          </div>
        </div>

        {hint && (
          <div
            key={hint.id}
            role="status"
            aria-live="polite"
            className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-xl px-3 py-2"
          >
            {hint.kind === 'min1'
              ? '⚠️ ต้องเลือกอย่างน้อย 1 มัด'
              : 'ℹ️ เลือกเฉพาะมัดนี้แล้ว (ออกจากโหมดทั่วร่างกาย)'}
          </div>
        )}
      </div>

      {/* MSD Manual Medical Anatomical Reference Card */}
      <div
        className={`bg-zinc-950/90 border rounded-2xl p-3 space-y-1 transition ${
          hint?.kind === 'min1' ? 'border-amber-400 ring-2 ring-amber-400/60 animate-pulse' : 'border-orange-500/35'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-white">{displayMeta.nameTh}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-orange-300 border border-zinc-800">
            {displayMeta.nameEn}
          </span>
        </div>
        {pickedMesh && engineMode === 'ecorche' && pickMode === 'muscle' && (
          <p className="text-[11px] text-amber-300 font-semibold">
            🎯 มัดที่เลือก: {getSubMuscleLabel(pickedMesh.subLabel).th} ({getSubMuscleLabel(pickedMesh.subLabel).en})
          </p>
        )}
        {pickedRegionId && engineMode === 'ecorche' && pickMode === 'region' && (
          <p className="text-[11px] text-amber-300 font-semibold">
            🧍 ส่วนของร่างกาย: {BODY_REGIONS.find(r => r.id === pickedRegionId)?.nameTh} (
            {BODY_REGIONS.find(r => r.id === pickedRegionId)?.nameEn})
          </p>
        )}
        <p className="text-[11px] text-cyan-300">
          จุดกำเนิด → จุดเกาะ (Origin/Insertion): <span className="text-zinc-300">{displayMeta.originInsertion}</span>
        </p>
        <p className="text-[11px] text-zinc-400 leading-snug">{displayMeta.description}</p>
      </div>

      {/* 16 Muscle Group Quick-Select Chips (Synced with both BioDigital & Ecorché) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-zinc-400">
            ซิงค์มัดกล้ามเนื้อเข้าตาราง ({isFullBody ? 'ครบทั้งหมด 16 มัด' : `${selectedMuscles.length}/16 มัด`}):
          </span>
          {onSmartRecoveryPick && (
            <button
              type="button"
              onClick={onSmartRecoveryPick}
              className="min-h-[40px] px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition"
            >
              ✨ เลือกมัดที่ฟื้นตัวพร้อมฝึก (&gt;=85%)
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-64 sm:max-h-48 overflow-y-auto pr-1">
          {MUSCLE_GROUPS.map(m => {
            const active = isFullBody || selectedMuscles.includes(m.id);
            const rec = recoveryStats[m.id] ?? 100;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setFocusedMuscle(m.id);
                  if (engineMode === 'ecorche') hintForMuscleClickRef.current?.(m.id);
                  if (onToggleMuscle) onToggleMuscle(m.id);
                }}
                className={`min-h-[40px] px-2 py-1.5 rounded-xl text-[11px] font-semibold border text-left transition flex items-center justify-between gap-1 ${
                  active
                    ? 'bg-zinc-800/95 text-white border-orange-500/80'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: active ? m.color : '#7f1d1d' }}
                  />
                  <span className="line-clamp-2 leading-tight break-words min-w-0">{m.nameTh.split(' (')[0]}</span>
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
