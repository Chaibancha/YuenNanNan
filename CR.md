# Change Request (CR) — KINETIC MED-FIT 3D (v2.0 → v2.1)

## ข้อมูลควบคุมเอกสาร (Document Control)

| รายการ | รายละเอียด |
| :--- | :--- |
| **ชื่อโปรเจกต์** | KINETIC MED-FIT 3D (Medical 3D Anatomy & AI Workout Studio) |
| **เวอร์ชันอ้างอิง** | Current: `v2.0` → Target: `v2.1` |
| **วันที่จัดทำ** | 2026-11-15 |
| **ผู้จัดทำ** | Senior QA Engineer & UX Auditor / Product Owner |
| **ผู้รับผิดชอบ** | Frontend Engineering Team (React / Three.js / PWA) |

---

## สรุปตาราง Change Requests (CR Summary Matrix)

| รหัส CR | หัวข้อการเปลี่ยนแปลง | ระดับความรุนแรง | โมดูลที่เกี่ยวข้อง | ประมาณการ (Effort) |
| :--- | :--- | :---: | :--- | :---: |
| **CR-001** | ยุบรวมสถาปัตยกรรม Split Codebase (Vanilla JS vs React/Vite) | Critical | `Index.html`, `src/App.jsx`, `src/main.jsx`, `package.json` | L (2–3 วัน) |
| **CR-002** | แก้ไขระบบ Service Worker & Bundle Dependencies เพื่อรองรับ Offline 100% | Critical | `sw.js`, `Index.html`, `package.json` | M (1 วัน) |
| **CR-003** | อัปเดตสเต็ป `REST` ก่อนหน้าให้ตรงกับท่าใหม่เมื่อกดสลับท่า (`🔀 Swap`) | High | `src/WorkoutEngine.js` | S (0.5 วัน) |
| **CR-004** | แก้ไข Video Canvas Fallback & ปรับตำแหน่ง HUD ไม่ให้ทับปุ่มควบคุม | High | `src/ExerciseVideoEngine.js`, `Index.html`, `src/WorkoutPlayer.jsx` | M (1 วัน) |
| **CR-005** | เพิ่ม Confirm Modal ป้องกันการรีเซ็ตตารางกลางคันขณะกำลังฝึก | High | `Index.html`, `src/App.jsx`, `src/WorkoutPlayer.jsx` | S (0.5 วัน) |
| **CR-006** | แก้ไข Mobile 3D Scroll Trap และรองรับการแตะดูข้อมูลกล้ามเนื้อบนมือถือ | High | `Index.html`, `src/Body3DSelector.jsx`, `src/Body3DAnatomy.js` | M (1 วัน) |
| **CR-007** | แสดงสถานะ Timer Mode (`WARM-UP / WORK / REST / SPRINT / ASANA`) และป้องกันเสียงเตือน 5s ตกหล่น | Medium | `Index.html`, `src/WorkoutPlayer.jsx` | S (0.5 วัน) |
| **CR-008** | ปรับปรุงความแม่นยำของ Live BPM, สูตรแคลอรีตาม Phase MET และ Fatigue % จริง | Medium | `src/WorkoutEngine.js`, `Index.html`, `src/WorkoutPlayer.jsx` | M (1 วัน) |
| **CR-009** | ขยายขนาด Touch Targets บนมือถือ & ปรับ Logic การคลิกกล้ามเนื้อจากโหมด Full Body | Medium | `Index.html`, `src/App.jsx`, `src/WorkoutPlayer.jsx` | S (0.5 วัน) |
| **CR-010** | ซิงก์ Breath Pacer ตามระดับความฟิต และย้าย AI Prompt ไว้ในโหมดผู้พัฒนา | Low | `Index.html`, `src/WorkoutPlayer.jsx`, `src/WorkoutEngine.js` | S (0.5 วัน) |

---

## รายละเอียด Change Requests (Detailed Specifications)

