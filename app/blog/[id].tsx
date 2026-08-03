import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { Text } from '@/components/AppText';
import { AppColors, AppRadius, AppSpacing, AppFontFamily, AppFontSize } from '@/constants/AppTheme';
import { AnimatedButton } from '@/components/animations/AnimatedButton';
import { FadeInView } from '@/components/animations/FadeInView';
import { SkeletonLoader } from '@/components/animations/SkeletonLoader';
import { showToast } from '@/components/AppToast';
import type { Article } from '@/src/types';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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

// ─── Custom Native Content Renderer ─────────────────────────
interface ContentBlock {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'bullet' | 'number' | 'quote' | 'image' | 'hr';
  content: string;
  meta?: any;
}

const parseMarkdown = (markdownStr: string): ContentBlock[] => {
  if (!markdownStr) return [];

  // Replace double newlines with placeholder, split blocks
  const blocks: ContentBlock[] = [];
  const rawLines = markdownStr.split('\n');

  let inList = false;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) {
      continue;
    }

    // HR
    if (line === '---' || line === '***' || line === '___') {
      blocks.push({ type: 'hr', content: '' });
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      blocks.push({ type: 'heading1', content: line.replace('# ', '') });
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'heading2', content: line.replace('## ', '') });
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'heading3', content: line.replace('### ', '') });
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      blocks.push({ type: 'quote', content: line.replace('>', '').trim() });
      continue;
    }

    // Bullet List
    if (line.startsWith('* ') || line.startsWith('- ')) {
      blocks.push({ type: 'bullet', content: line.substring(2) });
      continue;
    }

    // Numbered List
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      blocks.push({ type: 'number', content: numMatch[2], meta: { index: numMatch[1] } });
      continue;
    }

    // Image Block: ![alt](url)
    const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      blocks.push({ type: 'image', content: imgMatch[2], meta: { alt: imgMatch[1] } });
      continue;
    }

    // Paragraph
    blocks.push({ type: 'paragraph', content: line });
  }

  return blocks;
};

// Simple text inline parsing helper for **bold** and [link](url)
const renderInlineText = (text: string) => {
  const parts = [];
  let currentIndex = 0;

  // Simple regex matching for bold and links
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  const matches = [...text.matchAll(regex)];

  if (matches.length === 0) {
    return <Text>{text}</Text>;
  }

  matches.forEach((match, index) => {
    const matchStr = match[0];
    const matchIndex = match.index || 0;

    // text before match
    if (matchIndex > currentIndex) {
      parts.push(
        <Text key={`text-${index}`}>{text.substring(currentIndex, matchIndex)}</Text>
      );
    }

    if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
      // Bold
      const boldText = matchStr.substring(2, matchStr.length - 2);
      parts.push(
        <Text key={`bold-${index}`} style={styles.boldText}>
          {boldText}
        </Text>
      );
    } else if (matchStr.startsWith('[') && matchStr.includes('](')) {
      // Link
      const linkText = matchStr.substring(1, matchStr.indexOf(']'));
      const linkUrl = matchStr.substring(matchStr.indexOf('](') + 2, matchStr.length - 1);
      parts.push(
        <Text
          key={`link-${index}`}
          style={styles.linkText}
          onPress={() => Linking.openURL(linkUrl)}
        >
          {linkText}
        </Text>
      );
    }

    currentIndex = matchIndex + matchStr.length;
  });

  if (currentIndex < text.length) {
    parts.push(<Text key="text-end">{text.substring(currentIndex)}</Text>);
  }

  return <Text>{parts}</Text>;
};

