import type { DigitalHealthRecord } from '../../../types/digitalHealthRecord';

export interface HealthAnalysis {
  score: number;
  compliance: number;
  contributors: {
    nutrition: number;
    water: number;
    activity: number;
    sleep: number;
  };
  warnings: string[];
  achievements: string[];
  recommendations: string[];
  insights: string[];
  generatedAt: string;
}

export type HealthAnalyticsReport = HealthAnalysis;

export class HealthAnalyticsEngine {
  /**
   * Run the complete analytics calculations for a given Digital Health Record.
   */
  static analyze(dhr: DigitalHealthRecord, streak = 0): HealthAnalysis {
    const score = this.calculateScore(dhr, streak);
    const compliance = this.calculateCompliance(dhr);
    const warnings = this.calculateRisk(dhr);
    const insights = this.calculateInsights(dhr);

    // Dynamic contributors calculation
    const nutrition = dhr.meals.totalCount > 0 
      ? Math.min(Math.round((dhr.meals.completedCount / dhr.meals.totalCount) * 100), 100) 
      : 100;
    const water = dhr.water.targetGlasses > 0 
      ? Math.min(Math.round((dhr.water.consumedGlasses / dhr.water.targetGlasses) * 100), 100) 
      : 0;
    const stepGoal = dhr.goals.activity.daily_steps || 10000;
    const activity = Math.min(Math.round((dhr.activity.steps / stepGoal) * 100), 100);
    const sleep = dhr.sleep 
      ? Math.min(Math.round((dhr.sleep.hours / dhr.sleep.targetHours) * 100), 100) 
      : 100;

    // Dynamic achievements compilation
    const achievements: string[] = [];
    if (activity >= 100) achievements.push('لقد حققت هدف المشي اليوم! 🏃');
    if (water >= 100) achievements.push('أنجزت هدف شرب المياه لليوم! 💧');
    if (nutrition >= 100 && dhr.meals.totalCount > 0) achievements.push('التزام كامل بوجبات اليوم! 🥗');
    if (streak > 0) achievements.push(`سلسلة التزام متتالية لـ ${streak} أيام! 🔥`);

    // Recommendations compilation (actionable insights)
    const recommendations: string[] = [];
    if (activity < 50) recommendations.push('حاول المشي لـ 10 دقائق بعد الوجبة القادمة لتنشيط الدورة الدموية.');
    if (water < 60) recommendations.push('ضع كوب ماء بجانبك الآن واشرب منه بشكل دوري.');
    if (nutrition < 100 && dhr.meals.totalCount > 0) recommendations.push('احرص على إكمال وجبتك التالية في موعدها الموصى به.');
    if (sleep < 80) recommendations.push('ينصح بالنوم مبكراً الليلة لتعويض ساعات الراحة المفقودة.');

    return {
      score,
      compliance,
      contributors: {
        nutrition,
        water,
        activity,
        sleep
      },
      warnings,
      achievements,
      recommendations,
      insights,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate dynamic Health Score (50-100) based on wellness metrics.
   */
  static calculateScore(dhr: DigitalHealthRecord, streak = 0): number {
    let score = 75; // Baseline score

    // 1. Activity progress (Max +10 points)
    const stepGoal = dhr.goals.activity.daily_steps || 10000;
    const stepsProgress = dhr.activity.steps / stepGoal;
    score += Math.min(Math.round(stepsProgress * 10), 10);

    // 2. Hydration progress (Max +10 points)
    const waterGoal = dhr.water.targetGlasses || 8;
    const waterProgress = dhr.water.consumedGlasses / waterGoal;
    score += Math.min(Math.round(waterProgress * 10), 10);

    // 3. Nutrition plan compliance (Max +10 points)
    if (dhr.meals.totalCount > 0) {
      const mealProgress = dhr.meals.completedCount / dhr.meals.totalCount;
      score += Math.round(mealProgress * 10);
    } else {
      score += 8; // Auto points on rest days
    }

    // 4. Streak points (Max +5 points)
    if (streak > 0) {
      score += Math.min(streak * 1, 5);
    }

    // 5. Body Mass Index (BMI) evaluation
    const weight = dhr.profile.weight;
    const height = dhr.profile.height;
    if (weight && height) {
      const heightM = height / 100;
      const bmi = weight / (heightM * heightM);
      if (bmi >= 18.5 && bmi <= 24.9) {
        score += 5; // Healthy BMI bonus
      } else if (bmi >= 25 && bmi <= 29.9) {
        score += 2; // Overweight slightly
      } else {
        score -= 5; // Underweight or obese penalty
      }
    }

    // Bind score between 50 and 100
    return Math.min(Math.max(score, 50), 100);
  }

  /**
   * Evaluate overall daily compliance rate (0-100).
   */
  static calculateCompliance(dhr: DigitalHealthRecord): number {
    let factorCount = 0;
    let totalPercent = 0;

    // Nutrition factor
    if (dhr.meals.totalCount > 0) {
      totalPercent += dhr.meals.compliancePercent;
      factorCount++;
    }

    // Hydration factor
    const waterGoal = dhr.water.targetGlasses || 8;
    totalPercent += Math.min(Math.round((dhr.water.consumedGlasses / waterGoal) * 100), 100);
    factorCount++;

    // Steps factor
    const stepGoal = dhr.goals.activity.daily_steps || 10000;
    totalPercent += Math.min(Math.round((dhr.activity.steps / stepGoal) * 100), 100);
    factorCount++;

    return factorCount > 0 ? Math.round(totalPercent / factorCount) : 100;
  }

  /**
   * Detect potential health/safety flags based on DHR metrics.
   */
  static calculateRisk(dhr: DigitalHealthRecord): string[] {
    const risks: string[] = [];

    // Water intake risk
    if (dhr.water.consumedGlasses < (dhr.water.targetGlasses * 0.25)) {
      risks.push('ترطيب جسمك منخفض للغاية. يرجى شرب كوب ماء فوراً لتجنب الجفاف.');
    }

    // BMI & Activity Risk
    const weight = dhr.profile.weight;
    const height = dhr.profile.height;
    if (weight && height) {
      const heightM = height / 100;
      const bmi = weight / (heightM * heightM);
      const stepGoal = dhr.goals.activity.daily_steps || 10000;
      
      if (bmi >= 30 && dhr.activity.steps < (stepGoal * 0.3)) {
        risks.push('معدل حركتك اليوم منخفض مع ارتفاع مؤشر كتلة الجسم؛ ينصح بالمشي لتنشيط الحرق.');
      }
    }

    // Allergies alert
    if (dhr.medicalProfile?.allergies && dhr.medicalProfile.allergies.length > 0) {
      risks.push(`تنبيه الحساسية نشط لـ: ${dhr.medicalProfile.allergies.join('، ')}.`);
    }

    return risks;
  }

  /**
   * Formulate personalized Arabic recommendations.
   */
  static calculateInsights(dhr: DigitalHealthRecord): string[] {
    const insights: string[] = [];

    // Steps compliance
    const stepGoal = dhr.goals.activity.daily_steps || 10000;
    const stepPercent = Math.round((dhr.activity.steps / stepGoal) * 100);

    if (stepPercent >= 100) {
      insights.push('رائع! حققت هدف الحركة بالكامل اليوم 🏆');
    } else if (stepPercent >= 60) {
      insights.push('أداء مشي ممتاز، اقتربت من إكمال هدف خطوات اليوم.');
    } else if (dhr.activity.steps > 0) {
      insights.push('خطوات جيدة، حاول المشي لـ 15 دقيقة إضافية لدعم دورتك الدموية.');
    } else {
      insights.push('لم تسجل أي حركة اليوم؛ ابدأ بالمشي الخفيف لتنشيط طاقتك.');
    }

    // Water compliance
    const waterPercent = Math.round((dhr.water.consumedGlasses / dhr.water.targetGlasses) * 100);
    if (waterPercent >= 100) {
      insights.push('مستوى ترطيب ممتاز ومثالي اليوم 💧');
    } else if (waterPercent >= 50) {
      insights.push('التزام جيد بشرب المياه، متبقي بضعة أكواب للوصول لهدفك.');
    }

    // Meals compliance
    if (dhr.meals.totalCount > 0) {
      if (dhr.meals.compliancePercent === 100) {
        insights.push('التزامك ببرنامج التغذية اليوم ممتاز ومطابق 100% 🥗');
      } else if (dhr.meals.compliancePercent > 0) {
        insights.push('شارفت على إنهاء وجباتك الموصوفة لليوم؛ التزم بالوجبة القادمة.');
      }
    }

    return insights;
  }
}
