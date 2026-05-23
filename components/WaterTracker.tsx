import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { executeQuery } from '../src/lib/apiClient';
import { useFamily } from '../src/context/FamilyContext';
import { logger } from '../src/lib/logger';
import { AppColors, HydrationColors } from '../constants/AppTheme';
import { Strings } from '../constants/strings';
import { AppCache } from '../src/lib/cache';
import * as Haptics from 'expo-haptics';

const CIRCLE_SIZE = 160; // كبرنا الدايرة شوية

export default function WaterTracker() {
  const { currentProfile } = useFamily();
  const userId = currentProfile?.id;

  const [targetGlasses, setTargetGlasses] = useState(8);
  const [consumedGlasses, setConsumedGlasses] = useState(0);
  const [loading, setLoading] = useState(true);

  // أنيميشن الموجة الانسيابية
  const fillAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current; // هزة خفيفة عند الإضافة

  const loadCachedData = async () => {
    if (!userId) return;
    try {
      const cached = await AppCache.get<{ consumed: number; target: number }>(`water_${userId}`);
      if (cached) {
        setConsumedGlasses(cached.consumed);
        setTargetGlasses(cached.target);
        animateWater(cached.consumed, cached.target);
        setLoading(false);
      }
    } catch (e) {
      logger.error('Error loading cached water data:', e);
    }
  };

  useEffect(() => {
    if (userId) {
      setLoading(true);
      loadCachedData().then(() => {
        fetchWaterData();
      });
    }
  }, [userId]);

  const fetchWaterData = async () => {
    try {
      // 🔴 P-01 FIX: Parallel queries (was sequential — doubled loading time)
      // 🔴 CF-01 FIX: All calls through executeQuery for timeout/retry
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [lifeRes, waterRes] = await Promise.all([
        executeQuery<{ water_liters: number } | null>(
          supabase.from('lifestyle_profile').select('water_liters').eq('user_id', userId).single(),
          { isIdempotent: true }
        ),
        executeQuery<{ amount: number }[]>(
          supabase.from('water_tracking').select('amount').eq('user_id', userId).gte('recorded_at', today.toISOString()),
          { isIdempotent: true }
        ),
      ]);

      let target = 8;
      if (lifeRes.data?.water_liters) {
        target = Math.round(lifeRes.data.water_liters * 4);
        setTargetGlasses(target);
      }

      let totalConsumed = 0;
      if (waterRes.data) {
        totalConsumed = waterRes.data.reduce((sum, record) => sum + (record.amount || 0), 0);
        setConsumedGlasses(totalConsumed);
        animateWater(totalConsumed, target);
      }

      // Save to cache
      await AppCache.set(`water_${userId}`, { consumed: totalConsumed, target });
    } catch (error) { logger.error('Error water data:', error); } finally { setLoading(false); }
  };

  const animateWater = (consumed: number, target: number) => {
    const percentage = Math.min((consumed / target) * 100, 100);
    // 🌟 أنيميشن انسيابي ناعم جداً
    Animated.timing(fillAnim, {
      toValue: percentage,
      duration: 1000,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  };

  const shakeWater = () => {
    // أنيميشن هزة خفيفة للمياه كأنك حطيت فيها حاجة
    Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 5, duration: 100, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 100, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: false }),
    ]).start();
  }

  const handleAddGlass = async () => {
    const newAmount = consumedGlasses + 1;
    setConsumedGlasses(newAmount);
    animateWater(newAmount, targetGlasses);
    shakeWater(); // تشغيل الهزة البصرية
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Save to cache immediately (optimistic UI)
    await AppCache.set(`water_${userId}`, { consumed: newAmount, target: targetGlasses });

    try {
      const { error } = await executeQuery(
        supabase.from('water_tracking').insert([{ user_id: userId, amount: 1, recorded_at: new Date().toISOString() }]),
        { retries: 1 }
      );
      if (error) throw error;
    } catch (err) {
      logger.error('Error adding water:', err);
      // Rollback on error
      setConsumedGlasses(consumedGlasses);
      animateWater(consumedGlasses, targetGlasses);
      await AppCache.set(`water_${userId}`, { consumed: consumedGlasses, target: targetGlasses });
    }
  };

  const handleRemoveGlass = async () => {
    if (consumedGlasses <= 0) return;
    const newAmount = consumedGlasses - 1;
    setConsumedGlasses(newAmount);
    animateWater(newAmount, targetGlasses);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Save to cache immediately (optimistic UI)
    await AppCache.set(`water_${userId}`, { consumed: newAmount, target: targetGlasses });

    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data, error } = await executeQuery<{ id: string }[]>(
        supabase.from('water_tracking').select('id').eq('user_id', userId).gte('recorded_at', today.toISOString()).order('recorded_at', { ascending: false }).limit(1),
        { isIdempotent: true }
      );
      
      if (error) throw error;
      if (data && data.length > 0) {
        const { error: deleteError } = await executeQuery(
          supabase.from('water_tracking').delete().eq('id', data[0].id),
          { retries: 0 }
        );
        if (deleteError) throw deleteError;
      }
    } catch (err) {
      logger.error('Error removing water:', err);
      // Rollback on error
      setConsumedGlasses(consumedGlasses);
      animateWater(consumedGlasses, targetGlasses);
      await AppCache.set(`water_${userId}`, { consumed: consumedGlasses, target: targetGlasses });
    }
  };

  const waterHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCLE_SIZE, 0] // بنقلل الـ top عشان الميه تطلع لفوق
  });

  const percentage = Math.min(Math.round((consumedGlasses / targetGlasses) * 100), 100);

  if (loading) return null;

  return (
    <View style={styles.container}>
      {/* هيدر ناعم ومدمج */}
      <View style={styles.header}>
        <Text style={styles.motivationText}>{Strings.water.motivation}</Text>
        <Text style={styles.cardTitle}>{Strings.water.title}</Text>
      </View>

      <View style={styles.mainContent}>
        {/* 🌟 زرار التقليل الجانبي الأنيق */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleRemoveGlass} activeOpacity={0.7}>
          <Ionicons name="remove" size={20} color={AppColors.textMuted} />
        </TouchableOpacity>

        {/* 🌟 الفقاعة المائية المجسمة (The Fluid Bubble) */}
        <View style={styles.glassContainer}>
            <View style={styles.circleOuter}>
                <Animated.View style={[styles.waveFill, { top: waterHeight, transform: [{ translateX: shakeAnim }] }]}>
                    {/* عملنا طبقتين لون عشان شكل الموجة يبان */}
                    <View style={styles.waveTop} />
                    <View style={styles.waveBody} />
                </Animated.View>
                
                <View style={styles.textOverlay}>
                    <View style={styles.iconCountRow}>
                        <Ionicons name="water" size={18} color={percentage > 60 ? HydrationColors.bgLight : HydrationColors.textDark} style={{marginLeft: 5}}/>
                        <Text style={[styles.glassCount, { color: percentage > 60 ? '#FFF' : HydrationColors.textDark }]}>{consumedGlasses}</Text>
                    </View>
                    <Text style={[styles.glassTarget, { color: percentage > 60 ? 'rgba(255,255,255,0.7)' : HydrationColors.waveLight }]}>{Strings.water.glassesOf(targetGlasses)}</Text>
                </View>
                
                {/* طبقة تظليل زجاجية */}
                <View style={styles.glassShine} />
            </View>
        </View>

        {/* 🌟 زرار الإضافة العائم المتوهج */}
        <TouchableOpacity 
          style={[styles.floatingAddBtn, consumedGlasses >= targetGlasses && { backgroundColor: HydrationColors.complete, shadowColor: HydrationColors.complete }]} 
          onPress={handleAddGlass} 
          activeOpacity={0.8}
        >
          <Ionicons name={consumedGlasses >= targetGlasses ? "checkmark-done" : "add"} size={34} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 35 },
  header: { alignItems: 'flex-end', paddingHorizontal: 5, marginBottom: 15 },
  cardTitle: { fontSize: 22, fontWeight: '900', color: AppColors.textPrimary, textAlign: 'right' },
  motivationText: { fontSize: 13, color: HydrationColors.waveLight, fontWeight: 'bold', marginBottom: 2 },
  
  mainContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 15 },
  
  // تنسيقات الدايرة المائية المجسمة
  glassContainer: { elevation: 8, shadowColor: HydrationColors.waveLight, shadowOpacity: 0.3, shadowRadius: 15 },
  circleOuter: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: HydrationColors.bgLight, overflow: 'hidden', borderWidth: 6, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  
  // أنيميشن الموجة المائية المزدوجة
  waveFill: { position: 'absolute', left: -50, right: -50, height: CIRCLE_SIZE },
  waveTop: { height: 25, backgroundColor: HydrationColors.waveLight, borderRadius: 25, transform: [{ scaleX: 1.5 }], borderTopLeftRadius: 50, borderTopRightRadius: 50 },
  waveBody: { flex: 1, backgroundColor: HydrationColors.waveDark },
  
  textOverlay: { zIndex: 20, alignItems: 'center' },
  iconCountRow: { flexDirection: 'row-reverse', alignItems: 'baseline', marginBottom: -5 },
  glassCount: { fontSize: 50, fontWeight: '900' },
  glassTarget: { fontSize: 13, fontWeight: '900', marginTop: -5 },
  
  // طبقة التظليل الزجاجية
  glassShine: { position: 'absolute', top: 15, left: 25, width: 30, height: CIRCLE_SIZE / 2.5, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 15, transform: [{ rotate: '-15deg' }], zIndex: 10 },

  // الأزرار الجديدة
  floatingAddBtn: { width: 70, height: 70, backgroundColor: HydrationColors.waveDark, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: HydrationColors.waveDark, shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.5, shadowRadius: 10 },
  sideBtn: { width: 45, height: 45, backgroundColor: '#FFF', borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: HydrationColors.borderSide, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 }
});