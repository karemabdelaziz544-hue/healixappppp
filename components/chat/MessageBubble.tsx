import { Text } from '@/components/AppText';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';
import { supabase } from '../../src/lib/supabase';
import type { Message } from '../../src/types';
import { AppColors, AppFontFamily } from '../../constants/AppTheme';
import { AnimatedButton } from '../animations/AnimatedButton';
import { SlideInView } from '../animations/SlideInView';
import { logger } from '../../src/lib/logger';

// ────────────────────────────────────────────────────
// In-memory signed URL cache.
// ────────────────────────────────────────────────────
const signedUrlCache = new Map<string, { url: string; expiry: number }>();
const SIGNED_URL_TTL_MS = 60 * 60 * 1000;

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
  if (signedUrlCache.size > 200) {
    const first = signedUrlCache.keys().next().value;
    if (first !== undefined) signedUrlCache.delete(first);
  }
}

// ────────────────────────────────────────────────────
// Standalone Premium PDF File Card
// ────────────────────────────────────────────────────
interface PdfFileCardProps {
  path: string;
  isMe: boolean;
  msgTime: string;
}

export const PdfFileCard = React.memo(function PdfFileCard({ path, isMe, msgTime }: PdfFileCardProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      try {
        if (path.startsWith('http')) {
          if (isMounted) { setSignedUrl(path); setLoading(false); }
          return;
        }
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
        logger.error('Error fetching signed url for PDF:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUrl();
    return () => { isMounted = false; };
  }, [path]);

  const handleOpenUrl = () => {
    if (signedUrl) Linking.openURL(signedUrl);
  };

  const filename = path.split('/').pop() || 'document.pdf';

  return (
    <View style={bubbleStyles.pdfCard}>
      <View style={bubbleStyles.pdfCardContent}>
        <View style={bubbleStyles.pdfIconBox}>
          <Ionicons name="document-text-outline" size={24} color="#ba1a1a" />
        </View>
        <View style={bubbleStyles.pdfInfo}>
          <Text numberOfLines={1} style={bubbleStyles.pdfTitle}>{filename}</Text>
          <Text style={bubbleStyles.pdfMeta}>PDF • {msgTime}</Text>
        </View>
      </View>
      <View style={bubbleStyles.pdfActions}>
        <TouchableOpacity onPress={handleOpenUrl} style={bubbleStyles.pdfButtonDownload}>
          <Ionicons name="download-outline" size={18} color="#004532" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleOpenUrl} style={bubbleStyles.pdfButtonOpen}>
          <Ionicons name="open-outline" size={18} color="#8bd6b7" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ────────────────────────────────────────────────────
// Standalone Premium Invoice Card
// ────────────────────────────────────────────────────
interface InvoiceCardProps {
  path: string;
  isMe: boolean;
  msgTime: string;
}

export const InvoiceCard = React.memo(function InvoiceCard({ path, isMe, msgTime }: InvoiceCardProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      try {
        if (path.startsWith('http')) {
          if (isMounted) { setSignedUrl(path); setLoading(false); }
          return;
        }
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
        logger.error('Error fetching signed url for invoice:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUrl();
    return () => { isMounted = false; };
  }, [path]);

  const handleOpenUrl = () => {
    if (signedUrl) Linking.openURL(signedUrl);
  };

  return (
    <View style={bubbleStyles.invoiceCard}>
      <View style={bubbleStyles.invoiceHeader}>
        <View style={bubbleStyles.invoiceHeaderRight}>
          <Ionicons name="receipt-outline" size={26} color="#004532" />
          <View style={{ marginStart: 8, alignItems: 'flex-start' }}>
            <Text style={bubbleStyles.invoiceTitle}>فاتورة اشتراك</Text>
            <Text style={bubbleStyles.invoiceDate}>{msgTime}</Text>
          </View>
        </View>
        <View style={bubbleStyles.invoiceBadge}>
          <Text style={bubbleStyles.invoiceBadgeText}>تم الدفع</Text>
        </View>
      </View>
      
      {loading ? (
        <View style={[bubbleStyles.invoiceImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ecefeb' }]}>
          <ActivityIndicator size="small" color="#004532" />
        </View>
      ) : signedUrl ? (
        <Image source={{ uri: signedUrl }} style={bubbleStyles.invoiceImage} resizeMode="cover" />
      ) : null}
      
      <TouchableOpacity onPress={handleOpenUrl} style={bubbleStyles.invoiceButton}>
        <Text style={bubbleStyles.invoiceButtonText}>عرض التفاصيل</Text>
      </TouchableOpacity>
    </View>
  );
});

// ────────────────────────────────────────────────────
// InlineAttachment Component
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
  const [durationMillis, setDurationMillis] = useState<number>(0);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      try {
        if (path.startsWith('http')) {
          if (isMounted) { setSignedUrl(path); setLoading(false); }
          return;
        }
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
            if (status.isLoaded) {
              setDurationMillis(status.durationMillis || 0);
              setPositionMillis(status.positionMillis || 0);
              if (status.didJustFinish) {
                setIsPlaying(false);
                newSound.setPositionAsync(0);
                setPositionMillis(0);
              }
            } else if (!status.isLoaded && status.error) {
              setIsPlaying(false);
            }
          }
        );
        
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setDurationMillis(status.durationMillis || 0);
            setPositionMillis(status.positionMillis || 0);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPositionMillis(0);
            }
          }
        });

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

  if (loading) return <ActivityIndicator size="small" color={isMe ? '#FFF' : '#004532'} style={{ marginTop: 10 }} />;
  if (!signedUrl) return null;

  if (type === 'image') {
    return (
      <AnimatedButton onPress={handleOpenUrl}>
        <Image source={{ uri: signedUrl }} style={bubbleStyles.inlineImage} resizeMode="cover" />
      </AnimatedButton>
    );
  }

  if (type === 'audio') {
    const toArabicDigits = (str: string) => str.replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 0x0660 - 0x0030));
    const formatTime = (millis: number) => {
      if (!millis) return '٠:٠٠';
      const totalSeconds = Math.floor(millis / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return toArabicDigits(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    const displayTime = isPlaying || positionMillis > 0 ? formatTime(positionMillis) : formatTime(durationMillis);
    const durationText = displayTime === '٠:٠٠' ? 'صوت' : displayTime;

    return (
      <View style={[bubbleStyles.voiceBox, { backgroundColor: isMe ? '#004532' : '#ffffff', borderColor: isMe ? 'transparent' : '#bec9c2', borderWidth: isMe ? 0 : 1 }]}>
        <View style={bubbleStyles.voiceRow}>
          <TouchableOpacity onPress={toggleAudio} style={[bubbleStyles.voicePlayBtn, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#004532' }]}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#FFF" style={{ marginStart: isPlaying ? 0 : 2 }} />
          </TouchableOpacity>
          <View style={bubbleStyles.waveformContainer}>
            <View style={[bubbleStyles.waveformBar, { height: 8, backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : 'rgba(0,69,50,0.2)' }]} />
            <View style={[bubbleStyles.waveformBar, { height: 16, backgroundColor: isMe ? '#FFF' : '#004532' }]} />
            <View style={[bubbleStyles.waveformBar, { height: 12, backgroundColor: isMe ? '#FFF' : '#004532' }]} />
            <View style={[bubbleStyles.waveformBar, { height: 20, backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : 'rgba(0,69,50,0.2)' }]} />
            <View style={[bubbleStyles.waveformBar, { height: 8, backgroundColor: isMe ? '#FFF' : '#004532' }]} />
            <View style={[bubbleStyles.waveformBar, { height: 14, backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : 'rgba(0,69,50,0.2)' }]} />
            <View style={[bubbleStyles.waveformBar, { height: 24, backgroundColor: isMe ? '#FFF' : '#004532' }]} />
            <View style={[bubbleStyles.waveformBar, { height: 12, backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : 'rgba(0,69,50,0.2)' }]} />
          </View>
          <Text style={[bubbleStyles.voiceDuration, { color: isMe ? '#FFF' : '#3f4944' }]}>{durationText}</Text>
        </View>
      </View>
    );
  }

  const fileLabel = path.split('.').pop()?.toUpperCase() || 'ملف';
  return (
    <AnimatedButton onPress={handleOpenUrl} style={[bubbleStyles.inlineFileBox, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(42,75,70,0.05)' }]}>
      <Ionicons name="document-text" size={18} color={isMe ? '#FFF' : '#004532'} />
      <Text style={{ fontSize: 13, fontFamily: AppFontFamily.bold, color: isMe ? '#FFF' : '#004532' }}>فتح الملف ({fileLabel})</Text>
    </AnimatedButton>
  );
});

// ────────────────────────────────────────────────────
// MessageBubble Component
// ────────────────────────────────────────────────────
interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
}

export const MessageBubble = React.memo(function MessageBubble({ msg, isMe }: MessageBubbleProps) {
  const msgTime = new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  if (msg.sender_id === null || msg.sender_id === 'system') {
    return (
      <SlideInView direction="up" delay={50} style={bubbleStyles.systemWrapper}>
        <View style={bubbleStyles.systemMessage}>
          <Text style={bubbleStyles.systemMessageText}>{msg.content}</Text>
        </View>
      </SlideInView>
    );
  }

  const isPDF = msg.attachment_url && (msg.attachment_type === 'file' || msg.attachment_url.toLowerCase().endsWith('.pdf'));
  const isInvoice = msg.attachment_url && msg.attachment_type === 'image' && (msg.content?.includes('فاتورة') || msg.attachment_url.toLowerCase().includes('receipt') || msg.attachment_url.toLowerCase().includes('invoice'));

  if (isPDF) {
    return (
      <SlideInView direction="up" delay={50} style={[bubbleStyles.messageWrapper, isMe ? bubbleStyles.myMessageWrapper : bubbleStyles.theirMessageWrapper]}>
        <PdfFileCard path={msg.attachment_url!} isMe={isMe} msgTime={msgTime} />
      </SlideInView>
    );
  }

  if (isInvoice) {
    return (
      <SlideInView direction="up" delay={50} style={[bubbleStyles.messageWrapper, isMe ? bubbleStyles.myMessageWrapper : bubbleStyles.theirMessageWrapper]}>
        <InvoiceCard path={msg.attachment_url!} isMe={isMe} msgTime={msgTime} />
      </SlideInView>
    );
  }

  return (
    <SlideInView direction="up" delay={50} style={[bubbleStyles.messageWrapper, isMe ? bubbleStyles.myMessageWrapper : bubbleStyles.theirMessageWrapper]}>
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
          <Text style={[bubbleStyles.messageTime, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: '#3f4944' }]}>
            {msgTime}
          </Text>
          {isMe && (
            <Ionicons
              name={msg.is_read ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={msg.is_read ? '#4ADE80' : 'rgba(255,255,255,0.7)'}
              style={{ marginStart: 4 }}
            />
          )}
        </View>
      </View>
    </SlideInView>
  );
});

// ────────────────────────────────────────────────────
// Redesigned bubbleStyles
// ────────────────────────────────────────────────────
export const bubbleStyles = StyleSheet.create({
  messageWrapper: { 
    marginBottom: 16, 
    flexDirection: 'row', 
    width: '100%',
  },
  myMessageWrapper: { 
    justifyContent: 'flex-start', // RTL Aligned right
  },
  theirMessageWrapper: { 
    justifyContent: 'flex-end', // RTL Aligned left
  },
  messageBubble: { 
    maxWidth: '85%', 
    paddingHorizontal: 24, 
    paddingVertical: 16,
  },
  myBubble: { 
    backgroundColor: '#004532',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 4,
    shadowColor: '#004532',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  theirBubble: { 
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 24,
    borderWidth: 1, 
    borderColor: '#bec9c2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 5,
    elevation: 1,
  },
  messageText: { 
    fontSize: 16, 
    lineHeight: 25.6, 
    fontFamily: AppFontFamily.regular,
    textAlign: 'left' // Natural flow in RTL
  },
  myMessageText: { 
    color: '#ffffff' 
  },
  theirMessageText: { 
    color: '#181c1a'
  },
  messageFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start', 
    marginTop: 6 
  },
  messageTime: { 
    fontSize: 12, 
    fontFamily: AppFontFamily.regular
  },

  inlineImage: { 
    width: 220, 
    height: 140, 
    borderRadius: 16, 
    marginTop: 10, 
    backgroundColor: 'rgba(0,0,0,0.05)' 
  },
  inlineFileBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginTop: 10, 
    padding: 10, 
    borderRadius: 12, 
    alignSelf: 'flex-end' 
  },

  voiceBox: {
    padding: 12,
    borderRadius: 24,
    minWidth: 240,
    marginTop: 8,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  voicePlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 24,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
  },
  voiceDuration: {
    fontSize: 12,
    fontFamily: AppFontFamily.medium,
  },

  pdfCard: {
    backgroundColor: '#ffffff',
    borderColor: '#bec9c2',
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#004532',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  pdfCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  pdfIconBox: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 218, 214, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  pdfTitle: {
    fontSize: 14,
    fontFamily: AppFontFamily.bold,
    color: '#181c1a',
    textAlign: 'left',
    width: '100%',
  },
  pdfMeta: {
    fontSize: 12,
    fontFamily: AppFontFamily.regular,
    color: '#3f4944',
    marginTop: 2,
    textAlign: 'left',
    width: '100%',
  },
  pdfActions: {
    flexDirection: 'row',
    gap: 8,
  },
  pdfButtonOpen: {
    backgroundColor: '#065f46',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfButtonDownload: {
    backgroundColor: '#e6e9e5',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  invoiceCard: {
    backgroundColor: '#ffffff',
    borderColor: '#bec9c2',
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    width: '85%',
    shadowColor: '#004532',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceTitle: {
    fontSize: 14,
    fontFamily: AppFontFamily.bold,
    color: '#181c1a',
  },
  invoiceDate: {
    fontSize: 12,
    fontFamily: AppFontFamily.regular,
    color: '#3f4944',
  },
  invoiceBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  invoiceBadgeText: {
    color: '#8bd6b7',
    fontSize: 12,
    fontFamily: AppFontFamily.bold,
  },
  invoiceImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginBottom: 12,
  },
  invoiceButton: {
    backgroundColor: '#d3e3dc',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceButtonText: {
    color: '#566660',
    fontSize: 14,
    fontFamily: AppFontFamily.bold,
  },

  systemWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  systemMessage: {
    backgroundColor: 'rgba(230, 233, 229, 0.5)',
    borderColor: 'rgba(190, 201, 194, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    fontFamily: AppFontFamily.medium,
    color: '#3f4944',
    textAlign: 'center',
  },
});
