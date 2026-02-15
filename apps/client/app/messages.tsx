import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@haven/shared-utils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_text: string;
  read: boolean;
  created_at: string;
}

const getInitials = (name: string): string => {
  const names = name.trim().split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function ClientMessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [trainerName, setTrainerName] = useState<string>('Coach');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchUserAndMessages();
  }, []);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!currentUserId || !trainerId) return;

    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          markMessagesAsRead(currentUserId);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, trainerId]);

  const fetchUserAndMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('trainer_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.trainer_id) {
        setLoading(false);
        return;
      }

      setTrainerId(profile.trainer_id);

      // Get trainer's name
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', profile.trainer_id)
        .single();

      if (trainerProfile?.full_name) {
        setTrainerName(trainerProfile.full_name);
      }

      await fetchMessages(user.id, profile.trainer_id);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchUserAndMessages:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string, trainerId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${trainerId}),and(sender_id.eq.${trainerId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
    markMessagesAsRead(userId);
  };

  const markMessagesAsRead = async (userId: string) => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('recipient_id', userId)
      .eq('read', false);
  };

  const onRefresh = async () => {
    if (!currentUserId || !trainerId) return;
    setRefreshing(true);
    await fetchMessages(currentUserId, trainerId);
    setRefreshing(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !trainerId || sending) {
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          recipient_id: trainerId,
          message_text: newMessage.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        setSending(false);
        return;
      }

      setMessages(prev => [...prev, data]);
      setNewMessage('');

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error in sendMessage:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateSeparator = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDay = new Date(messageDate);
    messageDay.setHours(0, 0, 0, 0);
    
    if (messageDay.getTime() === today.getTime()) {
      return 'Today';
    } else if (messageDay.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage: Message | null) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.created_at).toDateString();
    const previousDate = new Date(previousMessage.created_at).toDateString();
    
    return currentDate !== previousDate;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isFromMe = item.sender_id === currentUserId;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = shouldShowDateSeparator(item, previousMessage);

    return (
      <>
        {showDateSeparator && (
          <View style={styles.dateSeparatorContainer}>
            <Text style={styles.dateSeparatorText}>
              {formatDateSeparator(item.created_at)}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageContainer, 
          isFromMe ? styles.myMessage : styles.theirMessage
        ]}>
          <View style={[
            styles.messageBubble, 
            isFromMe ? styles.myBubble : styles.theirBubble
          ]}>
            <Text style={[
              styles.messageText, 
              isFromMe ? styles.myMessageText : styles.theirMessageText
            ]}>
              {item.message_text}
            </Text>
            <Text style={[
              styles.messageTime, 
              isFromMe ? styles.myMessageTime : styles.theirMessageTime
            ]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.vividTeal} />
        </View>
      </SafeAreaView>
    );
  }

  if (!trainerId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header with back button */}
        <View style={styles.headerWrapper}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.graphite} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
  
        {/* Empty State Content */}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubbles" size={64} color={Colors.vividTeal} />
          </View>
          
          <Text style={styles.emptyTitle}>No Trainer Assigned</Text>
          <Text style={styles.emptyDescription}>
            Connect with a coach to get personalized guidance and support on your nutrition journey
          </Text>
  
          {/* Action Buttons */}
          <View style={styles.emptyButtonsContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => Linking.openURL('https://tryhaven.co')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Get Connected with a Coach</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
  
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.headerWrapper}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.graphite} />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>{getInitials(trainerName)}</Text>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerName}>{trainerName}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={24} color={Colors.graphite} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
        {messages.length === 0 ? (
          <View style={styles.emptyMessagesContainer}>
            <Ionicons name="chatbubble" size={48} color="#D1D5DB" />
            <Text style={styles.emptyMessagesText}>No messages yet</Text>
            <Text style={styles.emptyMessagesSubtext}>
              Start a conversation with your trainer
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1 }}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3D5A5C"
              />
            }
          />
        )}

        {/* Input */}
        <View style={[
          styles.inputContainerWrapper, 
          { 
            paddingBottom: keyboardVisible 
              ? 0 
              : Platform.OS === 'ios' 
                ? insets.bottom + 23
                : 65
          }
        ]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerWrapper: {
    backgroundColor: Colors.lightCream,
    paddingTop: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.vividTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: 0,
    paddingVertical: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: Colors.vividTeal,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: '#9CA3AF',
    textAlign: 'right',
  },
  inputContainerWrapper: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, 
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#206E6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D5A5C',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.graphite,
    flex: 1,
    textAlign: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E6F4F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyButtonsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.vividTeal,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.vividTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.lightCream,
  },
  secondaryButton: {
    backgroundColor: Colors.energyOrange,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.lightCream,
  },
});
