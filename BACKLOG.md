# Product Backlog — KINETIC MED-FIT 3D

เอกสารนี้จัดระเบียบงานพัฒนาทั้งหมดในรูปแบบ Agile Epics & User Stories เพื่อใช้วางแผน Sprint สำหรับทีมพัฒนา (Engineering), ออกแบบ (UX/UI) และทดสอบ (QA)

---

## 📊 ภาพรวมตาราง Sprint & Story Points (Velocity Planning)

| Sprint | Epic หลัก | จำนวน Stories | Story Points รวม | เป้าหมายของ Sprint |
| :---: | :--- | :---: | :---: | :--- |
| **Sprint 1** | Epic 1: Technical Debt & Core Stability | 6 Stories | 24 pts | รวมโค้ด React/Vite เป็นหนึ่งเดียว, แก้ Offline PWA, ปิด Bug ระดับ Critical/High |
| **Sprint 2** | Epic 2 & 3: Onboarding & Live Workout UX | 4 Stories | 18 pts | เพิ่ม Quick Goal Presets, Body Profile/Injury Filter, Focus Mode, Post-Workout Summary |
| **Sprint 3** | Epic 4 & 5 (Part 1): Smart Physiology & Streak | 4 Stories | 19 pts | Smart Recovery Auto-Pick, Tempo Metronome, Daily Streak & Weekly Goal |
| **Sprint 4** | Epic 4 & 5 (Part 2): BLE HR & Viral Growth | 3 Stories | 16 pts | Web Bluetooth Heart Rate, 7-Day Challenges, Shareable 3D Anatomy Card |

*(สเกล Story Points ใช้ Fibonacci: `1, 2, 3, 5, 8`)*

---

## 🛠️ Epic 1: Technical Debt & Core Stability (Sprint 1 — Must-Have Fixes)

### `US-101` — Single Codebase Consolidation (React + Vite)
- **As a** Developer, **I want** a unified React + Vite entry point (`src/main.jsx` -> `src/App.jsx`), **so that** feature parity is guaranteed across web, PWA, and Capacitor Android builds.
- **Priority:** `P0 (Critical)` | **Points:** `8` | **Ref:** `CR-001`
- **Acceptance Criteria:** `npm run build` ทำงานสำเร็จ, ไม่มี Logic ซ้ำซ้อนใน `Index.html`, และฟีเจอร์ Stats 16 มัด + Celebration Card แสดงผลครบ

### `US-102` — True Offline-First PWA Caching
- **As a** Gym-goer in low-signal areas, **I want** the app (UI, 3D model, video engine) to load completely offline, **so that** my workout never breaks without internet.
- **Priority:** `P0 (Critical)` | **Points:** `5` | **Ref:** `CR-002`
- **Acceptance Criteria:** Bundle Three.js & Tailwind locally, `sw.js` caches core shell, ทดสอบโหมด Offline ใน Chrome DevTools ผ่าน 100%

### `US-103` — Consistent Exercise Swap (`🔀`) & Rest Preview Sync
- **As a** Fitness User, **I want** the preceding Rest prompt and voice coach to reflect my newly swapped exercise, **so that** I prepare for the right movement during rest.
- **Priority:** `P1 (High)` | **Points:** `2` | **Ref:** `CR-003`
- **Acceptance Criteria:** กด `🔀` ที่สเต็ป Work แล้วสเต็ป `REST` ก่อนหน้าอัปเดต `nameTh`, `formCues`, และ `videoKinematics` ตามท่าใหม่ทันที

### `US-104` — Reliable Video Canvas Fallback & Clean HUD Layout
- **As a** Mobile WebView / iOS Safari User, **I want** the exercise animation to play smoothly without black screens or overlapping buttons, **so that** I can clearly follow the exercise form.
- **Priority:** `P1 (High)` | **Points:** `3` | **Ref:** `CR-004`
- **Acceptance Criteria:** Fallback `<canvas>` แสดงผลเมื่อ `captureStream` ไม่รองรับ, `object-contain` ไม่ตัดขอบภาพ, ป้าย `PROP:` ไม่ทับแถบความเร็ว/มุมกล้อง

### `US-105` — Active Session Protection & Mobile 3D Ergonomics
- **As a** Mobile User, **I want** confirmation before resetting an active workout and smooth scrolling past the 3D viewport, **so that** I don't lose progress or get trapped scrolling on 3D canvas.
- **Priority:** `P1 (High)` | **Points:** `3` | **Ref:** `CR-005`, `CR-006`
- **Acceptance Criteria:** แสดง Confirm Modal เมื่อแก้ตารางขณะกำลังฝึก, แตะกล้ามเนื้อบนมือถือแสดง Tooltip จุดยึดเกาะได้, และ Bottom Nav แยกหน้าจอชัดเจน

