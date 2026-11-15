/**
 * ============================================================================
 * ExerciseVideoEngine.js
 * ระบบสร้างสตรีมวิดีโอวนลูปเชิงกลศาสตร์ชีวภาพ (Real-Time Looping Workout Video Engine)
 * เชื่อมต่อกับ HTML5 <video autoplay loop muted playsinline> ผ่าน MediaStream (captureStream)
 * รองรับทุกท่าออกกำลังกายและโยคะ พร้อมอุปกรณ์จริงทั้ง 11 ชนิด ปรับความเร็ว 0.5x/1.0x/1.5x
 * และสลับมุมกล้อง Side / Front ได้ทันทีโดยไม่มีอาการกระตุก (Zero-Latency)
 * ============================================================================
 */

export class BiomechanicalVideoLoopEngine {
  constructor(options = {}) {
    this.width = options.width || 640;
    this.height = options.height || 400;
    this.fps = options.fps || 30;
    this.playbackRate = 1.0;
    this.cameraAngle = 'side'; // 'side' | 'front'
    this.currentStep = null;
    this.selectedEquipment = ['bodyweight'];
    this.rafId = null;
    this.startTime = performance.now();
    this.stream = null;
    this.videoEl = null;
    this.fallbackCanvasEl = null;
    this.prewarmedSteps = new Map();

    // Offscreen Canvas สำหรับสตรีมเป็น <video> Real-time
    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext('2d');
    }
  }

  attachToVideo(videoElement, fallbackCanvas = null) {
    this.videoEl = videoElement;
    this.fallbackCanvasEl = fallbackCanvas;

    if (this.canvas && videoElement && typeof this.canvas.captureStream === 'function') {
      try {
        if (!this.stream) {
          this.stream = this.canvas.captureStream(this.fps);
        }
        if (videoElement.srcObject !== this.stream) {
          videoElement.srcObject = this.stream;
        }
        videoElement.muted = true;
        videoElement.loop = true;
        videoElement.playsInline = true;
        const p = videoElement.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {
        // Fallback to direct canvas render if captureStream restricted
      }
    }
    this.startLoop();
  }

  setExerciseStep(step, selectedEquipment = ['bodyweight']) {
    this.currentStep = step;
    this.selectedEquipment = selectedEquipment;
  }

  prewarmStep(step) {
    if (step && step.exerciseId) {
      this.prewarmedSteps.set(step.exerciseId, {
        poseType: step.videoKinematics?.poseType || 'squat',
        equipRender: step.videoKinematics?.equipRender || 'bodyweight',
        timestamp: Date.now()
      });
    }
  }

  setPlaybackRate(rate) {
    this.playbackRate = Number(rate) || 1.0;
    if (this.videoEl) {
      try {
        this.videoEl.playbackRate = 1.0; // Speed handled smoothly inside kinematic phase
      } catch {}
    }
  }

  setCameraAngle(angle) {
    this.cameraAngle = angle === 'front' ? 'front' : 'side';
  }

  startLoop() {
    if (this.rafId) return;
    const render = now => {
      this.drawFrame(now);
      this.rafId = requestAnimationFrame(render);
    };
    this.rafId = requestAnimationFrame(render);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  /**
   * วาดเฟรมการเคลื่อนไหวตามหลัก Biomechanics และแสดงเส้นใยกล้ามเนื้อที่ออกแรง
   */
  drawFrame(now) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    const step = this.currentStep;
    const kin = step?.videoKinematics || { poseType: 'squat', tempoSec: 1.5, equipRender: 'bodyweight', rangeDeg: 80 };
    const tempoMs = Math.max(450, (kin.tempoSec || 1.5) * 1000);
    const elapsed = (now - this.startTime) * this.playbackRate;
    const cyclePhase = (elapsed % tempoMs) / tempoMs; // 0..1 seamless infinite loop
    const wave = 0.5 - 0.5 * Math.cos(cyclePhase * Math.PI * 2); // 0 -> 1 -> 0 smooth easing
    const signedWave = Math.sin(cyclePhase * Math.PI * 2); // -1..1

    const primaryColor = step?.primaryMuscleColor || '#f97316';
    const isRest = step?.type === 'REST' || step?.type === 'COOLDOWN';

    // 1. Dark Medical Studio Background + Floor Perspective
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.35, 30, W * 0.5, H * 0.5, W * 0.72);
    bgGrad.addColorStop(0, isRest ? '#0c1f29' : '#1f1612');
    bgGrad.addColorStop(0.55, '#0d0e14');
    bgGrad.addColorStop(1, '#070709');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Studio Grid Floor
    const floorY = H * 0.84;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + i * 55, floorY);
      ctx.lineTo(W * 0.5 + i * 115, H);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(30, floorY);
    ctx.lineTo(W - 30, floorY);
    ctx.strokeStyle = isRest ? 'rgba(6, 182, 212, 0.35)' : 'rgba(249, 115, 22, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Determine effective equipment to draw
    const activeEquip = this.resolveEquipmentRender(kin.equipRender, step?.equipment || []);

    // 2. Render Studio Equipment Props (Floor / Rig / Bike / Bench / Mat)
    this.drawFloorProps(ctx, W, floorY, activeEquip, cyclePhase);

    // 3. Compute Joint Coordinates for Pose Kinematics
    const joints = this.computePoseJoints(kin.poseType, wave, signedWave, cyclePhase, W, floorY);

    // 4. Draw Athlete Body + Medical Striated Muscle Glow + Held Equipment
    this.drawAnatomicalAthlete(ctx, joints, activeEquip, primaryColor, wave, cyclePhase, isRest);

    // 5. Render Subtle Loop Phase Arc & Contraction Telemetry
    this.drawVideoHud(ctx, W, H, wave, cyclePhase, primaryColor, activeEquip, step);

    // Mirror onto fallback canvas if provided
    if (this.fallbackCanvasEl) {
      const fCtx = this.fallbackCanvasEl.getContext('2d');
      if (fCtx) {
        fCtx.drawImage(this.canvas, 0, 0, this.fallbackCanvasEl.width, this.fallbackCanvasEl.height);
      }
    }
  }

  resolveEquipmentRender(kinEquip, stepEquipList) {
    if (this.selectedEquipment && this.selectedEquipment.length > 0) {
      const matched = stepEquipList.find(eq => this.selectedEquipment.includes(eq));
      if (matched) return matched;
    }
    return kinEquip || 'bodyweight';
  }

  drawFloorProps(ctx, W, floorY, equip, cyclePhase) {
    const cx = W * 0.5;
    if (equip === 'yoga_mat' || equip === 'yoga_block') {
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.roundRect(cx - 145, floorY - 6, 290, 8, 4);
      ctx.fill();
      if (equip === 'yoga_block') {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(cx + 80, floorY - 34, 34, 28);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + 80, floorY - 34, 34, 28);
      }
    } else if (equip === 'bench' || equip === 'bench_barbell') {
      ctx.fillStyle = '#27272a';
      ctx.fillRect(cx - 95, floorY - 58, 190, 14);
      ctx.fillRect(cx - 75, floorY - 44, 12, 44);
      ctx.fillRect(cx + 63, floorY - 44, 12, 44);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(cx - 95, floorY - 62, 190, 6);
    } else if (equip === 'pullup_bar') {
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 115, floorY);
      ctx.lineTo(cx - 115, 48);
      ctx.lineTo(cx + 115, 48);
      ctx.lineTo(cx + 115, floorY);
      ctx.stroke();
    } else if (equip === 'bike') {
      // Stationary Spin/Air Bike Frame & Spinning Flywheel
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 80, floorY);
      ctx.lineTo(cx + 80, floorY);
      ctx.moveTo(cx - 40, floorY);
      ctx.lineTo(cx - 25, floorY - 82);
      ctx.lineTo(cx + 48, floorY - 92);
      ctx.moveTo(cx + 42, floorY - 125);
      ctx.lineTo(cx + 55, floorY - 52);
      ctx.stroke();

      // Spinning Flywheel
      const wheelX = cx + 52;
      const wheelY = floorY - 42;
      ctx.beginPath();
      ctx.arc(wheelX, wheelY, 34, 0, Math.PI * 2);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4;
      ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const ang = cyclePhase * Math.PI * 2 + (k * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(wheelX, wheelY);
        ctx.lineTo(wheelX + Math.cos(ang) * 32, wheelY + Math.sin(ang) * 32);
        ctx.strokeStyle = 'rgba(249,115,22,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  computePoseJoints(poseType, wave, signedWave, cyclePhase, W, floorY) {
    const cx = W * 0.5;
    const isFront = this.cameraAngle === 'front';

    // Default Standing Neutral
    let hip = { x: cx, y: floorY - 108 };
    let shoulder = { x: cx, y: floorY - 196 };
    let head = { x: cx, y: floorY - 228 };
    let elbow = { x: cx + (isFront ? 36 : 12), y: floorY - 148 };
    let hand = { x: cx + (isFront ? 46 : 22), y: floorY - 110 };
    let elbowL = { x: cx - 36, y: floorY - 148 };
    let handL = { x: cx - 46, y: floorY - 110 };
    let knee = { x: cx + (isFront ? 18 : 6), y: floorY - 56 };
    let foot = { x: cx + (isFront ? 20 : 0), y: floorY - 4 };
    let kneeL = { x: cx - 18, y: floorY - 56 };
    let footL = { x: cx - 20, y: floorY - 4 };

    switch (poseType) {
      case 'squat':
      case 'jump_squat': {
        const drop = wave * 48;
        const jumpLift = poseType === 'jump_squat' ? Math.max(0, -signedWave) * 36 : 0;
        hip = { x: cx - (isFront ? 0 : wave * 24), y: floorY - 106 + drop - jumpLift };
        shoulder = { x: cx + (isFront ? 0 : wave * 12), y: floorY - 192 + drop * 0.92 - jumpLift };
        head = { x: shoulder.x + (isFront ? 0 : 4), y: shoulder.y - 32 };
        knee = { x: cx + (isFront ? 24 : 26 * wave + 8), y: floorY - 58 + drop * 0.2 - jumpLift };
        foot = { x: cx + (isFront ? 24 : 0), y: floorY - 4 - jumpLift };
        kneeL = { x: cx - 24, y: knee.y };
        footL = { x: cx - 24, y: foot.y };
        elbow = { x: shoulder.x + (isFront ? 34 : 28), y: shoulder.y + 22 };
        hand = { x: shoulder.x + (isFront ? 38 : 54), y: shoulder.y + 12 - wave * 16 };
        elbowL = { x: shoulder.x - 34, y: elbow.y };
        handL = { x: shoulder.x - 38, y: hand.y };
        break;
      }

      case 'thruster': {
        const squatPhase = wave < 0.5 ? (1 - wave * 2) : 0;
        const pressPhase = wave >= 0.5 ? (wave - 0.5) * 2 : 0;
        const drop = squatPhase * 46;
        hip = { x: cx - (isFront ? 0 : squatPhase * 22), y: floorY - 106 + drop };
        shoulder = { x: cx + (isFront ? 0 : squatPhase * 10), y: floorY - 192 + drop * 0.9 };
        head = { x: shoulder.x, y: shoulder.y - 32 };
        knee = { x: cx + (isFront ? 22 : squatPhase * 26 + 6), y: floorY - 58 + drop * 0.2 };
        kneeL = { x: cx - 22, y: knee.y };
        elbow = { x: shoulder.x + (isFront ? 36 : 16), y: shoulder.y - pressPhase * 34 + 12 };
        hand = { x: shoulder.x + (isFront ? 34 : 10), y: shoulder.y - 12 - pressPhase * 70 };
        elbowL = { x: shoulder.x - 36, y: elbow.y };
        handL = { x: shoulder.x - 34, y: hand.y };
        break;
      }

      case 'overhead_press': {
        const dip = wave < 0.25 ? (wave / 0.25) * 14 : 0;
        const drive = wave;
        hip = { x: cx, y: floorY - 106 + dip };
        shoulder = { x: cx, y: floorY - 194 + dip };
        head = { x: cx, y: shoulder.y - 32 };
        knee = { x: cx + (isFront ? 18 : 10), y: floorY - 56 + dip * 0.5 };
        kneeL = { x: cx - 18, y: knee.y };
        elbow = { x: shoulder.x + (isFront ? 36 : 16), y: shoulder.y + 8 - drive * 44 };
        hand = { x: shoulder.x + (isFront ? 34 : 8), y: shoulder.y - 14 - drive * 68 };
        elbowL = { x: shoulder.x - 36, y: elbow.y };
        handL = { x: shoulder.x - 34, y: hand.y };
        break;
      }

      case 'pushup':
      case 'pike_pushup': {
        const pushDrop = wave * 28;
        const isPike = poseType === 'pike_pushup';
        foot = { x: cx - 98, y: floorY - 8 };
        footL = { x: cx - 94, y: floorY - 8 };
        knee = { x: cx - 44, y: isPike ? floorY - 62 : floorY - 22 + pushDrop * 0.35 };
        kneeL = { x: cx - 40, y: knee.y };
        hip = { x: cx - 4, y: isPike ? floorY - 126 : floorY - 40 + pushDrop * 0.65 };
        shoulder = { x: cx + 62, y: floorY - 56 + pushDrop };
        head = { x: cx + 92, y: shoulder.y - 8 + pushDrop * 0.1 };
        hand = { x: cx + 68, y: floorY - 6 };
        handL = { x: cx + 58, y: floorY - 6 };
        elbow = { x: cx + 48 - wave * 12, y: (shoulder.y + hand.y) * 0.5 - 6 };
        elbowL = elbow;
        break;
      }

      case 'mountain_climber': {
        foot = { x: cx - 98 + wave * 68, y: floorY - 10 - wave * 18 };
        footL = { x: cx - 98 + (1 - wave) * 68, y: floorY - 10 - (1 - wave) * 18 };
        knee = { x: cx - 45 + wave * 68, y: floorY - 24 - wave * 18 };
        kneeL = { x: cx - 45 + (1 - wave) * 68, y: floorY - 24 - (1 - wave) * 18 };
        hip = { x: cx - 6, y: floorY - 54 };
        shoulder = { x: cx + 64, y: floorY - 72 };
        head = { x: cx + 94, y: floorY - 82 };
        hand = { x: cx + 68, y: floorY - 6 };
        handL = { x: cx + 58, y: floorY - 6 };
        elbow = { x: cx + 66, y: floorY - 38 };
        elbowL = elbow;
        break;
      }

      case 'kettlebell_swing':
      case 'rdl_hinge': {
        const hinge = 1 - wave; // 1 = hinged back, 0 = upright lock
        hip = { x: cx - hinge * 28, y: floorY - 106 + hinge * 14 };
        shoulder = { x: cx + hinge * 42, y: floorY - 194 + hinge * 54 };
        head = { x: shoulder.x + hinge * 18, y: shoulder.y - 28 + hinge * 12 };
        knee = { x: cx + (isFront ? 18 : 6), y: floorY - 56 + hinge * 4 };
        kneeL = { x: cx - 18, y: knee.y };
        const armSwing = poseType === 'kettlebell_swing' ? wave * 88 : 14;
        elbow = { x: shoulder.x + armSwing * 0.5, y: shoulder.y + 42 - armSwing * 0.4 };
        hand = { x: shoulder.x + armSwing * 0.9, y: shoulder.y + 80 - armSwing * 0.88 };
        elbowL = elbow;
        handL = hand;
        break;
      }

      case 'bench_press': {
        hip = { x: cx - 22, y: floorY - 64 };
        shoulder = { x: cx + 34, y: floorY - 66 };
        head = { x: cx + 64, y: floorY - 68 };
        knee = { x: cx - 66, y: floorY - 58 };
        foot = { x: cx - 72, y: floorY - 6 };
        kneeL = knee;
        footL = foot;
        elbow = { x: cx + 34, y: floorY - 82 - wave * 34 };
        hand = { x: cx + 34, y: floorY - 96 - wave * 64 };
        elbowL = elbow;
        handL = hand;
        break;
      }

      case 'tricep_dip': {
        const dip = wave * 34;
        foot = { x: cx - 86, y: floorY - 6 };
        knee = { x: cx - 44, y: floorY - 38 + dip * 0.25 };
        hip = { x: cx + 4, y: floorY - 52 + dip };
        shoulder = { x: cx + 22, y: floorY - 114 + dip };
        head = { x: cx + 24, y: shoulder.y - 28 };
        hand = { x: cx + 42, y: floorY - 58 };
        elbow = { x: cx + 44 + wave * 10, y: (shoulder.y + hand.y) * 0.5 - 8 };
        kneeL = knee; footL = foot; elbowL = elbow; handL = hand;
        break;
      }

      case 'hip_thrust': {
        const lift = wave * 42;
        foot = { x: cx - 74, y: floorY - 6 };
        knee = { x: cx - 54, y: floorY - 66 };
        hip = { x: cx - 6, y: floorY - 16 - lift };
        shoulder = { x: cx + 58, y: floorY - 22 };
        head = { x: cx + 88, y: floorY - 16 };
        elbow = { x: cx + 26, y: floorY - 14 };
        hand = { x: cx - 4, y: hip.y - 4 };
        kneeL = knee; footL = foot; elbowL = elbow; handL = hand;
        break;
      }

      case 'pullup': {
        const pull = wave * 56;
        hand = { x: cx + (isFront ? 44 : 8), y: 52 };
        handL = { x: cx - 44, y: 52 };
        shoulder = { x: cx, y: 138 - pull };
        head = { x: cx, y: shoulder.y - 30 };
        elbow = { x: cx + (isFront ? 54 : 18), y: (hand.y + shoulder.y) * 0.5 + 8 };
        elbowL = { x: cx - 54, y: elbow.y };
        hip = { x: cx, y: shoulder.y + 82 };
        knee = { x: cx + (isFront ? 14 : 6), y: hip.y + 48 };
        foot = { x: cx + (isFront ? 14 : -10), y: knee.y + 42 };
        kneeL = { x: cx - 14, y: knee.y };
        footL = { x: cx - 14, y: foot.y };
        break;
      }

      case 'bent_row': {
        hip = { x: cx - 22, y: floorY - 102 };
        shoulder = { x: cx + 38, y: floorY - 140 };
        head = { x: cx + 64, y: floorY - 154 };
        knee = { x: cx - 6, y: floorY - 54 };
        foot = { x: cx - 10, y: floorY - 4 };
        kneeL = knee; footL = foot;
        elbow = { x: shoulder.x - 16 - wave * 24, y: shoulder.y + 18 - wave * 28 };
        hand = { x: shoulder.x + 6, y: shoulder.y + 68 - wave * 42 };
        elbowL = elbow; handL = hand;
        break;
      }

      case 'bicep_curl': {
        elbow = { x: cx + (isFront ? 30 : 8), y: floorY - 148 };
        hand = { x: cx + (isFront ? 34 : 20 + wave * 12), y: floorY - 104 - wave * 64 };
        elbowL = { x: cx - 30, y: elbow.y };
        handL = { x: cx - 34, y: hand.y };
        break;
      }

      case 'band_pull_apart': {
        elbow = { x: cx + (isFront ? 46 + wave * 26 : 36), y: floorY - 186 };
        hand = { x: cx + (isFront ? 68 + wave * 44 : 58), y: floorY - 186 };
        elbowL = { x: cx - (46 + wave * 26), y: floorY - 186 };
        handL = { x: cx - (68 + wave * 44), y: floorY - 186 };
        break;
      }

      case 'indoor_bike': {
        const ang = cyclePhase * Math.PI * 2;
        hip = { x: cx - 26, y: floorY - 118 };
        shoulder = { x: cx + 22, y: floorY - 178 };
        head = { x: cx + 42, y: floorY - 208 };
        hand = { x: cx + 48, y: floorY - 128 };
        elbow = { x: cx + 38, y: floorY - 152 };
        foot = { x: cx - 8 + Math.cos(ang) * 26, y: floorY - 42 + Math.sin(ang) * 26 };
        footL = { x: cx - 8 + Math.cos(ang + Math.PI) * 26, y: floorY - 42 + Math.sin(ang + Math.PI) * 26 };
        knee = { x: (hip.x + foot.x) * 0.5 + 22, y: (hip.y + foot.y) * 0.5 - 12 };
        kneeL = { x: (hip.x + footL.x) * 0.5 + 22, y: (hip.y + footL.y) * 0.5 - 12 };
        elbowL = elbow; handL = hand;
        break;
      }

      case 'jump_rope': {
        const hop = Math.abs(Math.sin(cyclePhase * Math.PI)) * 24;
        hip = { x: cx, y: floorY - 108 - hop };
        shoulder = { x: cx, y: floorY - 196 - hop };
        head = { x: cx, y: shoulder.y - 32 };
        knee = { x: cx + (isFront ? 16 : 6), y: floorY - 56 - hop };
        foot = { x: cx + (isFront ? 18 : 0), y: floorY - 6 - hop };
        kneeL = { x: cx - 16, y: knee.y };
        footL = { x: cx - 18, y: foot.y };
        elbow = { x: cx + (isFront ? 44 : 10), y: shoulder.y + 42 };
        hand = { x: cx + (isFront ? 64 : 28), y: shoulder.y + 52 };
        elbowL = { x: cx - 44, y: elbow.y };
        handL = { x: cx - 64, y: hand.y };
        break;
      }

      case 'calf_raise': {
        const raise = wave * 18;
        hip = { x: cx, y: floorY - 108 - raise };
        shoulder = { x: cx, y: floorY - 196 - raise };
        head = { x: cx, y: shoulder.y - 32 };
        knee = { x: cx + (isFront ? 16 : 4), y: floorY - 56 - raise };
        foot = { x: cx + (isFront ? 18 : 0), y: floorY - 4 - raise * 0.5 };
        kneeL = { x: cx - 16, y: knee.y };
        footL = { x: cx - 18, y: foot.y };
        break;
      }

      case 'russian_twist':
      case 'yoga_boat': {
        const lift = wave * 12;
        hip = { x: cx - 10, y: floorY - 18 };
        shoulder = { x: cx - 44, y: floorY - 76 - lift * 0.4 };
        head = { x: cx - 54, y: shoulder.y - 28 };
        knee = { x: cx + 32, y: floorY - 56 - lift };
        foot = { x: cx + 74, y: floorY - 82 - lift };
        kneeL = knee; footL = foot;
        elbow = { x: shoulder.x + 26 + signedWave * 14, y: shoulder.y + 24 };
        hand = { x: shoulder.x + 54 + signedWave * 22, y: shoulder.y + 18 };
        elbowL = elbow; handL = hand;
        break;
      }

      case 'yoga_cobra': {
        const arch = wave * 42;
        foot = { x: cx - 108, y: floorY - 8 };
        knee = { x: cx - 58, y: floorY - 10 };
        hip = { x: cx - 10, y: floorY - 14 };
        shoulder = { x: cx + 52, y: floorY - 26 - arch };
        head = { x: cx + 72, y: shoulder.y - 24 - arch * 0.3 };
        hand = { x: cx + 54, y: floorY - 6 };
        elbow = { x: cx + 48, y: (shoulder.y + hand.y) * 0.5 };
        kneeL = knee; footL = foot; elbowL = elbow; handL = hand;
        break;
      }

      case 'yoga_downward_dog': {
        const pedal = wave * 14;
        foot = { x: cx - 78, y: floorY - 6 - pedal };
        footL = { x: cx - 70, y: floorY - 6 - (14 - pedal) };
        knee = { x: cx - 44, y: floorY - 62 };
        kneeL = knee;
        hip = { x: cx - 4, y: floorY - 134 };
        shoulder = { x: cx + 46, y: floorY - 74 };
        head = { x: cx + 58, y: floorY - 54 };
        elbow = { x: cx + 66, y: floorY - 40 };
        hand = { x: cx + 84, y: floorY - 6 };
        elbowL = elbow; handL = hand;
        break;
      }

      case 'yoga_warrior': {
        const sink = wave * 18;
        foot = { x: cx + 52, y: floorY - 6 };
        knee = { x: cx + 48, y: floorY - 58 + sink * 0.5 };
        footL = { x: cx - 64, y: floorY - 6 };
        kneeL = { x: cx - 36, y: floorY - 52 + sink * 0.3 };
        hip = { x: cx, y: floorY - 96 + sink };
        shoulder = { x: cx + 2, y: floorY - 182 + sink };
        head = { x: cx + 4, y: shoulder.y - 30 };
        elbow = { x: shoulder.x + 42, y: shoulder.y - 6 - wave * 24 };
        hand = { x: shoulder.x + 82, y: shoulder.y - 12 - wave * 52 };
        elbowL = { x: shoulder.x - 42, y: elbow.y };
        handL = { x: shoulder.x - 82, y: hand.y };
        break;
      }

      case 'yoga_seated_stretch':
      default: {
        const sway = signedWave * 10;
        hip = { x: cx, y: floorY - 18 };
        shoulder = { x: cx + sway * 0.5, y: floorY - 102 };
        head = { x: cx + sway, y: shoulder.y - 32 };
        knee = { x: cx + 48, y: floorY - 16 };
        foot = { x: cx + 18, y: floorY - 8 };
        kneeL = { x: cx - 48, y: floorY - 16 };
        footL = { x: cx - 18, y: floorY - 8 };
        elbow = { x: cx + 32, y: floorY - 64 };
        hand = { x: cx + 44, y: floorY - 16 };
        elbowL = { x: cx - 32, y: floorY - 64 };
        handL = { x: cx - 44, y: floorY - 16 };
        break;
      }
    }

    return { head, shoulder, hip, elbow, hand, elbowL, handL, knee, foot, kneeL, footL };
  }

  drawAnatomicalAthlete(ctx, j, equip, primaryColor, wave, cyclePhase, isRest) {
    const isFront = this.cameraAngle === 'front';
    const muscleGlow = isRest ? '#06b6d4' : primaryColor;

    // Draw Limb Helper with Striated Muscle Fiber Contour
    const drawLimb = (p1, p2, width, isActive = false) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = isActive ? muscleGlow : '#3f3f46';
      ctx.lineWidth = width;
      ctx.stroke();

      // Medical Striation Highlight inside limb
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = Math.max(2, width * 0.25);
      ctx.stroke();
      ctx.restore();
    };

    // Back limbs first (for depth)
    drawLimb(j.hip, j.kneeL, 17, false);
    drawLimb(j.kneeL, j.footL, 13, false);
    drawLimb(j.shoulder, j.elbowL, 14, false);
    drawLimb(j.elbowL, j.handL, 11, false);

    // Torso with striated muscle highlight
    drawLimb(j.hip, j.shoulder, isFront ? 36 : 26, true);

    // Front limbs (with EMG intensity glow proportional to wave)
    drawLimb(j.hip, j.knee, 19, true);
    drawLimb(j.knee, j.foot, 14, wave > 0.4);
    drawLimb(j.shoulder, j.elbow, 16, true);
    drawLimb(j.elbow, j.hand, 12, wave > 0.3);

    // Head
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, 17, 0, Math.PI * 2);
    ctx.fillStyle = '#e4e4e7';
    ctx.fill();
    ctx.strokeStyle = muscleGlow;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Joint Nodes
    [j.shoulder, j.hip, j.knee, j.elbow].forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    // Draw Held Equipment on Hands
    if (equip === 'dumbbell') {
      [j.hand, j.handL].forEach(h => {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(h.x - 13, h.y - 6, 8, 12);
        ctx.fillRect(h.x + 5, h.y - 6, 8, 12);
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(h.x - 5, h.y - 2, 10, 4);
      });
    } else if (equip === 'kettlebell') {
      ctx.beginPath();
      ctx.arc(j.hand.x, j.hand.y + 10, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(j.hand.x, j.hand.y + 2, 7, Math.PI, 0);
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (equip === 'barbell' || equip === 'bench_barbell') {
      ctx.strokeStyle = '#d4d4d8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(j.hand.x - 42, j.hand.y);
      ctx.lineTo(j.hand.x + 42, j.hand.y);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(j.hand.x - 42, j.hand.y - 16, 8, 32);
      ctx.fillRect(j.hand.x + 34, j.hand.y - 16, 8, 32);
    } else if (equip === 'band') {
      ctx.beginPath();
      ctx.moveTo(j.handL.x, j.handL.y);
      ctx.lineTo(j.hand.x, j.hand.y);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (equip === 'jump_rope') {
      const ropeArc = Math.sin(cyclePhase * Math.PI * 2) * 145;
      ctx.beginPath();
      ctx.moveTo(j.handL.x, j.handL.y);
      ctx.quadraticCurveTo(j.hip.x, j.hip.y + ropeArc, j.hand.x, j.hand.y);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  drawVideoHud(ctx, W, H, wave, cyclePhase, primaryColor, activeEquip, step) {
    // Top-left Live Motion Loop indicator
    ctx.fillStyle = 'rgba(9, 9, 11, 0.78)';
    ctx.beginPath();
    ctx.roundRect(14, 14, 218, 28, 8);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(28, 28, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();

    ctx.fillStyle = '#f4f4f5';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`LOOP VIDEO • ${this.playbackRate}x • ${this.cameraAngle.toUpperCase()}`, 40, 32);

    // Contraction Phase Bar (Top-right)
    ctx.fillStyle = 'rgba(9, 9, 11, 0.78)';
    ctx.beginPath();
    ctx.roundRect(W - 156, 14, 142, 28, 8);
    ctx.fill();

    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(wave > 0.55 ? 'CONCENTRIC (ออกแรง)' : 'ECCENTRIC (ควบคุม)', W - 146, 31);

    // Equipment badge
    ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
    ctx.beginPath();
    ctx.roundRect(14, H - 38, 178, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`PROP: ${activeEquip.toUpperCase()}`, 24, H - 22);
  }
}
