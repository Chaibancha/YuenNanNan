/**
 * ============================================================================
 * WorkoutEngine.js
 * ระบบฐานข้อมูลท่าออกกำลังกาย อัลกอริทึมจัดตารางฝึกตามหลักสรีรวิทยาการออกกำลังกาย
 * (HIIT / REHIT / Cardio) และระบบ AI Realistic Media Prompt + Pre-loader
 * ============================================================================
 */

export const MUSCLE_GROUPS = [
  {
    id: 'chest',
    nameTh: 'อก (Chest)',
    nameEn: 'Pectoralis Major & Minor',
    viewSide: 'front',
    color: '#f97316',
    antagonist: 'back',
    description: 'กล้ามเนื้อหน้าอกส่วนบน กลาง และล่าง ทำหน้าที่ผลักและหุบแขนเข้าหาลำตัว'
  },
  {
    id: 'back',
    nameTh: 'หลัง (Back & Lats)',
    nameEn: 'Latissimus Dorsi, Traps & Rhomboids',
    viewSide: 'back',
    color: '#3b82f6',
    antagonist: 'chest',
    description: 'กล้ามเนื้อหลังส่วนกว้าง สะบัก และหลังส่วนบน ทำหน้าที่ดึงและพยุงแกนกระดูกสันหลัง'
  },
  {
    id: 'shoulders',
    nameTh: 'ไหล่ (Shoulders)',
    nameEn: 'Anterior, Lateral & Posterior Deltoids',
    viewSide: 'both',
    color: '#eab308',
    antagonist: 'back',
    description: 'หัวไหล่ทั้ง 3 มัด (หน้า-กลาง-หลัง) เพิ่มความกว้างและความมั่นคงของข้อไหล่'
  },
  {
    id: 'biceps',
    nameTh: 'หน้าแขน (Biceps)',
    nameEn: 'Biceps Brachii & Brachialis',
    viewSide: 'front',
    color: '#ec4899',
    antagonist: 'triceps',
    description: 'กล้ามเนื้อต้นแขนด้านหน้า ทำหน้าที่งอข้อศอกและหงายข้อมือ'
  },
  {
    id: 'triceps',
    nameTh: 'หลังแขน (Triceps)',
    nameEn: 'Triceps Brachii (Long, Lateral, Medial)',
    viewSide: 'back',
    color: '#a855f7',
    antagonist: 'biceps',
    description: 'กล้ามเนื้อต้นแขนด้านหลังทั้ง 3 หัว ทำหน้าที่เหยียดข้อศอกและช่วยดัน'
  },
  {
    id: 'core',
    nameTh: 'หน้าท้อง/แกนกลาง (Core & Abs)',
    nameEn: 'Rectus Abdominis, Obliques & Transverse',
    viewSide: 'front',
    color: '#10b981',
    antagonist: 'back',
    description: 'กล้ามเนื้อหน้าท้อง ซิกแพค ท้องข้าง และแกนกลางลำตัวส่งถ่ายแรงทั่วร่างกาย'
  },
  {
    id: 'glutes',
    nameTh: 'สะโพก/ก้น (Glutes)',
    nameEn: 'Gluteus Maximus, Medius & Minimus',
    viewSide: 'back',
    color: '#f43f5e',
    antagonist: 'core',
    description: 'กล้ามเนื้อสะโพกและก้น ต้นกำเนิดพลังการเหยียดสะโพก กระโดด และสปรินต์'
  },
  {
    id: 'quads',
    nameTh: 'ต้นขาด้านหน้า (Quads)',
    nameEn: 'Quadriceps Femoris',
    viewSide: 'front',
    color: '#06b6d4',
    antagonist: 'hamstrings',
    description: 'กล้ามเนื้อต้นขาด้านหน้า 4 มัด ทำหน้าที่เหยียดเข่าและรับแรงกระแทก'
  },
  {
    id: 'hamstrings',
    nameTh: 'ต้นขาด้านหลัง (Hamstrings)',
    nameEn: 'Biceps Femoris, Semitendinosus',
    viewSide: 'back',
    color: '#6366f1',
    antagonist: 'quads',
    description: 'กล้ามเนื้อต้นขาด้านหลัง ทำหน้าที่พับเข่าและส่งแรงเหยียดสะโพก'
  },
  {
    id: 'calves',
    nameTh: 'น่อง (Calves)',
    nameEn: 'Gastrocnemius & Soleus',
    viewSide: 'both',
    color: '#14b8a6',
    antagonist: 'quads',
    description: 'กล้ามเนื้อน่องและเอ็นร้อยหวาย ช่วยส่งแรงถีบปลายเท้าและรักษาสมดุลข้อเท้า'
  }
];

export const EQUIPMENT_CATALOG = [
  { id: 'bodyweight', nameTh: 'ไม่ใช้อุปกรณ์ (Bodyweight)', nameEn: 'Bodyweight Only', icon: '🤸' },
  { id: 'dumbbell', nameTh: 'ดัมเบล (Dumbbell)', nameEn: 'Pair of Dumbbells', icon: '🏋️' },
  { id: 'kettlebell', nameTh: 'เคตเทิลเบล (Kettlebell)', nameEn: 'Cast-Iron Kettlebell', icon: '🔔' },
  { id: 'band', nameTh: 'ยางยืดแรงต้าน (Resistance Band)', nameEn: 'Heavy Resistance Loop Band', icon: '➰' },
  { id: 'pullup_bar', nameTh: 'บาร์โหน (Pull-up Bar)', nameEn: 'Overhead Pull-up Bar', icon: '🪜' },
  { id: 'barbell', nameTh: 'บาร์เบล (Barbell)', nameEn: 'Olympic Barbell with Plates', icon: '🏋️‍♂️' },
  { id: 'jump_rope', nameTh: 'เชือกกระโดด (Jump Rope)', nameEn: 'Speed Jump Rope', icon: '🪢' },
  { id: 'bench', nameTh: 'ม้านั่งออกกำลังกาย (Bench)', nameEn: 'Adjustable FID Workout Bench', icon: '🛋️' },
  { id: 'bike', nameTh: 'จักรยานปั่นในร่ม (Indoor Bike)', nameEn: 'Stationary Air/Spin Bike', icon: '🚴' }
];