### `US-106` — Accurate Timer Labels, Physiology Metrics & Touch Targets
- **As a** User, **I want** accurate timer phase labels (`REST`/`WARM-UP`/`SPRINT`), realistic BPM/fatigue metrics, and larger control buttons, **so that** I can trust the data and tap buttons easily while sweating.
- **Priority:** `P2 (Medium)` | **Points:** `3` | **Ref:** `CR-007`, `CR-008`, `CR-009`, `CR-010`
- **Acceptance Criteria:** ปุ่มวิดีโอสูง `>= 36–44px`, แสดงช่วงเวลาและ Target HR ชัดเจน, คำนวณ Fatigue ตามเวลาและ EMG จริง, Breath Pacer รีเซ็ตทุกสเต็ป

---

## 🎯 Epic 2: Frictionless Onboarding & Personalization (Sprint 2 — Must-Have Features)

### `US-201` — Goal-Based Quick Presets for Beginners
- **As a** First-time Fitness User, **I want** one-tap workout presets based on real-life goals (e.g., "แก้ปวดคอ-บ่า-ไหล่", "ลดไขมันเร่งด่วน", "ปั้นก้นไม่กระแทกเข่า"), **so that** I can start working out in 3 seconds without knowing anatomy terms.
- **Priority:** `Must-Have` | **Points:** `5`
- **Acceptance Criteria:**
  - แสดงแถบ Goal Presets ด้านบนสุดของหน้า Setup (4–5 การ์ดภาษาไทยเข้าใจง่าย)
  - กดเลือก 1 ครั้ง ระบบตั้งค่า `selectedMuscles`, `selectedEquipment`, `modality`, `lowImpactOnly`, และ `durationMinutes` อัตโนมัติพร้อมปุ่มเริ่มฝึกทันที

### `US-202` — Quick Body Profile & Joint/Injury Safety Filter
- **As a** User with specific body weight or joint pain (knee/wrist/lower back), **I want** to set my weight and injured joints locally without registering an account, **so that** calorie estimates are accurate and risky exercises are automatically excluded.
- **Priority:** `Must-Have` | **Points:** `5`
- **Acceptance Criteria:**
  - ปุ่มโปรไฟล์บันทึก `weightKg`, `heightCm`, `age`, และ `excludedJoints` (`knee`, `wrist`, `lower_back`, `shoulder`) ลง `localStorage`
  - `calculateScheduleMetrics` ใช้ `weightKg` จริงคำนวณ kcal
  - เพิ่ม Metadata `jointLoad` ใน `EXERCISE_DATABASE` เพื่อกรองท่าที่กระทบข้อต่อที่บาดเจ็บออกอัตโนมัติ (มี Fallback ปลอดภัยเสมอ)

---

## 🏋️ Epic 3: Ergonomic Live Workout Experience (Sprint 2 — Must-Have Features)

### `US-301` — Full-Screen Focus Workout Mode
- **As a** User exercising on a mat 1.5–2 meters away from my phone, **I want** an uncluttered full-screen workout view with oversized timer numbers and controls, **so that** I can see the movement and time remaining at a glance.
- **Priority:** `Must-Have` | **Points:** `5`
- **Acceptance Criteria:**
  - ปุ่ม `⛶ โหมดเต็มจอ (Focus)` ซ่อน Header, Setup และ Timeline
  - แสดง Video ขนาดใหญ่ + ตัวเลขเวลาขนาด `text-5xl`+ + แถบ Form Cue อ่านง่าย + ปุ่ม `Play/Pause`, `Next`, `Swap` ขนาดใหญ่ด้านล่าง

### `US-302` — Post-Workout Celebration Modal & 3-Level RPE Check-in
- **As a** User who just finished a workout, **I want** a rewarding summary screen showing trained 3D muscles and a 3-level difficulty rating, **so that** I feel accomplished and the app adapts to my fitness level.
- **Priority:** `Must-Have` | **Points:** `3`
- **Acceptance Criteria:**
  - เมื่อครบ `00:00` เปิด Modal สรุป: เวลาจริง, แคลอรี, จำนวนท่าที่ทำ, รายชื่อมัดกล้ามเนื้อที่ได้ฝึก
  - ปุ่มประเมินความเหนื่อย 3 ระดับ (`😊 สบายมาก`, `💦 กำลังดี`, `🥵 เหนื่อยสุด ๆ`) บันทึกลง History และแนะนำการปรับ `fitnessLevel` ในครั้งถัดไปหากเลือก `สบายมาก` หรือ `เหนื่อยสุด ๆ` ติดต่อกัน

---

## 🧠 Epic 4: Smart Physiology & Hardware Telemetry (Sprint 3–4 — Nice-to-Have Features)

