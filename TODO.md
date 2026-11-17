# TODO — รายการงานแก้ไขและพัฒนา (KINETIC MED-FIT 3D)

เอกสารฉบับนี้รวบรวมรายการงานที่ทีมพัฒนา (Frontend / PWA / Logic) ต้องดำเนินการตามลำดับความสำคัญ โดยอ้างอิงจากผลการตรวจสอบระบบและประสบการณ์ผู้ใช้ (QA & UX Audit) ของโปรเจกต์ **KINETIC MED-FIT 3D (v2.0)**

> **เป้าหมายของ Sprint:** ปิดจุดบกพร่องระดับ Critical/High ด้านสถาปัตยกรรม, PWA Offline, Logic การสลับท่า, และ Mobile-First UX ก่อนต่อยอดฟีเจอร์ใหม่ใน Backlog

---

## 🔴 P0 — Critical (ต้องแก้ไขทันที / Blockers)

- [x] **[TODO-01] ยุบรวมสถาปัตยกรรมที่แยกเป็น 2 ระบบซ้ำซ้อน (Split Codebase)**
  - **ไฟล์ที่เกี่ยวข้อง:** `Index.html` (บรรทัด `422–1119`), `src/App.jsx`, `src/Body3DSelector.jsx`, `src/WorkoutPlayer.jsx`, `package.json`
  - **สิ่งที่ต้องทำ:**
    1. ตัดสินใจเลือก Single Source of Truth (แนะนำให้ใช้ฝั่ง **React + Vite** เป็นหลักเพื่อให้ `npm run build` และ Capacitor Android ใช้งานได้จริง)
    2. สร้างไฟล์ Entry Point `src/main.jsx` เพื่อ Mount `<App />` และนำเข้า CSS (`src/index.css` สำหรับ Tailwind)
    3. ปรับ `Index.html` ให้โหลด `<div id="root"></div>` + `<script type="module" src="/src/main.jsx"></script>` แทน Vanilla JS ที่เขียนซ้ำไว้ หรือหากยังต้องรองรับโหมด Zero-Build ให้พอร์ต UI ที่หายไปจาก `App.jsx` / `WorkoutPlayer.jsx` (ตาราง JEFIT Recovery 16 มัด, การ์ด Celebration จบเซสชัน, การสลับ Tab บนมือถือ) กลับมาให้ครบ 100%
    4. ตรวจสอบ `npm run build` และ `npm run preview` ให้ผ่านโดยไม่มี Error

- [x] **[TODO-02] แก้ไขระบบ Offline PWA ให้ทำงานได้จริงเมื่อไม่มีอินเทอร์เน็ต**
  - **ไฟล์ที่เกี่ยวข้อง:** `sw.js` (บรรทัด `1–43`), `Index.html` (บรรทัด `14–39`), `package.json`
  - **สิ่งที่ต้องทำ:**
    1. ย้าย Dependency หลักที่ดึงจาก CDN (`https://cdn.tailwindcss.com`, `https://unpkg.com/three@0.160.0/...`) มา Bundle ผ่าน Vite (`tailwindcss`, `three` ใน `package.json` มีอยู่แล้ว)
    2. ปรับ `sw.js` ให้แคชไฟล์ Build ทั้งหมด รวมถึงจัดการ Cross-Origin assets (เช่น Google Fonts หรือเพิ่ม System Font Fallback `sans-serif`, `monospace`) โดยไม่กรองทิ้งด้วย `res.type === 'basic'` เพียงอย่างเดียว
    3. อัปเดต `CORE_ASSETS` ใน `sw.js` และเพิ่ม `CACHE_NAME` เวอร์ชันใหม่ (เช่น `kinetic-medfit-3d-v3`)
    4. ทดสอบใน Chrome DevTools → Application → Service Workers → ติ๊ก **Offline** แล้วรีโหลดหน้าเว็บ ต้องเปิดใช้งาน 3D, วิดีโอ และ Timer ได้ครบ

---