export const TRAINING_MODALITIES = {
  HIIT: {
    id: 'HIIT',
    nameTh: 'HIIT (ฝึกหนักสลับพักสั้น)',
    nameEn: 'High-Intensity Interval Training',
    hrZone: 'Zone 4–5 (85–95% HRmax)',
    energySystem: 'Anaerobic Glycolytic + VO2max',
    protocolsByLevel: {
      beginner: { workSec: 35, restSec: 25, ratioLabel: '35s ฝึก : 25s พัก' },
      intermediate: { workSec: 40, restSec: 20, ratioLabel: '40s ฝึก : 20s พัก' },
      advanced: { workSec: 45, restSec: 15, ratioLabel: '45s ฝึก : 15s พัก' }
    },
    description: 'เร่งอัตราการเต้นของหัวใจสู่โซน 4-5 สลับพักสั้น กระตุ้น EPOC (Afterburn Effect) เผาผลาญต่อเนื่องหลังฝึก'
  },
  REHIT: {
    id: 'REHIT',
    nameTh: 'REHIT (สปรินต์ขีดสุด 15-20s พักฟื้นนาน)',
    nameEn: 'Reduced Exertion High-Intensity Interval Training',
    hrZone: 'Supramaximal Sprint (100% All-Out) + Zone 1–2 Active Recovery',
    energySystem: 'Phosphagen (ATP-PCr) & Rapid Muscle Glycogen Depletion',
    protocolsByLevel: {
      beginner: { sprintSec: 15, recoverySec: 135, ratioLabel: '15s All-Out : 135s ฟื้นตัวเบา' },
      intermediate: { sprintSec: 20, recoverySec: 130, ratioLabel: '20s All-Out : 130s ฟื้นตัวเบา' },
      advanced: { sprintSec: 20, recoverySec: 100, ratioLabel: '20s All-Out : 100s ฟื้นตัวเบา' }
    },
    description: 'โปรโตคอลวิทยาศาสตร์การกีฬา (Vollaard Protocol) ระเบิดพลังสูงสุด 15-20 วินาทีเพียง 2-4 รอบ สลับเคลื่อนไหวเบาๆ 2-3 นาที เพื่อสลายไกลโคเจนและกระตุ้น AMPK/PGC-1α สูงสุดโดยไม่ล้าสะสม'
  },
  CARDIO: {
    id: 'CARDIO',
    nameTh: 'Cardio (แอโรบิกต่อเนื่อง โซน 2-3)',
    nameEn: 'Aerobic Endurance & PHA Circuit',
    hrZone: 'Zone 2–3 (65–80% HRmax)',
    energySystem: 'Aerobic Oxidative Phosphorylation (Fat Oxidation)',
    protocolsByLevel: {
      beginner: { workSec: 45, restSec: 15, ratioLabel: '45s ต่อเนื่อง : 15s เปลี่ยนท่า' },
      intermediate: { workSec: 50, restSec: 10, ratioLabel: '50s ต่อเนื่อง : 10s เปลี่ยนท่า' },
      advanced: { workSec: 55, restSec: 5, ratioLabel: '55s ต่อเนื่อง : 5s เปลี่ยนท่า' }
    },
    description: 'ฝึกความทนทานของระบบหัวใจและหลอดเลือดด้วยจังหวะคงที่ สลับส่วนบนและส่วนล่าง (Peripheral Heart Action) เน้นดึงไขมันมาใช้เป็นพลังงานหลัก'
  }
};

/**
 * ฐานข้อมูลท่าออกกำลังกายครบทั้ง 10 มัดกล้ามเนื้อ และ 9 อุปกรณ์
 * พร้อมข้อมูล Biomechanical Cues, Motion Pattern และภาพจำลองสตูดิโอความละเอียดสูง
 */