export default function ArticleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArticle = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: art, error } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        setArticle(art);

        if (art) {
          const { data: rel } = await supabase
            .from('articles')
            .select('*')
            .neq('id', id)
            .order('created_at', { ascending: false })
            .limit(4);
          setRelated(rel || []);
        }
      } catch (err: any) {
        showToast.error('خطأ في تحميل المقال');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [id]);

  const handleShare = async () => {
    if (!article) return;
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\n${article.excerpt || ''}\n\nاقرأ المزيد على Healix.`,
      });
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={AppColors.danger} />
        <Text style={styles.errorText}>المقال غير موجود</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>رجوع للمقالات</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const blocks = parseMarkdown(article.content);
  const readingTime = estimateReadingTime(article.content);

  return (
    <View style={styles.container}>
      {/* ── Floating Header Back Buttons ──────────────────── */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + AppSpacing.sm }]}>
        <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cover Image & Overlay */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: article.image_url || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=85' }}
            style={styles.coverImage}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
            style={styles.gradientOverlay}
          />
          <View style={styles.coverDetails}>
            <View style={styles.coverMetaRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{article.category || 'الصحة العامة'}</Text>
              </View>
              <Text style={styles.coverMetaText}>{readingTime} دقائق قراءة</Text>
              <Text style={styles.coverMetaText}>•</Text>
              <Text style={styles.coverMetaText}>{formatDate(article.created_at)}</Text>
            </View>
            <Text style={styles.title}>{article.title}</Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.contentBody}>
          {blocks.map((block, idx) => {
            switch (block.type) {
              case 'heading1':
                return (
                  <Text key={idx} style={styles.h1}>
                    {block.content}
                  </Text>
                );
              case 'heading2':
                return (
                  <Text key={idx} style={styles.h2}>
                    {block.content}
                  </Text>
                );
              case 'heading3':
                return (
                  <Text key={idx} style={styles.h3}>
                    {block.content}
                  </Text>
                );
              case 'quote':
                return (
                  <View key={idx} style={styles.quoteBlock}>
                    <Text style={styles.quoteText}>{block.content}</Text>
                  </View>
                );
              case 'bullet':
                return (
                  <View key={idx} style={styles.listRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.listItemText}>{renderInlineText(block.content)}</Text>
                  </View>
                );
              case 'number':
                return (
                  <View key={idx} style={styles.listRow}>
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberBadgeText}>{block.meta?.index || '١'}</Text>
                    </View>
                    <Text style={styles.listItemText}>{renderInlineText(block.content)}</Text>
                  </View>
                );
              case 'image':
                return (
                  <Image
                    key={idx}
                    source={{ uri: block.content }}
                    style={styles.bodyImage}
                  />
                );
              case 'hr':
                return <View key={idx} style={styles.hr} />;
              default:
                return (
                  <Text key={idx} style={styles.paragraph}>
                    {renderInlineText(block.content)}
                  </Text>
                );
            }
          })}
        </View>

        {/* Related Articles Row */}
        {related.length > 0 && (
          <View style={styles.relatedContainer}>
            <Text style={styles.relatedHeader}>مقالات ذات صلة</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedContent}
            >
              {related.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.relatedCard}
                  onPress={() => router.replace(`/blog/${item.id}`)}
                >
                  <Image source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80' }} style={styles.relatedImage} />
                  <View style={styles.relatedTextWrapper}>
                    <Text style={styles.relatedCardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.relatedCardMeta}>
                      {item.category || 'الصحة العامة'} • {estimateReadingTime(item.content)} د
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AnimatedButton style={styles.stickyBackBtn} onPress={() => router.push('/blog')}>
          <Ionicons name="arrow-forward-outline" size={18} color="#FFFFFF" />
          <Text style={styles.stickyBackBtnText}>رجوع للمقالات</Text>
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F3', // Warm white background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F8F3',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.xxl,
    backgroundColor: '#F9F8F3',
  },
  errorText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.textPrimary,
    marginVertical: AppSpacing.md,
  },
  backBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.full,
  },
  backBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: '#FFFFFF',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  coverContainer: {
    width: '100%',
    height: 380,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
  },
  coverDetails: {
    position: 'absolute',
    bottom: AppSpacing.xl,
    left: AppSpacing.xl,
    right: AppSpacing.xl,
  },
  coverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.md,
  },
  badge: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
    borderRadius: AppRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: '#FFFFFF',
  },
  coverMetaText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs + 1,
    color: 'rgba(255,255,255,0.85)',
  },
  title: {
    fontFamily: AppFontFamily.extraBold,
    fontSize: AppFontSize.xxl + 2,
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: 34,
  },
  contentBody: {
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.xl,
  },
  paragraph: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.md + 1,
    color: AppColors.textPrimary,
    lineHeight: 28,
    textAlign: 'left',
    marginBottom: AppSpacing.lg,
  },
  boldText: {
    fontFamily: AppFontFamily.bold,
  },
  linkText: {
    fontFamily: AppFontFamily.bold,
    color: AppColors.primary,
    textDecorationLine: 'underline',
  },
  h1: {
    fontFamily: AppFontFamily.extraBold,
    fontSize: AppFontSize.xxl,
    color: AppColors.primary,
    textAlign: 'left',
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.md,
    lineHeight: 30,
  },
  h2: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xl,
    color: AppColors.primary,
    textAlign: 'left',
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.md,
  },
  h3: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.primary,
    textAlign: 'left',
    marginTop: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  quoteBlock: {
    backgroundColor: AppColors.primaryLight,
    borderRightWidth: 4,
    borderRightColor: AppColors.primary,
    padding: AppSpacing.md,
    marginVertical: AppSpacing.md,
    borderRadius: AppRadius.sm,
  },
  quoteText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.md,
    color: AppColors.primary,
    textAlign: 'left',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: AppSpacing.sm,
    paddingRight: AppSpacing.xs,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.primary,
    marginTop: 10,
    marginRight: AppSpacing.sm,
  },
  numberBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginRight: AppSpacing.sm,
  },
  numberBadgeText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: AppColors.primary,
    lineHeight: 14,
  },
  listItemText: {
    flex: 1,
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.md,
    color: AppColors.textPrimary,
    lineHeight: 24,
    textAlign: 'left',
  },
  bodyImage: {
    width: '100%',
    height: 200,
    borderRadius: AppRadius.md,
    resizeMode: 'cover',
    marginVertical: AppSpacing.md,
  },
  hr: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: AppSpacing.xl,
  },
  relatedContainer: {
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
    paddingTop: AppSpacing.xl,
    paddingHorizontal: AppSpacing.xl,
  },
  relatedHeader: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.textPrimary,
    textAlign: 'left',
    marginBottom: AppSpacing.md,
  },
  relatedContent: {
    gap: AppSpacing.md,
    paddingBottom: AppSpacing.md,
  },
  relatedCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  relatedImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  relatedTextWrapper: {
    padding: AppSpacing.sm,
  },
  relatedCardTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm + 1,
    color: AppColors.textPrimary,
    textAlign: 'left',
    lineHeight: 18,
  },
  relatedCardMeta: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs,
    color: AppColors.textSecondary,
    textAlign: 'left',
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: AppSpacing.sm + 2,
    paddingHorizontal: AppSpacing.xl,
  },
  stickyBackBtn: {
    backgroundColor: AppColors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    borderRadius: AppRadius.full,
    gap: AppSpacing.sm,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  stickyBackBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: '#FFFFFF',
  },
});