## 🟠 P1 — High (กระทบ Flow การฝึกหลักและการใช้งานบนมือถือ)

- [x] **[TODO-03] แก้ไขบั๊กปุ่มสลับท่า (`🔀 Swap`) ไม่อัปเดตข้อมูลในสเต็ปพัก (`REST`) ก่อนหน้า**
  - **ไฟล์ที่เกี่ยวข้อง:** `src/WorkoutEngine.js` → `swapExerciseInSchedule` (บรรทัด `1246–1291`) และ `generateTimeBoundedSchedule` (บรรทัด `1103–1123`)
  - **สิ่งที่ต้องทำ:**
    1. ใน `swapExerciseInSchedule(schedule, stepIndex)` เมื่อสร้าง `newStep` จากท่าใหม่ (`replacement`) แล้ว ให้เช็ก `const prevStep = schedule.steps[stepIndex - 1]`
    2. หาก `prevStep && prevStep.type === 'REST'` ให้อัปเดต `nameTh`, `nameEn`, `formCues`, `primaryMuscle`, `primaryMuscleTh`, `primaryMuscleColor`, `videoKinematics`, `mediaUrl`, และ `aiPrompt` ของสเต็ป `REST` นั้นให้ชี้ไปที่ `replacement` ทันที (คง `duration`, `roundLabel`, `startTimeSec`, `endTimeSec` และ `id` เดิมไว้)
    3. ตรวจสอบทั้งโหมด `HIIT`, `CARDIO`, `YOGA`, `7MIN` และ `REHIT` (`ACTIVE_RECOVERY` ไม่ทับผิดท่า)

- [x] **[TODO-04] แก้ไขระบบ Fallback `<canvas>` วิดีโอ และปัญหาข้อความ HUD ทับปุ่มควบคุม**
  - **ไฟล์ที่เกี่ยวข้อง:** `src/ExerciseVideoEngine.js` (บรรทัด `36–60`, `192`, `680–714`), `Index.html` (บรรทัด `286–311`), `src/WorkoutPlayer.jsx` (บรรทัด `483–543`)
  - **สิ่งที่ต้องทำ:**
    1. ใน `BiomechanicalVideoLoopEngine.attachToVideo(videoElement, fallbackCanvas)`: หาก `typeof this.canvas.captureStream !== 'function'` หรือ `videoElement.play()` เกิด Rejection ให้ซ่อน `videoElement` (`classList.add('hidden')`) และแสดง `fallbackCanvas` (`classList.remove('hidden')`) อัตโนมัติ
    2. เพิ่ม Helper `drawRoundedRect(ctx, x, y, w, h, r)` แทนการใช้ `ctx.roundRect()` ตรง ๆ เพื่อให้ทำงานได้บน WebView / Safari รุ่นเก่า
    3. เปลี่ยนคลาส `<video>` และ `<canvas>` จาก `object-cover` เป็น `object-contain bg-zinc-950` เพื่อไม่ให้ขอบซ้าย-ขวาของ HUD ถูกตัดบนจอมือถือ
    4. ย้ายตำแหน่ง `PROP: ...` ใน `drawVideoHud()` (บรรทัด `706–713`) จาก `H - 38` ไปไว้ตำแหน่งบนหรือขยับให้พ้นแถบควบคุม HTML (`bottom-2.5`) เพื่อไม่ให้ซ้อนทับปุ่ม `0.5x / 1.0x / 1.5x`

