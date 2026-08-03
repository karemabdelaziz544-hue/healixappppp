import type { DigitalHealthRecord } from '../../../types/digitalHealthRecord';
import type { HealthAnalysis } from './HealthAnalyticsEngine';

export class HealixAIContextBuilder {
  /**
   * Serialize the unified Digital Health Record and Health Analysis into a rich natural language prompt context.
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

    // Identify current active meal
    const uncompletedMeal = meals.todayMeals.find(m => !m.is_completed);
    const currentMealText = uncompletedMeal 
      ? `الوجبة التالية المطلوبة: ${uncompletedMeal.title || uncompletedMeal.task_type} (${uncompletedMeal.content})`
      : 'جميع وجبات اليوم مكتملة بالكامل!';

    const doctorNotesText = dhr.doctorNotes && dhr.doctorNotes.length > 0 
      ? dhr.doctorNotes.join(' | ') 
      : 'لا توجد ملاحظات جديدة من الطبيب المعالج.';

    const inbodyText = dhr.inbody 
      ? `تاريخ ${dhr.inbody.record_date}: وزن ${dhr.inbody.weight} كجم، نسبة الدهون ${dhr.inbody.fat_percent || 'غير محدد'}%`
      : 'لا يوجد قياس InBody حديث.';

    const relationship = profile.relation 
      ? profile.relation 
      : (profile.manager_id ? 'عائلة' : 'المستفيد الرئيسي');
    const isPrimary = !profile.manager_id;
    const managerId = profile.manager_id || profile.id;

    const activeProfileHeader = `
===== ACTIVE PROFILE =====
- Profile Name: ${profile.full_name || 'غير معروف'}
- Relationship: ${relationship}
- Is Primary Profile: ${isPrimary ? 'Yes' : 'No'}
- Profile ID: ${profile.id}
- Manager ID: ${managerId}
- Age: ${profile.age || 'غير محدد'} سنة
- Gender: ${profile.gender || 'غير محدد'}

INSTRUCTION FOR HEALIX AI:
This conversation ONLY refers to this profile (${profile.full_name || 'المستخدم'}).
Never use information from the manager or any other family member.
Only answer using the active profile's health data.
`.trim();

    const context = `
${activeProfileHeader}

الملف الشخصي للمشترك:
- الاسم: ${profile.full_name || 'غير معروف'}
- العمر: ${profile.age || 'غير محدد'} سنة
- الوزن الحالي: ${profile.weight || 'غير متوفر'} كجم
- الطول الحالي: ${profile.height || 'غير متوفر'} سم
- مؤشر كتلة الجسم (BMI): ${bmiText}

التاريخ الطبي والتحذيرات:
- الأمراض المزمنة: ${medical?.diseases && medical.diseases.length > 0 ? medical.diseases.join('، ') : 'لا يوجد'}
- الحساسية الغذائية: ${medical?.allergies && medical.allergies.length > 0 ? medical.allergies.join('، ') : 'لا يوجد'}
- الأدوية الحالية: ${medical?.medications && medical.medications.length > 0 ? medical.medications.join('، ') : 'لا يوجد'}

مؤشرات اليوم الحالي:
- الالتزام اليومي الإجمالي: ${analysis.compliance}% (النتيجة الصحية: ${analysis.score}/100)
- الوجبات: تم إكمال ${meals.completedCount} من أصل ${meals.totalCount} وجبات. (${currentMealText})
- المياه: تم شرب ${water.consumedLiters.toFixed(1)}L من هدف ${water.targetLiters.toFixed(1)}L (المتبقي: ${Math.max(0, water.targetLiters - water.consumedLiters).toFixed(1)}L).
- الحركة: ${activity.steps.toLocaleString()} خطوة من هدف ${goals.activity.daily_steps.toLocaleString()} خطوة (${activity.calories} سعرة نشطة).
- التمارين: تم أنجاز ${workouts?.completedCount || 0} من أصل ${workouts?.totalCount || 0} تمارين.
- جودة النوم: ${sleep?.hours || 8} ساعات.

السجل الطبي والمعالج:
- الطبيب المتابع: ${dhr.doctorInfo?.name || 'غير محدد'}
- آخر ملاحظات الطبيب: ${doctorNotesText}
- قياس InBody: ${inbodyText}
    `.trim();

    return context;
  }
}

