
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  gender: 'male' | 'female' | 'other' | '';
  heightFt: number;
  heightIn: number;
  heightCm: number;
  unitSystem: 'imperial' | 'metric';
}

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    gender: '',
    heightFt: 5,
    heightIn: 0,
    heightCm: 170,
    unitSystem: 'imperial',
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Split full name into first and last
      const nameParts = (profile.full_name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setData({
        firstName,
        lastName,
        email: user.email || '',
        gender: profile.gender || '',
        heightFt: profile.height_ft || 5,
        heightIn: profile.height_in || 0,
        heightCm: profile.height_cm || 170,
        unitSystem: profile.unit_system || 'imperial',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load your profile');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string): string => {
    if (!firstName && !lastName) return 'U';
    if (!lastName) return firstName.charAt(0).toUpperCase();
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const handleSave = async () => {
    // Validation
    if (!data.firstName.trim()) {
      Alert.alert('Missing Information', 'Please enter your first name');
      return;
    }

    if (!data.gender) {
      Alert.alert('Missing Information', 'Please select your gender');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          gender: data.gender,
          height_ft: data.heightFt,
          height_in: data.heightIn,
          height_cm: data.heightCm,
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Your profile has been updated!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save your profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#206E6B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(data.firstName, data.lastName)}
              </Text>
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* First Name */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="person" size={20} color="#6B7280" />
              <Text style={styles.labelText}>First Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={data.firstName}
              onChangeText={(text) => setData(prev => ({ ...prev, firstName: text }))}
              placeholder="Enter first name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="person" size={20} color="#6B7280" />
              <Text style={styles.labelText}>Last Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={data.lastName}
              onChangeText={(text) => setData(prev => ({ ...prev, lastName: text }))}
              placeholder="Enter last name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Email (Read-only) */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="mail" size={20} color="#6B7280" />
              <Text style={styles.labelText}>Email</Text>
            </View>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.disabledText}>{data.email}</Text>
            </View>
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="male-female" size={20} color="#6B7280" />
              <Text style={styles.labelText}>Gender</Text>
            </View>
            <View style={styles.genderOptions}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  data.gender === 'male' && styles.genderOptionSelected
                ]}
                onPress={() => setData(prev => ({ ...prev, gender: 'male' }))}
              >
                <Text style={[
                  styles.genderOptionText,
                  data.gender === 'male' && styles.genderOptionTextSelected
                ]}>
                  Male
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderOption,
                  data.gender === 'female' && styles.genderOptionSelected
                ]}
                onPress={() => setData(prev => ({ ...prev, gender: 'female' }))}
              >
                <Text style={[
                  styles.genderOptionText,
                  data.gender === 'female' && styles.genderOptionTextSelected
                ]}>
                  Female
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderOption,
                  data.gender === 'other' && styles.genderOptionSelected
                ]}
                onPress={() => setData(prev => ({ ...prev, gender: 'other' }))}
              >
                <Text style={[
                  styles.genderOptionText,
                  data.gender === 'other' && styles.genderOptionTextSelected
                ]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Height */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Ionicons name="resize" size={20} color="#6B7280" />
              <Text style={styles.labelText}>Height</Text>
            </View>

            {data.unitSystem === 'imperial' ? (
              <View style={styles.heightInputRow}>
                <View style={styles.heightInputContainer}>
                  <TextInput
                    style={styles.heightInput}
                    value={data.heightFt.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      setData(prev => ({ ...prev, heightFt: value }));
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                  <Text style={styles.heightUnit}>ft</Text>
                </View>

                <View style={styles.heightInputContainer}>
                  <TextInput
                    style={styles.heightInput}
                    value={data.heightIn.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      setData(prev => ({ ...prev, heightIn: value }));
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={styles.heightUnit}>in</Text>
                </View>
              </View>
            ) : (
              <View style={styles.heightInputContainer}>
                <TextInput
                  style={styles.heightInput}
                  value={data.heightCm.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setData(prev => ({ ...prev, heightCm: value }));
                  }}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                />
                <Text style={styles.heightUnit}>cm</Text>
              </View>
            )}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#1F2937',
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#206E6B',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 48,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    form: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      marginHorizontal: 16,
      padding: 24,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    inputGroup: {
      marginBottom: 24,
    },
    inputLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    labelText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#1F2937',
    },
    input: {
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: '#1F2937',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    inputDisabled: {
      backgroundColor: '#F3F4F6',
      justifyContent: 'center',
    },
    disabledText: {
      fontSize: 16,
      color: '#9CA3AF',
    },
    genderOptions: {
      flexDirection: 'row',
      gap: 12,
    },
    genderOption: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
    },
    genderOptionSelected: {
      borderColor: '#206E6B',
      backgroundColor: '#F0F9F8',
    },
    genderOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#6B7280',
    },
    genderOptionTextSelected: {
      color: '#206E6B',
    },
    heightInputRow: {
      flexDirection: 'row',
      gap: 12,
    },
    heightInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      gap: 8,
    },
    heightInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: '700',
      color: '#1F2937',
      textAlign: 'center',
    },
    heightUnit: {
      fontSize: 16,
      fontWeight: '500',
      color: '#6B7280',
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#206E6B',
      marginHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
