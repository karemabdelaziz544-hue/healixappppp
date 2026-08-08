// ============================================================================
// 🤖 Heli Brand Identity System — Centralized AI Companion Definitions
// ============================================================================

export const HELI_BRAND = {
  name: {
    ar: 'هيلي',
    en: 'Heli',
  },
  platform: {
    ar: 'مدعوم بواسطة Healix AI',
    en: 'Powered by Healix AI',
  },
  role: {
    ar: 'رفيقك الصحي الشخصي',
    en: 'Personal Health Companion',
  },
  tagline: {
    ar: 'رفيقك الصحي في كل خطوة.',
    en: 'Your Personal Health Companion.',
  },
  ui: {
    iconColor: '#F26E11', // Secondary Brand Color
    iconContainerBg: 'rgba(242, 110, 17, 0.12)',
    badgeBg: '#F26E11',
    avatarImage: require('../../../../assets/images/heli-avatar.png'),
  },
  homeWidget: {
    title: 'هيلي',
    subtitle: 'رفيقك الصحي الذكي',
    description: 'تابع تقدمك، واحصل على نصائح مخصصة مبنية على بياناتك اليومية.',
    cta: 'خوض التجربة مع هيلي',
    lockedTitle: 'هيلي Premium',
    lockedSubtitle: 'احصل على تجربة هيلي الكاملة وتحدث مع رفيقك الصحي الذكي في أي وقت.',
    lockedCta: 'اكتشف ميزات هيلي ❮',
  },
  chatScreen: {
    headerTitle: 'هيلي',
    headerSubtitle: 'رفيقك الصحي',
    welcomeGreeting: 'مرحباً 👋',
    welcomeNamePrefix: 'أنا هيلي.',
    welcomeSubtitle: 'رفيقك الصحي داخل Healix.',
    welcomeDescription: 'أستطيع مساعدتك في:',
    welcomeCapabilities: [
      'شرح نظامك الغذائي',
      'شرح التمارين الرياضية',
      'تحليل تقدمك اليومي والأسبوعي',
      'تفسير نتائج InBody ومكونات الجسم',
      'متابعة عاداتك الصحية والماء',
      'الإجابة عن أسئلتك الصحية',
    ],
    quickSuggestions: [
      'حلل تقدمي',
      'كيف ألتزم أكثر؟',
      'راجع يومي',
      'اشرح نظامي الغذائي',
      'اشرح تمريني',
      'كيف أحسن نومي؟',
    ],
    inputPlaceholder: 'اسأل هيلي عن أي شيء صحي...',
  },
  premiumGate: {
    title: 'Unlock Heli Premium',
    subtitle: 'احصل على تجربة هيلي الكاملة وتحدث مع رفيقك الصحي الذكي في أي وقت.',
    badgeText: 'هيلي الذكي ✨',
    ctaText: 'احصل على هيلي الآن 🔒',
    benefits: [
      'تحليل شخصي لحالتك وأهدافك الصحية',
      'نصائح يومية واستشارات فورية على مدار 24/7',
      'متابعة مستمرة لنسبة الالتزام والتقدم',
      'شرح الأنظمة الغذائية والتمارين المخصصة',
      'تفسير نتائج قياسات الـ InBody والتحاليل',
    ],
  },
};
