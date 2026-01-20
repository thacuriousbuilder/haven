

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet,Text } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';


function TabBarBadge({ count }: { count: number }) {
  if (count === 0) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export default function TabLayout() {
  const [userType, setUserType] = useState<'client' | 'trainer' | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUserType();
  }, []);

  useEffect(() => {
    if (userType !== 'trainer') return;
  
    fetchUnreadCount();
  
    // Set up real-time subscription
    let channel: ReturnType<typeof supabase.channel> | null = null;
  
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      channel = supabase
        .channel('unread-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();
    };
  
    setupSubscription();
  
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userType]);

  const fetchUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      setUserType(profile?.user_type || 'client');
    } catch (error) {
      console.error('Error fetching user type:', error);
      setUserType('client'); // Default to client
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false);
  
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // Trainer tabs
  if (userType === 'trainer') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.vividTeal,
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            height: 90,
            paddingBottom: 30,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: 'Clients',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
       <Tabs.Screen
        name="quickAction"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.addButton}>
              <Ionicons 
                name="add" 
                size={32} 
                color="#FFFFFF" 
              />
            </View>
          ),
        }}
        />
       <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => (
              <View>
                <Ionicons name="chatbubbles" size={size} color={color} />
                {unreadCount > 0 && <TabBarBadge count={unreadCount} />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        {/* Hide client-only tabs */}
        <Tabs.Screen
          name="plan"
          options={{
            href: null, // Hide from tabs
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            href: null, // Hide from tabs
          }}
        />
      </Tabs>
    );
  }

  // Client tabs (default)
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.vividTeal,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 90,
          paddingBottom: 30,
          paddingTop: 15,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.addButton}>
              <Ionicons 
                name="add" 
                size={32} 
                color="#FFFFFF" 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      {/* Hide trainer-only tabs */}
      <Tabs.Screen
        name="clients"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="quickAction"
        options={{
          href: null, // Hide from tabs
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.energyOrange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});