export const EXERCISE_DATABASE = [
  // ==================== CHEST (อก) ====================
  {
    id: 'ex_pushup_explosive',
    nameEn: 'Explosive Plyo Push-Up',
    nameTh: 'วิดพื้นระเบิดพลังดันตัว',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'push_horizontal',
    formCues: 'เกร็งแกนกลางลำตัวเป็นเส้นตรง ลดอกลงเกือบแตะพื้นแล้วออกแรงผลักพื้นอย่างรวดเร็ว',
    cameraAngle: '3/4 front-diagonal low angle (35 degrees)',
    mediaUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_db_floor_or_bench_press',
    nameEn: 'Dumbbell Speed Chest Press',
    nameTh: 'ดัมเบลเชสต์เพรสจังหวะต่อเนื่อง',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['dumbbell', 'bench'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'press_vertical',
    formCues: 'บีบสะบักติดเบาะ กดไหล่ลง ดันดัมเบลขึ้นเหนืออกโดยทำมุมศอกประมาณ 45 องศา',
    cameraAngle: 'side-diagonal studio perspective',
    mediaUrl: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_barbell_bench_press',
    nameEn: 'Barbell Power Bench Press',
    nameTh: 'บาร์เบลเบนช์เพรสสร้างพลังอก',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['barbell', 'bench'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'press_vertical',
    formCues: 'วางเท้ามั่นคงบนพื้น ลดบาร์เบลลงแตะอกส่วนกลางแล้วดันขึ้นด้วยความเร็วต้นสูง',
    cameraAngle: '3/4 overhead-side studio shot',
    mediaUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_band_chest_fly',
    nameEn: 'Resistance Band Dynamic Chest Fly',
    nameTh: 'กางแขนบีบอกด้วยยางยืดแรงต้าน',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'core'],
    equipment: ['band'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'fly_horizontal',
    formCues: 'ก้าวเท้าเหลื่อมกันเล็กน้อย งอศอกเล็กน้อยแล้ววาดแขนประกบกันด้านหน้าพร้อมบีบกล้ามเนื้ออกค้าง 1 วินาที',
    cameraAngle: 'front eye-level studio portrait',
    mediaUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== BACK (หลัง) ====================
  {
    id: 'ex_pullup_strict',
    nameEn: 'Tactical Pronated Pull-Up',
    nameTh: 'โหนบาร์ดึงข้อสร้างปีกและหลัง',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'core', 'shoulders'],
    equipment: ['pullup_bar'],
    difficulty: 'advanced',
    supportedModalities: ['HIIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'pull_vertical',
    formCues: 'จับบาร์กว้างกว่าไหล่ กดสะบักลงก่อนดึงอกเข้าหาบาร์ ค่อยๆ ผ่อนตัวลงจนแขนตึง',
    cameraAngle: 'rear 3/4 view highlighting latissimus dorsi',
    mediaUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_db_renegade_row',
    nameEn: 'Dumbbell Renegade Plank Row',
    nameTh: 'เรเนเกดโรว์แพลงก์ดึงดัมเบลสลับข้าง',
    primaryMuscle: 'back',
    secondaryMuscles: ['core', 'biceps', 'shoulders'],
    equipment: ['dumbbell'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'row_pull',
    formCues: 'ตั้งท่าแพลงก์จับดัมเบล กางเท้ากว้างกันสะโพกบิด ดึงดัมเบลขึ้นแนบชายโครงสลับซ้าย-ขวา',
    cameraAngle: 'low 45-degree isometric studio angle',
    mediaUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_barbell_bent_row',
    nameEn: 'Barbell Pendlay Power Row',
    nameTh: 'ก้มตัวดึงบาร์เบลสร้างหลังหนา',
    primaryMuscle: 'back',
    secondaryMuscles: ['hamstrings', 'biceps', 'core'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'row_pull',
    formCues: 'พับสะโพกไปด้านหลัง รักษาแนวสันหลังตรง ดึงบาร์เบลเข้าหาสะดือพร้อมบีบสะบักเข้าหากัน',
    cameraAngle: '90-degree lateral profile showing flat spine',
    mediaUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_bodyweight_superman_pull',
    nameEn: 'Prone Back Extension Lat Pull',
    nameTh: 'ซูเปอร์แมนยกอกดึงศอกบีบสะบัก',
    primaryMuscle: 'back',
    secondaryMuscles: ['glutes', 'shoulders'],
    equipment: ['bodyweight', 'band'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'row_pull',
    formCues: 'นอนคว่ำ ยกอกและต้นขาพ้นพื้นเล็กน้อย ดึงข้อศอกลงมาข้างลำตัวเป็นรูปตัว W แล้วเหยียดกลับ',
    cameraAngle: 'high-angle 45-degree rear-side view',
    mediaUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== SHOULDERS (ไหล่) ====================
  {
    id: 'ex_db_push_press',
    nameEn: 'Dumbbell Explosive Push Press',
    nameTh: 'ดัมเบลพุชเพรสดันไหล่ระเบิดพลัง',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'quads', 'core'],
    equipment: ['dumbbell'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'press_vertical',
    formCues: 'ย่อเข่าเล็กน้อย (Quarter Dip) แล้วส่งแรงจากขาทะยานดันดัมเบลขึ้นเหนือศีรษะจนสุดแขน',
    cameraAngle: 'front 3/4 full-body studio angle',
    mediaUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_kb_overhead_swing',
    nameEn: 'Kettlebell High-Pull to Press',
    nameTh: 'เคตเทิลเบลไฮพูลแอนด์เพรส',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['glutes', 'back', 'core'],
    equipment: ['kettlebell'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'snatch_drive',
    formCues: 'ส่งแรงจากสะโพก ดึงเคตเทิลเบลชิดลำตัวแล้วพลิกข้อมือดันขึ้นเหนือศีรษะอย่างมั่นคง',
    cameraAngle: 'front-side 30-degree wide shot',
    mediaUrl: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_pike_shoulder_pushup',
    nameEn: 'Pike Handstand Shoulder Press',
    nameTh: 'วิดพื้นยกสะโพกเน้นหัวไหล่ (Pike Push-up)',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    equipment: ['bodyweight', 'bench'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'CARDIO'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'press_vertical',
    formCues: 'ยกสะโพกสูงเป็นรูปตัว V คว่ำ ค่อยๆ งอศอกลดศีรษะลงด้านหน้ามือแล้วออกแรงไหล่ดันตัวกลับ',
    cameraAngle: 'side profile studio shot',
    mediaUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== BICEPS (หน้าแขน) ====================
  {
    id: 'ex_db_hammer_curl_tempo',
    nameEn: 'Alternating Power Hammer Curl',
    nameTh: 'ดัมเบลแฮมเมอร์เคิร์ลสลับแขนความเร็วสูง',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['shoulders', 'core'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'curl_flexion',
    formCues: 'ล็อกข้อศอกไว้ข้างลำตัว หันฝ่ามือเข้าหากันแล้วพับแขนยกดัมเบลขึ้นระดับไหล่โดยไม่เหวี่ยงตัว',
    cameraAngle: 'close-medium 3/4 angle highlighting biceps brachii',
    mediaUrl: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_chinup_underhand',
    nameEn: 'Supinated Grip Chin-Up',
    nameTh: 'โหนบาร์หงายมือเน้นหน้าแขนและหลัง',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['back', 'core'],
    equipment: ['pullup_bar'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'pull_vertical',
    formCues: 'จับบาร์แบบหงายมือความกว้างเท่าช่วงไหล่ ดึงตัวขึ้นจนคางพ้นบาร์โดยโฟกัสการบีบหน้าแขน',
    cameraAngle: 'front-low 30-degree dynamic studio view',
    mediaUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_band_speed_curl',
    nameEn: 'Resistance Band High-Rep Bicep Burn',
    nameTh: 'เคิร์ลหน้าแขนด้วยยางยืดแรงต้านต่อเนื่อง',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['core'],
    equipment: ['band', 'barbell'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'curl_flexion',
    formCues: 'เหยียบยางยืดมั่นคง รักษาแรงตึงตลอดช่วงการเคลื่อนไหว พับศอกขึ้นสุดและต้านแรงตอนผ่อนลง',
    cameraAngle: 'front-diagonal 45-degree studio angle',
    mediaUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== TRICEPS (หลังแขน) ====================
  {
    id: 'ex_bench_tricep_dips',
    nameEn: 'Bench & Bodyweight Tricep Dips',
    nameTh: 'ดิปส์หลังแขนกับม้านั่ง/พื้น',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['shoulders', 'chest'],
    equipment: ['bench', 'bodyweight'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'press_vertical',
    formCues: 'วางมือบนขอบม้านั่งหรือพื้น หุบศอกชิดลำตัว ลดสะโพกลงจนต้นแขนขนานพื้นแล้วดันขึ้นจนแขนตึง',
    cameraAngle: 'side-rear 45-degree angle emphasizing triceps horseshoe',
    mediaUrl: 'https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_diamond_pushup',
    nameEn: 'Diamond Close-Grip Tricep Push-Up',
    nameTh: 'วิดพื้นมือชิดรูปเพชรเน้นหลังแขน',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'core', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'push_horizontal',
    formCues: 'วางนิ้วชี้และนิ้วโป้งแตะกันเป็นรูปเพชรใต้หน้าอก ลดตัวลงโดยหนีบศอกแนบลำตัวแล้วดันขึ้นเต็มแรง',
    cameraAngle: 'low front-side studio angle',
    mediaUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_db_overhead_extension',
    nameEn: 'Dumbbell Overhead Tricep Extension',
    nameTh: 'ยกดัมเบลเหยียดหลังแขนเหนือศีรษะ',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['core', 'shoulders'],
    equipment: ['dumbbell', 'kettlebell', 'band'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'press_vertical',
    formCues: 'ชูดัมเบลเหนือศีรษะ ล็อกต้นแขนให้อยู่นิ่งข้างใบหู ค่อยๆ พับศอกลดดัมเบลลงหลังศีรษะแล้วเหยียดขึ้นสุด',
    cameraAngle: 'rear-side 45-degree studio lighting',
    mediaUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== CORE / ABS (หน้าท้องและแกนกลาง) ====================
  {
    id: 'ex_mountain_climber_sprint',
    nameEn: 'All-Out Mountain Climber Sprint',
    nameTh: 'ปีนเขาความเร็วสูงสุดกระชับแกนกลาง',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'quads'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'sprint_climber',
    formCues: 'ตั้งท่าแพลงก์แขนตึง ไหล่อยู่เหนือข้อมือ ซอยเข่าพุ่งเข้าหาอกด้วยความเร็วสูงสุดโดยสะโพกไม่โด่ง',
    cameraAngle: 'side profile floor-level dynamic shot',
    mediaUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_russian_twist_weighted',
    nameEn: 'Rotational Russian Twist Power',
    nameTh: 'บิดลำตัวรัสเซียนทวิสต์สร้างร่องท้องข้าง',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    equipment: ['bodyweight', 'dumbbell', 'kettlebell'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'twist_rotation',
    formCues: 'นั่งเอนหลัง 45 องศา ยกเท้าพ้นพื้นเล็กน้อย บิดหัวไหล่และลำตัวซ้าย-ขวาโดยใช้กล้ามเนื้อท้องข้างควบคุม',
    cameraAngle: 'front-high 35-degree angle',
    mediaUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_hanging_knee_raise',
    nameEn: 'Hanging Strict Knee-to-Chest Raise',
    nameTh: 'โหนบาร์ยกเข่าแตะอกปั้นหน้าท้องล่าง',
    primaryMuscle: 'core',
    secondaryMuscles: ['back', 'biceps'],
    equipment: ['pullup_bar'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'pull_vertical',
    formCues: 'ห้อยตัวบนบาร์โดยไม่แกว่งตัว ม้วนก้นกบและเกร็งหน้าท้องล่างดึงเข่าขึ้นแตะหน้าอกแล้วผ่อนลงช้าๆ',
    cameraAngle: 'front-side 30-degree full-length view',
    mediaUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== GLUTES (สะโพก/ก้น) ====================
  {
    id: 'ex_kb_russian_swing',
    nameEn: 'Explosive Kettlebell Hip-Hinge Swing',
    nameTh: 'สวิงเคตเทิลเบลระเบิดพลังสะโพก',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'core', 'back'],
    equipment: ['kettlebell', 'dumbbell'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'snatch_drive',
    formCues: 'พับสะโพกไปด้านหลังแล้วดีดสะโพกไปข้างหน้าอย่างรุนแรงเพื่อส่งน้ำหนักขึ้นระดับอก แขนทำหน้าที่เป็นเพียงสายเชือก',
    cameraAngle: '90-degree lateral profile capturing hip hinge mechanics',
    mediaUrl: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_barbell_hip_thrust',
    nameEn: 'Weighted Glute Bridge & Hip Thrust',
    nameTh: 'ฮิปทรัสต์ดันสะโพกปั้นก้นกลมกระชับ',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['bench', 'barbell', 'dumbbell', 'bodyweight', 'band'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'thrust_hip',
    formCues: 'พิงสะบักบนม้านั่งหรือนอนหงาย กดส้นเท้าดันสะโพกขึ้นจนลำตัวขนานพื้น บีบก้นค้างไว้ด้านบน 1 วินาที',
    cameraAngle: 'side 3/4 low angle showing horizontal torso alignment',
    mediaUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== QUADS (ต้นขาด้านหน้า) ====================
  {
    id: 'ex_db_thruster_explode',
    nameEn: 'Full-Depth Dumbbell Squat Thruster',
    nameTh: 'ดัมเบลสควอททรัสเตอร์ระเบิดพลังทั่วร่าง',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'shoulders', 'core'],
    equipment: ['dumbbell', 'kettlebell', 'barbell'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'thrust_up',
    formCues: 'ถือดัมเบลระดับไหล่ ย่อสควอทลึกแล้วส่งแรงถีบส้นเท้าพุ่งขึ้นพร้อมดันดัมเบลเหนือศีรษะในจังหวะเดียว',
    cameraAngle: 'front 3/4 wide angle showing full vertical extension',
    mediaUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_jump_squat_plyo',
    nameEn: 'Plyometric Jump Squat / Air Squat',
    nameTh: 'สควอทจัมพ์ระเบิดพลังขาหน้า',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'calves', 'core'],
    equipment: ['bodyweight', 'band'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'jump_plyo',
    formCues: 'ย่อสะโพกลงจนต้นขาขนานพื้น ดีดตัวกระโดดขึ้นในแนวดิ่งแล้วลงสู่พื้นอย่างนุ่มนวลด้วยปลายเท้าต่อด้วยส้นเท้า',
    cameraAngle: 'low front-diagonal 30-degree dynamic capture',
    mediaUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_indoor_bike_wingate',
    nameEn: 'Indoor Bike Wingate All-Out Sprint',
    nameTh: 'ปั่นจักรยานสปรินต์ความเร็วสูงสุด (Wingate REHIT)',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'calves'],
    equipment: ['bike'],
    difficulty: 'beginner',
    supportedModalities: ['REHIT', 'HIIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'bike_sprint',
    formCues: 'ปรับแรงต้านปานกลาง-สูง แล้วอัดสปรินต์ด้วยรอบขาสูงสุดเท่าที่ทำได้ (100% All-Out Effort) ตลอดช่วงสปรินต์',
    cameraAngle: 'side-front 45-degree action shot on stationary bike',
    mediaUrl: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_bulgarian_split_squat',
    nameEn: 'Alternating Reverse Lunge / Split Squat',
    nameTh: 'ก้าวถอยย่อเข่าสปลิตสควอทเน้นขาหน้า',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    equipment: ['bodyweight', 'dumbbell', 'bench', 'kettlebell'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'thrust_up',
    formCues: 'ก้าวเท้าถอยหลัง ย่อเข่าลงให้เข่าหน้าทำมุม 90 องศาโดยเข่าไม่บิดเข้าด้านใน แล้วออกแรงกดส้นเท้าหน้าดันตัวขึ้น',
    cameraAngle: 'side 45-degree studio angle',
    mediaUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== HAMSTRINGS (ต้นขาด้านหลัง) ====================
  {
    id: 'ex_rdl_hinge',
    nameEn: 'Romanian Deadlift (RDL) Tempo Hinge',
    nameTh: 'โรมาเนียนเดดลิฟต์ยืดเหยียดขาหลังและก้น',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back', 'core'],
    equipment: ['dumbbell', 'barbell', 'kettlebell', 'band'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'snatch_drive',
    formCues: 'ปลดล็อกเข่าเล็กน้อย ดันสะโพกไปด้านหลังโดยให้ดัมเบล/บาร์เบลเฉียดหน้าแข้งจนรู้สึกตึงต้นขาด้านหลังแล้วบีบก้นดันตัวกลับ',
    cameraAngle: '90-degree lateral profile showing hip hinge angle',
    mediaUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_single_leg_walkout_bridge',
    nameEn: 'Dynamic Hamstring Walkout Bridge',
    nameTh: 'สะพานโค้งก้าวส้นเท้าบริหารต้นขาด้านหลัง',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'core', 'calves'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'thrust_hip',
    formCues: 'นอนหงายยกสะโพกค้างไว้ จิกส้นเท้าก้าวออกไปด้านหน้าทีละก้าวแล้วก้าวกลับเข้าหาสะโพกโดยก้นไม่แตะพื้น',
    cameraAngle: 'side floor-level studio perspective',
    mediaUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== CALVES (น่อง) ====================
  {
    id: 'ex_speed_jump_rope',
    nameEn: 'High-Cadence Speed Jump Rope / Double-Under',
    nameTh: 'กระโดดเชือกความเร็วสูงกระตุ้นน่องและหัวใจ',
    primaryMuscle: 'calves',
    secondaryMuscles: ['shoulders', 'core', 'quads'],
    equipment: ['jump_rope'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    motionPattern: 'jump_plyo',
    formCues: 'ใช้ข้อมือหมุนเชือก กระโดดเบาๆ ด้วยจมูกเท้าสูงจากพื้นเพียง 1-2 นิ้ว รักษาจังหวะต่อเนื่อง',
    cameraAngle: 'front full-body high-shutter studio shot',
    mediaUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_plyo_calf_hops',
    nameEn: 'Explosive Pogo Calf Hops & Raises',
    nameTh: 'เขย่งและสปริงข้อเท้าสร้างน่องคมชัด',
    primaryMuscle: 'calves',
    secondaryMuscles: ['quads', 'core'],
    equipment: ['bodyweight', 'dumbbell', 'step'],
    difficulty: 'beginner',
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    motionPattern: 'jump_plyo',
    formCues: 'ดันจมูกเท้าเขย่งขึ้นสูงสุดจนน่องเกร็งเต็มที่ สลับกับการสปริงข้อเท้าเบาๆ อย่างต่อเนื่อง',
    cameraAngle: 'low rear-side angle focusing on gastrocnemius & soleus',
    mediaUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80'
  }
];

export const WARMUP_EXERCISES = [
  {
    id: 'warmup_dynamic_thoracic',
    nameEn: 'Dynamic Full-Body Mobility & Arm Circles',
    nameTh: 'วอร์มอัพเปิดข้อไหล่ หมุนลำตัว และกระตุ้นการไหลเวียนเลือด',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['chest', 'back', 'core'],
    equipment: ['bodyweight'],
    motionPattern: 'twist_rotation',
    formCues: 'หมุนหัวไหล่กว้างๆ สลับบิดลำตัวซ้าย-ขวา หายใจเข้าออกลึกๆ เพื่อเพิ่มอุณหภูมิกล้ามเนื้อและน้ำเลี้ยงข้อต่อ',
    mediaUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'warmup_hip_opener_pulse',
    nameEn: 'World’s Greatest Stretch & Squat Opener',
    nameTh: 'วอร์มอัพยืดสะโพก ข้อเท้า และย่อสควอทปลุกกล้ามเนื้อขา',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'calves'],
    equipment: ['bodyweight'],
    motionPattern: 'thrust_up',
    formCues: 'ก้าวยาวเปิดสะโพก บิดอกขึ้นหาเพดาน สลับกับย่อสควอทช้าๆ เพื่อเตรียมพร้อมข้อเข่าและข้อสะโพก',
    mediaUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80'
  }
];

export const COOLDOWN_EXERCISES = [
  {
    id: 'cooldown_parasympathetic_stretch',
    nameEn: 'Full-Body Static Stretch & Box Breathing',
    nameTh: 'คูลดาวน์ยืดเหยียดกล้ามเนื้อและฝึกหายใจลดอัตราการเต้นหัวใจ',
    primaryMuscle: 'back',
    secondaryMuscles: ['chest', 'hamstrings', 'glutes'],
    equipment: ['bodyweight'],
    motionPattern: 'cooldown_breathe',
    formCues: 'ค้างท่ายืดกล้ามเนื้อที่ใช้งานหลัก พร้อมสูดหายใจเข้าลึก 4 วินาที ผ่อนออกยาว 6 วินาที เพื่อเร่งการฟื้นตัวระบบประสาทพาราซิมพาเทติก',
    mediaUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80'
  }
];

/**
 * สร้าง AI Prompt สำหรับโมเดลสร้างภาพสมจริง (Imagen 3 / Flux) และโมเดลเคลื่อนไหว (Veo / Runway / Kling)
 */
export function buildRealisticMediaPrompt(exercise, options = {}) {
  const {
    fitnessLevel = 'intermediate',
    modality = 'HIIT',
    selectedEquipment = ['bodyweight']
  } = options;

  const primaryObj = MUSCLE_GROUPS.find(m => m.id === exercise.primaryMuscle) || MUSCLE_GROUPS[0];
  const matchedEquip = (exercise.equipment || ['bodyweight'])
    .filter(eq => selectedEquipment.includes(eq))
    .map(eq => EQUIPMENT_CATALOG.find(item => item.id === eq)?.nameEn || eq);

  const equipText = matchedEquip.length > 0 ? matchedEquip.join(' and ') : 'Bodyweight only (no equipment)';

  const imagePrompt = [
    `Photorealistic commercial fitness studio photography of an athletic Southeast Asian fitness model (${fitnessLevel} level) performing "${exercise.nameEn}" (${exercise.nameTh}).`,
    `Equipment in active use: ${equipText}.`,
    `Anatomical focus: visible biomechanical engagement and subtle warm kinetic highlight on the ${primaryObj.nameEn} (primary) and ${(exercise.secondaryMuscles || []).join(', ')} (secondary).`,
    `Form & posture specification: ${exercise.formCues}.`,
    `Camera & lighting: ${exercise.cameraAngle || '3/4 dynamic studio angle'}, shot on Sony A7R V 50mm f/1.8 lens, natural rim lighting with high-contrast dark obsidian gym background, crisp sweat detail, 8K UHD.`
  ].join(' ');

  const motionLoopPrompt = [
    `Seamless 4-second looping biomechanically accurate motion clip (60fps) of "${exercise.nameEn}" with ${equipText}.`,
    `Phase 0.0s–1.8s: controlled eccentric loading phase maintaining neutral spine.`,
    `Phase 1.8s–2.6s: explosive concentric contraction of ${primaryObj.nameEn} (${modality} tempo).`,
    `Phase 2.6s–4.0s: smooth return to exact starting keyframe for zero-jump infinite loop.`,
    `Fixed tripod camera at ${exercise.cameraAngle || '3/4 studio angle'}, consistent studio lighting.`
  ].join(' ');

  return {
    exerciseId: exercise.id,
    imagePrompt,
    motionLoopPrompt,
    negativePrompt: 'deformed limbs, extra fingers, bad posture, rounded lower back, floating weights, blurry motion, watermark, text overlay, inconsistent lighting'
  };
}

/**
 * อัลกอริทึมคำนวณและจัดตารางฝึกให้ตรงตามกรอบเวลา (Time-Bounded Schedule Generator)
 * รับประกันว่าผลรวมเวลาทุกขั้นตอน (Warm-up + Main Rounds + Cool-down) เท่ากับ targetMinutes * 60 วินาทีพอดี 100%
 */
export function generateTimeBoundedSchedule({
  selectedMuscles = ['chest', 'back', 'quads', 'core'],
  isFullBody = false,
  selectedEquipment = ['bodyweight', 'dumbbell'],
  modality = 'HIIT',
  durationMinutes = 20,
  fitnessLevel = 'intermediate'
}) {
  const totalSeconds = Math.max(600, Math.round(Number(durationMinutes) * 60));

  // 1. คัดกรองท่าออกกำลังกายตามมัดกล้ามเนื้อและอุปกรณ์ที่ผู้ใช้มีจริง
  const activeMuscles = isFullBody || selectedMuscles.length === 0
    ? MUSCLE_GROUPS.map(m => m.id)
    : selectedMuscles;

  const activeEquip = selectedEquipment.length === 0 ? ['bodyweight'] : selectedEquipment;

  let candidatePool = EXERCISE_DATABASE.filter(ex => {
    const matchMuscle = activeMuscles.includes(ex.primaryMuscle);
    const matchEquip = ex.equipment.some(eq => activeEquip.includes(eq));
    return matchMuscle && matchEquip;
  });

  // Fallback หากผู้ใช้เลือกอุปกรณ์ที่มีจำกัดมาก ให้ดึงท่า Bodyweight ของกล้ามเนื้อมัดนั้นมาเสริม
  if (candidatePool.length < 3) {
    const bwFallback = EXERCISE_DATABASE.filter(
      ex => activeMuscles.includes(ex.primaryMuscle) && ex.equipment.includes('bodyweight')
    );
    candidatePool = [...new Map([...candidatePool, ...bwFallback].map(item => [item.id, item])).values()];
  }
  if (candidatePool.length === 0) {
    candidatePool = [...EXERCISE_DATABASE];
  }

  // 2. จัดเรียงท่าตามหลักวิทยาศาสตร์การกีฬา (Anti-Fatigue & Antagonist Alternation)
  // ไม่ให้มัดกล้ามเนื้อหลักเดียวกันอยู่ติดกัน เพื่อป้องกันความล้าเฉพาะจุดก่อนถึงโซนหัวใจเป้าหมาย
  const orderedExercises = orderExercisesScientifically(candidatePool, activeMuscles);

  const steps = [];
  let stepCounter = 1;

  // 3. กำหนดเวลา Warm-up และ Cool-down ตามสัดส่วนเวลาทั้งหมด
  const warmupTotalSec = totalSeconds <= 600 ? 90 : totalSeconds <= 1200 ? 120 : 180;
  const cooldownTotalSec = totalSeconds <= 600 ? 60 : totalSeconds <= 1200 ? 90 : 120;
  const mainBlockSec = totalSeconds - warmupTotalSec - cooldownTotalSec;

  // สร้างขั้นตอน Warm-up (แบ่งเป็น 2 ท่าย่อย)
  const wu1Sec = Math.floor(warmupTotalSec / 2);
  const wu2Sec = warmupTotalSec - wu1Sec;
  [
    { ex: WARMUP_EXERCISES[0], dur: wu1Sec, roundLabel: 'WARM-UP 1/2' },
    { ex: WARMUP_EXERCISES[1], dur: wu2Sec, roundLabel: 'WARM-UP 2/2' }
  ].forEach(item => {
    steps.push(createStepObject(stepCounter++, 'WARMUP', item.ex, item.dur, item.roundLabel, {
      fitnessLevel,
      modality,
      selectedEquipment: activeEquip
    }));
  });

  // 4. สร้าง Main Conditioning Block แยกตามโหมดการฝึก (HIIT / REHIT / CARDIO)
  if (modality === 'REHIT') {
    // โปรโตคอล REHIT (Reduced Exertion HIIT):
    // สลับช่วง All-Out Supramaximal Sprint (15-20s) กับ Active Recovery เคลื่อนไหวเบา (100-135s)
    const proto = TRAINING_MODALITIES.REHIT.protocolsByLevel[fitnessLevel] || TRAINING_MODALITIES.REHIT.protocolsByLevel.intermediate;
    const sprintCandidates = orderedExercises.filter(ex => ex.rehitRole === 'SPRINT');
    const sprintPool = sprintCandidates.length > 0 ? sprintCandidates : orderedExercises;

    const cycleSec = proto.sprintSec + proto.recoverySec;
    const numSprints = Math.max(2, Math.floor(mainBlockSec / cycleSec));
    let remainingMainSec = mainBlockSec;

    // Primer ช่วงเตรียมความพร้อมก่อน Sprint แรก (60 วินาที)
    const primerSec = Math.min(60, Math.floor(remainingMainSec * 0.15));
    if (primerSec >= 20) {
      const primerEx = orderedExercises[0];
      steps.push(
        createStepObject(stepCounter++, 'WORK', {
          ...primerEx,
          nameTh: `เตรียมพร้อมก่อนสปรินต์: ${primerEx.nameTh} (จังหวะเบา 50%)`,
          formCues: 'เคลื่อนไหวจังหวะสบายๆ เพื่อกระตุ้นระบบประสาทสั่งการกล้ามเนื้อก่อนเข้าสู่ช่วง All-Out Sprint'
        }, primerSec, 'REHIT PRIMER', { fitnessLevel, modality, selectedEquipment: activeEquip })
      );
      remainingMainSec -= primerSec;
    }

    for (let s = 0; s < numSprints && remainingMainSec > 0; s++) {
      const sprintEx = sprintPool[s % sprintPool.length];
      const currentSprintSec = Math.min(proto.sprintSec, remainingMainSec);
      steps.push(
        createStepObject(
          stepCounter++,
          'SPRINT',
          {
            ...sprintEx,
            nameTh: `⚡ ALL-OUT SPRINT #${s + 1}: ${sprintEx.nameTh}`,
            formCues: `ระเบิดความเร็วและแรงสูงสุด 100% ทุกวินาที! ${sprintEx.formCues}`
          },
          currentSprintSec,
          `SPRINT ${s + 1}/${numSprints}`,
          { fitnessLevel, modality, selectedEquipment: activeEquip }
        )
      );
      remainingMainSec -= currentSprintSec;

      if (remainingMainSec > 0) {
        // คำนวณเวลาพักฟื้นตัวแบบเคลื่อนไหวเบา (Active Recovery) ให้หารเวลาที่เหลือลงตัวพอดี
        const sprintsLeftAfterThis = numSprints - (s + 1);
        const recoverySec = sprintsLeftAfterThis > 0
          ? Math.min(proto.recoverySec, remainingMainSec - sprintsLeftAfterThis * proto.sprintSec)
          : remainingMainSec;

        if (recoverySec > 0) {
          const recEx = orderedExercises[(s + 1) % orderedExercises.length];
          steps.push(
            createStepObject(
              stepCounter++,
              'REST',
              {
                ...recEx,
                nameEn: `Active Recovery Mobility & Zone 1 Flow`,
                nameTh: `ฟื้นตัวแบบเคลื่อนไหวเบา (Active Recovery หลังสปรินต์ #${s + 1})`,
                formCues: 'เคลื่อนไหวช้าๆ ก้าวเดินหรือปั่นเบาๆ ห้ามหยุดนิ่งทันที เพื่อให้ร่างกายระบายกรดแลคติกและสังเคราะห์ ATP-PCr ใหม่'
              },
              recoverySec,
              `RECOVERY ${s + 1}/${numSprints}`,
              { fitnessLevel, modality, selectedEquipment: activeEquip }
            )
          );
          remainingMainSec -= recoverySec;
        }
      }
    }
  } else {
    // โปรโตคอล HIIT และ CARDIO
    const modConfig = TRAINING_MODALITIES[modality] || TRAINING_MODALITIES.HIIT;
    const proto = modConfig.protocolsByLevel[fitnessLevel] || modConfig.protocolsByLevel.intermediate;
    const cycleSec = proto.workSec + proto.restSec;
    const totalIntervals = Math.max(1, Math.floor(mainBlockSec / cycleSec));
    const exercisesPerRound = Math.min(orderedExercises.length, Math.max(3, Math.min(6, totalIntervals)));
    let remainingMainSec = mainBlockSec;

    for (let i = 0; i < totalIntervals && remainingMainSec > 0; i++) {
      const ex = orderedExercises[i % orderedExercises.length];
      const roundNum = Math.floor(i / exercisesPerRound) + 1;
      const totalRounds = Math.ceil(totalIntervals / exercisesPerRound);
      const isLastInterval = i === totalIntervals - 1;

      const workSec = isLastInterval
        ? Math.min(proto.workSec, remainingMainSec)
        : Math.min(proto.workSec, remainingMainSec);

      steps.push(
        createStepObject(
          stepCounter++,
          'WORK',
          ex,
          workSec,
          `รอบที่ ${roundNum}/${totalRounds} • ท่า ${(i % exercisesPerRound) + 1}`,
          { fitnessLevel, modality, selectedEquipment: activeEquip }
        )
      );
      remainingMainSec -= workSec;

      if (remainingMainSec > 0) {
        const restSec = isLastInterval ? remainingMainSec : Math.min(proto.restSec, remainingMainSec);
        const nextEx = orderedExercises[(i + 1) % orderedExercises.length];
        steps.push(
          createStepObject(
            stepCounter++,
            'REST',
            {
              id: `rest_${stepCounter}`,
              nameEn: `Rest & Transition -> ${nextEx.nameEn}`,
              nameTh: modality === 'CARDIO'
                ? `เปลี่ยนท่าต่อเนื่อง • เตรียม ${nextEx.nameTh}`
                : `พักหายใจ & เตรียมท่าถัดไป: ${nextEx.nameTh}`,
              primaryMuscle: nextEx.primaryMuscle,
              secondaryMuscles: nextEx.secondaryMuscles,
              equipment: nextEx.equipment,
              motionPattern: 'cooldown_breathe',
              formCues: `สูดหายใจเข้าลึกทางจมูก ผ่อนออกทางปาก เตรียมอุปกรณ์สำหรับท่า ${nextEx.nameTh}`,
              mediaUrl: nextEx.mediaUrl
            },
            restSec,
            `REST ${i + 1}`,
            { fitnessLevel, modality, selectedEquipment: activeEquip }
          )
        );
        remainingMainSec -= restSec;
      }
    }
  }

  // 5. ปรับสมดุลเศษวินาที (ถ้ามี) เข้ากับช่วง Cool-down เพื่อให้เวลารวมเท่ากับ targetMinutes * 60 วินาทีเป๊ะ 100%
  const currentSumSec = steps.reduce((acc, s) => acc + s.duration, 0);
  const exactCooldownSec = Math.max(30, totalSeconds - currentSumSec);

  steps.push(
    createStepObject(
      stepCounter++,
      'COOLDOWN',
      COOLDOWN_EXERCISES[0],
      exactCooldownSec,
      'COOL-DOWN & RECOVERY',
      { fitnessLevel, modality, selectedEquipment: activeEquip }
    )
  );

  // คำนวณ Timestamp สะสมของแต่ละขั้นตอน
  let cumulativeSec = 0;
  const finalizedSteps = steps.map((step, index) => {
    const startSec = cumulativeSec;
    cumulativeSec += step.duration;
    return {
      ...step,
      index,
      startTimeSec: startSec,
      endTimeSec: cumulativeSec
    };
  });

  return {
    modality,
    fitnessLevel,
    durationMinutes,
    totalSeconds: cumulativeSec,
    selectedMuscles: activeMuscles,
    selectedEquipment: activeEquip,
    steps: finalizedSteps,
    summary: calculateScheduleMetrics(finalizedSteps, modality)
  };
}

function orderExercisesScientifically(pool, activeMuscles) {
  if (pool.length <= 1) return [...pool];
  const buckets = {};
  activeMuscles.forEach(m => {
    buckets[m] = pool.filter(ex => ex.primaryMuscle === m);
  });

  const result = [];
  let added = true;
  let roundIdx = 0;
  while (added && result.length < 24) {
    added = false;
    for (const m of activeMuscles) {
      const list = buckets[m] || [];
      if (roundIdx < list.length) {
        const candidate = list[roundIdx];
        if (!result.some(r => r.id === candidate.id)) {
          result.push(candidate);
          added = true;
        }
      }
    }
    roundIdx++;
  }

  return result.length > 0 ? result : [...pool];
}

function createStepObject(stepNumber, phaseType, exercise, durationSec, roundLabel, options) {
  const promptData = buildRealisticMediaPrompt(exercise, options);
  const muscleMeta = MUSCLE_GROUPS.find(m => m.id === exercise.primaryMuscle) || MUSCLE_GROUPS[0];
  return {
    stepNumber,
    type: phaseType, // 'WARMUP' | 'WORK' | 'SPRINT' | 'REST' | 'COOLDOWN'
    exerciseId: exercise.id,
    nameTh: exercise.nameTh,
    nameEn: exercise.nameEn,
    primaryMuscle: exercise.primaryMuscle,
    primaryMuscleTh: muscleMeta.nameTh,
    primaryMuscleColor: muscleMeta.color,
    secondaryMuscles: exercise.secondaryMuscles || [],
    equipment: exercise.equipment || ['bodyweight'],
    duration: durationSec,
    roundLabel,
    formCues: exercise.formCues,
    motionPattern: exercise.motionPattern || 'thrust_up',
    mediaUrl: exercise.mediaUrl,
    aiPrompt: promptData
  };
}

function calculateScheduleMetrics(steps, modality) {
  const workSteps = steps.filter(s => s.type === 'WORK' || s.type === 'SPRINT');
  const restSteps = steps.filter(s => s.type === 'REST');
  const warmupSec = steps.filter(s => s.type === 'WARMUP').reduce((a, b) => a + b.duration, 0);
  const workSec = workSteps.reduce((a, b) => a + b.duration, 0);
  const restSec = restSteps.reduce((a, b) => a + b.duration, 0);
  const cooldownSec = steps.filter(s => s.type === 'COOLDOWN').reduce((a, b) => a + b.duration, 0);
  const totalSec = warmupSec + workSec + restSec + cooldownSec;

  // คำนวณแคลอรีโดยประมาณตามค่า METs ของแต่ละโหมด
  const metValue = modality === 'REHIT' ? 11.5 : modality === 'HIIT' ? 10.2 : 7.8;
  const estimatedKcal = Math.round((metValue * 3.5 * 70 / 200) * (totalSec / 60));

  return {
    totalSteps: steps.length,
    workIntervals: workSteps.length,
    warmupSec,
    workSec,
    restSec,
    cooldownSec,
    totalSec,
    estimatedKcal
  };
}

/**
 * ฟังก์ชันสลับท่าออกกำลังกาย (Swap Exercise) ในตารางโดยคงเวลาเดิมและเลือกท่าที่ตรงอุปกรณ์
 */
export function swapExerciseInSchedule(schedule, stepIndex) {
  const targetStep = schedule.steps[stepIndex];
  if (!targetStep || targetStep.type === 'REST' || targetStep.type === 'WARMUP' || targetStep.type === 'COOLDOWN') {
    return schedule;
  }

  const sameMusclePool = EXERCISE_DATABASE.filter(
    ex =>
      ex.id !== targetStep.exerciseId &&
      ex.primaryMuscle === targetStep.primaryMuscle &&
      ex.equipment.some(eq => schedule.selectedEquipment.includes(eq))
  );

  const broaderPool = EXERCISE_DATABASE.filter(
    ex =>
      ex.id !== targetStep.exerciseId &&
      schedule.selectedMuscles.includes(ex.primaryMuscle) &&
      ex.equipment.some(eq => schedule.selectedEquipment.includes(eq))
  );

  const pool = sameMusclePool.length > 0 ? sameMusclePool : broaderPool.length > 0 ? broaderPool : EXERCISE_DATABASE;
  const replacement = pool[Math.floor(Math.random() * pool.length)];

  const newStep = createStepObject(
    targetStep.stepNumber,
    targetStep.type,
    replacement,
    targetStep.duration,
    targetStep.roundLabel,
    {
      fitnessLevel: schedule.fitnessLevel,
      modality: schedule.modality,
      selectedEquipment: schedule.selectedEquipment
    }
  );

  const updatedSteps = schedule.steps.map((st, idx) => {
    if (idx === stepIndex) {
      return {
        ...newStep,
        index: st.index,
        startTimeSec: st.startTimeSec,
        endTimeSec: st.endTimeSec
      };
    }
    return st;
  });

  return {
    ...schedule,
    steps: updatedSteps
  };
}

/**
 * ระบบ Pre-load รูปภาพและสื่อล่วงหน้าอย่างน้อย 5 วินาทีก่อนเปลี่ยนท่า (Zero-Latency Media Preloader)
 */
export class MediaPreloader {
  constructor() {
    this.cache = new Map();
  }

  preloadUrl(url) {
    if (!url || this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url));
    }

    const promise = new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().then(() => resolve(url)).catch(() => resolve(url));
        } else {
          resolve(url);
        }
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });

    this.cache.set(url, promise);
    return promise;
  }

  preloadUpcomingSteps(steps, currentIndex, lookaheadCount = 3) {
    if (!Array.isArray(steps)) return;
    for (let i = currentIndex; i <= Math.min(steps.length - 1, currentIndex + lookaheadCount); i++) {
      const step = steps[i];
      if (step && step.mediaUrl) {
        this.preloadUrl(step.mediaUrl);
      }
    }
  }
}