- [x] **[TODO-05] เพิ่มระบบป้องกันการเผลอรีเซ็ตตารางฝึกระหว่างออกกำลังกาย**
  - **ไฟล์ที่เกี่ยวข้อง:** `Index.html` (`rebuildScheduleAndRender` บรรทัด `757–781`), `src/App.jsx` (บรรทัด `61–73`), `src/WorkoutPlayer.jsx`
  - **สิ่งที่ต้องทำ:**
    1. เก็บสถานะว่าผู้ใช้เริ่มฝึกเซสชันปัจจุบันแล้วหรือยัง (`hasStartedWorkout = isRunning || currentIndex > 0 || remainingSec < currentStep.duration`)
    2. ก่อนสร้างตารางใหม่จากการเปลี่ยนกล้ามเนื้อ, อุปกรณ์, โหมด, ระดับ หรือเวลา หาก `hasStartedWorkout === true` ให้แสดง Modal ยืนยัน *"คุณกำลังฝึกซ้อมค้างอยู่ ต้องการล้างเวลาปัจจุบันเพื่อสร้างตารางใหม่หรือไม่?"*
    3. เพิ่มปุ่ม `🔄 เริ่มต้นใหม่` แยกต่างหากในหน้า Player เพื่อความชัดเจน

- [x] **[TODO-06] แก้ไข Mobile Scroll Trap และ Touch Interaction บนโมเดล 3D**
  - **ไฟล์ที่เกี่ยวข้อง:** `Index.html` (บรรทัด `157–180`, `397–410`, `541–566`, `1108–1115`), `src/Body3DSelector.jsx` (บรรทัด `104–127`), `src/Body3DAnatomy.js` (บรรทัด `234–235`, `270–271`)
  - **สิ่งที่ต้องทำ:**
    1. ใน `Index.html` ปรับพฤติกรรม Bottom Navigation (`.mnav-btn`) บนหน้าจอ `< lg` ให้สลับแสดงทีละ Section (เหมือน `App.jsx`) หรือเพิ่มปุ่มล็อก `🔒 ล็อกการหมุน 3D` เพื่อไม่ให้นิ้วติดอยู่ในกรอบ WebGL ขณะเลื่อนหน้าเว็บ
    2. ใน `src/Body3DSelector.jsx` อัปเดต `setHoveredMuscle(hits[0].object.userData.muscleId)` inside `handlePointerUp` (และ/หรือ `handlePointerDown`) เพื่อให้ผู้ใช้มือถือที่แตะหน้าจอเห็น Tooltip ชื่อมัดกล้ามเนื้อและจุดยึดเกาะ (`Origin/Insertion`)
    3. ขยาย Hit Area หรือปรับขนาด Capsule ของมัดกล้ามเนื้อเล็ก (เช่น `neck_scm`, `forearms`) ให้กดเลือกบนหน้าจอมือถือได้ง่ายขึ้น

---

## 🟡 P2 — Medium (ความถูกต้องของ UI, Telemetry และ Touch Target)

- [x] **[TODO-07] แก้ไขป้ายสถานะวงแหวนนับถอยหลัง & ความแม่นยำของการเตือนล่วงหน้า 5 วินาที**
  - **ไฟล์ที่เกี่ยวข้อง:** `Index.html` (บรรทัด `321`, `986–990`), `src/WorkoutPlayer.jsx` (บรรทัด `203–210`, `566`)
  - **สิ่งที่ต้องทำ:**
    1. อัปเดต `#timer-mode-label` (ใน `Index.html`) และ Badge กลางวงแหวน (ใน `WorkoutPlayer.jsx`) ให้แสดงครบตาม `step.type`: `WARMUP` → `WARM-UP`, `SPRINT` → `SPRINT`, `REST` → `REST`, `COOLDOWN` → `COOL-DOWN`, `WORK` → `ASANA` (เมื่อเป็น YOGA) หรือ `WORK`
    2. เปลี่ยนเงื่อนไขเตือนล่วงหน้าจาก `remainingSec === 5` เป็น `remainingSec <= 5 && remainingSec > 3` ร่วมกับ Flag `warnedStepRef` ต่อสเต็ป เพื่อป้องกันกรณี Timer กระโดดข้ามเลข `5`