### CR-001: ยุบรวมสถาปัตยกรรม Split Codebase ให้เป็น Single Source of Truth
- **เหตุผลและความจำเป็น:**
  - *QA:* ปัจจุบัน `Index.html` ทำงานด้วย Vanilla JS แบบสแตนด์อโลน (บรรทัด `422–1119`) แยกขาดจากคอมโพเนนต์ React ใน `src/` (`App.jsx`, `Body3DSelector.jsx`, `WorkoutPlayer.jsx`) และไม่มีไฟล์ `src/main.jsx` ทำให้ `vite build` ใน `package.json` ไม่สร้างแอป React ตาม README รวมถึงฟีเจอร์ฝั่ง React (กราฟฟื้นตัว 16 มัดในแท็บ Stats, Celebration Card หลังจบเซสชัน) ไม่มีอยู่ใน `Index.html`
  - *ลูกค้า:* แตะเมนู `📊 ตาราง/สถิติ` บนมือถือแล้วไม่เห็นข้อมูลการฟื้นตัวของกล้ามเนื้อทั้ง 16 มัด
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `Index.html`, `src/App.jsx`, `src/main.jsx` (สร้างใหม่), `package.json`
- **As-Is → To-Be:**
  - *As-Is:* สอง Codebase ทำงานแยกกัน ฟีเจอร์ไม่เท่ากัน
  - *To-Be:* ใช้ Vite + React (`src/main.jsx` → `src/App.jsx`) เป็น Entry Point หลักเพียงชุดเดียว และลบโค้ด Vanilla JS ที่ซ้ำซ้อนออกจาก `Index.html`
- **แนวทางแก้ไขเชิงเทคนิค:**
  1. สร้าง `src/main.jsx` เรียก `ReactDOM.createRoot(document.getElementById('root')).render(<App />)`
  2. นำ Tailwind CSS (`src/index.css` พร้อม `@tailwind base/components/utilities`) เข้า Vite Build Pipeline
  3. ตรวจสอบ Feature Parity ของ `App.jsx`, `Body3DSelector.jsx`, `WorkoutPlayer.jsx` ให้ครบทุก ID/ฟีเจอร์ที่มีใน `Index.html` เดิม
- **Acceptance Criteria:**
  - **Given** นักพัฒนารัน `npm run build`
  - **When** เปิดไฟล์ที่ Build ใน `dist/` หรือรัน `npm run preview`
  - **Then** แอปต้องเรนเดอร์จาก React Component Tree เดียวกันทั้ง Desktop และ Mobile โดยแสดงแท็บ `1. โมเดล 3D & ออกแบบตาราง`, `2. ฝึกซ้อมสด`, และ `3. สถิติ & ฟื้นฟู` ครบถ้วน

---

### CR-002: แก้ไข Service Worker & Dependencies เพื่อรองรับ Offline PWA 100%
- **เหตุผลและความจำเป็น:**
  - *QA:* `sw.js` (บรรทัด `33`) แคชเฉพาะ `res.type === 'basic'` ทำให้ CDN ภายนอกใน `Index.html` (`cdn.tailwindcss.com`, `unpkg.com/three@0.160.0`, `fonts.googleapis.com`) ไม่ถูกแคชเมื่อออฟไลน์
  - *ลูกค้า:* เปิดแอปในยิมที่อับสัญญาณหรือโหมดเครื่องบินแล้วหน้าเว็บพังและโมเดล 3D หายไป
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `sw.js`, `Index.html`, `vite.config.js`
- **As-Is → To-Be:**
  - *As-Is:* พึ่งพา CDN สดและแคชเฉพาะ Same-Origin
  - *To-Be:* Bundle `three` และ `tailwindcss` ลงใน Build Local และปรับ `sw.js` ให้แคช Runtime Assets (รวมถึง `vite-plugin-pwa` หรือ Manifest precache list)
- **แนวทางแก้ไขเชิงเทคนิค:**
  1. นำ `<script src="https://cdn.tailwindcss.com">` และ `importmap` ชี้ CDN ออกจาก `Index.html` เมื่อใช้ Vite Bundle
  2. ใน `sw.js` ปรับ Cache Strategy สำหรับ Assets ของแอป (Stale-While-Revalidate สำหรับ Local JS/CSS และ Cache-First สำหรับ Fonts/Images)
  3. ตั้ง Fallback Font stack ใน Tailwind (`Prompt`, `Noto Sans Thai`, `system-ui`, `sans-serif`) เพื่อให้อ่านง่ายแม้โหลด Google Font ไม่ได้
