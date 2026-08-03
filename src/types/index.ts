// ============================================
// 🏋️ Healix Mobile — TypeScript Type Definitions
// ============================================

// ======== Plan & Tasks ========

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  manager_id: string | null;
  subscription_status: string;
  subscription_end_date: string | null;
  is_onboarded: boolean;
  gender?: string;
  birth_date?: string;
  age?: number | null;
  weight?: number;
  height?: number;
  relation?: string;
  entitlement?: { status: 'included' | 'excluded' | 'expired' | 'cancelled'; included_until: string | null } | null;
}

export interface Plan {
  id: string;
  user_id: string;
  title: string | null;
  status: 'active' | 'completed' | 'archived';
  plan_type: 'nutrition' | 'workout';
  duration_days?: number | null;
  start_date: string | null;
  created_at: string;
  updated_at?: string;
  plan_tasks?: { count: number }[];
}

export interface PlanTask {
  id: string;
  plan_id: string;
  day_name: string | null;
  day_number?: number | null;
  title?: string | null;
  content: string;
  task_type: 'workout' | 'nutrition' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;
  is_completed: boolean;
  order_index: number;
  scheduled_time?: string | null;
  metadata?: any;
  created_at?: string;
}

// ======== InBody & Medical ========

export interface InbodyRecord {
  id: string;
  user_id: string;
  weight: number;
  muscle_mass: number | null;
  fat_percent: number | null;
  record_date: string;
  ai_summary: string | null;
  image_url: string | null;
  created_at?: string;
}

export interface ClientDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  created_at: string;
}

export interface HealthProfile {
  id?: string;
  user_id: string;
  diseases: string[];
  has_allergies: boolean;
  allergies_details: string;
  diet_type: string;
  family_history: string[];
  medications: string;
  // الحقول الجديدة:
  surgeries: string;
  injuries: string;
  digestive_issues: string[];
  hormonal_status: string;
}

export interface LifestyleProfile {
  id?: string;
  user_id: string;
  goal: string;
  meals_per_day: string;
  has_breakfast: boolean;
  has_snacks: boolean;
  late_night_eating: boolean;
  favorite_foods: string;
  disliked_foods: string;
  water_liters: number;
  beverages: string[];
  activity_level: string;
  does_exercise: boolean;
  exercise_details: {
    type: string;
    days: string;
  };
  sleep_hours: number;
  sleep_quality: string;
  smoker: boolean;
  stress_level: string;
  // الحقول الجديدة:
  work_nature: string;
  emotional_eating: boolean;
  diet_history: string;
  supplements: string;
  caffeine_intake: string;
  appetite_level: string;
  weight_plateau: boolean;
}

// ======== Chat & Messages ========

export type InquiryCategory = 'nutrition' | 'meals' | 'weight' | 'symptoms' | 'exercises' | 'other';
export type InquiryStatus = 'open' | 'under_review' | 'replied' | 'closed';

export interface Inquiry {
  id: string;
  user_id: string;
  title: string;
  category: InquiryCategory;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: 'image' | 'audio' | 'file' | null;
  recipient_type: 'doctor' | 'admin';
  inquiry_id?: string; // Threaded ticket connection
  is_read: boolean;
  created_at: string;
}

// ======== Notifications ========

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'plan' | 'chat' | 'alert' | 'general';
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ======== Streak / Gamification ========

export interface DailyLog {
  id: string;
  user_id: string;
  /** Column is `date` (type: date) — not `log_date` */
  date: string;
  water_intake: number;
  calories_consumed: number;
  completed_tasks: unknown[];
  updated_at?: string;
}

// ======== Subscriptions ========

export interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  plan_type: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  receipt_url: string;
  renewal_metadata?: Record<string, unknown> | null;
  created_at: string;
  expected_amount?: number;
  declared_transferred_amount?: number | null;
  admin_confirmed_amount?: number | null;
  previous_request_id?: string | null;
  attempt_group_id?: string;
  rejection_reason?: string | null;
  admin_notes?: string | null;
  reviewed_at?: string | null;
  invoice_number?: string | null;
  /** Discriminator: new | renewal | upgrade | downgrade */
  payment_type?: 'new' | 'renewal' | 'upgrade' | 'downgrade';
  /** First-class family quota (replaces renewal_metadata.sub_count) */
  requested_family_quota?: number;
  /** First-class member selection (replaces renewal_metadata.keep_member_ids) */
  keep_member_ids?: string[];
}

export interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  category?: string | null;
  created_at: string;
}
