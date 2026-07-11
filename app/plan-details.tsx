import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Pressable, LayoutAnimation, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { logger } from '../src/lib/logger';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import ExpiredState from '../components/ExpiredState';
import Skeleton from '../components/Skeleton';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { useFamily } from '../src/context/FamilyContext';
import { showToast } from '../components/AppToast';
import type { PlanTask } from '../src/types';

type TaskWithLog = PlanTask & { todayDone: boolean; logId: string | null };

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TODAY = getLocalDateString();

const getDayNumFromName = (name: string): number => {
  if (/الأول|1/.test(name)) return 1;
  if (/الثاني\b|2/.test(name)) return 2;
  if (/الثالث\b|3/.test(name)) return 3;
  if (/الرابع\b|4/.test(name)) return 4;
  if (/الخامس\b|5/.test(name)) return 5;
  if (/السادس\b|6/.test(name)) return 6;
  if (/السابع\b|7/.test(name)) return 7;
  if (/الثامن\b|8/.test(name)) return 8;
  if (/التاسع\b|9/.test(name)) return 9;
  if (/العاشر\b|10/.test(name)) return 10;
  if (/الحادي عشر|11/.test(name)) return 11;
  if (/الثاني عشر|12/.test(name)) return 12;
  if (/الثالث عشر|13/.test(name)) return 13;
  if (/الرابع عشر|14/.test(name)) return 14;
  if (/الخامس عشر|15/.test(name)) return 15;
  if (/السادس عشر|16/.test(name)) return 16;
  if (/السابع عشر|17/.test(name)) return 17;
  if (/الثامن عشر|18/.test(name)) return 18;
  if (/التاسع عشر|19/.test(name)) return 19;
  if (/العشرون|العشرين|20/.test(name)) return 20;
  if (/الحادي والعشرون|21/.test(name)) return 21;
  if (/الثاني والعشرون|22/.test(name)) return 22;
  if (/الثالث والعشرون|23/.test(name)) return 23;
  if (/الرابع والعشرون|24/.test(name)) return 24;
  if (/الخامس والعشرون|25/.test(name)) return 25;
  if (/السادس والعشرون|26/.test(name)) return 26;
  if (/السابع والعشرون|27/.test(name)) return 27;
  if (/الثامن والعشرون|28/.test(name)) return 28;
  if (/التاسع والعشرون|29/.test(name)) return 29;
  if (/الثلاثون|الثلاثين|30/.test(name)) return 30;

  const match = name.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return 1;
};

const parseMealComponents = (content: string): string[] => {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const items: string[] = [];
  lines.forEach(line => {
    let cleaned = line.trim();
    if (!cleaned) return;
    // Remove bullets •, -, *, +, or numbers like 1., 2.
    cleaned = cleaned.replace(/^([•\-\*\+]\s*|\d+[\.\)\-]\s*)/, '');
    cleaned = cleaned.trim();
    if (cleaned) {
      items.push(cleaned);
    }
  });
  if (items.length === 1 && content.includes(',')) {
    return content.split(',').map(s => s.trim().replace(/^([•\-\*\+]\s*|\d+[\.\)\-]\s*)/, '').trim()).filter(Boolean);
  }
  return items;
};

const getTaskTypeOrder = (type: string) => {
  switch (type) {
    case 'breakfast': return 1;
    case 'snack': return 2;
    case 'lunch': return 3;
    case 'dinner': return 5;
    default: return 6;
  }
};

const getMealName = (type: string) => {
  switch (type) {
    case 'breakfast': return 'وجبة الإفطار';
    case 'lunch': return 'وجبة الغداء';
    case 'dinner': return 'وجبة العشاء';
    case 'snack': return 'سناك خفيف';
    default: return 'مهمة نظام';
  }
};

const getMealIcon = (type: string) => {
  switch (type) {
    case 'breakfast': return 'cafe-outline';
    case 'lunch': return 'restaurant-outline';
    case 'dinner': return 'moon-outline';
    case 'snack': return 'nutrition-outline';
    default: return 'document-text-outline';
  }
};

