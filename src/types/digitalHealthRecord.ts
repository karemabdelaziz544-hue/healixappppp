import type { Profile, Plan, PlanTask, InbodyRecord, ClientDocument } from './index';

export interface ActivityGoal {
  daily_steps: number;
  daily_minutes: number;
  daily_calories: number;
}

export interface ActivityProgress {
  steps: number;
  distance: number; // in meters/km
  active_minutes: number;
  calories: number;
  walking_minutes: number;
  running_minutes: number;
  cycling_minutes: number;
  source: 'Pedometer' | 'AppleHealth' | 'GoogleFit' | 'Garmin' | 'Huawei' | 'Manual';
}

export interface WaterProgress {
  consumedGlasses: number;
  targetGlasses: number;
  consumedLiters: number;
  targetLiters: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  color: string;
  type?: 'WaterEvent' | 'MealEvent' | 'WorkoutEvent' | 'AIEvent' | 'DoctorEvent' | 'AppointmentEvent' | 'WeightEvent' | 'AchievementEvent';
}

export interface DoctorInfo {
  name: string;
  avatarUrl: string | null;
  specialty?: string;
  isOnline?: boolean;
  lastActive?: string;
}

/**
 * Digital Health Record (DHR)
 * Unified health state representing the complete profile of a client.
 */
export interface DigitalHealthRecord {
  version: number; // e.g. 1
  generatedAt: string; // ISO timestamp
  userId: string;
  profile: Profile;
  medicalProfile: {
    diseases: string[];
    allergies: string[];
    medications: string[];
    surgeries: string[];
    injuries: string[];
    digestiveIssues: string[];
    dietType: string;
  } | null;
  goals: {
    activity: ActivityGoal;
    waterLiters: number;
    nutritionCalories: number;
  };
  activity: ActivityProgress;
  meals: {
    activePlan: Plan | null;
    todayMeals: PlanTask[];
    completedCount: number;
    totalCount: number;
    compliancePercent: number;
  };
  workouts?: {
    todayWorkouts: PlanTask[];
    completedCount: number;
    totalCount: number;
  };
  water: WaterProgress;
  sleep: {
    hours: number;
    quality: string; // 'Good' | 'Average' | 'Poor'
    targetHours: number;
  } | null;
  mood: {
    current: string; // e.g. 'Energetic' | 'Calm' | 'Tired'
    loggedAt: string;
  } | null;
  inbody: InbodyRecord | null;
  clientDocuments: ClientDocument[];
  timeline: TimelineEvent[];
  doctorNotes: string[];
  doctorInfo?: DoctorInfo | null;
}