- [x] **[TODO-08] ปรับปรุงความสมจริงของ Live BPM, สูตรแคลอรี และระบบคำนวณความล้ากล้ามเนื้อ**
  - **ไฟล์ที่เกี่ยวข้อง:** `Index.html` (บรรทัด `98–101`, `860–864`), `src/WorkoutPlayer.jsx` (บรรทัด `313–320`), `src/WorkoutEngine.js` (บรรทัด `1220–1244`, `1311–1346`)
  - **สิ่งที่ต้องทำ:**
    1. เมื่อ `isRunning === false` ให้แสดง `#live-bpm-display` เป็นช่วงเป้าหมาย เช่น `🎯 125–165 BPM` แทนการกะพริบเลข `128 BPM` ตั้งแต่ยังไม่เริ่มฝึก และระบุป้ายชัดเจนว่าเป็นค่าประมาณ (`Est. BPM`) จนกว่าจะต่อเซนเซอร์จริง
    2. ปรับ `calculateScheduleMetrics(steps, modality, userWeightKg = 70)` ให้คำนวณแคลอรีแยกตาม `workSec` (ใช้ MET โหมดหลัก), `restSec` (MET ~2.5), และ `warmupSec + cooldownSec` (MET ~3.5)
    3. ปรับ `logCompletedWorkoutSession(schedule, completedSteps)` ให้หักค่า Recovery ตามเวลาฝึกจริงของมัดกล้ามเนื้อที่เล่นในแต่ละสเต็ป (คูณน้ำหนักจาก `emgActivation`) แทนการหัก `-28` เท่ากันทุกมัด

- [x] **[TODO-09] ขยายขนาดปุ่มบนมือถือ (Touch Targets >= 44px) & ปรับ UX การเลือกกล้ามเนื้อ**
  - **ไฟล์ที่เกี่ยวข้อง:** `Index.html` (บรรทัด `114–116`, `300–310`, `617–631`, `1093–1098`), `src/App.jsx` (บรรทัด `75–91`), `src/WorkoutPlayer.jsx` (บรรทัด `510–542`)
  - **สิ่งที่ต้องทำ:**
    1. เพิ่มขนาดปุ่ม `.vspeed-btn` (`0.5x`, `1.0x`, `1.5x`) และ `.vangle-btn` (`ข้าง`, `หน้า`) เป็นอย่างน้อย `min-h-[36px] px-3 py-1.5 text-xs` และจัดวางให้กดง่ายขณะถือมือเดียว
    2. เพิ่ม Feedback สีและข้อความให้ปุ่ม `#btn-notify` เมื่อสถานะ Notification เป็น `granted` หรือ `denied`
    3. ปรับพฤติกรรม `handleToggleMuscle` / `toggleMuscleSelection`: หาก `isFullBody === true` แล้วผู้ใช้คลิกเลือก 1 มัด ให้สลับมาเลือก **เฉพาะมัดนั้นมัดเดียว** แทนการหักออกเหลือ 15 มัด พร้อมแสดง Toast แจ้งเตือนเมื่อเหลือรายการสุดท้าย (`ต้องเลือกอย่างน้อย 1 มัดกล้ามเนื้อ / 1 อุปกรณ์`)

---

## 🟢 P3 — Low (Polish & Developer Hygiene)

- [x] **[TODO-10] ซิงก์จังหวะ Pranayama Breath Pacer และย้ายปุ่ม AI Video Prompt**
  - **ไฟล์ที่เกี่ยวข้อง:** `Index.html` (บรรทัด `271–273`, `963–969`), `src/WorkoutPlayer.jsx` (บรรทัด `121–126`, `464–470`), `src/WorkoutEngine.js` (บรรทัด `270–274`)
  - **สิ่งที่ต้องทำ:**
    1. รีเซ็ต `breathTick = 0` ทุกครั้งที่เปลี่ยนสเต็ปเข้าสู่ `YOGA`, `REST`, หรือ `COOLDOWN` เพื่อให้เริ่มที่ `สูดหายใจเข้า (Inhale)` เสมอ
    2. ดึงเวลา Inhale / Hold / Exhale ให้ตรงกับ `TRAINING_MODALITIES.YOGA.protocolsByLevel[fitnessLevel]` (`4:2:4`, `4:2:6`, `5:3:7`)
    3. ย้ายปุ่ม `✨ AI Video Prompt` ไปซ่อนใน Developer / Advanced Settings หรือเปลี่ยนเป็นปุ่ม `💡 เคล็ดลับท่าฝึก & ข้อควรระวัง` สำหรับลูกค้าทั่วไป

