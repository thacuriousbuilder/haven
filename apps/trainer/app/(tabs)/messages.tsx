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
  Button
} from 'react-native';
import { SafeAreaView ,useSafeAreaInsets} from 'react-native-safe-area-context';
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

interface Profile {
  id: string;
  trainer_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [trainerName, setTrainerName] = useState<string>('Coach');
  const [userType, setUserType] = useState<'client' | 'trainer' | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const getInitials = (name: string): string => {
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  

  useEffect(() => {
    fetchUserAndMessages();
  }, []);

    // Add keyboard listeners
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
  
    // Subscribe to new messages
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
          const newMessage = payload.new as Message;
          
          // Add to messages list
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read
          markMessagesAsRead(currentUserId);
          
          // Scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();
  
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, trainerId]);

  useEffect(() => {
    if (userType !== 'trainer' || !currentUserId) return;
  
    console.log('Setting up real-time for trainer conversation list');
  
    const channel = supabase
      .channel('trainer-conversations')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Message change detected, refreshing conversations');
          fetchTrainerConversations(currentUserId);
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userType, currentUserId]);

  const fetchUserAndMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }
  
      setCurrentUserId(user.id);
  
      // Get user's profile to check user_type
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, trainer_id, first_name, last_name')
        .eq('id', user.id)
        .single();
  
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setLoading(false);
        return;
      }
  
      setUserType(profile.user_type);
  
      // CLIENT VIEW - fetch messages with trainer
      if (profile.user_type === 'client') {
        if (!profile.trainer_id) {
          setLoading(false);
          return;
        }
  
        setTrainerId(profile.trainer_id);
  
        // Get trainer's name
        const { data: trainerProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', profile.trainer_id)
          .single();
  
          if (trainerProfile) {
            const name = `${trainerProfile.first_name || ''} ${trainerProfile.last_name || ''}`.trim();
            setTrainerName(name || 'Coach');
          }
        // Fetch messages
        await fetchMessages(user.id, profile.trainer_id);
      } 
      // TRAINER VIEW - fetch conversation list
      else if (profile.user_type === 'trainer') {
        await fetchTrainerConversations(user.id);
      }
  
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

    // Mark messages as read
    markMessagesAsRead(userId);
  };

  const fetchTrainerConversations = async (trainerId: string) => {
    try {
      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('trainer_id', trainerId);
  
      if (clientsError || !clients) {
        console.error('Error fetching clients:', clientsError);
        return;
      }
  
      // For each client, get last message and unread count
      const conversationsData = await Promise.all(
        clients.map(async (client) => {
          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${trainerId},recipient_id.eq.${client.id}),and(sender_id.eq.${client.id},recipient_id.eq.${trainerId})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
  
          // Get unread count (messages sent TO trainer from this client)
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', client.id)
            .eq('recipient_id', trainerId)
            .eq('read', false);
  
          return {
            clientId: client.id,
            clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client',
            lastMessage: lastMessage?.message_text || 'No messages yet',
            lastMessageTime: lastMessage?.created_at || null,
            unreadCount: unreadCount || 0,
          };
        })
      );
  
      // Sort by most recent message
      conversationsData.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });
  
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error in fetchTrainerConversations:', error);
    }
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

      // Add message to local state
      setMessages(prev => [...prev, data]);
      setNewMessage('');

      // Scroll to bottom
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


      const formatConversationTime = (timestamp: string) => {
        const messageDate = new Date(timestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const messageDay = new Date(messageDate);
        messageDay.setHours(0, 0, 0, 0);
        
        if (messageDay.getTime() === today.getTime()) {
          // Today - show time
          return messageDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        } else if (messageDay.getTime() === yesterday.getTime()) {
          return 'Yesterday';
        } else {
          // Older - show date
          return messageDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
          });
        }
      };

  //function to check if we need a date separator
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


