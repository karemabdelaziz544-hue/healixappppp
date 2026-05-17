import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../../components/AppToast';
import { logger } from '../../lib/logger';
import { MedicalTabProps, GOAL_OPTIONS, WORK_NATURE_OPTIONS, APPETITE_OPTIONS } from './medical.types';
import { medicalStyles as styles } from './medicalStyles';
import type { LifestyleProfile } from '../../types';

interface LifestyleProfileTabProps extends MedicalTabProps {
  lifestyleProfile: LifestyleProfile | null;
  onRefresh: () => Promise<void>;
}

export default function LifestyleProfileTab({ userId, lifestyleProfile, uploading, setUploading, onRefresh }: LifestyleProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(
    lifestyleProfile
      ? {
          ...lifestyleProfile,
          water_liters: lifestyleProfile.water_liters?.toString() || '2',
          sleep_hours: lifestyleProfile.sleep_hours?.toString() || '7',
          exercise_details: {
            type: lifestyleProfile.exercise_details?.type || '',
            days: lifestyleProfile.exercise_details?.days?.toString() || '0',
          },
        }
      : {
          goal: 'خسارة وزن',
          meals_per_day: '3',
          has_breakfast: true,
          has_snacks: false,
          late_night_eating: false,
          favorite_foods: '',
          disliked_foods: '',
          water_liters: '2',
          beverages: [],
          activity_level: 'متوسط',
          does_exercise: false,
          exercise_details: { type: '', days: '0' },
          sleep_hours: '7',
          sleep_quality: 'جيد',
          smoker: false,
          stress_level: 'متوسط',
          work_nature: 'مكتبي (جالس)',
          emotional_eating: false,
          diet_history: '',
          supplements: '',
          caffeine_intake: '',
          appetite_level: 'عادية',
          weight_plateau: false,
        }
  );

  const saveProfile = async () => {
    setUploading(true);
    try {
      const { error } = await supabase.from('lifestyle_profile').upsert({ ...form, user_id: userId });
      if (error) throw error;
      await onRefresh();
      setIsEditing(false);
      showToast.success('تم حفظ نمط الحياة بنجاح');
    } catch (err: any) {
      logger.error('[saveLifestyleProfile] Error:', JSON.stringify(err));
      showToast.error('خطأ في الحفظ', err?.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.fadeContainer}>
      {!isEditing ? (
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <TouchableOpacity style={[styles.editBtnSmall, { backgroundColor: '#F97316' }]} onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={16} color="#FFF" />
              <Text style={styles.editBtnText}>تحديث</Text>
            </TouchableOpacity>
            <Text style={styles.profileTitle}>العادات اليومية ونمط الحياة</Text>
          </View>
          {!lifestyleProfile ? (
            <View style={styles.emptyAlert}>
              <Text style={styles.emptyAlertText}>أخبرنا عن عاداتك لتصميم خطة تناسبك!</Text>
            </View>
          ) : (
            <View style={styles.profileBody}>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { borderColor: '#E8F3F1' }]}>
                  <Text style={styles.statLabel}>الهدف</Text>
                  <Text style={[styles.statValue, { fontSize: 16 }]}>{lifestyleProfile.goal}</Text>
                </View>
                <View style={[styles.statCard, { borderColor: '#DBEAFE' }]}>
                  <Text style={styles.statLabel}>المياه</Text>
                  <Text style={[styles.statValue, { fontSize: 16 }]}>{lifestyleProfile.water_liters} لتر</Text>
                </View>
                <View style={[styles.statCard, { borderColor: '#FFEDD5' }]}>
                  <Text style={styles.statLabel}>النوم</Text>
                  <Text style={[styles.statValue, { fontSize: 16 }]}>{lifestyleProfile.sleep_hours} س</Text>
                </View>
              </View>

              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>عادات الأكل</Text>
                <Text style={styles.dataValueBox}>
                  يفطر: {lifestyleProfile.has_breakfast ? 'نعم' : 'لا'} | سناكس: {lifestyleProfile.has_snacks ? 'نعم' : 'لا'} | أكل متأخر: {lifestyleProfile.late_night_eating ? 'نعم' : 'لا'}
                </Text>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>النشاط البدني وطبيعة العمل</Text>
                <Text style={styles.dataValueBox}>
                  {lifestyleProfile.work_nature} - {lifestyleProfile.activity_level} {lifestyleProfile.does_exercise ? `(${lifestyleProfile.exercise_details?.type})` : ''}
                </Text>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>معلومات إضافية (الشهية والمكملات)</Text>
                <Text style={styles.dataValueBox}>
                  الشهية: {lifestyleProfile.appetite_level} | المكملات: {lifestyleProfile.supplements || 'لا يوجد'}
                </Text>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>تاريخ الدايت وتحدياته</Text>
                <Text style={styles.dataValueBox}>
                  ثبات وزن: {lifestyleProfile.weight_plateau ? 'نعم' : 'لا'} | أكل عاطفي: {lifestyleProfile.emotional_eating ? 'نعم' : 'لا'}
                  {'\n'}الأنظمة السابقة: {lifestyleProfile.diet_history || 'لا يوجد'}
                </Text>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>الأطعمة المفضلة والممنوعة</Text>
                <Text style={styles.dataValueBox}>
                  المفضل: {lifestyleProfile.favorite_foods || '-'}{'\n'}الممنوع: {lifestyleProfile.disliked_foods || '-'}
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <Ionicons name="close-circle" size={28} color="#EF4444" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>تحديث نمط الحياة</Text>
          </View>

          <Text style={styles.inputLabel}>الهدف الأساسي</Text>
          <View style={styles.chipsContainer}>
            {GOAL_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.chipSelect, form.goal === d && styles.chipSelectActive]}
                onPress={() => setForm({ ...form, goal: d })}
              >
                <Text style={[styles.chipSelectText, form.goal === d && styles.chipSelectTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>النوم (ساعات)</Text>
              <TextInput
                style={styles.input}
                value={form.sleep_hours}
                onChangeText={t => setForm({ ...form, sleep_hours: t })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>المياه (لتر)</Text>
              <TextInput
                style={styles.input}
                value={form.water_liters}
                onChangeText={t => setForm({ ...form, water_liters: t })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>تفاصيل الأكل اليومي</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>أتناول الإفطار</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, form.has_breakfast && styles.toggleBtnActive]}
              onPress={() => setForm({ ...form, has_breakfast: !form.has_breakfast })}
            >
              <View style={[styles.toggleDot, form.has_breakfast && styles.toggleDotActive]} />
            </TouchableOpacity>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>آكل سناكس بين الوجبات</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, form.has_snacks && styles.toggleBtnActive]}
              onPress={() => setForm({ ...form, has_snacks: !form.has_snacks })}
            >
              <View style={[styles.toggleDot, form.has_snacks && styles.toggleDotActive]} />
            </TouchableOpacity>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>آكل في وقت متأخر ليلاً</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, form.late_night_eating && styles.toggleBtnActive]}
              onPress={() => setForm({ ...form, late_night_eating: !form.late_night_eating })}
            >
              <View style={[styles.toggleDot, form.late_night_eating && styles.toggleDotActive]} />
            </TouchableOpacity>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>الارتباط العاطفي بالأكل (شراهة عند التوتر؟)</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, form.emotional_eating && styles.toggleBtnActive]}
              onPress={() => setForm({ ...form, emotional_eating: !form.emotional_eating })}
            >
              <View style={[styles.toggleDot, form.emotional_eating && styles.toggleDotActive]} />
            </TouchableOpacity>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>أعاني من ثبات الوزن الفترات الأخيرة</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, form.weight_plateau && styles.toggleBtnActive]}
              onPress={() => setForm({ ...form, weight_plateau: !form.weight_plateau })}
            >
              <View style={[styles.toggleDot, form.weight_plateau && styles.toggleDotActive]} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>طبيعة العمل اليومي</Text>
          <View style={styles.chipsContainer}>
            {WORK_NATURE_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.chipSelect, form.work_nature === d && styles.chipSelectActive]}
                onPress={() => setForm({ ...form, work_nature: d })}
              >
                <Text style={[styles.chipSelectText, form.work_nature === d && styles.chipSelectTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>مستوى الشهية العام</Text>
          <View style={styles.chipsContainer}>
            {APPETITE_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.chipSelect, form.appetite_level === d && styles.chipSelectActive]}
                onPress={() => setForm({ ...form, appetite_level: d })}
              >
                <Text style={[styles.chipSelectText, form.appetite_level === d && styles.chipSelectTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>تاريخ الدايت (أنظمة قاسية سابقة؟)</Text>
          <TextInput
            style={styles.inputLong}
            placeholder="مثال: جربت كيتو ونزلت ورجعت تاني..."
            value={form.diet_history}
            onChangeText={t => setForm({ ...form, diet_history: t })}
          />

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>المكملات الغذائية المستخدمة حالياً</Text>
          <TextInput
            style={styles.inputLong}
            placeholder="مثال: واي بروتين، فيتامين د..."
            value={form.supplements}
            onChangeText={t => setForm({ ...form, supplements: t })}
          />

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>معدل استهلاك المنبهات (قهوة، شاي، طاقة)</Text>
          <TextInput
            style={styles.inputLong}
            placeholder="مثال: 3 أكواب قهوة يومياً..."
            value={form.caffeine_intake}
            onChangeText={t => setForm({ ...form, caffeine_intake: t })}
          />

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>أطعمة مفضلة جداً</Text>
          <TextInput
            style={styles.inputLong}
            placeholder="شوكولاتة، مكرونة..."
            value={form.favorite_foods}
            onChangeText={t => setForm({ ...form, favorite_foods: t })}
          />

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>أطعمة غير مفضلة أو ممنوعة</Text>
          <TextInput
            style={styles.inputLong}
            placeholder="سمك، باذنجان..."
            value={form.disliked_foods}
            onChangeText={t => setForm({ ...form, disliked_foods: t })}
          />

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>هل تمارس الرياضة؟</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioBtn, !form.does_exercise && styles.radioBtnActive]}
              onPress={() => setForm({ ...form, does_exercise: false })}
            >
              <Text style={[styles.radioText, !form.does_exercise && styles.radioTextActive]}>لا</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioBtn, form.does_exercise && styles.radioBtnActive]}
              onPress={() => setForm({ ...form, does_exercise: true })}
            >
              <Text style={[styles.radioText, form.does_exercise && styles.radioTextActive]}>نعم</Text>
            </TouchableOpacity>
          </View>

          {form.does_exercise && (
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>أيام في الأسبوع</Text>
                <TextInput
                  style={styles.input}
                  value={form.exercise_details.days}
                  onChangeText={t => setForm({ ...form, exercise_details: { ...form.exercise_details, days: t } })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputWrap, { flex: 2 }]}>
                <Text style={styles.inputLabel}>نوع الرياضة</Text>
                <TextInput
                  style={styles.input}
                  placeholder="جيم، مشي..."
                  value={form.exercise_details.type}
                  onChangeText={t => setForm({ ...form, exercise_details: { ...form.exercise_details, type: t } })}
                />
              </View>
            </View>
          )}

          <TouchableOpacity style={[styles.saveBtn, { marginTop: 20, backgroundColor: '#F97316' }]} onPress={saveProfile} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>تحديث نمط الحياة</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