- **Acceptance Criteria:**
  - **Given** ผู้ใช้เปิดเข้าแอปอย่างน้อย 1 ครั้งขณะออนไลน์
  - **When** ตัดการเชื่อมต่ออินเทอร์เน็ต (Offline Mode) แล้วรีโหลดหน้าเว็บ
  - **Then** หน้า UI, Tailwind styles, โมเดล 3D Three.js, และ Video Canvas ต้องโหลดและเริ่มฝึกได้ปกติ

---

### CR-003: ซิงก์สเต็ป `REST` ก่อนหน้าเมื่อกดสลับท่า (`🔀 Swap Exercise`)
- **เหตุผลและความจำเป็น:**
  - *QA:* `swapExerciseInSchedule(schedule, stepIndex)` ใน `src/WorkoutEngine.js` (บรรทัด `1246–1291`) อัปเดตเฉพาะ `steps[stepIndex]` แต่สเต็ป `REST` ก่อนหน้า (`steps[stepIndex - 1]`) ยังคงเก็บชื่อท่าเก่า (`พัก & เตรียมท่าถัดไป: <ท่าเก่า>`)
  - *ลูกค้า:* เสียงโค้ชและหน้าจอช่วงพักบอกให้เตรียมทำท่าหนึ่ง แต่พอหมดเวลาพักกลับขึ้นอีกท่าหนึ่ง
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `src/WorkoutEngine.js` → `swapExerciseInSchedule()`
- **As-Is → To-Be:**
  - *As-Is:* อัปเดตแค่ Index ของท่าที่กด Swap
  - *To-Be:* อัปเดตทั้ง `steps[stepIndex]` และ `steps[stepIndex - 1]` (หาก `type === 'REST'`)
- **แนวทางแก้ไขเชิงเทคนิค:**
  ```js
  // ภายใน swapExerciseInSchedule(schedule, stepIndex)
  const updatedSteps = schedule.steps.map((st, idx) => {
    if (idx === stepIndex) {
      return { ...newStep, index: st.index, startTimeSec: st.startTimeSec, endTimeSec: st.endTimeSec };
    }
    if (idx === stepIndex - 1 && st.type === 'REST' && schedule.modality !== 'REHIT') {
      return {
        ...st,
        nameEn: schedule.modality === 'YOGA' ? `Mindful Transition → ${replacement.nameEn}` : `Rest & Prepare → ${replacement.nameEn}`,
        nameTh: schedule.modality === 'YOGA' ? `ปรับลมหายใจเข้าสู่ท่า: ${replacement.nameTh}` : `พัก & เตรียมท่าถัดไป: ${replacement.nameTh}`,
        formCues: schedule.modality === 'YOGA'
          ? `หายใจออกยาว ผ่อนคลายหัวไหล่ แล้วค่อยๆ จัดตำแหน่งร่างกายสำหรับ ${replacement.nameTh}`
          : `สูดหายใจเข้าลึกทางจมูก เตรียมพร้อมสำหรับท่า ${replacement.nameTh}`,
        primaryMuscle: replacement.primaryMuscle,
        primaryMuscleTh: newStep.primaryMuscleTh,
        primaryMuscleColor: newStep.primaryMuscleColor,
        videoKinematics: replacement.videoKinematics,
        mediaUrl: replacement.mediaUrl,
        aiPrompt: newStep.aiPrompt
      };
    }
    return st;
  });
  ```
- **Acceptance Criteria:**
  - **Given** ผู้ใช้กดปุ่ม `🔀` ที่สเต็ป `WORK` ลำดับที่ $N$
  - **When** สเต็ปก่อนหน้า ($N-1$) เป็นประเภท `REST`
  - **Then** ชื่อท่า, Form Cue, และวิดีโอตัวอย่างในช่วง `REST` ลำดับที่ $N-1$ ต้องเปลี่ยนเป็นท่าใหม่ทันที และ `Up Next` ที่แสดงในช่วง `REST` ต้องตรงกัน 100%

---

