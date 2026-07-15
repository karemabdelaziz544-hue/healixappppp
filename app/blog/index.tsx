import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { Text, TextInput } from '@/components/AppText';
import { AppColors, AppRadius, AppSpacing, AppFontFamily, AppFontSize } from '@/constants/AppTheme';
import { AnimatedButton } from '@/components/animations/AnimatedButton';
import { FadeInView } from '@/components/animations/FadeInView';
import { SkeletonLoader } from '@/components/animations/SkeletonLoader';
import { showToast } from '@/components/AppToast';
import type { Article } from '@/src/types';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  'الكل',
  'التغذية',
  'إنقاص الوزن',
  'زيادة الوزن',
  'الأطفال',
  'الحمل',
  'الرياضة',
  'الصحة العامة',
  'السكري',
  'ضغط الدم',
];

function estimateReadingTime(text: string): number {
  const words = (text || '').trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

// ─── Animation Wrapper for Cards ─────────────────────────────
const PressableCard: React.FC<{ onPress: () => void; children: React.ReactNode; style?: any }> = ({
  onPress,
  children,
  style,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style]}
    >
      <Animated.View style={[styles.cardContainer, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function BlogListScreen() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  const fetchArticles = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (err: any) {
      showToast.error('خطأ في تحميل المقالات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArticles(true);
  }, []);

  // Filter logic
  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.content || '').toLowerCase().includes(searchQuery.toLowerCase());

    const articleCategory = article.category || 'الصحة العامة';
    const matchesCategory =
      selectedCategory === 'الكل' || articleCategory.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const featuredArticle = filteredArticles[0];
  const latestArticles = filteredArticles.slice(1);

  // ─── Rendering Helper Components ───────────────────────────
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color={AppColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.titleText}>المقالات</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitleText}>تعرف على أحدث المقالات الصحية من فريق Healix.</Text>
    </View>
  );

  const renderSearch = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={AppColors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن مقال..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={AppColors.textMuted}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={AppColors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  isSelected && styles.categoryTextSelected,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {/* Featured skeleton */}
      <View style={styles.featuredSkeleton}>
        <SkeletonLoader height={200} borderRadius={AppRadius.lg} />
        <View style={styles.skeletonMeta}>
          <SkeletonLoader width={80} height={16} />
          <SkeletonLoader width={100} height={16} />
        </View>
        <SkeletonLoader width="90%" height={24} style={{ marginTop: AppSpacing.sm }} />
        <SkeletonLoader width="70%" height={16} style={{ marginTop: AppSpacing.xs }} />
      </View>
      {/* List skeleton */}
      {Array.from({ length: 3 }).map((_, idx) => (
        <View key={idx} style={styles.itemSkeleton}>
          <SkeletonLoader width={100} height={100} borderRadius={AppRadius.md} />
          <View style={styles.itemSkeletonMeta}>
            <SkeletonLoader width={60} height={14} />
            <SkeletonLoader width="95%" height={18} style={{ marginTop: AppSpacing.xs }} />
            <SkeletonLoader width="80%" height={14} style={{ marginTop: AppSpacing.xs }} />
            <SkeletonLoader width={80} height={14} style={{ marginTop: AppSpacing.xs }} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderFeatured = () => {
    if (!featuredArticle) return null;
    const readingTime = estimateReadingTime(featuredArticle.content);
    return (
      <FadeInView delay={100} style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>المقال المميز</Text>
        <PressableCard
          onPress={() => router.push(`/blog/${featuredArticle.id}`)}
          style={styles.featuredCard}
        >
          <Image
            source={{ uri: featuredArticle.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80' }}
            style={styles.featuredImage}
          />
          <View style={styles.featuredContent}>
            <View style={styles.metaRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{featuredArticle.category || 'الصحة العامة'}</Text>
              </View>
              <View style={styles.metaInfo}>
                <Ionicons name="time-outline" size={14} color={AppColors.textSecondary} />
                <Text style={styles.metaText}>{readingTime} دقائق قراءة</Text>
              </View>
            </View>
            <Text style={styles.featuredTitle}>{featuredArticle.title}</Text>
            <Text style={styles.featuredDesc} numberOfLines={2}>
              {featuredArticle.excerpt || featuredArticle.content.substring(0, 100) + '...'}
            </Text>
            <View style={styles.featuredFooter}>
              <Text style={styles.footerDate}>{formatDate(featuredArticle.created_at)}</Text>
              <View style={styles.readMoreContainer}>
                <Text style={styles.readMoreText}>اقرأ المقال</Text>
                <Ionicons name="arrow-back" size={16} color={AppColors.primary} />
              </View>
            </View>
          </View>
        </PressableCard>
      </FadeInView>
    );
  };

  const renderLatestList = () => {
    if (latestArticles.length === 0) return null;
    return (
      <FadeInView delay={200} style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>أحدث المقالات</Text>
        {latestArticles.map((article) => {
          const readingTime = estimateReadingTime(article.content);
          return (
            <PressableCard
              key={article.id}
              onPress={() => router.push(`/blog/${article.id}`)}
              style={styles.latestCard}
            >
              <View style={styles.latestCardContent}>
                <Image
                  source={{ uri: article.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80' }}
                  style={styles.latestImage}
                />
                <View style={styles.latestDetails}>
                  <View style={styles.latestMetaRow}>
                    <Text style={styles.latestCategory}>{article.category || 'الصحة العامة'}</Text>
                    <Text style={styles.latestDivider}>•</Text>
                    <Text style={styles.latestMetaText}>{readingTime} د قراءة</Text>
                  </View>
                  <Text style={styles.latestTitle} numberOfLines={2}>
                    {article.title}
                  </Text>
                  <Text style={styles.latestDesc} numberOfLines={2}>
                    {article.excerpt || article.content.substring(0, 80) + '...'}
                  </Text>
                  <Text style={styles.latestDate}>{formatDate(article.created_at)}</Text>
                </View>
              </View>
            </PressableCard>
          );
        })}
      </FadeInView>
    );
  };

  const renderEmptyState = () => (
    <FadeInView style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={AppColors.textMuted} />
      <Text style={styles.emptyTitle}>لا توجد مقالات متاحة</Text>
      <Text style={styles.emptySubtitle}>جرب تغيير خيارات البحث أو الفئات المحددة.</Text>
      <AnimatedButton style={styles.resetBtn} onPress={() => { setSearchQuery(''); setSelectedCategory('الكل'); }}>
        <Text style={styles.resetBtnText}>عرض كل المقالات</Text>
      </AnimatedButton>
    </FadeInView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {renderHeader()}
      {renderSearch()}
      {renderCategories()}

      {loading ? (
        renderSkeleton()
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.primary]} />
          }
        >
          {filteredArticles.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {renderFeatured()}
              {renderLatestList()}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F3', // Warm white background matching Healix design
  },
  headerContainer: {
    paddingHorizontal: AppSpacing.xxl,
    paddingTop: AppSpacing.md,
    paddingBottom: AppSpacing.sm,
    backgroundColor: '#F9F8F3',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  backButton: {
    padding: AppSpacing.xs,
  },
  titleText: {
    fontFamily: AppFontFamily.extraBold,
    fontSize: AppFontSize.xxl + 2,
    color: AppColors.textPrimary,
  },
  subtitleText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.sm + 1,
    color: AppColors.textSecondary,
    textAlign: 'left',
    marginTop: AppSpacing.xs,
  },
  searchSection: {
    paddingHorizontal: AppSpacing.xxl,
    marginBottom: AppSpacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.md,
    height: 48,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginLeft: AppSpacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.md,
    color: AppColors.textPrimary,
    textAlign: 'left',
  },
  clearButton: {
    marginRight: AppSpacing.xs,
  },
  categoriesContainer: {
    marginBottom: AppSpacing.md,
  },
  categoriesContent: {
    paddingHorizontal: AppSpacing.xxl,
    gap: AppSpacing.sm,
  },
  categoryChip: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.xs + 2,
    borderRadius: AppRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  categoryText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: AppColors.textSecondary,
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionContainer: {
    paddingHorizontal: AppSpacing.xxl,
    marginBottom: AppSpacing.xl,
  },
  sectionTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.textPrimary,
    textAlign: 'left',
    marginBottom: AppSpacing.md,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    overflow: 'hidden',
  },
  featuredCard: {
    width: '100%',
  },
  featuredImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  featuredContent: {
    padding: AppSpacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: AppSpacing.sm + 2,
    paddingVertical: 2,
    borderRadius: AppRadius.sm,
    backgroundColor: AppColors.primaryLight,
  },
  categoryBadgeText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: AppColors.primary,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.textSecondary,
  },
  featuredTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.textPrimary,
    textAlign: 'left',
    marginBottom: AppSpacing.xs,
    lineHeight: 24,
  },
  featuredDesc: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.sm + 1,
    color: AppColors.textSecondary,
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: AppSpacing.md,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: AppSpacing.md,
  },
  footerDate: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.textMuted,
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: AppColors.primary,
  },
  latestCard: {
    marginBottom: AppSpacing.md,
  },
  latestCardContent: {
    flexDirection: 'row',
    padding: AppSpacing.md,
    gap: AppSpacing.md,
  },
  latestImage: {
    width: 100,
    height: 100,
    borderRadius: AppRadius.md,
    resizeMode: 'cover',
  },
  latestDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  latestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  latestCategory: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: AppColors.primary,
  },
  latestDivider: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
  },
  latestMetaText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs,
    color: AppColors.textSecondary,
  },
  latestTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: AppColors.textPrimary,
    textAlign: 'left',
    lineHeight: 20,
    marginVertical: 2,
  },
  latestDesc: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.textSecondary,
    textAlign: 'left',
    lineHeight: 16,
  },
  latestDate: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textAlign: 'left',
    marginTop: 4,
  },
  skeletonContainer: {
    paddingHorizontal: AppSpacing.xxl,
    gap: AppSpacing.lg,
  },
  featuredSkeleton: {
    width: '100%',
    gap: AppSpacing.sm,
  },
  skeletonMeta: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: AppSpacing.sm,
  },
  itemSkeleton: {
    flexDirection: 'row-reverse',
    gap: AppSpacing.md,
  },
  itemSkeletonMeta: {
    flex: 1,
    gap: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.xxxl,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.textPrimary,
    marginTop: AppSpacing.md,
  },
  emptySubtitle: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: AppSpacing.xs,
    lineHeight: 20,
  },
  resetBtn: {
    marginTop: AppSpacing.lg,
    backgroundColor: AppColors.primary,
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.full,
  },
  resetBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: '#FFFFFF',
  },
});
