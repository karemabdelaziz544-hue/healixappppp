import type { DigitalHealthRecord } from '../../../types/digitalHealthRecord';
import type { HealthAnalysis } from './HealthAnalyticsEngine';

export class HealixAIContextBuilder {
  /**
   * Serialize the unified Digital Health Record and Health Analysis into a natural language prompt context.
   */
  static buildContext(dhr: DigitalHealthRecord, analysis: HealthAnalysis): string {
    const profile = dhr.profile;
    const medical = dhr.medicalProfile;
    const goals = dhr.goals;
    const activity = dhr.activity;
    const meals = dhr.meals;
    const workouts = dhr.workouts;
    const water = dhr.water;
    const sleep = dhr.sleep;

    // Calculate BMI
    let bmiText = 'غير متوفر';
    if (profile.weight && profile.height) {
      const heightM = profile.height / 100;
      const bmi = Number((profile.weight / (heightM * heightM)).toFixed(1));
      bmiText = `${bmi} (${bmi >= 18.5 && bmi <= 24.9 ? 'وزن مثالي' : bmi >= 25 && bmi <= 29.9 ? 'وزن زائد' : 'سمنة'})`;
    }

    const context = `
الملف الشخصي للمشترك:
- الاسم: ${profile.full_name || 'غير معروف'}
- الجنس: ${profile.gender === 'male' ? 'ذكر' : 'أنثى'}
- الوزن الحالي: ${profile.weight || 'غير متوفر'} كجم
- الطول الحالي: ${profile.height || 'غير متوفر'} سم
- مؤشر كتلة الجسم (BMI): ${bmiText}

الملف الصحي والتحذيرات:
- الأمراض المزمنة: ${medical?.diseases && medical.diseases.length > 0 ? medical.diseases.join('، ') : 'لا يوجد'}
- الحساسية الغذائية: ${medical?.allergies && medical.allergies.length > 0 ? medical.allergies.join('، ') : 'لا يوجد'}
- الأدوية الحالية: ${medical?.medications && medical.medications.length > 0 ? medical.medications.join('، ') : 'لا يوجد'}

مؤشرات الالتزام لليوم الحالي:
- درجة الصحة الإجمالية اليوم: ${analysis.score} من 100 (معدل الالتزام اليومي: ${analysis.compliance}%)
- الوجبات الغذائية المكتملة: تم تناول ${meals.completedCount} وجبة من أصل ${meals.totalCount} وجبات موصوفة.
- التمارين الرياضية المكتملة: تم إنجاز ${workouts?.completedCount || 0} تمرين من أصل ${workouts?.totalCount || 0} تمارين موصوفة اليوم.
- ترطيب المياه: تم شرب ${water.consumedLiters.toFixed(2)} لتر من أصل ${water.targetLiters.toFixed(2)} لتر مستهدفة اليوم (${water.consumedGlasses} كوب من أصل ${water.targetGlasses} أكواب).
- الحركة اليومية: مشي ${activity.steps.toLocaleString()} خطوة من هدف ${goals.activity.daily_steps.toLocaleString()} خطوة (المصدر: ${activity.source}).
- جودة النوم: نوم ${sleep?.hours || 'غير مسجل'} ساعات (التقييم: ${sleep?.quality || 'غير متوفر'} - الهدف: ${sleep?.targetHours || 8} ساعات).

ملاحظات التحليل التلقائي:
- التنبيهات الصحية الحالية: ${analysis.warnings.length > 0 ? analysis.warnings.join(' | ') : 'لا توجد تحذيرات.'}
- الإنجازات اليومية: ${analysis.achievements.length > 0 ? analysis.achievements.join(' | ') : 'لا توجد إنجازات مسجلة بعد.'}
- توصيات الحركة الفورية: ${analysis.recommendations.length > 0 ? analysis.recommendations.join(' | ') : 'مستمر بشكل ممتاز.'}
    `.trim();

    return context;
  }
}
