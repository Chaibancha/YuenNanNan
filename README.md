# KINETIC MED-FIT 3D (v2.1)

> **Dual-Engine Interactive 3D Muscular System (BioDigital Human × MSD Manual + Ecorché Dissect/Isolate), Looping Biomechanical Workout Videos & Multi-Modality Exercise Physiology Studio (PWA / Android Play Store Ready)**

[![GitHub Repository](https://img.shields.io/badge/GitHub-Chaibancha%2FYuenNanNan-orange?logo=github)](https://github.com/Chaibancha/YuenNanNan)
[![Tech Stack](https://img.shields.io/badge/Stack-Three.js%20%7C%20React%20%7C%20Tailwind%20%7C%20WebGL-06b6d4)](#)
[![Mobile Ready](https://img.shields.io/badge/Android%20%2F%20Play%20Store-PWA%20%2B%20Capacitor%20%2B%20TWA-10b981)](#google-play-store-packaging-guide)

---

## Core Capabilities & Architecture

### 1. Dual-Engine Medical 3D Muscular System (`src/Body3DAnatomy.js` & `src/Body3DSelector.jsx`)
- **Engine 1 — BioDigital Human × MSD Manual Live 3D Viewer (`be=2PcB` + `HumanAPI`):** Embeds the official interactive muscular system model referenced from [MSD Manual Consumer Version: Muscular System](https://www.msdmanuals.com/home/multimedia/3dmodel/muscular-system) via `BIODIGITAL_MSD_EMBED_URL` and `BIODIGITAL_HUMAN_API_SCRIPT` (`human-api.min.js` + `postMessage` bridge via `attachBioDigitalBridge()`). Clicking any anatomical structure resolves Latin/English names through `mapBioDigitalObjectToMuscleId()` to sync the 16 workout targets and live MSD Manual **Origin / Insertion** reference card.
- **Engine 2 — BioDigital-Matched Three.js Anatomical Ecorché + Dissect & Isolate:** Offline-capable striated myofibril model (`buildMedicalAnatomyGroup()`) featuring **cranial & facial muscles** (`Frontalis`, `Temporalis`, `Masseter`, `Orbicularis Oris`) and **7 pearl-white tendon/fascia structures (`tendonMeshes`)** (`Galea Aponeurotica`, `Linea Alba`, `Thoracolumbar Fascia`, `Iliotibial Band`, `Patellar Tendon`, `Achilles Tendon`, `Wrist Retinaculum`), plus interactive **Select / Dissect / Isolate** tools (`dissectedMeshIds`, `isolatedMuscleId`).
- **16 Detailed Bilateral Muscle Groups:**
  1. `neck_scm` — Sternocleidomastoid & Splenius Capitis
  2. `shoulders_anterior_lateral` — Anterior & Lateral Deltoids
  3. `shoulders_posterior_traps` — Posterior Deltoid & Upper/Mid Trapezius
  4. `chest_upper_Mid` — Pectoralis Major (Clavicular & Sternal Heads)
  5. `serratus_obliques` — Serratus Anterior & External/Internal Obliques
  6. `abs_rectus` — Rectus Abdominis (8-pack segments) & Linea Alba
  7. `lats_teres` — Latissimus Dorsi & Teres Major
  8. `rhomboids_erector` — Rhomboids & Erector Spinae
  9. `biceps_brachialis` — Biceps Brachii & Brachialis
  10. `triceps` — Triceps Brachii (Long, Lateral & Medial Heads)
  11. `forearms` — Brachioradialis, Wrist Flexors & Extensors
  12. `glutes` — Gluteus Maximus & Gluteus Medius
  13. `hip_adductors` — Iliopsoas, TFL & Adductors
  14. `quads` — Quadriceps Femoris (Rectus Femoris, Vastus Lateralis/Medialis)
  15. `hamstrings` — Biceps Femoris & Semitendinosus
  16. `calves_tibialis` — Gastrocnemius, Soleus & Tibialis Anterior
- **3 Medical Visualization Modes (`applyMedicalViewModeColors()`):**
  - `🧬 Ecorché Fiber`: High-contrast medical striated muscle tissue + pearl-white tendons
  - `🦴 X-Ray Skeletal`: Translucent fascia/muscle revealing spine, ribcage & joints
  - `🔥 EMG & Recovery Heatmap`: Live muscle fatigue & recovery status map

### 2. Real-Time Looping Workout Video Engine (`src/ExerciseVideoEngine.js`)
- Generates smooth looping `<video autoplay loop muted playsinline>` streams via `canvas.captureStream()` for **every exercise and all 11 equipment types**:
  - Bodyweight, Dumbbells, Kettlebell, Resistance Band, Pull-up Bar, Barbell, Jump Rope, Adjustable Bench, Indoor Bike, Yoga Mat, Yoga Block.
- Interactive video controls: **0.5x Slow-Mo / 1.0x / 1.5x** playback speeds and **Side / Front** camera angles, plus **5-second pre-warming** before step transitions.

### 3. Science-Based Modalities & Inspired Top-App Features (`src/WorkoutEngine.js`)
- **Training Modalities:**
  - **HIIT:** Zone 4–5 (`35:25`, `40:20`, `45:15`)
  - **REHIT (Vollaard Protocol):** Supramaximal `15–20s` All-Out Sprints + `100–135s` Active Recovery
  - **CARDIO (PHA Circuit):** Zone 2–3 steady-state upper/lower alternation (`45:15`, `50:10`, `55:5`)
  - **YOGA (Yoga Studio inspired):** Vinyasa, Power Yoga & Yin stretches with **Pranayama Breath Pacer** (`4s Inhale : 2s Hold : 6s Exhale`)
  - **7-Minute Scientific Circuit (7 Minute Workout inspired):** Instant ACSM-style circuit with SVG circular countdown ring & Haptic Vibration (`navigator.vibrate`)
- **Sworkit Features:** Exact time-bounded scheduling (`7, 10, 15, 20, 30, 45 min`), one-tap **Swap Exercise**, and **Low-Impact / Joint-Friendly** filter.
- **JEFIT Features:** Per-exercise **EMG Muscle Activation %** bars and **LocalStorage Muscle Recovery %** tracking.
- **Daily Burn Features:** Live simulated **Heart Rate (BPM)** & burn rate (`kcal/min`) telemetry bar.

---

## Project Structure

```text
YuenNanNan/
├── Index.html                  # Unified Vite HTML Entry Point (<div id="root">)
├── manifest.json               # Web App Manifest (Play Store TWA ready)
├── sw.js                       # Offline-First Service Worker (v3, Stale-While-Revalidate + Media Cache)
├── vite.config.js              # Vite React Build + PWA Copy Plugin
├── tailwind.config.js          # Bundled Tailwind CSS + Thai System Font Fallback
├── postcss.config.js           # PostCSS Pipeline
├── capacitor.config.json       # Capacitor Android Build Configuration
├── package.json                # React + Vite + Three.js Dependencies
├── PRD.md / CR.md / BACKLOG.md # Engineering Specs & Sprint Roadmap
├── Explode30_Original.html     # Original v0 prototype backup
└── src/
    ├── main.jsx                # React Root Mount & Service Worker Registration
    ├── index.css               # Bundled Tailwind Directives & Dark Studio Theme
    ├── App.jsx                 # React Main Orchestrator, Goal Presets, Profile, Guard & Streak
    ├── Body3DAnatomy.js        # BioDigital HumanAPI Bridge, MSD Mapping & Ecorché Builder
    ├── Body3DSelector.jsx      # Dual-Engine BioDigital + Three.js Dissect/Isolate/Lock Selector
    ├── ExerciseVideoEngine.js  # Looping Biomechanical Video Stream Engine + Safe Canvas Fallback
    ├── WorkoutEngine.js        # Physiology Engine, Joint Filter, Phase METs, Presets & Recovery
    └── WorkoutPlayer.jsx       # Focus Mode Player, BLE HR, Metronome, Breath Pacer & 9:16 Share Card
```

---

## Running Locally

### Option 1: Development Server (Vite + React + Bundled Tailwind/Three.js)
```bash
npm install
npm run dev
```

### Option 2: Production Offline-Ready Build & Preview
```bash
npm install
npm run build
npm run preview
```

---

## Google Play Store Packaging Guide (Android)

This app supports **Screen Wake Lock API**, **Haptic Vibration**, **Offline Service Worker (`sw.js`)**, and **Mobile-First Bottom Navigation** for deployment to Google Play Store via two standard approaches:

### Method A: Capacitor Native Android Wrapper (`.aab` / `.apk`)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
Build the signed **Android App Bundle (`.aab`)** inside Android Studio (`Build -> Generate Signed Bundle / APK`).

### Method B: Trusted Web Activity (TWA) via Bubblewrap
1. Deploy `Index.html`, `manifest.json`, `sw.js`, and `src/` to HTTPS (e.g., GitHub Pages or Vercel).
2. Run Bubblewrap CLI:
   ```bash
   npx @bubblewrap/cli init --manifest https://<your-domain>/manifest.json
   npx @bubblewrap/cli build
   ```
3. Upload the generated `.aab` to the **Google Play Console**.
