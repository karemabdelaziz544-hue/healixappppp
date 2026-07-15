import { Text, TextInput } from '@/components/AppText';
import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';;
import { Ionicons } from '@expo/vector-icons';
import { MedicalTabProps, DISEASE_OPTIONS, DIET_OPTIONS, FAMILY_HISTORY_OPTIONS, DIGESTIVE_OPTIONS } from './medical.types';
import { medicalStyles as styles } from './medicalStyles';
import type { HealthProfile } from '../../types';
import { useHealthProfile } from './hooks/useHealthProfile';
import { AnimatedButton } from '../../../components/animations/AnimatedButton';

interface HealthProfileTabProps extends MedicalTabProps {
  healthProfile: HealthProfile | null;
  onRefresh: () => Promise<void>;
}

export default function HealthProfileTab({ userId, healthProfile, uploading, setUploading, onRefresh }: HealthProfileTabProps) {
  const { 
    state: { isEditing, form }, 
    actions: { setIsEditing, setForm, toggleArrayItem, saveProfile } 
  } = useHealthProfile(userId, healthProfile, onRefresh, setUploading);

  return (
    <View style={styles.fadeContainer}>
      {!isEditing ? (
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileTitle}>البيانات الطبية الأساسية</Text>
            <AnimatedButton style={styles.editBtnSmall} onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={16} color="#FFF" />
              <Text style={styles.editBtnText}>تعديل</Text>
            </AnimatedButton>
          </View>
          {!healthProfile ? (
            <View style={styles.emptyAlert}>
              <Text style={styles.emptyAlertText}>لم تقم بإدخال بياناتك الطبية بعد!</Text>
            </View>
          ) : (
            <View style={styles.profileBody}>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>الأمراض المزمنة</Text>
                <View style={styles.chipsContainer}>
                  {healthProfile.diseases?.length ? (
                    healthProfile.diseases.map((d: string) => (
                      <View key={d} style={styles.chipRed}>
                        <Text style={styles.chipRedText}>{d}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.chipGreen}>
                      <Text style={styles.chipGreenText}>لا يوجد</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>الحساسية</Text>
                {healthProfile.has_allergies ? (
                  <Text style={styles.dataValueRed}>نعم ({healthProfile.allergies_details})</Text>
                ) : (
                  <Text style={styles.dataValueGreen}>لا يوجد</Text>
                )}
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>الأدوية والمكملات</Text>
                <Text style={styles.dataValueBox}>{healthProfile.medications || 'لا يوجد'}</Text>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>العمليات الجراحية</Text>
                <Text style={styles.dataValueBox}>{healthProfile.surgeries || 'لا يوجد'}</Text>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>الإصابات المانعة للحركة</Text>
                <Text style={styles.dataValueBox}>{healthProfile.injuries || 'لا يوجد'}</Text>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>مشاكل الهضم</Text>
                <View style={styles.chipsContainer}>
                  {healthProfile.digestive_issues?.length ? (
                    healthProfile.digestive_issues.map((d: string) => (
                      <View key={d} style={styles.chipRed}>
                        <Text style={styles.chipRedText}>{d}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.chipGreen}>
                      <Text style={styles.chipGreenText}>لا يوجد</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>الحالة الهرمونية</Text>
                <Text style={styles.dataValueBox}>{healthProfile.hormonal_status || 'لا يوجد / لا ينطبق'}</Text>
              </View>
              <View style={styles.dataGroup}>
                <Text style={styles.dataLabel}>نوع النظام المفضل</Text>
                <Text style={styles.dataValueBox}>{healthProfile.diet_type}</Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>تحديث الملف الطبي</Text>
            <AnimatedButton onPress={() => setIsEditing(false)}>
              <Ionicons name="close-circle" size={28} color="#EF4444" />
            </AnimatedButton>
          </View>

          <Text style={styles.inputLabel}>هل تعاني من أمراض مزمنة؟</Text>
          <View style={styles.chipsContainer}>
            {DISEASE_OPTIONS.map(d => (
              <AnimatedButton
                key={d}
                style={[styles.chipSelect, form.diseases?.includes(d) && styles.chipSelectActiveRed]}
                onPress={() => toggleArrayItem('diseases', d)}
              >
                <Text style={[styles.chipSelectText, form.diseases?.includes(d) && styles.chipSelectTextActiveRed]}>{d}</Text>
              </AnimatedButton>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>هل لديك حساسية؟</Text>
          <View style={styles.radioGroup}>
            <AnimatedButton
              style={[styles.radioBtn, !form.has_allergies && styles.radioBtnActive]}
              onPress={() => setForm({ ...form, has_allergies: false })}
            >
              <Text style={[styles.radioText, !form.has_allergies && styles.radioTextActive]}>لا</Text>
            </AnimatedButton>
            <AnimatedButton
              style={[styles.radioBtn, form.has_allergies && styles.radioBtnActive]}
              onPress={() => setForm({ ...form, has_allergies: true })}
            >
              <Text style={[styles.radioText, form.has_allergies && styles.radioTextActive]}>نعم</Text>
            </AnimatedButton>
          </View>
          {form.has_allergies && (
            <TextInput
              style={[styles.inputLong, { marginTop: 10 }]}
              placeholder="اكتب تفاصيل الحساسية..."
              value={form.allergies_details}
              onChangeText={t => setForm({ ...form, allergies_details: t })}
            />
          )}

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>تاريخ مرضي بالعائلة</Text>
          <View style={styles.chipsContainer}>
            {FAMILY_HISTORY_OPTIONS.map(d => (
              <AnimatedButton
                key={d}
                style={[styles.chipSelect, form.family_history?.includes(d) && styles.chipSelectActive]}
                onPress={() => toggleArrayItem('family_history', d)}
              >
                <Text style={[styles.chipSelectText, form.family_history?.includes(d) && styles.chipSelectTextActive]}>{d}</Text>
              </AnimatedButton>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>نوع النظام المفضل</Text>
          <View style={styles.chipsContainer}>
            {DIET_OPTIONS.map(d => (
              <AnimatedButton
                key={d}
                style={[styles.chipSelect, form.diet_type === d && styles.chipSelectActive]}
                onPress={() => setForm({ ...form, diet_type: d })}
              >
                <Text style={[styles.chipSelectText, form.diet_type === d && styles.chipSelectTextActive]}>{d}</Text>
              </AnimatedButton>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>الأدوية (بالجرعات)</Text>
          <TextInput
            style={styles.inputArea}
            multiline
            placeholder="مثال: جلوكوفاج 500 بعد الغداء..."
            value={form.medications}
            onChangeText={t => setForm({ ...form, medications: t })}
          />

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>هل قمت بإجراء أي عمليات جراحية؟</Text>
          <TextInput
            style={styles.inputArea}
            multiline
            placeholder="اذكر التفاصيل إن وجد..."
            value={form.surgeries}
            onChangeText={t => setForm({ ...form, surgeries: t })}
          />

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>هل لديك أي إصابات تمنعك من تمرين معين؟</Text>
          <TextInput
            style={styles.inputArea}
            multiline
            placeholder="مثل: غضروف الظهر، إصابة ركبة..."
            value={form.injuries}
            onChangeText={t => setForm({ ...form, injuries: t })}
          />

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>مشاكل الجهاز الهضمي</Text>
          <View style={styles.chipsContainer}>
            {DIGESTIVE_OPTIONS.map(d => (
              <AnimatedButton
                key={d}
                style={[styles.chipSelect, form.digestive_issues?.includes(d) && styles.chipSelectActive]}
                onPress={() => toggleArrayItem('digestive_issues', d)}
              >
                <Text style={[styles.chipSelectText, form.digestive_issues?.includes(d) && styles.chipSelectTextActive]}>{d}</Text>
              </AnimatedButton>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 15 }]}>الحالة الهرمونية (للسيدات: انتظام الدورة، تكيسات..)</Text>
          <TextInput
            style={styles.inputArea}
            multiline
            placeholder="اذكر التفاصيل إن وجد..."
            value={form.hormonal_status}
            onChangeText={t => setForm({ ...form, hormonal_status: t })}
          />

          <AnimatedButton style={[styles.saveBtn, { marginTop: 20 }]} onPress={saveProfile} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>حفظ البيانات الطبية</Text>}
          </AnimatedButton>
        </View>
      )}
    </View>
  );
}