### CR-004: แก้ไข Video Canvas Fallback และตำแหน่ง HUD ซ้อนทับปุ่มควบคุม
- **เหตุผลและความจำเป็น:**
  - *QA:* ใน `ExerciseVideoEngine.js` หากเบราว์เซอร์ไม่รองรับ `canvas.captureStream()` หรือ `video.play()` ถูกบล็อก `<canvas id="exercise-fallback-canvas">` ยังมีคลาส `hidden` อยู่ตลอดเวลา และใช้ `ctx.roundRect()` ที่ไม่รองรับบน WebView เก่า อีกทั้ง `object-cover` ตัดขอบ HUD ของ Canvas และป้าย `PROP:` ทับแถบปุ่มควบคุมด้านล่าง
  - *ลูกค้า:* ภาพวิดีโอดำบนมือถือบางรุ่น หรือข้อความบนวิดีโอทับปุ่มกดปรับความเร็ว
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `src/ExerciseVideoEngine.js`, `Index.html`, `src/WorkoutPlayer.jsx`
- **As-Is → To-Be:**
  - *As-Is:* `fallbackCanvas` ถูกซ่อนตายตัว และใช้ `object-cover` ทับ HUD
  - *To-Be:* สลับแสดง `fallbackCanvas` อัตโนมัติเมื่อ Stream ใช้ไม่ได้, ใช้ Safe `roundRect` helper, เปลี่ยนเป็น `object-contain`, และย้าย `PROP:` ออกจากพื้นที่แถบควบคุมด้านล่าง
- **แนวทางแก้ไขเชิงเทคนิค:**
  1. ใน `attachToVideo()` หาก `!this.canvas?.captureStream` หรือ `videoElement.play()` catch error ให้ตั้ง `videoElement.classList.add('hidden')` และ `fallbackCanvas?.classList.remove('hidden')`
  2. เขียน Private method `safeRoundRect(ctx, x, y, w, h, r)` ที่เช็ก `if (typeof ctx.roundRect === 'function')` ก่อนใช้ `quadraticCurveTo` เป็น Fallback
  3. ปรับ `className` ของ `<video>` และ `<canvas>` เป็น `w-full h-full object-contain bg-zinc-950 min-h-[260px]`
  4. ใน `drawVideoHud()` ย้ายป้าย `PROP: ...` ไปไว้ตำแหน่งบนกลางหรือใต้ `LOOP VIDEO` (เช่น `y = 48`) แทน `H - 38`
- **Acceptance Criteria:**
  - **Given** เบราว์เซอร์ที่ไม่มี `HTMLCanvasElement.prototype.captureStream`
  - **When** เข้าหน้าฝึกซ้อมสด
  - **Then** ระบบต้องสลับแสดง `fallbackCanvas` แทน `<video>` ได้ทันทีโดยไม่มีกรอบดำ และข้อความ HUD ทุกชิ้นต้องไม่ถูกตัดขอบหรือไม่ซ้อนทับกับแถบปุ่มความเร็ว/มุมกล้อง

---

### CR-005: เพิ่ม Guard ป้องกันการรีเซ็ตตารางฝึกซ้อมโดยไม่ตั้งใจ
- **เหตุผลและความจำเป็น:**
  - *QA:* การเปลี่ยน State ใด ๆ (`selectedMuscles`, `selectedEquipment`, `modality`, `fitnessLevel`, `durationMinutes`) สั่งรัน `generateTimeBoundedSchedule()` ทันทีซึ่งรีเซ็ต `currentIndex = 0` และหยุด Timer โดยไม่มีการแจ้งเตือน
  - *ลูกค้า:* ออกกำลังกายไปครึ่งทางแล้วเผลอแตะเปลี่ยนอุปกรณ์หรือกล้ามเนื้อ ทำให้เวลาและลำดับท่าที่ฝึกไปแล้วหายหมด
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `src/App.jsx`, `src/WorkoutPlayer.jsx`, `Index.html`
- **As-Is → To-Be:**
  - *As-Is:* เปลี่ยนค่าปุ๊บ รีเซ็ตตารางทันที
  - *To-Be:* ตรวจสอบสถานะ Active Workout ก่อน หากกำลังฝึกอยู่ให้ถามยืนยันก่อนสร้างตารางใหม่
