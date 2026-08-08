import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { logger } from '../../../lib/logger';
import { ActivityRepository } from '../../activity/repositories/ActivityRepository';
import { ActivitySyncManager } from '../../activity/services/ActivitySyncManager';
import { ActivityService } from '../../activity/services/ActivityService';
import type { DigitalHealthRecord, ActivityProgress, TimelineEvent, DoctorInfo } from '../../../types/digitalHealthRecord';

export class HealthDataProvider {
  /**
   * Fetch and assemble the complete unified Digital Health Record (DHR) for a user.
   */
  static async fetchDigitalHealthRecord(userId: string, dateStr: string): Promise<DigitalHealthRecord | null> {
    try {
      // 1. Fetch profiles, water tracking, and audit logs in parallel
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);

      // We query active nutrition plans AND active workout plans in parallel
      const [
        profileRes,
        healthRes,
        lifestyleRes,
        waterRes,
        auditLogsRes,
        goalsRes,
        activePlanRes,
        activeWorkoutRes,
        inbodyRes,
        docsRes
      ] = await Promise.all([
        executeQuery<any>(supabase.from('profiles').select('id, full_name, weight, height, age, gender, relation, manager_id, assigned_doctor_id').eq('id', userId).maybeSingle(), { isIdempotent: true }),
        executeQuery<any>(supabase.from('health_profile').select('id, diseases, allergies, medications, blood_type, has_chronic_disease, surgeries').eq('user_id', userId).maybeSingle(), { isIdempotent: true }),
        executeQuery<any>(supabase.from('lifestyle_profile').select('id, activity_level, dietary_preference, typical_sleep_hours, water_intake_goal, daily_steps_goal, has_dietitian, smoke, alcohol, stress_level').eq('user_id', userId).maybeSingle(), { isIdempotent: true }),
        executeQuery<any[]>(supabase.from('water_tracking').select('amount').eq('user_id', userId).gte('recorded_at', startOfDay.toISOString()).lte('recorded_at', endOfDay.toISOString()), { isIdempotent: true }),
        executeQuery<any[]>(supabase.from('medical_audit_log').select('id, action, created_at, occurred_at').eq('profile_id', userId).order('occurred_at', { ascending: false }).limit(5), { isIdempotent: true }),
        ActivityRepository.fetchActivityGoal(userId),
        executeQuery<any>(supabase.from('plans').select('id, title, plan_type, status, created_at, end_date').eq('user_id', userId).neq('plan_type', 'workout').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(), { isIdempotent: true }),
        executeQuery<any>(supabase.from('plans').select('id, title, plan_type, status, created_at, end_date').eq('user_id', userId).eq('plan_type', 'workout').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(), { isIdempotent: true }),
        executeQuery<any>(supabase.from('inbody_records').select('id, record_date, weight, fat_percent, muscle_mass, score').eq('user_id', userId).order('record_date', { ascending: false }).limit(1).maybeSingle(), { isIdempotent: true }),
        executeQuery<any[]>(supabase.from('client_documents').select('id, title, document_type, file_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50), { isIdempotent: true })
      ]);

      if (!profileRes.data) return null;

      // Fetch Doctor details if assigned_doctor_id exists
      let doctorInfo: DoctorInfo | null = null;
      let doctorNotes: string[] = [];

      if (profileRes.data.assigned_doctor_id) {
        const [docProfileRes, doctorMsgsRes] = await Promise.all([
          executeQuery<any>(supabase.from('profiles').select('full_name, avatar_url').eq('id', profileRes.data.assigned_doctor_id).maybeSingle(), { isIdempotent: true }),
          executeQuery<any[]>(supabase.from('messages').select('content').eq('sender_id', profileRes.data.assigned_doctor_id).eq('receiver_id', userId).order('created_at', { ascending: false }).limit(5), { isIdempotent: true })
        ]);

        if (docProfileRes.data) {
          doctorInfo = {
            name: docProfileRes.data.full_name,
            avatarUrl: docProfileRes.data.avatar_url,
            specialty: 'طبيب تغذية وعلاج طبيعي',
            isOnline: true,
            lastActive: 'منذ دقيقة'
          };
        }
        doctorNotes = doctorMsgsRes.data ? doctorMsgsRes.data.map((m: any) => m.content).filter(Boolean) : [];
      }

      // 2. Load activity progress (gets local live steps or DB log steps)
      const localSteps = ActivitySyncManager.getSteps();
      let activity: ActivityProgress;
      
      if (localSteps > 0) {
        const strideLengthMeters = 0.76;
        const caloriesPerStep = 0.04;
        const activeMinutes = Math.round(localSteps / 100);
        activity = {
          steps: localSteps,
          distance: Number(((localSteps * strideLengthMeters) / 1000).toFixed(2)),
          active_minutes: activeMinutes,
          calories: Number((localSteps * caloriesPerStep).toFixed(1)),
          walking_minutes: activeMinutes,
          running_minutes: 0,
          cycling_minutes: 0,
          source: ActivityService.getActiveProviderName() as any
        };
      } else {
        activity = await ActivityRepository.fetchDailyActivity(userId, dateStr);
      }

      // 3. Assemble active plan meals & workout tasks
      const activePlan = activePlanRes.data;
      const activeWorkout = activeWorkoutRes.data;
      const planIds = [activePlan?.id, activeWorkout?.id].filter(Boolean) as string[];

      let todayMeals: any[] = [];
      let completedMealsCount = 0;
      let mealsCompliancePercent = 0;

      let todayWorkouts: any[] = [];
      let completedWorkoutsCount = 0;

      if (planIds.length > 0) {
        const [tasksRes, logsRaw] = await Promise.all([
          executeQuery<any[]>(supabase.from('plan_tasks').select('id, plan_id, title, task_type, content, order_index, time_of_day, target_day_num, target_weekday, duration_mins, calories_burned').in('plan_id', planIds).order('order_index', { ascending: true }).limit(100), { isIdempotent: true }),
          executeQuery<any[]>(supabase.from('daily_task_logs').select('task_id, is_completed').eq('user_id', userId).eq('log_date', dateStr), { isIdempotent: true })
        ]);

        const allTasks = tasksRes.data || [];
        const logData = logsRaw.data || [];

        if (allTasks && allTasks.length > 0) {
          const selectedDay = new Date(dateStr);
          selectedDay.setHours(0, 0, 0, 0);
          const selectedWeekdayName = selectedDay.toLocaleDateString('ar-EG', { weekday: 'long' });

          // Calculate nutrition plan day number & check duration expiry
          let nutritionDayNum = 1;
          let isNutritionExpired = false;
          if (activePlan) {
            const startDate = new Date(activePlan.start_date || activePlan.created_at);
            startDate.setHours(0, 0, 0, 0);
            nutritionDayNum = Math.floor((selectedDay.getTime() - startDate.getTime()) / 86400000) + 1;
            const maxDuration = activePlan.duration_days || 14;
            if (nutritionDayNum > maxDuration) {
              isNutritionExpired = true;
              supabase.from('plans').update({ status: 'completed' }).eq('id', activePlan.id);
            }
          }

          // Calculate workout plan day number independently & check duration expiry
          let workoutDayNum = 1;
          let isWorkoutExpired = false;
          if (activeWorkout) {
            const startDate = new Date(activeWorkout.start_date || activeWorkout.created_at);
            startDate.setHours(0, 0, 0, 0);
            workoutDayNum = Math.floor((selectedDay.getTime() - startDate.getTime()) / 86400000) + 1;
            const maxDuration = activeWorkout.duration_days || 14;
            if (workoutDayNum > maxDuration) {
              isWorkoutExpired = true;
              supabase.from('plans').update({ status: 'completed' }).eq('id', activeWorkout.id);
            }
          }

          const filtered = allTasks.filter(t => {
            const isWorkout = t.task_type === 'workout';
            if (isWorkout && isWorkoutExpired) return false;
            if (!isWorkout && isNutritionExpired) return false;

            const currentDayNum = isWorkout ? workoutDayNum : nutritionDayNum;

            if (t.day_number !== undefined && t.day_number !== null) {
              return t.day_number === currentDayNum;
            }
            const name = t.day_name || "";
            if (currentDayNum === 1 && /اليوم\s*(الأول|1($|\D))/.test(name)) return true;
            const match = name.match(/\d+/);
            if (match) {
              return parseInt(match[0], 10) === currentDayNum;
            }
            return name.includes(selectedWeekdayName);
          });

          const logsMap = new Map(logData.map(log => [log.task_id, log.is_completed]));
          const mappedTasks = filtered.map(t => ({
            ...t,
            is_completed: logsMap.has(t.id) ? logsMap.get(t.id) : false
          }));

          // Split nutrition (meals) vs workout tasks
          todayMeals = mappedTasks.filter(t => t.task_type !== 'workout');
          completedMealsCount = todayMeals.filter(t => t.is_completed).length;
          mealsCompliancePercent = todayMeals.length > 0 ? Math.round((completedMealsCount / todayMeals.length) * 100) : 0;

          todayWorkouts = mappedTasks.filter(t => t.task_type === 'workout');
          completedWorkoutsCount = todayWorkouts.filter(t => t.is_completed).length;
        }
      }

      // 4. Assemble water progress
      const consumedWaterCups = waterRes.data ? waterRes.data.reduce((sum, r) => sum + (r.amount || 0), 0) : 0;
      const targetWaterLiters = lifestyleRes.data?.water_liters || 3.0;
      const targetWaterCups = Math.round(targetWaterLiters * 4);

      // 5. Parse timeline activities
      const timeline: TimelineEvent[] = (auditLogsRes.data || []).map((log: any, idx: number) => {
        let title = 'نشاط صحي';
        let subtitle = 'تم تحديث سجلاتك الطبية.';
        let icon = 'pulse-outline';
        let color = '#3B82F6';
        let type: TimelineEvent['type'] = 'AchievementEvent';

        if (log.table_name === 'inbody_records') {
          title = 'تسجيل قياس InBody';
          subtitle = log.action === 'INSERT' ? 'تم إضافة قياس وزن جديد' : 'تم تحديث قياسات الجسم';
          icon = 'body-outline';
          color = '#8B5CF6';
          type = 'WeightEvent';
        } else if (log.table_name === 'client_documents') {
          title = 'المستندات الطبية';
          subtitle = log.action === 'INSERT' ? 'تم رفع مستند طبي جديد' : 'تم تحديث ملف طبي';
          icon = 'document-text-outline';
          color = '#FD761C';
          type = 'DoctorEvent';
        } else if (log.table_name === 'health_profile') {
          title = 'الملف الصحي';
          subtitle = 'تم مراجعة وتحديث الملف الطبي للمشترك.';
          icon = 'heart-half-outline';
          color = '#10B981';
          type = 'DoctorEvent';
        } else if (log.table_name === 'lifestyle_profile') {
          title = 'نمط الحياة';
          subtitle = 'تم تعديل أهداف نمط الحياة.';
          icon = 'cafe-outline';
          color = '#3B82F6';
          type = 'AchievementEvent';
        } else if (log.table_name === 'activity_logs') {
          title = 'إنجاز الحركة اليومية';
          subtitle = 'حققت إنجازاً حركياً جديداً اليوم';
          icon = 'footsteps-outline';
          color = '#27443B';
          type = 'AchievementEvent';
        }

        const date = new Date(log.occurred_at || new Date());
        const timeStr = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        return {
          id: `${log.id || idx}`,
          title,
          subtitle,
          time: timeStr,
          icon,
          color,
          type
        };
      });

      // 6. Assemble Sleep object
      const sleepHours = lifestyleRes.data?.sleep_hours || 8;
      const sleepQuality = lifestyleRes.data?.sleep_quality || 'Good';
      const sleepObj = {
        hours: sleepHours,
        quality: sleepQuality,
        targetHours: 8
      };

      return {
        version: 1,
        generatedAt: new Date().toISOString(),
        userId,
        profile: profileRes.data,
        medicalProfile: healthRes.data ? {
          diseases: healthRes.data.diseases || [],
          allergies: healthRes.data.allergies || [],
          medications: healthRes.data.medications || [],
          surgeries: healthRes.data.surgeries || [],
          injuries: healthRes.data.injuries || [],
          digestiveIssues: healthRes.data.digestive_issues || [],
          dietType: healthRes.data.diet_type || 'General'
        } : null,
        goals: {
          activity: goalsRes,
          waterLiters: targetWaterLiters,
          nutritionCalories: lifestyleRes.data?.daily_calories || 2000
        },
        activity,
        meals: {
          activePlan,
          todayMeals,
          completedCount: completedMealsCount,
          totalCount: todayMeals.length,
          compliancePercent: mealsCompliancePercent
        },
        workouts: {
          todayWorkouts,
          completedCount: completedWorkoutsCount,
          totalCount: todayWorkouts.length
        },
        water: {
          consumedGlasses: consumedWaterCups,
          targetGlasses: targetWaterCups,
          consumedLiters: consumedWaterCups * 0.25,
          targetLiters: targetWaterLiters
        },
        sleep: sleepObj,
        mood: null,
        inbody: inbodyRes.data || null,
        clientDocuments: docsRes.data || [],
        timeline,
        doctorNotes,
        doctorInfo
      };
    } catch (e) {
      logger.error('[HealthDataProvider] Failed to fetch DHR:', e);
      return null;
    }
  }
}