---

## 🚀 Feature Tasks (ต่อยอดตาม PRD & Backlog Sprint 2–3)

- [x] **[FEAT-01]** สร้าง **Goal-Based Quick Presets** สำหรับมือใหม่ (ลดไขมัน / แก้ออฟฟิศซินโดรม / ปั้นก้น Low-Impact / ดัมเบล Upper Body)
- [x] **[FEAT-02]** สร้าง **Quick Body Profile** (น้ำหนัก, อายุ, ข้อจำกัดบาดเจ็บ เข่า/ข้อมือ/หลังล่าง) บันทึกใน `localStorage`
- [x] **[FEAT-03]** เพิ่ม **Full-Screen Focus Workout Mode** ตัวเลขเวลาและวิดีโอขนาดใหญ่พิเศษสำหรับวางมือถือห่างตัว 1.5–2 เมตร
- [x] **[FEAT-04]** สร้าง **Post-Workout Summary Modal & 3-Level RPE Check-in** (`สบายมาก / กำลังดี / เหนื่อยสุด ๆ`)
- [x] **[FEAT-05]** เพิ่ม **Smart Recovery Auto-Pick** จัดตารางจากกล้ามเนื้อที่ฟื้นตัว `>= 85%`
- [x] **[FEAT-06]** เพิ่ม **Daily Workout Streak & Weekly Consistency Ring** + **Shareable 9:16 3D Anatomy Workout Card**

---

## ✅ QA Sign-Off Verification Checklist (ก่อนปิด Sprint)
- [x] ทดสอบ Flow ตั้งแต่เลือกกล้ามเนื้อ → อุปกรณ์ → ฝึกซ้อมจนจบ `00:00` → บันทึกสถิติ → รีโหลดหน้าเว็บข้อมูลยังอยู่
- [x] ทดสอบบน viewport มือถือ (`390x844`) ไม่มี Horizontal Scrollbar และปุ่มไม่ซ้อนทับ (`min-h >= 40px`)
- [x] ทดสอบกด `🔀 Swap` ในตารางแล้วสเต็ป `REST` ก่อนหน้าอัปเดตชื่อท่าตรงกัน และไม่สุ่มท่าซ้ำในรอบเดียวกัน
- [x] ทดสอบ Bundle / Service Worker (`sw.js` v4) ไม่มี External CDN Runtime Dependencies
- [x] ทดสอบจำลอง `canvas.captureStream = undefined` แล้ว Fallback Canvas แสดงภาพท่าทางได้ต่อเนื่อง

---