- **แนวทางแก้ไขเชิงเทคนิค:**
  1. ส่ง Prop `hasActiveSession` (เป็นจริงเมื่อ `isRunning || currentIndex > 0`) ขึ้นไปยัง `App.jsx`
  2. เมื่ออยู่แท็บ `setup` และ `hasActiveSession === true` หากผู้ใช้กดแก้ตัวกรองที่กระทบโครงสร้างตาราง ให้เปิด Confirm Modal (`ยืนยันสร้างตารางใหม่ (รีเซ็ตความคืบหน้า)` vs `ยกเลิก`)
- **Acceptance Criteria:**
  - **Given** ผู้ใช้อยู่ในท่าที่ 5 (`currentIndex === 4`) หรือ Timer กำลังเดินอยู่
  - **When** ผู้ใช้เปลี่ยนมัดกล้ามเนื้อหรือระดับความฟิต
  - **Then** ระบบต้องแสดง Modal ยืนยันก่อน หากกด `ยกเลิก` ต้องคงค่าตารางและเวลาเดิมไว้ครบถ้วน

---

### CR-006: แก้ไข Mobile 3D Viewport Scroll Trap & Mobile Tap Tooltip
- **เหตุผลและความจำเป็น:**
  - *QA:* บนหน้าจอแคบ `Index.html` วาง 3D Canvas ไว้ในหน้าเดียวที่ต้องเลื่อนผ่าน ทำให้ Touch Gesture ถูก `OrbitControls` ดักไว้ และใน `Body3DSelector.jsx` ข้อมูล `hoveredMuscle` อัปเดตเฉพาะ `pointermove` จึงไม่แสดงผลเมื่อแตะบนจอมือถือ
  - *ลูกค้า:* เลื่อนหน้าจอมือถือผ่านหุ่น 3D ลำบาก และแตะที่มัดกล้ามเนื้อบนมือถือแล้วไม่ขึ้นข้อมูลจุดยึดเกาะ
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `Index.html`, `src/Body3DSelector.jsx`, `src/Body3DAnatomy.js`
- **As-Is → To-Be:**
  - *As-Is:* บนมือถือหน้าจอยาวและ Tooltip แสดงเฉพาะเมาส์ Hover
  - *To-Be:* แยกหน้าจอมือถือเป็น Tab ชัดเจน (ไม่ซ้อนกันในหน้าเดียว), เพิ่มปุ่ม Lock การหมุน 3D, และแสดง Tooltip เมื่อแตะ (`pointerup`)
- **แนวทางแก้ไขเชิงเทคนิค:**
  1. ใน `Body3DSelector.jsx` เพิ่มปุ่ม `🔒 ล็อกมุมกล้อง` (`controlsRef.current.enabled = !locked`) เพื่อให้ผู้ใช้ปัดหน้าจอได้สะดวก
  2. ใน `handlePointerUp` เมื่อ `dist < 7` และ Raycast เจอมัดกล้ามเนื้อ ให้เรียกทั้ง `setHoveredMuscle(muscleId)` และ `onToggleMuscle(muscleId)`
  3. เพิ่ม Invisible Hit-mesh หรือขยายรัศมี Collider เล็กน้อยสำหรับมัด `neck_scm` และ `forearms`
- **Acceptance Criteria:**
  - **Given** ผู้ใช้เปิดบนจอมือถือขนาด `375px`
  - **When** แตะที่มัดกล้ามเนื้อบนโมเดล 3D
  - **Then** การ์ด Tooltip ชื่อไทย-อังกฤษและจุดยึดเกาะ (`originInsertion`) ต้องปรากฏขึ้น และสามารถสลับหน้าจอไปยัง `⚙️ จัดตาราง` หรือ `🎬 ฝึกซ้อมสด` ได้โดยไม่ติดการหมุนของ Canvas

---

