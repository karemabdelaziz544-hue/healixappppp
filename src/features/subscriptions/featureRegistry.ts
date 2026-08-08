export type FeatureCategory = 'ai' | 'medical' | 'doctor' | 'nutrition' | 'workout' | 'family' | 'settings';

export type FeatureId =
  // AI Features
  | 'AI_CHAT'
  | 'AI_DASHBOARD'
  | 'AI_INBODY_ANALYSIS'
  | 'AI_LAB_ANALYSIS'
  // Doctor & Medical Features
  | 'DOCTOR_CHAT'
  | 'DOCTOR_NOTES'
  // Plans & Workouts
  | 'NUTRITION_PLAN'
  | 'WORKOUT_PLAN'
  // Family Features
  | 'SUB_ACCOUNTS'
  | 'FAMILY_SHARING'
  // Free / Core Tracker Features
  | 'WATER_TRACKING'
  | 'MEAL_LOGGING'
  | 'WORKOUT_LOGGING'
  | 'WEIGHT_LOGGING'
  | 'MEDICAL_PROFILE'
  | 'LIFESTYLE_PROFILE'
  | 'INBODY_UPLOAD'
  | 'DOCS_UPLOAD';

export type SubscriptionPlanTier = 'FREE' | 'INDIVIDUAL' | 'FAMILY' | 'ENTERPRISE';
export type AppRole = 'client' | 'doctor' | 'admin';

export interface FeatureMetadata {
  id: FeatureId;
  title: string;
  description: string;
  icon: string;
  category: FeatureCategory;
  requiredPlan: SubscriptionPlanTier[];
  allowedRoles: AppRole[];
  version: number;
  remoteControlled: boolean;
  comingSoon?: boolean;
  route?: string;
  benefits?: string[];
  ctaText?: string;
  badgeText?: string;
}