// TRAINER VIEW - Conversation List
if (userType === 'trainer') {
  return (
    <SafeAreaView style={styles.container} edges={['top','bottom']}>
      {/* Updated Header */}
      <View style={styles.trainerHeaderWrapper}>
        <View style={styles.trainerHeaderTop}>
          <Text style={styles.trainerHeaderTitle}>Messages</Text>
          <View style={styles.unreadCountContainer}>
            <Text style={styles.unreadCountText}>
              {conversations.filter(c => c.unreadCount > 0).length} unread conversations
            </Text>
          </View>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Conversations</Text>
          <Text style={styles.emptyDescription}>
            Your clients will appear here once they send you a message
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.clientId}
          renderItem={({ item }) => (
       
            <TouchableOpacity
              style={styles.conversationCard}
              onPress={() => {
                router.push(`/messageThread/${item.clientId}`);
              }}
            >
              <View style={styles.conversationLeft}>
                <View style={styles.conversationAvatar}>
                  <Text style={styles.conversationAvatarText}>
                    {getInitials(item.clientName)}
                  </Text>
                </View>
                <View style={styles.conversationInfo}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationName}>{item.clientName}</Text>
                    {item.lastMessageTime && (
                      <Text style={styles.conversationTime}>
                        {formatConversationTime(item.lastMessageTime)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.conversationPreview} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
            
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>In Baseline</Text>
                  </View>
                </View>
              </View>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
                      )}
          contentContainerStyle={styles.conversationList}
        />
      )}
    </SafeAreaView>
  );
}

  if (!trainerId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles" size={64} color={Colors.vividTeal} />
          <Text style={styles.emptyTitle}>No Trainer Assigned</Text>
          <Text style={styles.emptyDescription}>
            You need to be assigned to a trainer to send messages
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.container} edges={['top','bottom']}>

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
                Start a conversation with your trainer
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              style={{flex:1}}
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
</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#206E6B',
  },
  safeAreaTrainer: {
    flex:1,
    backgroundColor: '#206E6B',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
 //client message
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
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  messagesList: {
    paddingHorizontal: 0,
    paddingVertical: 20,
    paddingBottom:20,
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
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
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
trainerHeaderWrapper: {
  backgroundColor: Colors.lightCream,
  paddingTop: 8,
  paddingBottom: 16,
},
trainerHeaderTop: {
  paddingHorizontal: 24,
  paddingTop: 8,
  paddingBottom: 12,
},
trainerHeaderTitle: {
  fontSize: 32,
  fontWeight: '700',
  color: Colors.graphite,
  marginBottom: 4,
},
unreadCountContainer: {
  marginTop: 4,
},
unreadCountText: {
  fontSize: 14,
  color: Colors.fatSteel,
},
searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: Colors.white,
  marginHorizontal: 24,
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 12,
  gap: 10,
},
searchInput: {
  flex: 1,
  fontSize: 16,
  color: '#FFFFFF',
},
conversationList: {
  paddingVertical: 8,
},
conversationCard: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 20,
  paddingVertical: 16,
  marginHorizontal: 16,
  marginVertical: 6,
  borderRadius: 16,
  // iOS shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  // Android shadow
  elevation: 2,
  // Remove any default borders
  borderWidth: 0,
},
conversationLeft: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  flex: 1,
  gap: 12,
},
conversationAvatarContainer: {
  position: 'relative',
},
conversationAvatar: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '#EF7828',
  alignItems: 'center',
  justifyContent: 'center',
},
conversationAvatarText: {
  fontSize: 20,
  fontWeight: '700',
  color: '#FFFFFF',
},
onlineIndicator: {
  position: 'absolute',
  bottom: 2,
  right: 2,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: '#10B981',
  borderWidth: 2,
  borderColor: '#FFFFFF',
},
conversationInfo: {
  flex: 1,
  gap: 4,
},
conversationHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
conversationName: {
  fontSize: 17,
  fontWeight: '600',
  color: '#1F2937',
},
conversationTime: {
  fontSize: 13,
  color: '#6B7280',
},
conversationPreview: {
  fontSize: 15,
  color: '#6B7280',
  lineHeight: 20,
},
statusBadge: {
  alignSelf: 'flex-start',
  backgroundColor: '#FEF3C7',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  marginTop: 4,
},
statusBadgeText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#F59E0B',
},
unreadBadge: {
  backgroundColor: '#EF7828',
  borderRadius: 12,
  minWidth: 28,
  height: 28,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 10,
},
unreadText: {
  fontSize: 13,
  fontWeight: '700',
  color: '#FFFFFF',
},
});