### CR-007: แสดงสถานะ Timer Mode ให้ถูกต้องทุกช่วง & ป้องกันเสียงเตือน 5s ตกหล่น
- **เหตุผลและความจำเป็น:**
  - *QA:* `<span id="timer-mode-label">` ใน `Index.html` (บรรทัด `321`) ค้างคำว่า `WORK` ตลอดเวลา และ `WorkoutPlayer.jsx` (บรรทัด `566`) แสดงแค่ `REST / ASANA / WORK` ไม่แยก `WARM-UP`, `SPRINT`, `COOL-DOWN` รวมถึงเช็ก `remainingSec === 5` ที่อาจข้ามได้เมื่อเฟรมหน่วง
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `Index.html`, `src/WorkoutPlayer.jsx`
- **As-Is → To-Be:**
  - *As-Is:* ป้ายแสดง `WORK` ผิดช่วง และเตือน 5 วิเฉพาะค่าเท่ากับ 5 เป๊ะ
  - *To-Be:* Map Label ตาม `step.type` ครบ 6 สถานะ และใช้ Flag `warned5SecStepRef` เช็กช่วง `<= 5 && > 3`
- **แนวทางแก้ไขเชิงเทคนิค:**
  - สร้าง Helper `getTimerModeLabel(stepType, modality)`:
    - `WARMUP` → `'WARM-UP'`
    - `SPRINT` → `'ALL-OUT SPRINT'`
    - `REST` → `modality === 'YOGA' ? 'BREATH' : 'REST'`
    - `COOLDOWN` → `'COOL-DOWN'`
    - `WORK` → `modality === 'YOGA' ? 'ASANA' : 'WORK'`
- **Acceptance Criteria:**
  - **Given** ตารางฝึกกำลังอยู่ในช่วง `WARMUP`, `REST`, หรือ `COOLDOWN`
  - **When** มองที่ตัวอักษรเหนือตัวเลขเวลาในวงแหวน SVG
  - **Then** ต้องแสดงข้อความตรงตามช่วงปัจจุบัน และเสียงเตือนล่วงหน้า 5 วินาทีต้องทำงานทุกครั้งที่มีสเต็ปถัดไป

---

### CR-008: ปรับปรุง Telemetry BPM, สูตรแคลอรี และคำนวณความล้ากล้ามเนื้อตามจริง
- **เหตุผลและความจำเป็น:**
  - *QA:* แถบด้านบนกะพริบ `128 BPM` ทั้งที่ยังไม่เริ่มฝึก, สูตรแคลอรีเอา MET สูงสุดคูณเวลารวม (รวมช่วงพัก), และหัก Recovery `-28%` ทุกมัดใน `selectedMuscles` เท่ากันหมดไม่ว่าจะฝึก `7 นาที` หรือ `45 นาที`
  - *ลูกค้า:* เห็นข้อมูลหัวใจและสถิติความล้าที่ไม่สอดคล้องกับความหนักที่เล่นจริง
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `src/WorkoutEngine.js`, `src/WorkoutPlayer.jsx`, `Index.html`
- **As-Is → To-Be:**
  - *As-Is:* ตัวเลข Static/Flat deduction
  - *To-Be:* แสดงป้าย `Target HR` เมื่อ Pause, คำนวณแคลอรีแยกตาม Work/Rest MET + น้ำหนักจริง, และหักความล้าตามระยะเวลา + `% EMG Activation` ของท่าที่ทำจริง
- **แนวทางแก้ไขเชิงเทคนิค:**
  1. สูตรความล้าต่อมัดกล้ามเนื้อ $m$: $\text{fatigueDrop}(m) = \min\left(45, \sum_{\text{step } \in \text{ completed}} \frac{\text{step.duration}}{60} \times \frac{\text{EMG}(m)}{100} \times \text{modalityFactor}\right)$
  2. แยกคำนวณแคลอรีใน `calculateScheduleMetrics` โดยใช้ MET จริงของแต่ละช่วง (`WORK/SPRINT`, `REST`, `WARMUP/COOLDOWN`) และรับ `weightKg` จาก Profile
- **Acceptance Criteria:**
  - **Given** ผู้ใช้จบโปรแกรม `7MIN` (7 นาที) เทียบกับ `HIIT` (45 นาที)
  - **When** เข้าดูสถิติ Recovery %
  - **Then** มัดกล้ามเนื้อที่ออกแรงหนักกว่าในโปรแกรม 45 นาทีต้องมี % Recovery ลดลงมากกว่าโปรแกรม 7 นาทีอย่างชัดเจน