export const FEATURE_REGISTRY: Record<FeatureId, FeatureMetadata> = {
  // ─── AI Features (Heli Platform) ───
  AI_CHAT: {
    id: 'AI_CHAT',
    title: 'تحدث مع هيلي (Heli)',
    description: 'تحدث مع رفيقك الصحي الذكي في أي وقت واحصل على دعم واستشارات مخصصة.',
    icon: 'sparkles',
    category: 'ai',
    requiredPlan: ['INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client', 'doctor'],
    version: 1,
    remoteControlled: true,
    route: '/healix-ai',
    ctaText: 'احصل على هيلي الآن 🔒',
    badgeText: 'هيلي الذكي ✨',
    benefits: ['استشارات فورية مخصصة لحالتك الصحية', 'شرح خطتك الغذائية وتمارينك الرياضية', 'توفر وتفاعل مستمر على مدار 24/7'],
  },
  AI_DASHBOARD: {
    id: 'AI_DASHBOARD',
    title: 'ملاحظات هيلي اليومية',
    description: 'توصيات وتنبيهات مخصصة يومياً من هيلي بناءً على مؤشراتك ومستوى التزامك.',
    icon: 'analytics',
    category: 'ai',
    requiredPlan: ['INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: true,
    ctaText: 'احصل على هيلي الآن 🔒',
    badgeText: 'هيلي الذكي ✨',
    benefits: ['تحليل الالتزام اليومي التلقائي', 'نصائح مشجعة للتغذية والنوم والنشاط'],
  },
  AI_INBODY_ANALYSIS: {
    id: 'AI_INBODY_ANALYSIS',
    title: 'تحليل InBody بواسطة هيلي',
    description: 'تحليل وقراءة كاملة لنتائج الـ InBody بواسطة هيلي مع تقرير مبسط لتطور جسمك.',
    icon: 'scan',
    category: 'ai',
    requiredPlan: ['INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client', 'doctor'],
    version: 1,
    remoteControlled: true,
    ctaText: 'احصل على هيلي الآن 🔒',
    badgeText: 'تحليل هيلي 📈',
    benefits: ['استخراج نسبة الدهون والعضلات آلياً', 'تقرير تقييمي شامل لتطور مكونات الجسم'],
  },
  AI_LAB_ANALYSIS: {
    id: 'AI_LAB_ANALYSIS',
    title: 'محلل التحاليل بواسطة هيلي',
    description: 'قراءة نتائج التحاليل المختبرية والروشتات بأسلوب مبسط من هيلي.',
    icon: 'flask',
    category: 'ai',
    requiredPlan: ['INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client', 'doctor'],
    version: 1,
    remoteControlled: true,
    comingSoon: true,
    ctaText: 'احصل على هيلي الآن 🔒',
    benefits: ['تبسيط مصطلحات التحاليل الطبية', 'تنبيهات تلقائية للقيم الحرجة'],
  },

  // ─── Doctor & Medical Features ───
  DOCTOR_CHAT: {
    id: 'DOCTOR_CHAT',
    title: 'التواصل المباشر مع الطبيب',
    description: 'تواصل مباشرة مع طبيبك المعالج للحصول على الاستشارات والمتابعة الدورية.',
    icon: 'chatbubbles',
    category: 'doctor',
    requiredPlan: ['INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client', 'doctor'],
    version: 1,
    remoteControlled: true,
    route: '/chat',
    ctaText: 'اشترك في الباقة الفردية 🔒',
    badgeText: 'متابعة طبية 👨‍⚕️',
    benefits: ['متابعة شخصية مستمرة من طبيبك المعالج', 'إرسال واستلام الرسائل والمرفقات والملفات'],
  },
  DOCTOR_NOTES: {
    id: 'DOCTOR_NOTES',
    title: 'ملاحظات وتوصيات الطبيب',
    description: 'شاهد التقارير والملاحظات الدورية المسجلة من طبيبك المعالج.',
    icon: 'journal',
    category: 'doctor',
    requiredPlan: ['INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: true,
    ctaText: 'اشترك في الباقة الفردية 🔒',
    badgeText: 'تقرير طبي 📝',
    benefits: ['سجل طبي دائم للملاحظات والاستشارات', 'توصيات دقيقة مخصصة لحالتك الصحية'],
  },

  // ─── Plans & Workouts ───
  NUTRITION_PLAN: {
    id: 'NUTRITION_PLAN',
    title: 'الخطة الغذائية المخصصة',
    description: 'شاهد النظام الغذائي والوجبات المحددة السعرات التي أعدها لك طبيبك.',
    icon: 'restaurant',
    category: 'nutrition',
    requiredPlan: ['INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 2,
    remoteControlled: true,
    route: '/plan-details',
    ctaText: 'اشترك في الباقة الفردية 🔒',
    badgeText: 'نظام غذائي 🥗',
    benefits: ['جدول وجبات يومي تفصيلي بالجرعات', 'بدائل غذائية مرنة تناسب رغباتك'],
  },
  WORKOUT_PLAN: {
    id: 'WORKOUT_PLAN',
    title: 'البرنامج التدريبي المخصص',
    description: 'شاهد برنامج التمارين الرياضية المصمم خصيصاً لهدفك ومستواك البدني.',
    icon: 'barbell',
    category: 'workout',
    requiredPlan: ['INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: true,
    route: '/workouts',
    ctaText: 'اشترك في الباقة الفردية 🔒',
    badgeText: 'تمارين مخصصة 🏋️',
    benefits: ['فيديوهات توضيحية لشرح أداء التمارين', 'تتبع المجموعات والأوزان وأوقات الراحة'],
  },

  // ─── Family Features ───
  SUB_ACCOUNTS: {
    id: 'SUB_ACCOUNTS',
    title: 'تفعيل الحسابات الفرعية العائلية',
    description: 'تفعيل ومتابعة أفراد العائلة طباً ورياضياً تحت اشتراك عائلي واحد.',
    icon: 'people',
    category: 'family',
    requiredPlan: ['FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: true,
    route: '/family',
    ctaText: 'اشترك في الباقة العائلية 🔒',
    badgeText: 'باقة عائلية 👨‍👩‍👧',
    benefits: ['حسابات مستقلة ومفعلة لجميع أفراد الأسرة', 'متابعة طبية وتدريبية شاملة لكل فرد'],
  },
  FAMILY_SHARING: {
    id: 'FAMILY_SHARING',
    title: 'مشاركة البيانات العائلية',
    description: 'مشاركة التقارير والمستندات الطبية بأمان بين أفراد العائلة.',
    icon: 'share-social',
    category: 'family',
    requiredPlan: ['FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: true,
    ctaText: 'اشترك في الباقة العائلية 🔒',
    benefits: ['مشاركة محمية للتحاليل والملفات الطبية', 'صلاحيات وصول سهلة ومرنة'],
  },

  // ─── Free / Core Tracker Features ───
  WATER_TRACKING: {
    id: 'WATER_TRACKING',
    title: 'متبع شرب المياه',
    description: 'تسجيل وتتبع كمية المياه اليومية.',
    icon: 'water',
    category: 'settings',
    requiredPlan: ['FREE', 'INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: false,
  },
  MEAL_LOGGING: {
    id: 'MEAL_LOGGING',
    title: 'تسجيل الوجبات اليومية',
    description: 'تسجيل وتأكيد تناول وجباتك اليومية.',
    icon: 'checkmark-circle',
    category: 'nutrition',
    requiredPlan: ['FREE', 'INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: false,
  },
  WORKOUT_LOGGING: {
    id: 'WORKOUT_LOGGING',
    title: 'تسجيل التمارين',
    description: 'تسجيل أداء التمارين الرياضية.',
    icon: 'fitness',
    category: 'workout',
    requiredPlan: ['FREE', 'INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: false,
  },
  WEIGHT_LOGGING: {
    id: 'WEIGHT_LOGGING',
    title: 'تسجيل الوزن',
    description: 'تتبع تغير الوزن الدوري.',
    icon: 'scale',
    category: 'medical',
    requiredPlan: ['FREE', 'INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: false,
  },
  MEDICAL_PROFILE: {
    id: 'MEDICAL_PROFILE',
    title: 'الملف الطبي الأساسي',
    description: 'حفظ واستعراض الأمراض والحساسية والأدوية.',
    icon: 'medical',
    category: 'medical',
    requiredPlan: ['FREE', 'INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client', 'doctor'],
    version: 1,
    remoteControlled: false,
  },
  LIFESTYLE_PROFILE: {
    id: 'LIFESTYLE_PROFILE',
    title: 'ملف نمط الحياة والعادات',
    description: 'حفظ واستعراض عادات الأكل والأنشطة والنوم.',
    icon: 'cafe',
    category: 'medical',
    requiredPlan: ['FREE', 'INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client', 'doctor'],
    version: 1,
    remoteControlled: false,
  },
  INBODY_UPLOAD: {
    id: 'INBODY_UPLOAD',
    title: 'حفظ قياسات InBody',
    description: 'إدخال قياسات الـ InBody وحفظ السجل.',
    icon: 'body',
    category: 'medical',
    requiredPlan: ['FREE', 'INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: false,
  },
  DOCS_UPLOAD: {
    id: 'DOCS_UPLOAD',
    title: 'مكتبة التحاليل والمستندات',
    description: 'رفع واستعراض المستندات والروشتات الطبية.',
    icon: 'document-attach',
    category: 'medical',
    requiredPlan: ['FREE', 'INDIVIDUAL', 'FAMILY', 'ENTERPRISE'],
    allowedRoles: ['client'],
    version: 1,
    remoteControlled: false,
  },
};
