import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';
import { supabase } from '../../src/lib/supabase';
import type { Message } from '../../src/types';
import { AppColors } from '../../constants/AppTheme';

// ────────────────────────────────────────────────────
// 🔴 AUDIT FIX: In-memory signed URL cache.
// Prevents re-fetching the same URL when user scrolls back.
// Evicts after 1 hour (URLs valid for 2h).
// ────────────────────────────────────────────────────
const signedUrlCache = new Map<string, { url: string; expiry: number }>();
const SIGNED_URL_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCachedSignedUrl(path: string): string | null {
  const entry = signedUrlCache.get(path);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    signedUrlCache.delete(path);
    return null;
  }
  return entry.url;
}

function setCachedSignedUrl(path: string, url: string) {
  signedUrlCache.set(path, { url, expiry: Date.now() + SIGNED_URL_TTL_MS });
  // Cap cache size to 200 entries
  if (signedUrlCache.size > 200) {
    const first = signedUrlCache.keys().next().value;
    if (first !== undefined) signedUrlCache.delete(first);
  }
}

// ────────────────────────────────────────────────────
// 🌟 InlineAttachment — extracted into its own memoized component
// ────────────────────────────────────────────────────
interface InlineAttachmentProps {
  path: string;
  type: string;
  isMe: boolean;
}

export const InlineAttachment = React.memo(function InlineAttachment({ path, type, isMe }: InlineAttachmentProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Effect 1: Fetch signed URL — with cache
  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      try {
        if (path.startsWith('http')) {
          if (isMounted) { setSignedUrl(path); setLoading(false); }
          return;
        }

        // 🔴 AUDIT FIX: Check cache first — prevents 50 API calls on fast scroll
        const cached = getCachedSignedUrl(path);
        if (cached) {
          if (isMounted) { setSignedUrl(cached); setLoading(false); }
          return;
        }

        const { data } = await supabase.storage.from('chat-attachments').createSignedUrl(path, 7200);
        if (data && isMounted) {
          setSignedUrl(data.signedUrl);
          setCachedSignedUrl(path, data.signedUrl);
        }
      } catch (e) {
        if (__DEV__) console.log(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUrl();
    return () => { isMounted = false; };
  }, [path]);

  // Effect 2: Cleanup sound on unmount only.
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const toggleAudio = useCallback(async () => {
    if (!signedUrl) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: signedUrl },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
              newSound.setPositionAsync(0);
            } else if (!status.isLoaded && status.error) {
              setIsPlaying(false);
            }
          }
        );
        soundRef.current = newSound;
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (e) {
      if (__DEV__) console.log('Audio play error', e);
      setIsPlaying(false);
    }
  }, [signedUrl, sound, isPlaying]);

  const handleOpenUrl = useCallback(() => {
    if (signedUrl) Linking.openURL(signedUrl);
  }, [signedUrl]);

  if (loading) return <ActivityIndicator size="small" color={isMe ? '#FFF' : AppColors.primary} style={{ marginTop: 10 }} />;
  if (!signedUrl) return null;

  if (type === 'image') {
    return (
      <TouchableOpacity onPress={handleOpenUrl}>
        <Image source={{ uri: signedUrl }} style={bubbleStyles.inlineImage} resizeMode="cover" />
      </TouchableOpacity>
    );
  }

  if (type === 'audio') {
    return (
      <View style={[bubbleStyles.inlineAudioBox, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(42,75,70,0.05)' }]}>
        <TouchableOpacity onPress={toggleAudio} style={[bubbleStyles.audioPlayBtn, { backgroundColor: isMe ? '#FFF' : AppColors.primary }]}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={isMe ? AppColors.primary : '#FFF'} style={{ marginLeft: isPlaying ? 0 : 4 }} />
        </TouchableOpacity>
        <Text style={[bubbleStyles.audioText, { color: isMe ? '#FFF' : AppColors.textPrimary }]}>
          {isPlaying ? 'جاري التشغيل...' : 'رسالة صوتية'}
        </Text>
      </View>
    );
  }

  const fileLabel = path.split('.').pop()?.toUpperCase() || 'ملف';
  return (
    <TouchableOpacity onPress={handleOpenUrl} style={[bubbleStyles.inlineFileBox, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(42,75,70,0.05)' }]}>
      <Ionicons name="document-text" size={18} color={isMe ? '#FFF' : AppColors.primary} />
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: isMe ? '#FFF' : AppColors.primary }}>فتح الملف ({fileLabel})</Text>
    </TouchableOpacity>
  );
});

// ────────────────────────────────────────────────────
// 🌟 MessageBubble — memoized to prevent re-renders on scroll
// 🔴 AUDIT FIX: Previously defined inline inside FlatList.renderItem,
// causing new function allocations on every render.
// ────────────────────────────────────────────────────
interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
}

export const MessageBubble = React.memo(function MessageBubble({ msg, isMe }: MessageBubbleProps) {
  const msgTime = new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[bubbleStyles.messageWrapper, isMe ? bubbleStyles.myMessageWrapper : bubbleStyles.theirMessageWrapper]}>
      <View style={[bubbleStyles.messageBubble, isMe ? bubbleStyles.myBubble : bubbleStyles.theirBubble]}>
        {msg.content ? (
          <Text style={[bubbleStyles.messageText, isMe ? bubbleStyles.myMessageText : bubbleStyles.theirMessageText]}>
            {msg.content}
          </Text>
        ) : null}

        {msg.attachment_url ? (
          <InlineAttachment path={msg.attachment_url} type={msg.attachment_type || 'file'} isMe={isMe} />
        ) : null}

        <View style={bubbleStyles.messageFooter}>
          <Text style={[bubbleStyles.messageTime, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: AppColors.textMuted }]}>
            {msgTime}
          </Text>
          {isMe && (
            <Ionicons
              name={msg.is_read ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={msg.is_read ? '#4ADE80' : 'rgba(255,255,255,0.7)'}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>
    </View>
  );
});

// ────────────────────────────────────────────────────
// Styles (shared between InlineAttachment and MessageBubble)
// ────────────────────────────────────────────────────
export const bubbleStyles = StyleSheet.create({
  messageWrapper: { marginBottom: 15, flexDirection: 'row' },
  myMessageWrapper: { justifyContent: 'flex-start' },
  theirMessageWrapper: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '80%', padding: 15, borderRadius: 20 },
  myBubble: { backgroundColor: AppColors.primary, borderBottomLeftRadius: 5 },
  theirBubble: { backgroundColor: AppColors.surface, borderBottomRightRadius: 5, borderWidth: 1, borderColor: AppColors.border },
  messageText: { fontSize: 15, lineHeight: 22 },
  myMessageText: { color: '#FFF' },
  theirMessageText: { color: AppColors.textPrimary },
  messageFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 5 },
  messageTime: { fontSize: 10, fontWeight: 'bold' },

  inlineImage: { width: 220, height: 220, borderRadius: 15, marginTop: 10, backgroundColor: 'rgba(0,0,0,0.1)' },
  inlineAudioBox: { flexDirection: 'row-reverse', alignItems: 'center', padding: 10, borderRadius: 15, marginTop: 10, minWidth: 180, alignSelf: 'flex-end' },
  audioPlayBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  audioText: { marginRight: 15, fontSize: 13, fontWeight: 'bold' },
  inlineFileBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 10, padding: 10, borderRadius: 10, alignSelf: 'flex-end' },
});
