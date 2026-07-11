import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Dimensions, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { showToast } from '../components/AppToast';
import { AppColors, AppFontFamily } from '../constants/AppTheme';

const { width } = Dimensions.get('window');

const VITALITY_COLORS = {
  background: '#FAF9F7',
  primaryDark: '#12362E',
  primaryContainer: '#2A4D44',
  accentOrange: '#F26E11',
  successGreen: '#10B981',
  surfaceCard: '#FFFFFF',
  textMain: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  errorBg: '#FEE2E2',
  errorText: '#EF4444',
};

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // Parse details passed via router parameters or use defaults
  const id = params.id as string || 'squat';
  const title = params.title as string || 'تمرين القرفصاء';
  const category = params.category as string || 'STRENGTH';
  const difficulty = params.difficulty as string || 'INTERMEDIATE';
  const duration = params.duration as string || '15 min';
  const calories = params.calories as string || '120 kcal';
  const muscle = params.muscle as string || 'الفخذ والغلوتس';
  const sets = params.sets as string || '3 جولات × 12 تكرار';
  const tips = params.tips as string || 'تمرين أساسي لبناء عضلات الجزء السفلي وتقوية الجذع.';

  const mistakes = params.mistakes ? JSON.parse(params.mistakes as string) : [
    { title: 'انحناء أسفل الظهر', desc: 'حافظ على شد جذع الجسم ودفع الصدر للأعلى لحماية ظهرك.' },
    { title: 'ميلان الركبتين للداخل', desc: 'ادفع ركبتيك للخارج باتجاه أصابع قدميك أثناء الهبوط.' }
  ];

  const steps = params.steps ? JSON.parse(params.steps as string) : [
    'قف مباعداً بين قدميك بمحاذاة كتفيك.',
    'اهبط للأسفل كأنك تجلس على كرسي ودفع الأرداف للخلف.',
    'اضغط على باطن قدميك للعودة لوضعية الوقوف وشد عضلات الفخذ.'
  ];

  const [isCompleted, setIsCompleted] = useState(false);

  const handleMarkCompleted = () => {
    setIsCompleted(true);
    showToast.success('عاش يا بطل! تم حفظ التمرين في سجلك الرياضي');
    setTimeout(() => {
      router.back();
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section / Video Thumbnail */}
        <ImageBackground
          source={{ uri: id === 'walking' ? 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=600&auto=format&fit=crop' }}
          style={styles.heroSection}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.playButton} activeOpacity={0.8}>
              <Ionicons name="play" size={36} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* Back Button */}
        <TouchableOpacity 
          style={[styles.floatingBackButton, { top: insets.top + 10 }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-forward" size={24} color={VITALITY_COLORS.primaryDark} />
        </TouchableOpacity>

        {/* Category Tags */}
        <View style={styles.tagRow}>
          <View style={[styles.tagBadge, { backgroundColor: VITALITY_COLORS.primaryDark }]}>
            <Text style={[styles.tagBadgeText, { color: '#FFFFFF' }]}>{category}</Text>
          </View>
          <View style={[styles.tagBadge, { backgroundColor: '#E5E7EB' }]}>
            <Text style={[styles.tagBadgeText, { color: VITALITY_COLORS.textMain }]}>{difficulty}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.titleText}>{title}</Text>

        {/* Quick Stats Bento Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="time" size={22} color={VITALITY_COLORS.accentOrange} />
            <Text style={styles.statValue}>{duration}</Text>
            <Text style={styles.statLabel}>المدة</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="flame" size={22} color={VITALITY_COLORS.accentOrange} />
            <Text style={styles.statValue}>{calories}</Text>
            <Text style={styles.statLabel}>السعرات</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="fitness" size={22} color={VITALITY_COLORS.accentOrange} />
            <Text style={styles.statValue}>{muscle}</Text>
            <Text style={styles.statLabel}>العضلة</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="repeat" size={22} color={VITALITY_COLORS.accentOrange} />
            <Text style={styles.statValue}>{sets.split(' ')[0]} جولات</Text>
            <Text style={styles.statLabel}>الهدف</Text>
          </View>
        </View>

        {/* How to Perform */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="book-outline" size={20} color={VITALITY_COLORS.primaryDark} />
            <Text style={styles.sectionTitle}>خطوات أداء التمرين</Text>
          </View>

          <View style={styles.stepsList}>
            {steps.map((step: string, index: number) => (
              <View key={index} style={styles.stepCard}>
                <Text style={styles.stepIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Routine Details (Sets, Reps, Rest) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={20} color={VITALITY_COLORS.primaryDark} />
            <Text style={styles.sectionTitle}>تفاصيل الجولات والتكرار</Text>
          </View>

          <View style={styles.routineBanner}>
            <View style={styles.routineItem}>
              <View style={styles.routineCircle}>
                <Text style={styles.routineValue}>3</Text>
              </View>
              <Text style={styles.routineLabel}>جولات</Text>
            </View>
            <View style={styles.routineDivider} />
            <View style={styles.routineItem}>
              <View style={styles.routineCircle}>
                <Text style={styles.routineValue}>12</Text>
              </View>
              <Text style={styles.routineLabel}>تكرار</Text>
            </View>
            <View style={styles.routineDivider} />
            <View style={styles.routineItem}>
              <View style={styles.routineCircle}>
                <Text style={styles.routineValue}>45ث</Text>
              </View>
              <Text style={styles.routineLabel}>راحة</Text>
            </View>
          </View>
        </View>

        {/* Common Mistakes */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={20} color={VITALITY_COLORS.primaryDark} />
            <Text style={styles.sectionTitle}>أخطاء شائعة يجب تجنبها</Text>
          </View>

          <View style={styles.mistakesContainer}>
            {mistakes.map((mistake: any, index: number) => (
              <View key={index} style={styles.mistakeCard}>
                <Ionicons name="close-circle" size={20} color={VITALITY_COLORS.errorText} style={styles.mistakeIcon} />
                <View style={styles.mistakeInfo}>
                  <Text style={styles.mistakeTitle}>{mistake.title}</Text>
                  <Text style={styles.mistakeDesc}>{mistake.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Doctor Tips */}
        <View style={styles.doctorTipsCard}>
          <View style={styles.doctorTipsHeader}>
            <Ionicons name="medical" size={20} color="#A9CEC2" />
            <Text style={styles.doctorTipsTitle}>زاوية واستشارات الطبيب</Text>
          </View>
          <Text style={styles.doctorTipsText}>{tips}</Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={[styles.bottomActionContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={[
            styles.completedButton,
            isCompleted && { backgroundColor: VITALITY_COLORS.successGreen }
          ]} 
          onPress={handleMarkCompleted}
          disabled={isCompleted}
          activeOpacity={0.9}
        >
          <Ionicons name={isCompleted ? "checkmark-circle" : "checkmark-circle-outline"} size={22} color="#FFFFFF" />
          <Text style={styles.completedButtonText}>
            {isCompleted ? 'تم حفظ وإنجاز التمرين!' : 'تحديد التمرين كمنجز'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VITALITY_COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: VITALITY_COLORS.accentOrange,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: VITALITY_COLORS.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingBackButton: {
    position: 'absolute',
    right: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: VITALITY_COLORS.primaryDark,
    fontFamily: AppFontFamily.bold,
    textAlign: 'left',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 64) / 4,
    backgroundColor: VITALITY_COLORS.surfaceCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: VITALITY_COLORS.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: VITALITY_COLORS.textMain,
    marginTop: 6,
    fontFamily: AppFontFamily.bold,
  },
  statLabel: {
    fontSize: 10,
    color: VITALITY_COLORS.textSecondary,
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: VITALITY_COLORS.primaryDark,
    fontFamily: AppFontFamily.bold,
  },
  stepsList: {
    gap: 12,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: VITALITY_COLORS.surfaceCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: VITALITY_COLORS.border,
    borderRightWidth: 4,
    borderRightColor: VITALITY_COLORS.accentOrange,
  },
  stepIndex: {
    fontSize: 18,
    fontWeight: 'bold',
    color: VITALITY_COLORS.accentOrange,
    marginLeft: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: VITALITY_COLORS.textMain,
    textAlign: 'left',
    lineHeight: 22,
  },
  routineBanner: {
    backgroundColor: VITALITY_COLORS.primaryContainer,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineItem: {
    alignItems: 'center',
    flex: 1,
  },
  routineCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: VITALITY_COLORS.accentOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  routineValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  routineLabel: {
    fontSize: 11,
    color: '#A9CEC2',
    fontWeight: '600',
  },
  routineDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  mistakesContainer: {
    gap: 10,
  },
  mistakeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
  },
  mistakeIcon: {
    marginLeft: 12,
  },
  mistakeInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  mistakeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: VITALITY_COLORS.errorText,
    marginBottom: 2,
    fontFamily: AppFontFamily.bold,
  },
  mistakeDesc: {
    fontSize: 12,
    color: VITALITY_COLORS.textSecondary,
    textAlign: 'left',
    lineHeight: 18,
  },
  doctorTipsCard: {
    backgroundColor: VITALITY_COLORS.primaryContainer,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  doctorTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  doctorTipsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: AppFontFamily.bold,
  },
  doctorTipsText: {
    fontSize: 13,
    color: '#C4EBDE',
    textAlign: 'left',
    lineHeight: 22,
  },
  bottomActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(250, 249, 247, 0.9)',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  completedButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: VITALITY_COLORS.accentOrange,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: VITALITY_COLORS.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completedButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
