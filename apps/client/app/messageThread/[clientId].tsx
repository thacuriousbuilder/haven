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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { Ionicons } from '@expo/vector-icons';
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

export default function MessageThreadScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>('Client');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchThreadData();
  }, [clientId]);

  // Real-time subscription
  useEffect(() => {
    if (!currentUserId || !clientId) {
      console.log('Skipping subscription - missing IDs');
      return;
    }

    console.log('=== Setting up real-time subscription for thread ===');

    const channel = supabase
      .channel(`message-thread-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('New message received in thread:', payload);
          const newMsg = payload.new as Message;
          
          // Only add if it's from this client
          if (newMsg.sender_id === clientId) {
            setMessages(prev => [...prev, newMsg]);
            markMessagesAsRead(currentUserId);
            
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('Thread subscription status:', status);
      });

    return () => {
      console.log('Cleaning up thread subscription');
      supabase.removeChannel(channel);
    };
  }, [currentUserId, clientId]);

  

  const fetchThreadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // Get client's name
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', clientId)
        .single();

      if (clientProfile?.full_name) {
        setClientName(clientProfile.full_name);
      }

      // Fetch messages
      await fetchMessages(user.id, clientId);

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchThreadData:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (trainerId: string, clientId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${trainerId},recipient_id.eq.${clientId}),and(sender_id.eq.${clientId},recipient_id.eq.${trainerId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
    markMessagesAsRead(trainerId);
  };

  const markMessagesAsRead = async (trainerId: string) => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('recipient_id', trainerId)
      .eq('sender_id', clientId)
      .eq('read', false);
  };

  const onRefresh = async () => {
    if (!currentUserId) return;
    
    setRefreshing(true);
    await fetchMessages(currentUserId, clientId);
    setRefreshing(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || sending) {
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          recipient_id: clientId,
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3D5A5C" />
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
                  <Ionicons name="arrow-back" size={24} color={Colors.graphite}  />
                </TouchableOpacity>
                
                <View style={styles.headerCenter}>
                  <View style={styles.headerAvatar}>
                    <Text style={styles.headerAvatarText}>{getInitials(clientName)}</Text>
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerName}>{clientName}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.menuButton}>
                  <Ionicons name="ellipsis-vertical" size={24} color={Colors.graphite}  />
                </TouchableOpacity>
              </View>
            </View>

        {/* Messages List */}
        {messages.length === 0 ? (
          <View style={styles.emptyMessagesContainer}>
            <Ionicons name="chatbubble" size={48} color="#D1D5DB" />
            <Text style={styles.emptyMessagesText}>No messages yet</Text>
            <Text style={styles.emptyMessagesSubtext}>
              Start a conversation with {clientName}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3D5A5C"
              />
            }
          />
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message."
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
    color: Colors.graphite,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingBottom: 20,
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
    backgroundColor: '#206E6B',
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
});