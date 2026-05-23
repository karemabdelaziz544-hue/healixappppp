/**
 * Healix Strings — ملف النصوص المركزي
 * =====================================
 * كل النصوص العربية في التطبيق موجودة هنا.
 * عند إضافة لغة جديدة، انسخ هذا الملف إلى en.ts وترجم.
 *
 * Usage:
 *   import { Strings } from '@/constants/strings';
 *   <Text>{Strings.dashboard.todayPlan}</Text>
 */

export const Strings = {
  common: {
    back: 'رجوع',
    send: 'إرسال',
    noInternet: 'لا يوجد اتصال بالإنترنت',
    loading: 'جاري التحميل...',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    error: 'خطأ',
    success: 'تم بنجاح',
  },

  tabs: {
    home: 'الرئيسية',
    chat: 'المحادثات',
    medical: 'القسم الطبي',
    history: 'الخطط والبرامج',
    profile: 'الملف الشخصي',
    switchBack: 'العودة للحساب الرئيسي',
    switchedBack: 'تم الرجوع للحساب الرئيسي',
  },

  dashboard: {
    greeting: (name: string) => `مرحباً، ${name}`,
    todayPlan: 'خطة اليوم',
    activePlan: 'النظام النشط حالياً',
    dailyMap: 'خريطتك اليومية',
    restDay: 'يوم راحة مستحق!',
    allComplete: 'رائع! أنهيت كل مهام اليوم',
    defaultName: 'يا بطل',
    daysStreak: (n: number) => `${n} أيام`,
    taskCount: (done: number, total: number) => `${done} من ${total} مهام`,
    subAccountViewing: (name: string) => `تعرض حساب: ${name}`,

    tasks: {
      workout: 'تمرين رياضي',
      breakfast: 'وجبة الإفطار',
      lunch: 'وجبة الغداء',
      dinner: 'وجبة العشاء',
      snack: 'سناك خفيف',
      system: 'مهمة نظام',
    },

    quotes: [
      "🌟 يومك فاضي — جسمك بيشكرك على الراحة!",
      "💪 استعد ليوم جديد مليان طاقة",
      "🧘 خذ نفس عميق — الاستراحة جزء من النجاح",
    ],
  },

  water: {
    title: 'ترطيب الجسم',
    motivation: 'اشرب بانتظام لصحة أفضل ✨',
    glassesOf: (target: number) => `من ${target} أكواب`,
  },

  chat: {
    placeholder: 'اكتب رسالتك...',
    noMessages: 'لا توجد رسائل حتى الآن.',
    startChat: 'ابدأ المحادثة الآن!',
    noInternetSend: 'لا يوجد اتصال بالإنترنت — لا يمكن الإرسال',
    recording: 'جاري التسجيل...',
    stopRecording: 'إيقاف التسجيل',
    voiceRecord: 'تسجيل صوتي',
    lastSeen: 'آخر ظهور:',
  },

  medical: {
    title: 'مركز القياسات',
    subtitle: 'البيانات الطبية، نمط الحياة، والتحاليل',
    tabs: {
      inbody: 'InBody',
      docs: 'التحاليل',
      health: 'الملف الطبي',
      lifestyle: 'نمط الحياة',
    },
    lockedTitle: 'المركز الطبي والقياسات 🩺',
    lockedSubtitle: 'اشترك الآن لتبدأ في تسجيل قياساتك الطبية، التحاليل، ونمط حياتك لمتابعة أدق مع طبيبك.',
    lockedButton: 'اشترك الآن',
  },

  profile: {
    pageTitle: 'إعدادات الحساب',
    personalData: 'البيانات والصورة',
    personalDataDesc: 'تعديل الاسم والصورة الشخصية',
    security: 'الأمان وكلمة المرور',
    securityDesc: 'تغيير كلمة المرور الخاصة بحسابك',
    subscription: 'إدارة الاشتراك',
    subscriptionDesc: 'تجديد، تعديل الباقة، وتأكيد الدفع',
    family: 'إدارة العائلة',
    familyDesc: 'أضف وبدل بين أفراد عائلتك',
    logout: 'تسجيل الخروج',
    logoutConfirm: 'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
    fullName: 'الاسم بالكامل',
    fullNamePlaceholder: 'اكتب اسمك هنا',
    email: 'البريد الإلكتروني (غير قابل للتعديل)',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    updatePassword: 'تحديث كلمة المرور',
    avatarHint: 'اضغط على الصورة للتغيير',
    profileUpdated: 'تم تحديث الملف الشخصي بنجاح! 🎉',
    avatarUploaded: 'تم رفع الصورة، اضغط "حفظ التغييرات" لتأكيد التغيير.',
    passwordChanged: 'تم تغيير كلمة المرور بنجاح! 🔒',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    passwordTooShort: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    photoPermission: 'يجب إعطاء صلاحية الوصول للصور لتتمكن من تغيير صورتك.',
    switchBackButton: 'العودة للحساب الرئيسي',
  },
} as const;