const getMealColor = (type: string) => {
  switch (type) {
    case 'breakfast': return '#2A4D44'; // Primary
    case 'lunch': return '#F26E11'; // Accent
    case 'dinner': return '#2A4D44'; // Primary
    case 'snack': return '#F26E11'; // Accent
    default: return '#717975';
  }
};

const getMealBg = (type: string) => {
  switch (type) {
    case 'breakfast': return 'rgba(42, 77, 68, 0.08)';
    case 'lunch': return 'rgba(242, 110, 17, 0.08)';
    case 'dinner': return 'rgba(42, 77, 68, 0.08)';
    case 'snack': return 'rgba(242, 110, 17, 0.08)';
    default: return 'rgba(113, 121, 117, 0.08)';
  }
};

export default function PlanDetailsScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const { currentProfile } = useFamily();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [planTitle, setPlanTitle] = useState('');
  const [tasksByDay, setTasksByDay] = useState<Record<string, TaskWithLog[]>>({});
  const [dayNames, setDayNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSubscribed, isGuardLoading } = useSubscriptionGuard();

  const [currentDayNum, setCurrentDayNum] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayForModal, setSelectedDayForModal] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const fetchPlanDetails = useCallback(async () => {
    if (!planId || !currentProfile?.id) return;
    try {
      setLoading(true);

      // 1. Fetch plan title and dates
      const { data: plan } = await supabase
        .from('plans')
        .select('title, start_date, created_at')
        .eq('id', planId)
        .maybeSingle();

      if (plan) {
        setPlanTitle(plan.title || 'تفاصيل الخطة');
        const startDate = new Date(plan.start_date || plan.created_at);
        startDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - startDate.getTime();
        const dayNum = Math.floor(diffTime / 86400000) + 1;
        setCurrentDayNum(dayNum);
      }

      // 2. Fetch all tasks for the plan
      const { data: tasks } = await supabase
        .from('plan_tasks')
        .select('id, plan_id, day_name, content, task_type, is_completed, order_index')
        .eq('plan_id', planId)
        .order('order_index', { ascending: true });

      if (!tasks) return;

      // 3. Fetch today's completion logs for this user
      const taskIds = tasks.map(t => t.id);
      const { data: logs, error: logsError } = await supabase
        .from('daily_task_logs')
        .select('id, task_id, is_completed')
        .eq('user_id', currentProfile.id)
        .eq('log_date', TODAY)
        .in('task_id', taskIds);

      logger.warn(`[PlanDetails] FETCH logs — date:${TODAY} user:${currentProfile.id} found:${logs?.length ?? 0} error:${logsError ? JSON.stringify(logsError) : 'none'}`);

      const logMap = new Map<string, { id: string; is_completed: boolean }>();
      logs?.forEach(l => logMap.set(l.task_id, { id: l.id, is_completed: l.is_completed }));

      // 4. Group tasks by day, merging with today's log status
      const grouped: Record<string, TaskWithLog[]> = {};
      const days: string[] = [];

      tasks.forEach((task) => {
        const dayName = task.day_name || 'اليوم الأول';
        if (!grouped[dayName]) {
          grouped[dayName] = [];
          days.push(dayName);
        }
        const logEntry = logMap.get(task.id);
        grouped[dayName].push({
          ...task,
          todayDone: logEntry?.is_completed ?? false,
          logId: logEntry?.id ?? null,
        });
      });

      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setTasksByDay(grouped);
      setDayNames(days);
    } catch (error) {
      logger.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  }, [planId, currentProfile?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchPlanDetails();
    }, [fetchPlanDetails])
  );

  const handleSearchChange = (text: string) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setSearchQuery(text);
  };

  const getCompletedDaysCount = () => {
    return dayNames.filter(day => {
      const dayTasks = tasksByDay[day] || [];
      return dayTasks.length > 0 && dayTasks.every(t => t.todayDone);
    }).length;
  };

  const completedDaysCount = getCompletedDaysCount();
  const remainingDaysCount = dayNames.length - completedDaysCount;
  const progressPercent = dayNames.length > 0 ? Math.round((completedDaysCount / dayNames.length) * 100) : 0;

  const getMealsCountPerDay = () => {
    if (dayNames.length === 0) return 0;
    const firstDay = dayNames[0];
    const tasks = tasksByDay[firstDay] || [];
    return tasks.filter(t => t.task_type !== 'snack' && t.task_type !== 'workout').length;
  };

  const mealsCountPerDay = getMealsCountPerDay();

  const filteredDayNames = dayNames.filter(day =>
    day.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || isGuardLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={[styles.headerTitleBox, { marginRight: 16 }]}>
            <Skeleton width={140} height={20} borderRadius={8} style={{ marginBottom: 6 }} />
            <Skeleton width={90} height={14} borderRadius={5} />
          </View>
        </View>
        <View style={{ padding: 24, gap: 16 }}>
          <Skeleton width="100%" height={100} borderRadius={24} />
          <Skeleton width="100%" height={90} borderRadius={24} />
          <Skeleton width="100%" height={56} borderRadius={24} />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={96} borderRadius={24} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!isSubscribed) {
    return <ExpiredState />;
  }

  // Width for stats cards in a 2x2 grid
  const statsCardWidth = (screenWidth - 48 - 16) / 2;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header (Top App Bar) */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'flex-start' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#2A4D44" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>{planTitle}</Text>
          <Text style={styles.headerSubtitle}>
            مدة البرنامج: {dayNames.length} يوم • {mealsCountPerDay} وجبات يومياً
          </Text>
        </View>
      </View>

      {dayNames.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-clear-outline" size={60} color="#717975" />
          <Text style={styles.emptyText}>لا توجد مهام مسجلة في هذا النظام.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statsCard, { width: statsCardWidth }]}>
              <Text style={styles.statsLabel}>إجمالي الأيام</Text>
              <Text style={[styles.statsValue, { color: '#2A4D44' }]}>{dayNames.length}</Text>
            </View>
            <View style={[styles.statsCard, { width: statsCardWidth }]}>
              <Text style={styles.statsLabel}>الأيام المكتملة</Text>
              <Text style={[styles.statsValue, { color: '#10B981' }]}>{completedDaysCount}</Text>
            </View>
            <View style={[styles.statsCard, { width: statsCardWidth }]}>
              <Text style={styles.statsLabel}>الأيام المتبقية</Text>
              <Text style={[styles.statsValue, { color: '#F26E11' }]}>{remainingDaysCount}</Text>
            </View>
            <View style={[styles.statsCard, { width: statsCardWidth }]}>
              <Text style={styles.statsLabel}>نسبة الإنجاز</Text>
              <Text style={[styles.statsValue, { color: '#2A4D44' }]}>{progressPercent}%</Text>
            </View>
          </View>

          {/* Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>تقدم البرنامج</Text>
              <Text style={styles.progressInfo}>{completedDaysCount} من {dayNames.length} يوم مكتملة</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={[
              styles.searchInputWrapper,
              isSearchFocused && styles.searchInputWrapperFocused
            ]}>
              <Ionicons name="search-outline" size={20} color={isSearchFocused ? '#F26E11' : '#717975'} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="ابحث عن يوم..."
                placeholderTextColor="#717975"
                value={searchQuery}
                onChangeText={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </View>
          </View>

          {/* Days List */}
          <View style={styles.daysListContainer}>
            {filteredDayNames.length === 0 ? (
              <View style={styles.searchEmptyContainer}>
                <View style={styles.searchEmptyIconBox}>
                  <Ionicons name="search-outline" size={48} color="#717975" />
                </View>
                <Text style={styles.searchEmptyText}>لا توجد أيام مطابقة لنتيجة البحث.</Text>
              </View>
            ) : (
              filteredDayNames.map((dayName) => {
                const dayTasks = tasksByDay[dayName] || [];
                const dayMealsCount = dayTasks.filter(t => t.task_type !== 'snack' && t.task_type !== 'workout').length;
                const daySnacksCount = dayTasks.filter(t => t.task_type === 'snack').length;

                const isCompleted = dayTasks.length > 0 && dayTasks.every(t => t.todayDone);
                const dayNum = getDayNumFromName(dayName);
                const isCurrent = currentDayNum !== null && dayNum === currentDayNum;

                return (
                  <TouchableOpacity
                    key={dayName}
                    style={[
                      styles.dayCard,
                      isCurrent && styles.dayCardCurrent,
                    ]}
                    onPress={() => setSelectedDayForModal(dayName)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.dayCardRightSide}>
                      <View style={[
                        styles.calendarIconContainer,
                        isCurrent && styles.calendarIconContainerCurrent,
                        isCompleted && styles.calendarIconContainerCompleted,
                        !isCurrent && !isCompleted && styles.calendarIconContainerNotStarted,
                      ]}>
                        <Ionicons
                          name={isCompleted || isCurrent ? 'calendar' : 'calendar-outline'}
                          size={24}
                          color={isCurrent ? '#F26E11' : isCompleted ? '#2A4D44' : '#717975'}
                        />
                      </View>
                      <View style={styles.dayTextContainer}>
                        <View style={styles.dayTitleRow}>
                          <Text style={styles.dayTitleText}>{dayName}</Text>
                          {isCurrent && (
                            <View style={styles.currentBadge}>
                              <Text style={styles.currentBadgeText}>اليوم الحالي</Text>
                            </View>
                          )}
                          {isCompleted && (
                            <View style={styles.completedBadge}>
                              <Ionicons name="checkmark-circle" size={12} color="#002113" style={{ marginLeft: 4 }} />
                              <Text style={styles.completedBadgeText}>مكتمل</Text>
                            </View>
                          )}
                          {!isCurrent && !isCompleted && (
                            <View style={styles.notStartedBadge}>
                              <Text style={styles.notStartedBadgeText}>لم يبدأ</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.daySubtitleText}>
                          {dayMealsCount} وجبات • {daySnacksCount} سناك
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color="#717975"
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* Dynamic Height Bottom Sheet Modal */}
      {selectedDayForModal && (
        <Modal
          visible={!!selectedDayForModal}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDayForModal(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedDayForModal(null)}>
            <View
              style={[
                styles.modalSheet,
                { paddingBottom: Math.max(insets.bottom, 24) }
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalDragHandle} />

              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setSelectedDayForModal(null)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#2A4D44" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>تفاصيل التغذية - {selectedDayForModal}</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {(() => {
                  const dayTasks = tasksByDay[selectedDayForModal] || [];
                  const sortedTasks = [...dayTasks].sort((a, b) => {
                    const orderA = getTaskTypeOrder(a.task_type);
                    const orderB = getTaskTypeOrder(b.task_type);
                    if (orderA !== orderB) return orderA - orderB;
                    return a.order_index - b.order_index;
                  });

                  if (sortedTasks.length === 0) {
                    return (
                      <View style={styles.emptyDayContainer}>
                        <Ionicons name="nutrition-outline" size={48} color="#717975" style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyDayText}>لا توجد وجبات لهذا اليوم.</Text>
                      </View>
                    );
                  }

                  return sortedTasks.map((task) => {
                    const parsedComponents = parseMealComponents(task.content);
                    const mealIcon = getMealIcon(task.task_type);
                    const mealColor = getMealColor(task.task_type);
                    const mealBg = getMealBg(task.task_type);
                    const mealName = getMealName(task.task_type);

                    return (
                      <View key={task.id} style={styles.mealCard}>
                        <View style={styles.mealCardHeader}>
                          <View style={[styles.mealIconBox, { backgroundColor: mealBg }]}>
                            <Ionicons name={mealIcon as any} size={20} color={mealColor} />
                          </View>
                          <Text style={[styles.mealTitle, { color: mealColor }]}>{mealName}</Text>
                        </View>
                        <View style={styles.mealComponentsWrapper}>
                          {parsedComponents.map((component, idx) => (
                            <Text key={idx} style={styles.componentBulletItem}>
                              • {component}
                            </Text>
                          ))}
                        </View>
                      </View>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F3' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F8F3' },
  emptyText: { marginTop: 16, color: '#717975', fontSize: 16, fontWeight: '600', fontFamily: 'Tajawal-Bold' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F8F3',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: { flexDirection: 'column', alignItems: 'flex-start', flex: 1 },
  headerTitle: { color: '#2A4D44', fontSize: 20, fontWeight: '600', fontFamily: 'Tajawal-Bold', textAlign: 'right' },
  headerSubtitle: { color: '#717975', fontSize: 12, marginTop: 4, fontWeight: '600', fontFamily: 'Tajawal-Medium', textAlign: 'right' },

  scrollContent: { paddingHorizontal: 24, paddingVertical: 24, gap: 32 },

  // Summary Stats Grid (Flex grid layout for 2 columns on mobile)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 2,
  },
  statsLabel: { fontSize: 12, color: '#717975', fontWeight: '600', marginBottom: 4, fontFamily: 'Tajawal-Medium' },
  statsValue: { fontSize: 24, fontWeight: '600', fontFamily: 'Tajawal-Bold' },

  // Progress Card
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressTitle: { fontSize: 20, fontWeight: '600', color: '#2A4D44', fontFamily: 'Tajawal-Bold' },
  progressInfo: { fontSize: 14, fontWeight: '500', color: '#F26E11', fontFamily: 'Tajawal-Medium' },
  progressBarBg: { height: 12, backgroundColor: '#d9e3f6', borderRadius: 9999, overflow: 'hidden' },
  progressBarFill: { height: 12, backgroundColor: '#F26E11', borderRadius: 9999 },

  // Search Section
  searchSection: {},
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#C1C8C4',
    paddingHorizontal: 16,
    height: 56,
  },
  searchInputWrapperFocused: {
    borderColor: '#2A4D44',
  },
  searchInput: { flex: 1, height: '100%', fontSize: 16, color: '#121c2a', textAlign: 'right', fontFamily: 'Tajawal-Regular' },
  searchIcon: { marginLeft: 12 },

  // Search Empty State
  searchEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 2,
  },
  searchEmptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchEmptyText: { fontSize: 14, color: '#717975', fontWeight: '600', fontFamily: 'Tajawal-Bold' },

  // Days List
  daysListContainer: { gap: 16 },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 2,
  },
  dayCardCurrent: {
    borderWidth: 2,
    borderColor: '#F26E11',
  },
  dayCardRightSide: { flexDirection: 'row', alignItems: 'center', gap: 24, flex: 1 },
  calendarIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  calendarIconContainerCurrent: { backgroundColor: '#ffdbcb' },
  calendarIconContainerCompleted: { backgroundColor: '#dee9fc' },
  calendarIconContainerNotStarted: { backgroundColor: '#eff4ff' },
  dayTextContainer: { alignItems: 'flex-start', flex: 1 },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dayTitleText: { fontSize: 20, fontWeight: '600', color: '#2A4D44', fontFamily: 'Tajawal-Bold' },

  // Badges
  currentBadge: { backgroundColor: '#F26E11', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  currentBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600', fontFamily: 'Tajawal-Bold' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  completedBadgeText: { color: '#002113', fontSize: 10, fontWeight: '600', fontFamily: 'Tajawal-Bold' },
  notStartedBadge: { backgroundColor: 'rgba(193, 200, 196, 0.3)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  notStartedBadgeText: { color: '#717975', fontSize: 10, fontWeight: '600', fontFamily: 'Tajawal-Bold' },
  daySubtitleText: { fontSize: 16, color: '#717975', fontWeight: '400', fontFamily: 'Tajawal-Medium', marginTop: 4, textAlign: 'right' },

  // Bottom Sheet Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(18, 28, 42, 0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#F9F8F3',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalDragHandle: { width: 32, height: 4, backgroundColor: '#C1C8C4', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#2A4D44', fontFamily: 'Tajawal-Bold' },
  modalScrollView: { paddingHorizontal: 24 },
  modalScrollContent: { paddingVertical: 20, gap: 16 },

  // Empty Day State
  emptyDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 2,
  },
  emptyDayText: { fontSize: 14, color: '#717975', fontWeight: '600', fontFamily: 'Tajawal-Bold' },

  // Meal Cards Inside Bottom Sheet
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '90%',
    alignSelf: 'center',
  },
  mealCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  mealIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mealTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Tajawal-Bold', textAlign: 'right' },
  mealComponentsWrapper: { gap: 8, paddingRight: 4, alignItems: 'flex-start' },
  componentBulletItem: { fontSize: 14, color: '#414846', textAlign: 'right', fontFamily: 'Tajawal-Regular', lineHeight: 22 },
});