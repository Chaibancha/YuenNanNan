/**
 * ============================================================================
 * WorkoutEngine.js (v2.0 — Medical-Grade 16 Muscle Anatomy & Multi-Modality Engine)
 * ระบบฐานข้อมูลท่าออกกำลังกายทางการแพทย์ 16 มัดกล้ามเนื้อ 11 อุปกรณ์
 * อัลกอริทึมจัดตารางฝึก HIIT / REHIT / Cardio / Yoga / 7-Minute Scientific Circuit
 * พร้อม EMG Muscle Activation %, JEFIT Recovery Status, Sworkit Low-Impact Filter
 * และข้อมูล Kinematics สำหรับเรนเดอร์วิดีโอวนลูปครบทุกท่า
 * ============================================================================
 */

export const MUSCLE_GROUPS = [
  {
    id: 'neck_scm',
    nameTh: 'คอและก้านคอ (Neck & SCM)',
    nameEn: 'Sternocleidomastoid & Splenius Capitis',
    viewSide: 'both',
    color: '#f59e0b',
    antagonist: 'rhomboids_erector',
    synergists: ['shoulders_posterior_traps'],
    fiberDirection: 'oblique-inferior-anterior',
    originInsertion: 'Manubrium & Clavicle → Mastoid Process',
    description: 'กล้ามเนื้อคอและก้านคอ พยุงศีรษะ หมุนคอ และลดอาการตึงบ่าออฟฟิศซินโดรม'
  },
  {
    id: 'shoulders_anterior_lateral',
    nameTh: 'หัวไหล่หน้าและข้าง (Front & Side Delts)',
    nameEn: 'Anterior & Lateral Deltoids',
    viewSide: 'front',
    color: '#eab308',
    antagonist: 'lats_teres',
    synergists: ['chest_upper_Mid', 'triceps'],
    fiberDirection: 'multipennate-convergent',
    originInsertion: 'Lateral Clavicle & Acromion → Deltoid Tuberosity',
    description: 'หัวไหล่ส่วนหน้าและด้านข้าง สร้างความกว้างของช่วงไหล่และแรงดันเหนือศีรษะ'
  },
  {
    id: 'shoulders_posterior_traps',
    nameTh: 'ไหล่หลังและบ่า (Rear Delts & Traps)',
    nameEn: 'Posterior Deltoid & Upper/Mid Trapezius',
    viewSide: 'back',
    color: '#fb923c',
    antagonist: 'chest_upper_Mid',
    synergists: ['rhomboids_erector', 'lats_teres'],
    fiberDirection: 'transverse-convergent',
    originInsertion: 'Occiput & Spinous Processes → Scapular Spine & Acromion',
    description: 'บ่าและหัวไหล่ด้านหลัง ป้องกันไหล่ห่อค่อมและเพิ่มความสมดุลข้อไหล่'
  },
  {
    id: 'chest_upper_Mid',
    nameTh: 'อกบนและอกหลัก (Chest Pectorals)',
    nameEn: 'Pectoralis Major (Clavicular & Sternal Heads)',
    viewSide: 'front',
    color: '#f97316',
    antagonist: 'rhomboids_erector',
    synergists: ['shoulders_anterior_lateral', 'triceps'],
    fiberDirection: 'fan-shaped-convergent',
    originInsertion: 'Clavicle & Sternum → Intertubercular Sulcus of Humerus',
    description: 'กล้ามเนื้อหน้าอกส่วนบนและกลาง ทำหน้าที่ผลัก ดัน และหุบต้นแขนเข้าหากลางลำตัว'
  },
  {
    id: 'serratus_obliques',
    nameTh: 'ฟันเลื่อยและท้องข้าง (Serratus & Obliques)',
    nameEn: 'Serratus Anterior & External/Internal Obliques',
    viewSide: 'front',
    color: '#22c55e',
    antagonist: 'rhomboids_erector',
    synergists: ['abs_rectus', 'chest_upper_Mid'],
    fiberDirection: 'diagonal-interdigitating',
    originInsertion: 'Ribs 1–12 → Medial Scapula & Iliac Crest',
    description: 'กล้ามเนื้อข้างลำตัวรูปฟันเลื่อยและเอวด้านข้าง ควบคุมการบิดลำตัวและเสถียรภาพสะบัก'
  },
  {
    id: 'abs_rectus',
    nameTh: 'หน้าท้องซิกแพค บน-ล่าง (Rectus Abdominis)',
    nameEn: 'Rectus Abdominis & Linea Alba',
    viewSide: 'front',
    color: '#10b981',
    antagonist: 'rhomboids_erector',
    synergists: ['serratus_obliques', 'hip_adductors'],
    fiberDirection: 'vertical-segmented',
    originInsertion: 'Pubic Crest → Costal Cartilages 5–7 & Xiphoid',
    description: 'กล้ามเนื้อหน้าท้องส่วนหน้าตั้งแต่ใต้ซี่โครงถึงหน้าท้องล่าง สร้างแกนกลางลำตัวที่แข็งแกร่ง'
  },
  {
    id: 'lats_teres',
    nameTh: 'ปีกหลังส่วนกว้าง (Lats & Teres Major)',
    nameEn: 'Latissimus Dorsi & Teres Major',
    viewSide: 'back',
    color: '#3b82f6',
    antagonist: 'shoulders_anterior_lateral',
    synergists: ['biceps_brachialis', 'rhomboids_erector'],
    fiberDirection: 'broad-fan-diagonal',
    originInsertion: 'Thoracolumbar Fascia & Iliac Crest → Humerus Groove',
    description: 'กล้ามเนื้อปีกหลังขนาดใหญ่ สร้างทรง V-Taper และส่งแรงดึงเข้าหาลำตัว'
  },
  {
    id: 'rhomboids_erector',
    nameTh: 'สะบักและหลังล่าง (Rhomboids & Erector Spinae)',
    nameEn: 'Rhomboids Major/Minor & Erector Spinae',
    viewSide: 'back',
    color: '#2563eb',
    antagonist: 'abs_rectus',
    synergists: ['lats_teres', 'glutes'],
    fiberDirection: 'oblique-and-longitudinal',
    originInsertion: 'Vertebral Column & Sacrum → Medial Scapula & Ribs',
    description: 'กล้ามเนื้อร่องหลัง สะบัก และแนวกระดูกสันหลังส่วนล่าง พยุงบุคลิกภาพให้ตั้งตรง'
  },
  {
    id: 'biceps_brachialis',
    nameTh: 'หน้าแขนและบราคิอาลิส (Biceps & Brachialis)',
    nameEn: 'Biceps Brachii & Brachialis',
    viewSide: 'front',
    color: '#ec4899',
    antagonist: 'triceps',
    synergists: ['forearms', 'lats_teres'],
    fiberDirection: 'fusiform-longitudinal',
    originInsertion: 'Scapula Glenoid & Coracoid → Radial Tuberosity',
    description: 'กล้ามเนื้อต้นแขนด้านหน้าทั้งมัดนอก-ใน ทำหน้าที่งอข้อศอกและหมุนหงายข้อมือ'
  },
  {
    id: 'triceps',
    nameTh: 'หลังแขน 3 หัว (Triceps Brachii)',
    nameEn: 'Triceps Brachii (Long, Lateral & Medial Heads)',
    viewSide: 'back',
    color: '#a855f7',
    antagonist: 'biceps_brachialis',
    synergists: ['chest_upper_Mid', 'shoulders_anterior_lateral'],
    fiberDirection: 'horseshoe-pennate',
    originInsertion: 'Infraglenoid & Posterior Humerus → Olecranon of Ulna',
    description: 'กล้ามเนื้อหลังแขนทั้ง 3 หัว คิดเป็น 2 ใน 3 ของขนาดต้นแขน ทำหน้าที่เหยียดข้อศอก'
  },
  {
    id: 'forearms',
    nameTh: 'แขนท่อนล่างและข้อมือ (Forearms & Grip)',
    nameEn: 'Brachioradialis, Wrist Flexors & Extensors',
    viewSide: 'both',
    color: '#d946ef',
    antagonist: 'biceps_brachialis',
    synergists: ['biceps_brachialis', 'lats_teres'],
    fiberDirection: 'longitudinal-parallel',
    originInsertion: 'Distal Humerus Epicondyles → Metacarpals & Phalanges',
    description: 'กล้ามเนื้อปลายแขนและแรงบีบมือ เพิ่มความมั่นคงเวลาจับดัมเบล บาร์เบล และโหนบาร์'
  },
  {
    id: 'glutes',
    nameTh: 'สะโพกและก้น (Glutes Max & Medius)',
    nameEn: 'Gluteus Maximus & Gluteus Medius',
    viewSide: 'back',
    color: '#f43f5e',
    antagonist: 'hip_adductors',
    synergists: ['hamstrings', 'quads'],
    fiberDirection: 'thick-oblique-fascicles',
    originInsertion: 'Posterior Ilium & Sacrum → Gluteal Tuberosity & IT Band',
    description: 'มัดกล้ามเนื้อที่ใหญ่ที่สุดของร่างกาย ต้นกำเนิดพลังการเหยียดสะโพก กระโดด และทรงตัว'
  },
  {
    id: 'hip_adductors',
    nameTh: 'ข้อพับสะโพกและต้นขาใน (Hip Flexors & Adductors)',
    nameEn: 'Iliopsoas, TFL, Gracilis & Adductor Magnus',
    viewSide: 'front',
    color: '#fb7185',
    antagonist: 'glutes',
    synergists: ['abs_rectus', 'quads'],
    fiberDirection: 'oblique-medial-convergence',
    originInsertion: 'Lumbar Spine & Pubis → Lesser Trochanter & Linea Aspera',
    description: 'กล้ามเนื้อข้อพับสะโพกและต้นขาด้านใน ช่วยยกเข่า เสถียรภาพเชิงกราน และความยืดหยุ่น'
  },
  {
    id: 'quads',
    nameTh: 'ต้นขาด้านหน้า 4 มัด (Quadriceps)',
    nameEn: 'Rectus Femoris & Vastus (Lateralis/Medialis/Intermedius)',
    viewSide: 'front',
    color: '#06b6d4',
    antagonist: 'hamstrings',
    synergists: ['glutes', 'calves_tibialis'],
    fiberDirection: 'bipennate-vertical',
    originInsertion: 'AIIS & Femur Shaft → Patellar Tendon & Tibial Tuberosity',
    description: 'กล้ามเนื้อต้นขาด้านหน้าทั้ง 4 มัด เหยียดเข่า รับแรงกระแทก และพยุงข้อเข่า'
  },
  {
    id: 'hamstrings',
    nameTh: 'ต้นขาด้านหลัง (Hamstrings)',
    nameEn: 'Biceps Femoris, Semitendinosus & Semimembranosus',
    viewSide: 'back',
    color: '#6366f1',
    antagonist: 'quads',
    synergists: ['glutes', 'calves_tibialis'],
    fiberDirection: 'fusiform-posterior',
    originInsertion: 'Ischial Tuberosity → Fibular Head & Proximal Tibia',
    description: 'กล้ามเนื้อด้านหลังต้นขา ทำหน้าที่พับเข่า ชะลอการวิ่ง และส่งแรงเหยียดสะโพก'
  },
  {
    id: 'calves_tibialis',
    nameTh: 'น่องและหน้าแข้ง (Calves & Tibialis)',
    nameEn: 'Gastrocnemius, Soleus & Tibialis Anterior',
    viewSide: 'both',
    color: '#14b8a6',
    antagonist: 'quads',
    synergists: ['hamstrings', 'quads'],
    fiberDirection: 'bipennate-achilles-insertion',
    originInsertion: 'Femoral Condyles & Tibia → Calcaneal (Achilles) Tendon',
    description: 'กล้ามเนื้อน่องและหน้าแข้ง ส่งแรงสปริงข้อเท้า กระโดดเชือก และป้องกันข้อเท้าพลิก'
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
  { id: 'bike', nameTh: 'จักรยานปั่นในร่ม (Indoor Bike)', nameEn: 'Stationary Air/Spin Bike', icon: '🚴' },
  { id: 'yoga_mat', nameTh: 'เสื่อโยคะ (Yoga Mat)', nameEn: 'High-Grip Eco Yoga Mat', icon: '🧘' },
  { id: 'yoga_block', nameTh: 'บล็อกโยคะ/สายรัด (Yoga Block)', nameEn: 'Cork Yoga Block & Stretch Strap', icon: '🧱' }
];

export const TRAINING_MODALITIES = {
  HIIT: {
    id: 'HIIT',
    nameTh: 'HIIT (ฝึกหนักสลับพักสั้น)',
    nameEn: 'High-Intensity Interval Training',
    hrZone: 'Zone 4–5 (85–95% HRmax)',
    hrTargetBpm: [152, 178],
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
    hrZone: 'Supramaximal Sprint (100% All-Out) + Zone 1–2 Recovery',
    hrTargetBpm: [118, 185],
    energySystem: 'Phosphagen (ATP-PCr) & Rapid Glycogen Depletion',
    protocolsByLevel: {
      beginner: { sprintSec: 15, recoverySec: 135, ratioLabel: '15s Sprint : 135s ฟื้นตัว' },
      intermediate: { sprintSec: 20, recoverySec: 130, ratioLabel: '20s Sprint : 130s ฟื้นตัว' },
      advanced: { sprintSec: 20, recoverySec: 100, ratioLabel: '20s Sprint : 100s ฟื้นตัว' }
    },
    description: 'โปรโตคอลวิทยาศาสตร์การกีฬา (Vollaard Protocol) สปรินต์ขีดสุด 15-20 วินาที สลับเคลื่อนไหวเบา 2 นาที กระตุ้น AMPK/PGC-1α สูงสุด'
  },
  CARDIO: {
    id: 'CARDIO',
    nameTh: 'Cardio (แอโรบิกต่อเนื่อง โซน 2-3)',
    nameEn: 'Aerobic Endurance & PHA Circuit',
    hrZone: 'Zone 2–3 (65–80% HRmax)',
    hrTargetBpm: [122, 148],
    energySystem: 'Aerobic Oxidative Phosphorylation',
    protocolsByLevel: {
      beginner: { workSec: 45, restSec: 15, ratioLabel: '45s ต่อเนื่อง : 15s เปลี่ยนท่า' },
      intermediate: { workSec: 50, restSec: 10, ratioLabel: '50s ต่อเนื่อง : 10s เปลี่ยนท่า' },
      advanced: { workSec: 55, restSec: 5, ratioLabel: '55s ต่อเนื่อง : 5s เปลี่ยนท่า' }
    },
    description: 'ฝึกความทนทานของระบบหัวใจและหลอดเลือดด้วยจังหวะคงที่ สลับส่วนบน-ล่าง (PHA) เน้นดึงไขมันมาใช้เป็นพลังงานหลัก'
  },
  YOGA: {
    id: 'YOGA',
    nameTh: 'Yoga Flow & Mobility (โยคะ + ลมหายใจ)',
    nameEn: 'Yoga Studio Vinyasa, Power Yoga & Pranayama',
    hrZone: 'Zone 1–2 Parasympathetic Flow (55–70% HRmax)',
    hrTargetBpm: [92, 124],
    energySystem: 'Aerobic Recovery, Fascia Release & Vagal Tone',
    protocolsByLevel: {
      beginner: { workSec: 45, restSec: 15, breathRatio: '4s เข้า : 2s ค้าง : 4s ออก', ratioLabel: 'Yin/Hatha 45s : 15s' },
      intermediate: { workSec: 50, restSec: 10, breathRatio: '4s เข้า : 2s ค้าง : 6s ออก', ratioLabel: 'Vinyasa 50s : 10s' },
      advanced: { workSec: 55, restSec: 5, breathRatio: '5s เข้า : 3s ค้าง : 7s ออก', ratioLabel: 'Power Yoga 55s : 5s' }
    },
    description: 'ผสานท่าอาสนะโยคะคลายพังผืด เพิ่มความยืดหยุ่นข้อต่อและแกนกลางลำตัว พร้อมวงกลมนำจังหวะลมหายใจ (Pranayama Breath Pacer)'
  },
  '7MIN': {
    id: '7MIN',
    nameTh: '7-Minute Scientific Circuit (ACSM)',
    nameEn: '7-Minute High-Intensity Scientific Circuit',
    hrZone: 'Zone 4–5 Metabolic Circuit (80–92% HRmax)',
    hrTargetBpm: [145, 174],
    energySystem: 'Combined Anaerobic & Aerobic Conditioning',
    protocolsByLevel: {
      beginner: { workSec: 25, restSec: 10, ratioLabel: '25s ฝึก : 10s เปลี่ยนท่า' },
      intermediate: { workSec: 30, restSec: 10, ratioLabel: '30s ฝึก : 10s เปลี่ยนท่า' },
      advanced: { workSec: 32, restSec: 8, ratioLabel: '32s ฝึก : 8s เปลี่ยนท่า' }
    },
    description: 'ได้แรงบันดาลใจจากงานวิจัย 7-Minute Workout (ACSM) จัดลำดับท่าสลับบน-ล่าง-แกนกลางต่อเนื่องในเวลาเร่งด่วน'
  }
};

/**
 * ฐานข้อมูลท่าออกกำลังกายและโยคะครบทั้ง 16 มัดกล้ามเนื้อและ 11 อุปกรณ์
 * ทุกท่ามี videoKinematics สำหรับเรนเดอร์วิดีโอวนลูป (Looping Motion Stream)
 */
export const EXERCISE_DATABASE = [
  // ==================== 1. NECK & SCM ====================
  {
    id: 'ex_neck_isometric_mobility',
    nameEn: 'Cervical Mobility & Isometric Resistance Hold',
    nameTh: 'บริหารกล้ามเนื้อคอและต้านแรงไอโซเมตริก',
    primaryMuscle: 'neck_scm',
    secondaryMuscles: ['shoulders_posterior_traps'],
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['YOGA', 'CARDIO', 'HIIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { neck_scm: 86, shoulders_posterior_traps: 42 },
    videoKinematics: { poseType: 'yoga_seated_stretch', tempoSec: 2.6, equipRender: 'bodyweight', rangeDeg: 35 },
    formCues: 'ยืดแนวกระดูกสันหลังตั้งตรง กดไหล่ลงห่างใบหู เอียงและต้านแรงฝ่ามือเบาๆ ทีละข้างอย่างนุ่มนวล',
    cameraAngle: 'front close-medium studio framing',
    mediaUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_band_neck_retraction',
    nameEn: 'Resistance Band Cervical Chin Tuck',
    nameTh: 'ดึงยางยืดต้านแรงเสริมกล้ามเนื้อก้านคอและแก้คอยื่น',
    primaryMuscle: 'neck_scm',
    secondaryMuscles: ['rhomboids_erector', 'shoulders_posterior_traps'],
    equipment: ['band'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['CARDIO', 'HIIT', 'YOGA'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { neck_scm: 84, rhomboids_erector: 48 },
    videoKinematics: { poseType: 'band_pull_apart', tempoSec: 2.0, equipRender: 'band', rangeDeg: 40 },
    formCues: 'คล้องยางยืดด้านหลังศีรษะ กดคางเข้าหาลำคอเป็นแนวตรงต้านแรงยางยืดอย่างควบคุม',
    cameraAngle: 'side 45-degree studio shot',
    mediaUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 2. SHOULDERS ANTERIOR & LATERAL ====================
  {
    id: 'ex_db_push_press',
    nameEn: 'Dumbbell Explosive Push Press',
    nameTh: 'ดัมเบลพุชเพรสดันไหล่ระเบิดพลัง',
    primaryMuscle: 'shoulders_anterior_lateral',
    secondaryMuscles: ['triceps', 'quads', 'abs_rectus'],
    equipment: ['dumbbell', 'kettlebell'],
    difficulty: 'intermediate',
    lowImpact: true,
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO', '7MIN'],
    rehitRole: 'SPRINT',
    emgActivation: { shoulders_anterior_lateral: 91, triceps: 62, quads: 48 },
    videoKinematics: { poseType: 'overhead_press', tempoSec: 1.3, equipRender: 'dumbbell', rangeDeg: 110 },
    formCues: 'ย่อเข่าเล็กน้อยแล้วส่งแรงจากสะโพกและขาทะยานดันดัมเบลขึ้นเหนือศีรษะจนสุดแขน',
    cameraAngle: 'front 3/4 full-body studio angle',
    mediaUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_pike_shoulder_pushup',
    nameEn: 'Pike Handstand Shoulder Press',
    nameTh: 'วิดพื้นยกสะโพกเน้นหัวไหล่หน้าและข้าง',
    primaryMuscle: 'shoulders_anterior_lateral',
    secondaryMuscles: ['triceps', 'chest_upper_Mid', 'abs_rectus'],
    equipment: ['bodyweight', 'bench', 'yoga_mat'],
    difficulty: 'intermediate',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'YOGA', '7MIN'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { shoulders_anterior_lateral: 88, triceps: 68, abs_rectus: 45 },
    videoKinematics: { poseType: 'pike_pushup', tempoSec: 1.6, equipRender: 'bodyweight', rangeDeg: 75 },
    formCues: 'ยกสะโพกสูงเป็นรูปตัว V คว่ำ งอศอกลดศีรษะลงด้านหน้าฝ่ามือแล้วออกแรงหัวไหล่ดันตัวกลับ',
    cameraAngle: 'side profile studio shot',
    mediaUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 3. SHOULDERS POSTERIOR & TRAPS ====================
  {
    id: 'ex_kb_high_pull_traps',
    nameEn: 'Kettlebell & Barbell Upright High-Pull',
    nameTh: 'เคตเทิลเบล/บาร์เบลไฮพูลสร้างบ่าและไหล่หลัง',
    primaryMuscle: 'shoulders_posterior_traps',
    secondaryMuscles: ['shoulders_anterior_lateral', 'forearms', 'glutes'],
    equipment: ['kettlebell', 'barbell', 'dumbbell'],
    difficulty: 'intermediate',
    lowImpact: true,
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    emgActivation: { shoulders_posterior_traps: 89, forearms: 58, glutes: 52 },
    videoKinematics: { poseType: 'kettlebell_swing', tempoSec: 1.25, equipRender: 'kettlebell', rangeDeg: 95 },
    formCues: 'ส่งแรงจากสะโพก ดึงข้อศอกนำขึ้นสูงกว่าระดับข้อมือ บีบสะบักและหัวไหล่ด้านหลัง',
    cameraAngle: 'front-side 30-degree wide shot',
    mediaUrl: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_band_face_pull',
    nameEn: 'Resistance Band Face Pull & Rear Delt Fly',
    nameTh: 'ดึงยางยืดเข้าหาใบหน้าเปิดไหล่หลังและบ่า',
    primaryMuscle: 'shoulders_posterior_traps',
    secondaryMuscles: ['rhomboids_erector', 'biceps_brachialis'],
    equipment: ['band', 'bodyweight'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['CARDIO', 'HIIT', 'YOGA', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { shoulders_posterior_traps: 87, rhomboids_erector: 76 },
    videoKinematics: { poseType: 'band_pull_apart', tempoSec: 1.8, equipRender: 'band', rangeDeg: 90 },
    formCues: 'ดึงยางยืดเข้าหาระดับหน้าผากพร้อมหมุนเปิดหัวไหล่ออกด้านนอก บีบสะบักค้าง 1 วินาที',
    cameraAngle: 'rear-side 45-degree angle',
    mediaUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 4. CHEST UPPER & MID ====================
  {
    id: 'ex_pushup_explosive',
    nameEn: 'Explosive Plyo & Tempo Push-Up',
    nameTh: 'วิดพื้นระเบิดพลังดันตัว (Push-Up)',
    primaryMuscle: 'chest_upper_Mid',
    secondaryMuscles: ['triceps', 'shoulders_anterior_lateral', 'abs_rectus'],
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'intermediate',
    lowImpact: false,
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO', '7MIN'],
    rehitRole: 'SPRINT',
    emgActivation: { chest_upper_Mid: 90, triceps: 66, abs_rectus: 52 },
    videoKinematics: { poseType: 'pushup', tempoSec: 1.3, equipRender: 'bodyweight', rangeDeg: 85 },
    formCues: 'เกร็งแกนกลางลำตัวเป็นเส้นตรง ลดอกลงเกือบแตะพื้นแล้วออกแรงผลักพื้นอย่างรวดเร็ว',
    cameraAngle: '3/4 front-diagonal low angle',
    mediaUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_db_bench_press',
    nameEn: 'Dumbbell & Barbell Chest Bench Press',
    nameTh: 'ดัมเบล/บาร์เบลเบนช์เพรสสร้างกล้ามเนื้ออก',
    primaryMuscle: 'chest_upper_Mid',
    secondaryMuscles: ['triceps', 'shoulders_anterior_lateral'],
    equipment: ['dumbbell', 'barbell', 'bench'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'SPRINT',
    emgActivation: { chest_upper_Mid: 94, triceps: 64, shoulders_anterior_lateral: 55 },
    videoKinematics: { poseType: 'bench_press', tempoSec: 1.5, equipRender: 'bench_barbell', rangeDeg: 90 },
    formCues: 'บีบสะบักติดม้านั่ง กดไหล่ลง ดันน้ำหนักขึ้นเหนืออกกลางโดยทำมุมข้อศอก 45 องศา',
    cameraAngle: 'side-diagonal studio perspective',
    mediaUrl: 'https://images.unsplash.com/photo-1534368786749-b63e05c90863?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 5. SERRATUS & OBLIQUES ====================
  {
    id: 'ex_side_plank_rotation',
    nameEn: 'Side Plank Thread-the-Needle & Rotation',
    nameTh: 'แพลงก์ตะแคงสอดแขนบิดเอวกระชับฟันเลื่อยและท้องข้าง',
    primaryMuscle: 'serratus_obliques',
    secondaryMuscles: ['abs_rectus', 'shoulders_anterior_lateral'],
    equipment: ['bodyweight', 'yoga_mat', 'dumbbell'],
    difficulty: 'intermediate',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'YOGA', '7MIN'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { serratus_obliques: 92, abs_rectus: 68, shoulders_anterior_lateral: 54 },
    videoKinematics: { poseType: 'russian_twist', tempoSec: 1.5, equipRender: 'yoga_mat', rangeDeg: 80 },
    formCues: 'ยกสะโพกสูงในท่า Side Plank ดันพื้นผ่านสะบักเพื่อกระตุ้นฟันเลื่อย แล้วสอดแขนหมุนลำตัวช้าๆ',
    cameraAngle: 'front-diagonal low angle',
    mediaUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_russian_twist_power',
    nameEn: 'Rotational Russian Twist Power',
    nameTh: 'บิดลำตัวรัสเซียนทวิสต์สร้างร่องท้องข้าง',
    primaryMuscle: 'serratus_obliques',
    secondaryMuscles: ['abs_rectus', 'hip_adductors'],
    equipment: ['bodyweight', 'dumbbell', 'kettlebell', 'yoga_mat'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT', '7MIN'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { serratus_obliques: 88, abs_rectus: 72 },
    videoKinematics: { poseType: 'russian_twist', tempoSec: 1.1, equipRender: 'kettlebell', rangeDeg: 95 },
    formCues: 'นั่งเอนหลัง 45 องศา ยกเท้าพ้นพื้นเล็กน้อย บิดหัวไหล่และลำตัวซ้าย-ขวาโดยใช้กล้ามเนื้อท้องข้างควบคุม',
    cameraAngle: 'front-high 35-degree angle',
    mediaUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 6. ABS RECTUS ====================
  {
    id: 'ex_mountain_climber_sprint',
    nameEn: 'All-Out Mountain Climber Sprint',
    nameTh: 'ปีนเขาความเร็วสูงสุดกระชับซิกแพคและแกนกลาง',
    primaryMuscle: 'abs_rectus',
    secondaryMuscles: ['hip_adductors', 'shoulders_anterior_lateral', 'quads'],
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    lowImpact: false,
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO', '7MIN'],
    rehitRole: 'SPRINT',
    emgActivation: { abs_rectus: 89, hip_adductors: 64, quads: 58 },
    videoKinematics: { poseType: 'mountain_climber', tempoSec: 0.75, equipRender: 'yoga_mat', rangeDeg: 70 },
    formCues: 'ตั้งท่าแพลงก์แขนตึง ซอยเข่าพุ่งเข้าหาอกด้วยความเร็วสูงสุดโดยสะโพกไม่โด่ง',
    cameraAngle: 'side profile floor-level dynamic shot',
    mediaUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_yoga_navasana_boat',
    nameEn: 'Navasana (Yoga Boat Pose) & Core Pulse',
    nameTh: 'ท่าเรือโยคะ (Navasana) เกร็งหน้าท้องลึก',
    primaryMuscle: 'abs_rectus',
    secondaryMuscles: ['hip_adductors', 'rhomboids_erector'],
    equipment: ['yoga_mat', 'yoga_block', 'bodyweight'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['YOGA', 'CARDIO', 'HIIT', '7MIN'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { abs_rectus: 91, hip_adductors: 74, rhomboids_erector: 48 },
    videoKinematics: { poseType: 'yoga_boat', tempoSec: 2.8, equipRender: 'yoga_block', rangeDeg: 45 },
    formCues: 'นั่งทรงตัวบนกระดูกก้น ยกขาทำมุม 45 องศา เปิดอกยืดหลังตรง บีบบล็อกโยคะระหว่างเข่า หายใจลึกสม่ำเสมอ',
    cameraAngle: 'side profile yoga studio shot',
    mediaUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 7. LATS & TERES ====================
  {
    id: 'ex_pullup_strict',
    nameEn: 'Tactical Pronated Pull-Up',
    nameTh: 'โหนบาร์ดึงข้อสร้างปีกหลัง V-Taper',
    primaryMuscle: 'lats_teres',
    secondaryMuscles: ['biceps_brachialis', 'forearms', 'rhomboids_erector'],
    equipment: ['pullup_bar'],
    difficulty: 'advanced',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'SPRINT',
    emgActivation: { lats_teres: 95, biceps_brachialis: 70, forearms: 65 },
    videoKinematics: { poseType: 'pullup', tempoSec: 1.7, equipRender: 'pullup_bar', rangeDeg: 110 },
    formCues: 'จับบาร์กว้างกว่าไหล่ กดสะบักลงก่อนดึงอกเข้าหาบาร์ ค่อยๆ ผ่อนตัวลงจนแขนตึง',
    cameraAngle: 'rear 3/4 view highlighting latissimus dorsi',
    mediaUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_db_renegade_row',
    nameEn: 'Dumbbell & Barbell Power Row',
    nameTh: 'ดึงดัมเบล/บาร์เบลสร้างปีกหลังหนา',
    primaryMuscle: 'lats_teres',
    secondaryMuscles: ['rhomboids_erector', 'biceps_brachialis', 'abs_rectus'],
    equipment: ['dumbbell', 'barbell', 'kettlebell', 'band'],
    difficulty: 'intermediate',
    lowImpact: true,
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    emgActivation: { lats_teres: 90, rhomboids_erector: 76, biceps_brachialis: 60 },
    videoKinematics: { poseType: 'bent_row', tempoSec: 1.4, equipRender: 'dumbbell', rangeDeg: 85 },
    formCues: 'ล็อกแกนกลางลำตัว ดึงศอกกวาดเฉียดข้างลำตัวเข้าหาสะโพก พร้อมบีบปีกหลัง',
    cameraAngle: 'low 45-degree studio angle',
    mediaUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 8. RHOMBOIDS & ERECTOR SPINAE ====================
  {
    id: 'ex_yoga_cobra_locust',
    nameEn: 'Bhujangasana (Cobra) to Locust Back Flow',
    nameTh: 'ท่าคอบร้าและตั๊กแตนโยคะฟื้นฟูหลังและสะบัก',
    primaryMuscle: 'rhomboids_erector',
    secondaryMuscles: ['glutes', 'shoulders_posterior_traps', 'neck_scm'],
    equipment: ['bodyweight', 'yoga_mat', 'yoga_block'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['YOGA', 'CARDIO', 'HIIT', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { rhomboids_erector: 88, glutes: 56, shoulders_posterior_traps: 52 },
    videoKinematics: { poseType: 'yoga_cobra', tempoSec: 2.6, equipRender: 'yoga_mat', rangeDeg: 55 },
    formCues: 'นอนคว่ำบนเสื่อ บีบสะบักเข้าหากัน ยกหน้าอกขึ้นด้วยกล้ามเนื้อหลังโดยไม่กดเอวล่างเกินไป',
    cameraAngle: 'high-angle 45-degree rear-side view',
    mediaUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 9. BICEPS & BRACHIALIS ====================
  {
    id: 'ex_db_hammer_curl_tempo',
    nameEn: 'Alternating Power Hammer Curl',
    nameTh: 'ดัมเบล/ยางยืดแฮมเมอร์เคิร์ลปั้นหน้าแขนและบราคิอาลิส',
    primaryMuscle: 'biceps_brachialis',
    secondaryMuscles: ['forearms', 'shoulders_anterior_lateral'],
    equipment: ['dumbbell', 'band', 'barbell', 'kettlebell'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { biceps_brachialis: 92, forearms: 68 },
    videoKinematics: { poseType: 'bicep_curl', tempoSec: 1.3, equipRender: 'dumbbell', rangeDeg: 115 },
    formCues: 'ล็อกข้อศอกข้างลำตัว พับแขนยกน้ำหนักขึ้นระดับไหล่โดยไม่เหวี่ยงหลัง ควบคุมจังหวะผ่อนลง',
    cameraAngle: 'close-medium 3/4 angle',
    mediaUrl: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_chinup_underhand',
    nameEn: 'Supinated Grip Chin-Up',
    nameTh: 'โหนบาร์หงายมือเน้นหน้าแขนและหลัง',
    primaryMuscle: 'biceps_brachialis',
    secondaryMuscles: ['lats_teres', 'forearms', 'abs_rectus'],
    equipment: ['pullup_bar'],
    difficulty: 'intermediate',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    emgActivation: { biceps_brachialis: 91, lats_teres: 82, forearms: 64 },
    videoKinematics: { poseType: 'pullup', tempoSec: 1.6, equipRender: 'pullup_bar', rangeDeg: 110 },
    formCues: 'จับบาร์หงายมือกว้างเท่าช่วงไหล่ ดึงตัวขึ้นจนคางพ้นบาร์ โฟกัสการบีบหน้าแขนเต็มที่',
    cameraAngle: 'front-low 30-degree dynamic view',
    mediaUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 10. TRICEPS ====================
  {
    id: 'ex_bench_tricep_dips',
    nameEn: 'Bench & Floor Tricep Dips',
    nameTh: 'ดิปส์หลังแขน 3 หัวกับม้านั่ง/พื้น',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['shoulders_anterior_lateral', 'chest_upper_Mid'],
    equipment: ['bench', 'bodyweight', 'yoga_block'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT', '7MIN'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { triceps: 90, shoulders_anterior_lateral: 52 },
    videoKinematics: { poseType: 'tricep_dip', tempoSec: 1.4, equipRender: 'bench', rangeDeg: 85 },
    formCues: 'วางมือบนขอบม้านั่งหรือบล็อกโยคะ หุบศอกชิดลำตัว ลดสะโพกลงจนต้นแขนขนานพื้นแล้วดันขึ้นสุด',
    cameraAngle: 'side-rear 45-degree angle',
    mediaUrl: 'https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 11. FOREARMS ====================
  {
    id: 'ex_farmer_grip_wrist_curl',
    nameEn: 'Explosive Wrist Curl & Grip Hold',
    nameTh: 'บริหารแขนท่อนล่างและกำลังบีบมือ (Forearm Power)',
    primaryMuscle: 'forearms',
    secondaryMuscles: ['biceps_brachialis', 'shoulders_posterior_traps'],
    equipment: ['dumbbell', 'kettlebell', 'barbell', 'pullup_bar', 'jump_rope'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { forearms: 93, biceps_brachialis: 50 },
    videoKinematics: { poseType: 'bicep_curl', tempoSec: 1.2, equipRender: 'kettlebell', rangeDeg: 70 },
    formCues: 'กำด้ามอุปกรณ์ให้แน่น กระดกข้อมือขึ้นลงหรือหมุนข้อมือด้วยจังหวะสม่ำเสมอ รักษาหัวไหล่กดต่ำ',
    cameraAngle: 'close-medium 3/4 studio angle',
    mediaUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 12. GLUTES ====================
  {
    id: 'ex_kb_russian_swing',
    nameEn: 'Explosive Kettlebell Hip-Hinge Swing',
    nameTh: 'สวิงเคตเทิลเบลระเบิดพลังสะโพกและก้น',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'rhomboids_erector', 'abs_rectus'],
    equipment: ['kettlebell', 'dumbbell'],
    difficulty: 'intermediate',
    lowImpact: true,
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    emgActivation: { glutes: 93, hamstrings: 78, rhomboids_erector: 58 },
    videoKinematics: { poseType: 'kettlebell_swing', tempoSec: 1.2, equipRender: 'kettlebell', rangeDeg: 90 },
    formCues: 'พับสะโพกไปด้านหลังแล้วดีดสะโพกไปข้างหน้าอย่างรุนแรงเพื่อส่งน้ำหนักขึ้นระดับอก',
    cameraAngle: '90-degree lateral profile',
    mediaUrl: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_yoga_bridge_thrust',
    nameEn: 'Setu Bandhasana (Yoga Bridge) & Hip Thrust',
    nameTh: 'ท่าสะพานโค้งฮิปทรัสต์ปั้นก้นกลมกระชับ',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'abs_rectus', 'rhomboids_erector'],
    equipment: ['bench', 'barbell', 'dumbbell', 'bodyweight', 'band', 'yoga_mat', 'yoga_block'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT', 'YOGA'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { glutes: 91, hamstrings: 72, abs_rectus: 45 },
    videoKinematics: { poseType: 'hip_thrust', tempoSec: 1.7, equipRender: 'yoga_mat', rangeDeg: 65 },
    formCues: 'กดส้นเท้าดันสะโพกขึ้นจนแนวลำตัวตรง บีบก้นค้างไว้ด้านบน 1-2 วินาทีแล้วผ่อนลงช้าๆ',
    cameraAngle: 'side 3/4 low angle',
    mediaUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 13. HIP FLEXORS & ADDUCTORS ====================
  {
    id: 'ex_yoga_pigeon_warrior_lunge',
    nameEn: 'Anjaneyasana Crescent Lunge & Hip Opener',
    nameTh: 'ท่าโยคะเปิดข้อพับสะโพกและต้นขาด้านใน (Crescent Lunge)',
    primaryMuscle: 'hip_adductors',
    secondaryMuscles: ['quads', 'glutes', 'abs_rectus'],
    equipment: ['yoga_mat', 'yoga_block', 'bodyweight', 'band'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['YOGA', 'CARDIO', 'REHIT', 'HIIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { hip_adductors: 89, quads: 62, glutes: 54 },
    videoKinematics: { poseType: 'yoga_warrior', tempoSec: 2.8, equipRender: 'yoga_block', rangeDeg: 85 },
    formCues: 'ก้าวยาวเปิดข้อพับสะโพกหน้า-หลัง วางมือประคองบล็อกโยคะหรือชูแขนเหนือศีรษะ หายใจลึกเข้า-ออก',
    cameraAngle: 'side-diagonal yoga studio view',
    mediaUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_sumo_squat_adductor',
    nameEn: 'Sumo Squat & Cossack Adductor Pulse',
    nameTh: 'ซูโม่สควอทเปิดสะโพกกระชับต้นขาด้านใน',
    primaryMuscle: 'hip_adductors',
    secondaryMuscles: ['quads', 'glutes'],
    equipment: ['bodyweight', 'kettlebell', 'dumbbell'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'YOGA', '7MIN'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { hip_adductors: 87, quads: 74, glutes: 70 },
    videoKinematics: { poseType: 'squat', tempoSec: 1.5, equipRender: 'kettlebell', rangeDeg: 95 },
    formCues: 'ยืนกางขากว้างกว่าหัวไหล่ เปิดปลายเท้าออก 45 องศา ย่อตัวลงตรงๆ แล้วบีบต้นขาด้านในดันขึ้น',
    cameraAngle: 'front full-body view',
    mediaUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 14. QUADRICEPS ====================
  {
    id: 'ex_db_thruster_explode',
    nameEn: 'Full-Depth Dumbbell Squat Thruster',
    nameTh: 'ดัมเบลสควอททรัสเตอร์ระเบิดพลังขาหน้าและทั่วร่าง',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'shoulders_anterior_lateral', 'abs_rectus'],
    equipment: ['dumbbell', 'kettlebell', 'barbell'],
    difficulty: 'intermediate',
    lowImpact: true,
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    emgActivation: { quads: 92, glutes: 80, shoulders_anterior_lateral: 76 },
    videoKinematics: { poseType: 'thruster', tempoSec: 1.35, equipRender: 'dumbbell', rangeDeg: 105 },
    formCues: 'ถือดัมเบลระดับไหล่ ย่อสควอทลึกแล้วส่งแรงถีบส้นเท้าพุ่งขึ้นพร้อมดันดัมเบลเหนือศีรษะในจังหวะเดียว',
    cameraAngle: 'front 3/4 wide angle',
    mediaUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_indoor_bike_wingate',
    nameEn: 'Indoor Bike Wingate All-Out Sprint',
    nameTh: 'ปั่นจักรยานสปรินต์ความเร็วสูงสุด (Wingate REHIT)',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'calves_tibialis'],
    equipment: ['bike'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['REHIT', 'HIIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    emgActivation: { quads: 94, glutes: 72, calves_tibialis: 58 },
    videoKinematics: { poseType: 'indoor_bike', tempoSec: 0.65, equipRender: 'bike', rangeDeg: 360 },
    formCues: 'ปรับแรงต้านปานกลาง-สูง แล้วอัดสปรินต์ด้วยรอบขาสูงสุด 100% All-Out Effort ตลอดช่วงสปรินต์',
    cameraAngle: 'side-front 45-degree action shot',
    mediaUrl: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_yoga_utkatasana_chair',
    nameEn: 'Utkatasana (Yoga Chair Pose) & Wall Sit',
    nameTh: 'ท่าเก้าอี้โยคะ/วอลล์ซิท (Chair Pose) สร้างความอึดต้นขาหน้า',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'abs_rectus', 'shoulders_anterior_lateral'],
    equipment: ['bodyweight', 'yoga_mat', 'yoga_block', 'bench'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['YOGA', '7MIN', 'CARDIO', 'HIIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { quads: 89, glutes: 66, abs_rectus: 52 },
    videoKinematics: { poseType: 'squat', tempoSec: 2.6, equipRender: 'yoga_mat', rangeDeg: 80 },
    formCues: 'ทิ้งน้ำหนักลงส้นเท้า ย่อสะโพกเหมือนนั่งเก้าอี้ ชูแขนยืดแนวกระดูกสันหลังและหายใจลึก',
    cameraAngle: 'side 45-degree angle',
    mediaUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_jump_squat_plyo',
    nameEn: 'Plyometric Jump Squat',
    nameTh: 'สควอทจัมพ์กระโดดระเบิดพลังขาหน้า',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'calves_tibialis'],
    equipment: ['bodyweight', 'band'],
    difficulty: 'intermediate',
    lowImpact: false,
    supportedModalities: ['HIIT', 'REHIT', '7MIN'],
    rehitRole: 'SPRINT',
    emgActivation: { quads: 93, glutes: 82, calves_tibialis: 70 },
    videoKinematics: { poseType: 'jump_squat', tempoSec: 1.1, equipRender: 'bodyweight', rangeDeg: 100 },
    formCues: 'ย่อสะโพกขนานพื้น ดีดตัวกระโดดขึ้นในแนวดิ่งแล้วลงพื้นอย่างนุ่มนวลด้วยปลายเท้าต่อด้วยส้นเท้า',
    cameraAngle: 'low front-diagonal capture',
    mediaUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 15. HAMSTRINGS ====================
  {
    id: 'ex_rdl_hinge',
    nameEn: 'Romanian Deadlift (RDL) Tempo Hinge',
    nameTh: 'โรมาเนียนเดดลิฟต์สร้างกล้ามเนื้อต้นขาด้านหลังและก้น',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'rhomboids_erector', 'forearms'],
    equipment: ['dumbbell', 'barbell', 'kettlebell', 'band'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { hamstrings: 94, glutes: 84, rhomboids_erector: 62 },
    videoKinematics: { poseType: 'rdl_hinge', tempoSec: 1.8, equipRender: 'barbell', rangeDeg: 85 },
    formCues: 'ปลดล็อกเข่าเล็กน้อย ดันสะโพกไปด้านหลังให้แนวสันหลังตรงจนรู้สึกตึงต้นขาหลังแล้วบีบก้นดันกลับ',
    cameraAngle: '90-degree lateral profile',
    mediaUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_yoga_downward_dog_pedal',
    nameEn: 'Adho Mukha Svanasana (Downward Dog Pedal)',
    nameTh: 'ท่าสุนัขก้มหน้าย่ำส้นเท้ายืดต้นขาด้านหลังและน่อง',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['calves_tibialis', 'shoulders_anterior_lateral', 'lats_teres'],
    equipment: ['yoga_mat', 'yoga_block', 'bodyweight'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['YOGA', 'CARDIO', 'REHIT'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { hamstrings: 84, calves_tibialis: 76, shoulders_anterior_lateral: 58 },
    videoKinematics: { poseType: 'yoga_downward_dog', tempoSec: 2.5, equipRender: 'yoga_mat', rangeDeg: 65 },
    formCues: 'กางนิ้วมือกดเสื่อ ยกก้นกบชี้เพดานเป็นรูปตัว V คว่ำ ย่ำส้นเท้าสลับซ้าย-ขวาเพื่อยืดแฮมสตริงและน่อง',
    cameraAngle: 'side profile yoga studio shot',
    mediaUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80'
  },

  // ==================== 16. CALVES & TIBIALIS ====================
  {
    id: 'ex_speed_jump_rope',
    nameEn: 'High-Cadence Speed Jump Rope',
    nameTh: 'กระโดดเชือกความเร็วสูงกระตุ้นน่องและระบบหัวใจ',
    primaryMuscle: 'calves_tibialis',
    secondaryMuscles: ['forearms', 'shoulders_anterior_lateral', 'quads'],
    equipment: ['jump_rope'],
    difficulty: 'beginner',
    lowImpact: false,
    supportedModalities: ['HIIT', 'REHIT', 'CARDIO'],
    rehitRole: 'SPRINT',
    emgActivation: { calves_tibialis: 92, forearms: 58, quads: 50 },
    videoKinematics: { poseType: 'jump_rope', tempoSec: 0.55, equipRender: 'jump_rope', rangeDeg: 360 },
    formCues: 'ใช้ข้อมือหมุนเชือก กระโดดเบาๆ ด้วยจมูกเท้าสูงจากพื้นเพียง 1-2 นิ้ว รักษาจังหวะต่อเนื่อง',
    cameraAngle: 'front full-body high-shutter studio shot',
    mediaUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ex_plyo_calf_raises',
    nameEn: 'Explosive Calf Raise & Ankle Spring',
    nameTh: 'เขย่งปลายเท้าสลับสปริงข้อเท้าสร้างน่องคมชัด',
    primaryMuscle: 'calves_tibialis',
    secondaryMuscles: ['quads', 'abs_rectus'],
    equipment: ['bodyweight', 'dumbbell', 'yoga_block', 'bench'],
    difficulty: 'beginner',
    lowImpact: true,
    supportedModalities: ['HIIT', 'CARDIO', 'REHIT', 'YOGA'],
    rehitRole: 'ACTIVE_RECOVERY',
    emgActivation: { calves_tibialis: 90, quads: 40 },
    videoKinematics: { poseType: 'calf_raise', tempoSec: 1.1, equipRender: 'dumbbell', rangeDeg: 45 },
    formCues: 'ดันจมูกเท้าเขย่งขึ้นสูงสุดจนน่องเกร็งเต็มที่ ค้างไว้ 1 วินาทีแล้วค่อยๆ ลดส้นเท้าลงช้าๆ',
    cameraAngle: 'low rear-side angle',
    mediaUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80'
  }
];

export const WARMUP_EXERCISES = [
  {
    id: 'warmup_dynamic_thoracic',
    nameEn: 'Dynamic Full-Body Mobility & Arm Circles',
    nameTh: 'วอร์มอัพเปิดข้อไหล่ หมุนลำตัว และกระตุ้นการไหลเวียนเลือด',
    primaryMuscle: 'shoulders_anterior_lateral',
    secondaryMuscles: ['chest_upper_Mid', 'rhomboids_erector', 'serratus_obliques'],
    equipment: ['bodyweight'],
    lowImpact: true,
    emgActivation: { shoulders_anterior_lateral: 60, serratus_obliques: 50 },
    videoKinematics: { poseType: 'yoga_warrior', tempoSec: 2.2, equipRender: 'bodyweight', rangeDeg: 75 },
    formCues: 'หมุนหัวไหล่กว้างๆ สลับบิดลำตัวซ้าย-ขวา หายใจเข้าออกลึกๆ เพื่อเพิ่มอุณหภูมิกล้ามเนื้อและน้ำเลี้ยงข้อต่อ',
    mediaUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'warmup_hip_opener_pulse',
    nameEn: 'World’s Greatest Stretch & Squat Opener',
    nameTh: 'วอร์มอัพยืดข้อพับสะโพก ข้อเท้า และปลุกกล้ามเนื้อขา',
    primaryMuscle: 'hip_adductors',
    secondaryMuscles: ['quads', 'glutes', 'hamstrings'],
    equipment: ['bodyweight'],
    lowImpact: true,
    emgActivation: { hip_adductors: 65, quads: 58, glutes: 55 },
    videoKinematics: { poseType: 'squat', tempoSec: 2.0, equipRender: 'bodyweight', rangeDeg: 80 },
    formCues: 'ก้าวยาวเปิดสะโพก บิดอกขึ้นหาเพดาน สลับกับย่อสควอทช้าๆ เพื่อเตรียมพร้อมข้อเข่าและข้อสะโพก',
    mediaUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80'
  }
];

export const COOLDOWN_EXERCISES = [
  {
    id: 'cooldown_parasympathetic_stretch',
    nameEn: 'Savasana & Parasympathetic Deep Breath Stretch',
    nameTh: 'คูลดาวน์ยืดเหยียดกล้ามเนื้อและฝึกหายใจลดอัตราการเต้นหัวใจ',
    primaryMuscle: 'rhomboids_erector',
    secondaryMuscles: ['hamstrings', 'neck_scm', 'abs_rectus'],
    equipment: ['bodyweight', 'yoga_mat'],
    lowImpact: true,
    emgActivation: { rhomboids_erector: 35, hamstrings: 40 },
    videoKinematics: { poseType: 'yoga_downward_dog', tempoSec: 3.4, equipRender: 'yoga_mat', rangeDeg: 40 },
    formCues: 'ค้างท่ายืดกล้ามเนื้อที่ใช้งานหลัก พร้อมสูดหายใจเข้าลึก 4 วินาที ผ่อนออกยาว 6 วินาที เพื่อเร่งการฟื้นตัว',
    mediaUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80'
  }
];

/**
 * สร้าง AI Prompt สำหรับโมเดลสร้างภาพและวิดีโอวนลูปสมจริง
 */
export function buildRealisticMediaPrompt(exercise, options = {}) {
  const { fitnessLevel = 'intermediate', modality = 'HIIT', selectedEquipment = ['bodyweight'] } = options;
  const primaryObj = MUSCLE_GROUPS.find(m => m.id === exercise.primaryMuscle) || MUSCLE_GROUPS[0];
  const matchedEquip = (exercise.equipment || ['bodyweight'])
    .filter(eq => selectedEquipment.includes(eq))
    .map(eq => EQUIPMENT_CATALOG.find(item => item.id === eq)?.nameEn || eq);

  const equipText = matchedEquip.length > 0 ? matchedEquip.join(' and ') : 'Bodyweight only';
  const imagePrompt = [
    `Medical-grade photorealistic fitness studio render of an athletic model (${fitnessLevel}) performing "${exercise.nameEn}".`,
    `Equipment: ${equipText}.`,
    `Muscle fiber focus: striated ${primaryObj.nameEn} (${primaryObj.originInsertion}) visibly engaged.`,
    `Form: ${exercise.formCues}. Camera: ${exercise.cameraAngle || '3/4 dynamic studio view'}, 8K UHD.`
  ].join(' ');

  const motionLoopPrompt = [
    `Seamless 4-second 60fps looping video of "${exercise.nameEn}" with ${equipText}.`,
    `Tempo: ${exercise.videoKinematics?.tempoSec || 1.5}s per repetition (${modality} protocol), infinite loop zero-seam transition.`
  ].join(' ');

  return {
    exerciseId: exercise.id,
    imagePrompt,
    motionLoopPrompt,
    negativePrompt: 'deformed anatomy, floating weights, bad posture, blurry motion, watermark'
  };
}

/**
 * อัลกอริทึมจัดตารางฝึกตามกรอบเวลาที่แม่นยำ 100% รองรับ HIIT / REHIT / CARDIO / YOGA / 7MIN
 * และรองรับ Low-Impact Filter แบบ Sworkit
 */
export function generateTimeBoundedSchedule({
  selectedMuscles = ['chest_upper_Mid', 'lats_teres', 'quads', 'abs_rectus'],
  isFullBody = false,
  selectedEquipment = ['bodyweight', 'dumbbell'],
  modality = 'HIIT',
  durationMinutes = 20,
  fitnessLevel = 'intermediate',
  lowImpactOnly = false
}) {
  const effectiveDuration = modality === '7MIN' ? 7 : Number(durationMinutes);
  const totalSeconds = Math.max(420, Math.round(effectiveDuration * 60));

  const activeMuscles = isFullBody || selectedMuscles.length === 0
    ? MUSCLE_GROUPS.map(m => m.id)
    : selectedMuscles;

  const activeEquip = selectedEquipment.length === 0 ? ['bodyweight'] : selectedEquipment;

  let candidatePool = EXERCISE_DATABASE.filter(ex => {
    const matchMuscle = activeMuscles.includes(ex.primaryMuscle);
    const matchEquip = ex.equipment.some(eq => activeEquip.includes(eq));
    const matchImpact = !lowImpactOnly || ex.lowImpact;
    const matchModality = modality === 'YOGA'
      ? ex.supportedModalities.includes('YOGA')
      : true;
    return matchMuscle && matchEquip && matchImpact && matchModality;
  });

  // Fallback หากกรองแล้วมีน้อยเกินไป
  if (candidatePool.length < 3) {
    const relaxPool = EXERCISE_DATABASE.filter(ex => {
      const matchMuscle = activeMuscles.includes(ex.primaryMuscle);
      const matchImpact = !lowImpactOnly || ex.lowImpact;
      const matchEquip = ex.equipment.includes('bodyweight') || ex.equipment.includes('yoga_mat') || ex.equipment.some(eq => activeEquip.includes(eq));
      return matchMuscle && matchImpact && matchEquip;
    });
    candidatePool = [...new Map([...candidatePool, ...relaxPool].map(item => [item.id, item])).values()];
  }
  if (candidatePool.length < 2) {
    candidatePool = EXERCISE_DATABASE.filter(ex => !lowImpactOnly || ex.lowImpact);
  }

  const orderedExercises = orderExercisesScientifically(candidatePool, activeMuscles);

  const steps = [];
  let stepCounter = 1;

  // กำหนด Warm-up & Cool-down ตามความยาวรวม (รองรับ 7 นาทีจนถึง 45 นาที)
  const warmupTotalSec = totalSeconds <= 450 ? 40 : totalSeconds <= 600 ? 80 : totalSeconds <= 1200 ? 120 : 180;
  const cooldownTotalSec = totalSeconds <= 450 ? 40 : totalSeconds <= 600 ? 60 : totalSeconds <= 1200 ? 90 : 120;
  const mainBlockSec = totalSeconds - warmupTotalSec - cooldownTotalSec;

  const wu1Sec = Math.floor(warmupTotalSec / 2);
  const wu2Sec = warmupTotalSec - wu1Sec;
  [
    { ex: WARMUP_EXERCISES[0], dur: wu1Sec, label: modality === 'YOGA' ? 'PRANAYAMA WARM-UP 1/2' : 'WARM-UP 1/2' },
    { ex: WARMUP_EXERCISES[1], dur: wu2Sec, label: modality === 'YOGA' ? 'MOBILITY FLOW 2/2' : 'WARM-UP 2/2' }
  ].forEach(item => {
    steps.push(createStepObject(stepCounter++, 'WARMUP', item.ex, item.dur, item.label, {
      fitnessLevel,
      modality,
      selectedEquipment: activeEquip
    }));
  });

  if (modality === 'REHIT') {
    const proto = TRAINING_MODALITIES.REHIT.protocolsByLevel[fitnessLevel] || TRAINING_MODALITIES.REHIT.protocolsByLevel.intermediate;
    const sprintPool = orderedExercises.filter(ex => ex.rehitRole === 'SPRINT');
    const usableSprintPool = sprintPool.length > 0 ? sprintPool : orderedExercises;

    const cycleSec = proto.sprintSec + proto.recoverySec;
    const numSprints = Math.max(2, Math.floor(mainBlockSec / cycleSec));
    let remainingMainSec = mainBlockSec;

    const primerSec = Math.min(45, Math.floor(remainingMainSec * 0.14));
    if (primerSec >= 20 && remainingMainSec - primerSec >= numSprints * proto.sprintSec + 40) {
      const primerEx = orderedExercises[0];
      steps.push(
        createStepObject(stepCounter++, 'WORK', {
          ...primerEx,
          nameTh: `เตรียมพร้อมระบบประสาท (50% Effort): ${primerEx.nameTh}`,
          formCues: 'เคลื่อนไหวจังหวะสบายๆ เพื่อกระตุ้นการไหลเวียนเลือดก่อนเข้าสู่ช่วงสปรินต์ขีดสุด'
        }, primerSec, 'REHIT PRIMER', { fitnessLevel, modality, selectedEquipment: activeEquip })
      );
      remainingMainSec -= primerSec;
    }

    for (let s = 0; s < numSprints && remainingMainSec > 0; s++) {
      const sprintEx = usableSprintPool[s % usableSprintPool.length];
      const currentSprintSec = Math.min(proto.sprintSec, remainingMainSec);
      steps.push(
        createStepObject(
          stepCounter++,
          'SPRINT',
          {
            ...sprintEx,
            nameTh: `⚡ ALL-OUT SPRINT #${s + 1}: ${sprintEx.nameTh}`,
            formCues: `ระเบิดแรงและความเร็วสูงสุด 100% ทุกวินาที! ${sprintEx.formCues}`
          },
          currentSprintSec,
          `SPRINT ${s + 1}/${numSprints}`,
          { fitnessLevel, modality, selectedEquipment: activeEquip }
        )
      );
      remainingMainSec -= currentSprintSec;

      if (remainingMainSec > 0) {
        const sprintsLeftAfter = numSprints - (s + 1);
        const recoverySec = sprintsLeftAfter > 0
          ? Math.min(proto.recoverySec, Math.max(10, remainingMainSec - sprintsLeftAfter * proto.sprintSec))
          : remainingMainSec;

        if (recoverySec > 0) {
          const recEx = orderedExercises[(s + 1) % orderedExercises.length];
          steps.push(
            createStepObject(
              stepCounter++,
              'REST',
              {
                ...recEx,
                nameEn: `Active Recovery Zone 1 Flow`,
                nameTh: `ฟื้นตัวแบบเคลื่อนไหวเบา (Active Recovery หลังสปรินต์ #${s + 1})`,
                formCues: 'เคลื่อนไหวช้าๆ หายใจเข้าทางจมูกยาวๆ เพื่อฟื้นฟู ATP-PCr และระบายกรดแลคติก'
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
    const modConfig = TRAINING_MODALITIES[modality] || TRAINING_MODALITIES.HIIT;
    const proto = modConfig.protocolsByLevel[fitnessLevel] || modConfig.protocolsByLevel.intermediate;
    const cycleSec = proto.workSec + proto.restSec;
    const totalIntervals = Math.max(1, Math.floor(mainBlockSec / cycleSec));
    const exercisesPerRound = Math.min(orderedExercises.length, Math.max(3, Math.min(8, totalIntervals)));
    let remainingMainSec = mainBlockSec;

    for (let i = 0; i < totalIntervals && remainingMainSec > 0; i++) {
      const ex = orderedExercises[i % orderedExercises.length];
      const roundNum = Math.floor(i / exercisesPerRound) + 1;
      const totalRounds = Math.ceil(totalIntervals / exercisesPerRound);
      const workSec = Math.min(proto.workSec, remainingMainSec);

      const roundLabel = modality === 'YOGA'
        ? `ASANA FLOW ${i + 1}/${totalIntervals}`
        : modality === '7MIN'
        ? `7-MIN STATION ${i + 1}/${totalIntervals}`
        : `รอบที่ ${roundNum}/${totalRounds} • ท่า ${(i % exercisesPerRound) + 1}`;

      steps.push(
        createStepObject(stepCounter++, 'WORK', ex, workSec, roundLabel, {
          fitnessLevel,
          modality,
          selectedEquipment: activeEquip
        })
      );
      remainingMainSec -= workSec;

      if (remainingMainSec > 0) {
        const isLast = i === totalIntervals - 1;
        const restSec = isLast ? remainingMainSec : Math.min(proto.restSec, remainingMainSec);
        const nextEx = orderedExercises[(i + 1) % orderedExercises.length];
        steps.push(
          createStepObject(
            stepCounter++,
            'REST',
            {
              ...nextEx,
              id: `rest_${stepCounter}`,
              nameEn: modality === 'YOGA' ? `Mindful Transition → ${nextEx.nameEn}` : `Rest & Prepare → ${nextEx.nameEn}`,
              nameTh: modality === 'YOGA'
                ? `ปรับลมหายใจเข้าสู่ท่า: ${nextEx.nameTh}`
                : `พัก & เตรียมท่าถัดไป: ${nextEx.nameTh}`,
              formCues: modality === 'YOGA'
                ? `หายใจออกยาว ผ่อนคลายหัวไหล่ แล้วค่อยๆ จัดตำแหน่งร่างกายสำหรับ ${nextEx.nameTh}`
                : `สูดหายใจเข้าลึกทางจมูก เตรียมพร้อมสำหรับท่า ${nextEx.nameTh}`
            },
            restSec,
            modality === 'YOGA' ? `BREATH ${i + 1}` : `REST ${i + 1}`,
            { fitnessLevel, modality, selectedEquipment: activeEquip }
          )
        );
        remainingMainSec -= restSec;
      }
    }
  }

  const currentSumSec = steps.reduce((acc, s) => acc + s.duration, 0);
  const exactCooldownSec = Math.max(20, totalSeconds - currentSumSec);

  steps.push(
    createStepObject(
      stepCounter++,
      'COOLDOWN',
      COOLDOWN_EXERCISES[0],
      exactCooldownSec,
      modality === 'YOGA' ? 'SAVASANA & RECOVERY' : 'COOL-DOWN & RECOVERY',
      { fitnessLevel, modality, selectedEquipment: activeEquip }
    )
  );

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
    durationMinutes: effectiveDuration,
    lowImpactOnly,
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
  while (added && result.length < 32) {
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
    type: phaseType,
    exerciseId: exercise.id,
    nameTh: exercise.nameTh,
    nameEn: exercise.nameEn,
    primaryMuscle: exercise.primaryMuscle,
    primaryMuscleTh: muscleMeta.nameTh,
    primaryMuscleColor: muscleMeta.color,
    secondaryMuscles: exercise.secondaryMuscles || [],
    equipment: exercise.equipment || ['bodyweight'],
    lowImpact: Boolean(exercise.lowImpact),
    emgActivation: exercise.emgActivation || { [exercise.primaryMuscle]: 85 },
    videoKinematics: exercise.videoKinematics || { poseType: 'squat', tempoSec: 1.5, equipRender: 'bodyweight', rangeDeg: 80 },
    duration: durationSec,
    roundLabel,
    formCues: exercise.formCues,
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

  const metMap = { REHIT: 11.5, HIIT: 10.2, '7MIN': 9.8, CARDIO: 7.8, YOGA: 4.2 };
  const metValue = metMap[modality] || 8.5;
  const estimatedKcal = Math.round((metValue * 3.5 * 70 / 200) * (totalSec / 60));

  return {
    totalSteps: steps.length,
    workIntervals: workSteps.length,
    warmupSec,
    workSec,
    restSec,
    cooldownSec,
    totalSec,
    estimatedKcal,
    burnRatePerMin: Number(((estimatedKcal / Math.max(1, totalSec / 60))).toFixed(1))
  };
}

export function swapExerciseInSchedule(schedule, stepIndex) {
  const targetStep = schedule.steps[stepIndex];
  if (!targetStep || targetStep.type === 'REST' || targetStep.type === 'WARMUP' || targetStep.type === 'COOLDOWN') {
    return schedule;
  }

  const sameMusclePool = EXERCISE_DATABASE.filter(
    ex =>
      ex.id !== targetStep.exerciseId &&
      ex.primaryMuscle === targetStep.primaryMuscle &&
      (!schedule.lowImpactOnly || ex.lowImpact) &&
      ex.equipment.some(eq => schedule.selectedEquipment.includes(eq))
  );

  const broaderPool = EXERCISE_DATABASE.filter(
    ex =>
      ex.id !== targetStep.exerciseId &&
      (!schedule.lowImpactOnly || ex.lowImpact) &&
      schedule.selectedMuscles.includes(ex.primaryMuscle) &&
      ex.equipment.some(eq => schedule.selectedEquipment.includes(eq))
  );

  const fallbackPool = EXERCISE_DATABASE.filter(ex => ex.id !== targetStep.exerciseId);
  const pool = sameMusclePool.length > 0 ? sameMusclePool : broaderPool.length > 0 ? broaderPool : fallbackPool;
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

  return {
    ...schedule,
    steps: schedule.steps.map((st, idx) =>
      idx === stepIndex ? { ...newStep, index: st.index, startTimeSec: st.startTimeSec, endTimeSec: st.endTimeSec } : st
    )
  };
}

/**
 * ระบบ JEFIT Recovery & History Tracker (LocalStorage)
 */
const STORAGE_KEY = 'kinetic_3d_workout_history_v2';

export function loadWorkoutStats() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { totalSessions: 0, totalMinutes: 0, totalKcal: 0, muscleFatigue: {} };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { totalSessions: 0, totalMinutes: 0, totalKcal: 0, muscleFatigue: {} };
    return JSON.parse(raw);
  } catch {
    return { totalSessions: 0, totalMinutes: 0, totalKcal: 0, muscleFatigue: {} };
  }
}

export function logCompletedWorkoutSession(schedule) {
  const current = loadWorkoutStats();
  const nextFatigue = { ...(current.muscleFatigue || {}) };
  const nowTs = Date.now();

  (schedule.selectedMuscles || []).forEach(mId => {
    const prevScore = nextFatigue[mId]?.score || 100;
    nextFatigue[mId] = {
      score: Math.max(35, prevScore - (schedule.modality === 'YOGA' ? 5 : 28)),
      lastTrainedAt: nowTs
    };
  });

  const updated = {
    totalSessions: (current.totalSessions || 0) + 1,
    totalMinutes: (current.totalMinutes || 0) + (schedule.durationMinutes || 0),
    totalKcal: (current.totalKcal || 0) + (schedule.summary?.estimatedKcal || 0),
    lastModality: schedule.modality,
    muscleFatigue: nextFatigue
  };

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}
  return updated;
}

export function getMuscleRecoveryPercent(stats, muscleId) {
  const entry = stats?.muscleFatigue?.[muscleId];
  if (!entry) return 100;
  const hoursElapsed = (Date.now() - (entry.lastTrainedAt || Date.now())) / 3600000;
  const recovered = Math.min(100, Math.round(entry.score + hoursElapsed * 2.5));
  return recovered;
}

/**
 * ระบบ Pre-load และ Pre-warm สื่อท่าถัดไปล่วงหน้า (Zero-Latency Media Preloader)
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
      if (typeof Image === 'undefined') return resolve(url);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(url);
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