### `US-401` — Smart Recovery Auto-Pick ("เลือกมัดที่พร้อมฝึกให้อัตโนมัติ")
- **As a** Regular Exerciser, **I want** a 1-tap button that automatically selects muscles recovered `>= 85%`, **so that** I avoid overtraining sore muscles from yesterday.
- **Priority:** `Nice-to-Have` | **Points:** `3`
- **Acceptance Criteria:** กดปุ่ม `✨ จัดตารางตามความฟื้นตัว` แล้วเลือกเฉพาะมัดที่มี `getMuscleRecoveryPercent >= 85%` (หากน้อยกว่า 2 มัดให้เลือกมัดที่ฟื้นตัวสูงสุด 3 อันดับแรก)

### `US-402` — Concentric / Eccentric Tempo Audio Metronome
- **As a** Strength Trainee looking at the floor (e.g., Push-up, Plank), **I want** subtle audio cues synced to the exercise tempo (`videoKinematics.tempoSec`), **so that** I maintain proper eccentric/concentric speed without staring at the screen.
- **Priority:** `Nice-to-Have` | **Points:** `3`
- **Acceptance Criteria:** Toggle เปิด/ปิดเสียง Metronome แยกต่างหาก โดยส่งเสียงโทนต่ำช่วง Eccentric และโทนสูงช่วง Concentric ซิงก์กับ `cyclePhase` ใน `ExerciseVideoEngine.js`

### `US-403` — Web Bluetooth (`0x180D`) Live Heart Rate Monitor
- **As a** HIIT/REHIT Athlete with a chest strap or smartwatch, **I want** to pair my BLE Heart Rate Monitor directly in the browser, **so that** I see my real live BPM and HR Zone instead of simulated numbers.
- **Priority:** `Nice-to-Have` | **Points:** `8`
- **Acceptance Criteria:** ปุ่ม `เชื่อมต่อสายวัดหัวใจ (BLE)` ใช้ `navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] })` อ่าน Characteristic `0x2A37` มาแสดงแทนค่าจำลอง (ซ่อนหรือแจ้งเตือนอย่างสุภาพบนเบราว์เซอร์ที่ไม่รองรับ Web Bluetooth)

---

## 🔥 Epic 5: Retention, Gamification & Viral Sharing (Sprint 3–4 — Growth Features)

### `US-501` — Daily Workout Streak & Weekly Consistency Ring
- **As a** Busy User trying to build a habit, **I want** to see my consecutive workout days (`🔥 Streak`) and weekly goal progress (`3/4 วัน`), **so that** I stay motivated not to break my chain.
- **Priority:** `Must-Have (Retention)` | **Points:** `5`
- **Acceptance Criteria:** บันทึก `workoutDates: ['YYYY-MM-DD']` ใน `localStorage`, คำนวณ Streak ปัจจุบัน/สูงสุด และแสดง Badge บน Header พร้อมปุ่มลัด `⚡ 7 นาที เพื่อรักษา Streak`

### `US-502` — 7-Day & 14-Day Guided Micro-Challenges
- **As a** Returning User, **I want** pre-built multi-day challenges (e.g., "ภารกิจ 7 วัน พิชิตออฟฟิศซินโดรม"), **so that** I have a structured short-term goal instead of configuring settings every day.
- **Priority:** `Nice-to-Have` | **Points:** `5`
- **Acceptance Criteria:** หน้า Challenges แสดง Progress Day 1–7, กดเล่นตามแผนประจำวันได้ทันที และติ๊กถูกอัตโนมัติเมื่อฝึกจบ

### `US-503` — Shareable 9:16 3D Anatomy Workout Summary Card
- **As a** Proud Fitness User, **I want** to export a vertical `9:16` image showing the 3D highlighted muscles I trained today plus my time & kcal, **so that** I can share it to IG Story / LINE / TikTok.
- **Priority:** `Nice-to-Have` | **Points:** `5`
- **Acceptance Criteria:** ปุ่ม `📸 บันทึกการ์ดแชร์ผลฝึก` ใน Post-Workout Summary จับภาพ WebGL Canvas (`preserveDrawingBuffer: true` หรือ offscreen render) รวมกับข้อมูลสรุปเป็นไฟล์ `.png` ดาวน์โหลดได้ทันที

---

## ✅ Definition of Done (DoD)
1. โค้ดทำงานครบทั้ง Desktop และ Mobile Responsive (`360px` – `1440px`) โดยไม่มี Horizontal Scrollbar
2. ผ่านการทดสอบ Manual QA ตาม Acceptance Criteria ของ Story นั้น ๆ และไม่ทำให้ฟีเจอร์เดิม (Regression) เสียหาย
3. รองรับ Offline `localStorage` fallback อย่างปลอดภัยเมื่อ `QuotaExceededError` หรือ Private Mode
4. ข้อความ UI ภาษาไทยถูกต้อง สื่อสารเข้าใจง่ายสำหรับคนทั่วไป (หลีกเลี่ยงศัพท์แพทย์ล้วนโดยไม่มีคำอธิบาย)
