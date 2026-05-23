import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase'; 
import { useFamily } from '../src/context/FamilyContext'; 

export default function NotificationBell() {
  const router = useRouter();
  const { currentProfile } = useFamily();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentProfile?.id) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentProfile.id)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentProfile.id}` }, () => {
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [currentProfile?.id]);

  return (
    <TouchableOpacity 
      onPress={() => router.push('/notifications')} 
      style={{ width: 45, height: 45, backgroundColor: '#FFF', borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', elevation: 2 }}
    >
      <Ionicons name="notifications-outline" size={24} color="#1F2937" />
      {unreadCount > 0 && (
        <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' }}>
          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}