## 🛠️ รอบตรวจสอบ QA & ลูกค้าใช้งานจริง (แก้ไขครบทั้ง 16 รายการแล้ว)
- [x] **[DEF-01]** กั้นกรอบ BioDigital iframe ด้วย `contain: paint` + `clipPath` ไม่ให้รั่วทับการ์ดอื่น พร้อม Loading Skeleton และปุ่มสลับไปโหมด Ecorché 3D อัตโนมัติเมื่อโหลดช้า/ออฟไลน์
- [x] **[DEF-02]** แยกแถบปุ่มปรับความเร็ว (`0.5x/1x/1.5x`) และมุมกล้อง (`ข้าง/หน้า`) ออกมาไว้ด้านล่างกรอบวิดีโอ `16:10` เพื่อไม่ให้บังหุ่นนักกีฬา 2D บนจอ Desktop
- [x] **[DEF-03]** เพิ่ม `resolveExerciseForEquipment()` และ `isExerciseEquipmentCompatible()` ให้ชื่อท่า คำแนะนำ และอุปกรณ์ในตารางตรงกับอุปกรณ์ที่ผู้ใช้เลือกจริง 100%
- [x] **[DEF-04]** ตัดสเต็ป `REST/BREATH` ที่ค้างก่อนเข้า `COOL-DOWN/SAVASANA` ออก และเกลี่ยเวลาลงช่วงฝึกให้เวลารวมตรงกับ `durationMinutes * 60` พอดี
- [x] **[DEF-05]** คำนวณสรุปผลหลังฝึก (`computeSessionSummary`) จากท่าที่ฝึกจริง (`>= 50%` ของเวลาท่า), แสดงหน่วยเป็น `ท่า`, แสดงเฉพาะมัดกล้ามเนื้อที่ได้ฝึกจริง และไม่นับสถิติสะสมหากกดข้ามทุกท่า (`0 ท่า`)
- [x] **[DEF-06]** เพิ่มความหลากหลายของท่าฝึกในตาราง 20 นาที (`>= 6` ท่าไม่ซ้ำ) และป้องกันปุ่ม `🔀 Swap` สุ่มท่าซ้ำในรอบเดียวกัน
- [x] **[DEF-07]** ขยายความสูงปุ่มชิปกล้ามเนื้อและปุ่มควบคุมใน `Body3DSelector.jsx` เป็น `min-h-[40px]` พร้อมแสดงชื่อกล้ามเนื้อแบบ 2 บรรทัด (`line-clamp-2`) ไม่ให้ถูกตัดคำบนจอมือถือ
- [x] **[DEF-08]** เพิ่ม Toast และข้อความแจ้งเตือนเมื่อคลิกแยกมัดเดี่ยวออกจากโหมดทั่วร่างกาย หรือเมื่อพยายามยกเลิกมัดสุดท้ายที่เหลืออยู่
- [x] **[DEF-09]** แสดงจำนวนชิ้นที่ซ่อนและสถานะแยกมัดบนปุ่ม `🔄 คืนค่าชั้น (ซ่อน N ชิ้น • แยก 1 มัด)` อย่างถูกต้อง
- [x] **[DEF-10]** เพิ่มการตรวจสอบค่าข้อมูลร่างกายแบบเรียลไทม์ (`validateProfileField`) พร้อมข้อความแจ้งเตือนภาษาไทยและสถานะ `บันทึกอัตโนมัติแล้ว ✓`
- [x] **[DEF-11]** ซ่อนปุ่ม `🛠️ Dev AI Prompts` จากผู้ใช้ทั่วไป (แสดงเฉพาะเมื่อเปิด `?dev=1` หรือตั้งค่า `localStorage.kinetic_dev_ui = '1'`)
- [x] **[DEF-12]** ผูก `htmlFor`/`id`, `role="group"`, `aria-labelledby`, `aria-pressed` และ `role="status"` ให้ครบตามหลัก Accessibility
- [x] **[DEF-13]** ย้ายตำแหน่ง Toast แจ้งเตือนไปด้านล่าง (`bottom-20 lg:bottom-6`) เพื่อไม่ให้ทับแถบ Header ด้านบน
- [x] **[DEF-14]** จดจำเวลาเป้าหมายเดิมก่อนสลับเข้าโหมด `7MIN` แล้วคืนค่าให้อัตโนมัติเมื่อสลับออก พร้อมเพิ่มปุ่ม `👀 ดูตัวอย่างท่าในตาราง` ก่อนกดเริ่มฝึก
- [x] **[DEF-15]** แก้การเว้นวรรคภาษาไทย-อังกฤษในภารกิจ 7 วัน (`วันที่ 6: REHIT เร่งความฟิตหัวใจและ VO2max`)
- [x] **[DEF-16]** ปรับรายการตารางฝึกใน `WorkoutPlayer.jsx` ให้แสดงชื่อท่าได้ 2 บรรทัด (`line-clamp-2`) และไม่ตัดชื่อมัดกล้ามเนื้อบนมือถือ