---

### CR-009: ขยาย Touch Targets บนมือถือ & ปรับ Logic คลิกกล้ามเนื้อจาก Full Body
- **เหตุผลและความจำเป็น:**
  - *QA:* ปุ่ม `0.5x / 1.0x / 1.5x` และ `ข้าง / หน้า` สูงเพียง `~22px`, ปุ่มแจ้งเตือน `#btn-notify` ใน `Index.html` ไม่มีสีบอกสถานะ, และการคลิกมัดกล้ามเนื้อตอนเปิด `Full Body` กลับเอาออกแค่มัดนั้นเหลือ 15 มัด
  - *ลูกค้า:* กดปุ่มเปลี่ยนมุมกล้องพลาดบ่อยตอนมือเปียกเหงื่อ และออกจากโหมดทั่วร่างกายเพื่อเล่นเฉพาะจุดลำบาก
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `Index.html`, `src/App.jsx`, `src/WorkoutPlayer.jsx`
- **As-Is → To-Be:**
  - *As-Is:* ปุ่มเล็ก, ไม่แจ้งเตือนเมื่อเหลือ 1 รายการ, Full Body → 15 มัด
  - *To-Be:* ปุ่มขั้นต่ำ `36–44px`, แสดง Toast เมื่อแตะขั้นต่ำ, Full Body + คลิกมัด $X$ → โฟกัสเฉพาะมัด $X$ (พร้อมปุ่ม `ล้างค่า`)
- **แนวทางแก้ไขเชิงเทคนิค:**
  - ใน `handleToggleMuscle(muscleId)`:
    ```js
    if (isFullBody) {
      setIsFullBody(false);
      setSelectedMuscles([muscleId]);
      return;
    }
    ```
- **Acceptance Criteria:**
  - **Given** ผู้ใช้เปิดโหมด `🔥 ทั่วร่างกาย (Full Body)` อยู่
  - **When** แตะที่มัดกล้ามเนื้อ `อกบนและอกหลัก`
  - **Then** ระบบต้องปิดโหมด Full Body และตั้งค่า `selectedMuscles` เป็น `['chest_upper_Mid']` มัดเดียวทันที

---

### CR-010: ซิงก์ Pranayama Breath Pacer และซ่อน AI Video Prompt
- **เหตุผลและความจำเป็น:**
  - *QA:* ตัวนับ `breathTick` วิ่งอิสระไม่รีเซ็ตเมื่อเปลี่ยนท่าและฮาร์ดโค้ด `4:2:6` ไม่ใช้ค่าจาก `protocolsByLevel` ส่วนปุ่ม `✨ AI Video Prompt` แสดงข้อความภาษาอังกฤษสำหรับ AI Generator ในหน้าผู้ฝึกทั่วไป
  - *ลูกค้า:* เปิดช่วงพักมาเจอคำว่า "กลั้นลมหายใจ" ทันทีและงงว่าปุ่ม AI Prompt มีไว้ทำอะไร
- **ไฟล์และฟังก์ชันที่ได้รับผลกระทบ:** `Index.html`, `src/WorkoutPlayer.jsx`, `src/WorkoutEngine.js`
- **As-Is → To-Be:**
  - *As-Is:* `breathTick` ล็อก 12 วินาทีและไม่รีเซ็ต; ปุ่ม AI Prompt อยู่บนหัว Player
  - *To-Be:* รีเซ็ต `breathTick = 0` เมื่อ `currentIndex` เปลี่ยน, อ่านจังหวะจาก `protocolsByLevel[fitnessLevel]`, และย้าย AI Prompt เข้า Developer Toggle
- **Acceptance Criteria:**
  - **Given** ผู้ใช้ฝึกโหมด `YOGA` ระดับ `beginner` (`4:2:4`) และกำลังเข้าสู่ท่าใหม่
  - **When** สเต็ปเปลี่ยนไปยังอาสนะถัดไปหรือช่วงพัก
  - **Then** ตัวช่วยหายใจต้องเริ่มนับจาก `สูดหายใจเข้า (Inhale 4s)` เสมอ
