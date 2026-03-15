import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  KeyboardAvoidingView,
  InputAccessoryView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import {
  getFoodDetailsFromResult,
  getRecentFoods,
} from '@/utils/foodSearch';
import type { FoodDetails, RecentFood } from '@/utils/foodSearch';
import * as ImagePicker from 'expo-image-picker';
import { getLocalDateString, formatLocalDate, getMonday, getSunday } from '@/utils/timezone';
import { sanitizeFoodName } from '@/utils/sanitize'
import { Colors } from '@/constants/colors';
import { compressImageForUpload } from '@/utils/imageCompression';
import { Platform, Linking } from 'react-native';

const INPUT_ACCESSORY_ID = 'food-description';

interface FoodLogSheetProps {
  onSuccess: () => void;
  initialMethod?: 'camera' | 'photo' | 'manual' | 'barcode' | null;
  initialImageBase64?: string | null;
  userNote?: string | null;
  barcodeData?: string | null;
  logDate?: string;
}

type LogMethod = 'manual' | 'image' | 'barcode' | null;
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function FoodLogSheet({
  onSuccess,
  initialMethod = null,
  initialImageBase64 = null,
  userNote = null,
  barcodeData = null,
  logDate,
}: FoodLogSheetProps) {
  const resolvedLogDate = logDate ?? getLocalDateString();

  const [selectedMethod, setSelectedMethod] = useState<LogMethod>(
    initialMethod === 'camera' || initialMethod === 'photo' ? 'image' :
    initialMethod === 'barcode' ? 'barcode' :
    initialMethod || null
  );
  const [foodDescription, setFoodDescription] = useState('');
  const [estimatedCalories, setEstimatedCalories] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(initialImageBase64 || null);
  const [processingImage, setProcessingImage] = useState(false);
  const [pendingNoteReview, setPendingNoteReview] = useState(false);
  const [sheetUserNote, setSheetUserNote] = useState('');

  // AI estimation state
  const [estimatingNutrition, setEstimatingNutrition] = useState(false);

  // Editable macro state
  const [editedCalories, setEditedCalories] = useState('');
  const [editedProtein, setEditedProtein] = useState('');
  const [editedCarbs, setEditedCarbs] = useState('');
  const [editedFat, setEditedFat] = useState('');

  // AI metadata
  const [aiServingDescription, setAiServingDescription] = useState('');
  const [aiConfidence, setAiConfidence] = useState('');

  const [selectedFood, setSelectedFood] = useState<FoodDetails | null>(null);

  // Recent foods state
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const RECENT_DISPLAY_LIMIT = 3;

  // Progress bar animations — separate refs so image and estimate never conflict
  const progressAnim = useRef(new Animated.Value(0)).current;
  const estimateProgressAnim = useRef(new Animated.Value(0)).current;

  // ── Derived state ───────────────────────────────────────────────────────────
  const hasEnoughDescription = foodDescription.trim().length > 0;
  const readyToSave = !!selectedFood && !!editedCalories;

  // ── Image progress helpers ──────────────────────────────────────────────────
  const startProgressAnimation = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 8000,
      useNativeDriver: false,
    }).start();
  };

  const completeProgressAnimation = (callback: () => void) => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start(callback);
  };

  // ── Estimate progress helpers ───────────────────────────────────────────────
  const startEstimateAnimation = () => {
    estimateProgressAnim.setValue(0);
    Animated.timing(estimateProgressAnim, {
      toValue: 0.85,
      duration: 6000, // text estimation is faster than image analysis
      useNativeDriver: false,
    }).start();
  };

  const completeEstimateAnimation = (callback: () => void) => {
    Animated.timing(estimateProgressAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start(callback);
  };

  useEffect(() => {
    loadRecentFoods();
    if (initialMethod === 'manual') {
      setSelectedMethod('manual');
    } else if (initialMethod === 'barcode' && barcodeData) {
      try {
        const parsed = JSON.parse(barcodeData);
        setFoodDescription(parsed.food_name);
        setEstimatedCalories(parsed.calories.toString());
        setEditedCalories(parsed.calories.toString());
        setEditedProtein(parsed.protein_grams?.toString() || '');
        setEditedCarbs(parsed.carbs_grams?.toString() || '');
        setEditedFat(parsed.fat_grams?.toString() || '');
        setAiServingDescription(parsed.serving_description || '');
        setAiConfidence('');
        setSelectedFood({
          food_id: `barcode_${parsed.barcode}`,
          name: parsed.food_name,
          serving_description: parsed.serving_description || 'per serving',
          calories: parsed.calories,
          protein: parsed.protein_grams,
          carbs: parsed.carbs_grams,
          fat: parsed.fat_grams,
        });
        setSelectedMethod('manual');
      } catch (e) {
        console.error('Failed to parse barcode data:', e);
        setSelectedMethod(null);
      }
    } else if (initialImageBase64) {
      setSelectedImage(initialImageBase64);
      setSelectedMethod('image');
    }
  }, [initialMethod, initialImageBase64, barcodeData]);

  useEffect(() => {
    if (selectedMethod === 'image' && selectedImage && !processingImage && !pendingNoteReview) {
      processImageWithAI(selectedImage);
    }
  }, [selectedMethod, selectedImage, pendingNoteReview]);

  const loadRecentFoods = async () => {
    try {
      setLoadingRecent(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const recent = await getRecentFoods(user.id, 15);
      setRecentFoods(recent);
    } catch (error) {
      console.error('Error loading recent foods:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSelectRecent = (food: RecentFood) => {
    setFoodDescription(food.food_name);
    setEstimatedCalories(food.calories.toString());
    setEditedCalories(food.calories.toString());
    setEditedProtein(food.protein_grams?.toString() || '');
    setEditedCarbs(food.carbs_grams?.toString() || '');
    setEditedFat(food.fat_grams?.toString() || '');
    setAiServingDescription('');
    setAiConfidence('');
    setMealType(food.meal_type as MealType);
    setSelectedMethod('manual');
  };

  const clearAIResult = () => {
    setSelectedFood(null);
    setEditedCalories('');
    setEditedProtein('');
    setEditedCarbs('');
    setEditedFat('');
    setAiServingDescription('');
    setAiConfidence('');
  };

  const handleSave = async () => {
    if (!foodDescription.trim()) {
      Alert.alert('Error', 'Please describe what you ate');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        setSaving(false);
        return;
      }

      const calories = editedCalories ? parseInt(editedCalories) : 0;

      const { error } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          food_name: sanitizeFoodName(foodDescription),
          calories: calories,
          protein_grams: editedProtein ? parseFloat(editedProtein) : null,
          carbs_grams: editedCarbs ? parseFloat(editedCarbs) : null,
          fat_grams: editedFat ? parseFloat(editedFat) : null,
          log_date: resolvedLogDate,
          meal_type: mealType,
          entry_method: selectedMethod === 'barcode'
            ? 'barcode'
            : selectedMethod === 'image'
            ? 'ai_image'
            : selectedFood
            ? 'ai_text'
            : 'manual',
          serving_description: aiServingDescription || null,
          ai_confidence: aiConfidence || null,
        });

      if (error) {
        console.error('Error saving food log:', error);
        Alert.alert('Error', 'Failed to save food log');
        setSaving(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('baseline_start_date, baseline_complete')
        .eq('id', user.id)
        .single();

      if (profile && !profile.baseline_complete && !profile.baseline_start_date) {
        await supabase
          .from('profiles')
          .update({ baseline_start_date: resolvedLogDate })
          .eq('id', user.id);
        console.log('✅ Baseline started on:', resolvedLogDate);
      }

      if (calories > 0) {
        const { data: existingSummary } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .eq('summary_date', resolvedLogDate)
          .single();

        const newTotal = (existingSummary?.calories_consumed || 0) + calories;

        await supabase
          .from('daily_summaries')
          .upsert({
            user_id: user.id,
            summary_date: resolvedLogDate,
            calories_consumed: newTotal,
            calories_burned: 0,
          }, { onConflict: 'user_id,summary_date' });
      }

      // Streak update
      try {
        await supabase.functions.invoke('calculateStreaks', {
          body: { userId: user.id }
        });
        console.log('✅ Streak updated');
      } catch (streakError) {
        console.error('⚠️ Streak update failed (non-critical):', streakError);
      }

      // Weekly limit warning check
      try {
        const { data: summaries } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .gte('summary_date', formatLocalDate(getMonday()))
          .lte('summary_date', formatLocalDate(getSunday()));

        const { data: profileBudget } = await supabase
          .from('profiles')
          .select('weekly_calorie_budget')
          .eq('id', user.id)
          .single();

        if (summaries && profileBudget?.weekly_calorie_budget) {
          const totalThisWeek = summaries.reduce(
            (sum: number, day: { calories_consumed: number }) => sum + day.calories_consumed, 0
          );
          await supabase.functions.invoke('sendWeeklyLimitWarning', {
            body: {
              user_id: user.id,
              calories_consumed: totalThisWeek,
              weekly_budget: profileBudget.weekly_calorie_budget,
            },
          });
        }
      } catch (limitError) {
        console.error('⚠️ Weekly limit check failed (non-critical):', limitError);
      }

      // Reset form
      setFoodDescription('');
      setEstimatedCalories('');
      setEditedCalories('');
      setEditedProtein('');
      setEditedCarbs('');
      setEditedFat('');
      setAiServingDescription('');
      setAiConfidence('');
      setMealType('breakfast');
      setSelectedMethod(null);
      setSelectedFood(null);
      setSaving(false);

      Alert.alert('Success', 'Food logged!');
      onSuccess();
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Something went wrong');
      setSaving(false);
    }
  };

  const handleTakePhoto = () => {
    router.replace('/camera');
  };

  const handlePickImage = async () => {
    const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    let finalStatus = currentStatus;

    if (currentStatus !== 'granted') {
      const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = newStatus;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'HAVEN needs access to your photo library to scan food images.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings()
          }
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        const compressed = await compressImageForUpload(result.assets[0].uri);
        setSelectedImage(compressed.base64);
        setSheetUserNote('');
        setPendingNoteReview(true);
      } catch (error) {
        Alert.alert('Image Too Large', error instanceof Error ? error.message : 'Could not process this image.');
      }
    }
  };

  const processImageWithAI = async (base64Image: string, noteOverride?: string) => {
    setProcessingImage(true);
    startProgressAnimation();
    try {
      const imageSizeBytes = (base64Image.length * 3) / 4;
      const imageSizeMB = imageSizeBytes / (1024 * 1024);

      if (imageSizeMB > 5) {
        throw new Error(`Image too large: ${imageSizeMB.toFixed(2)}MB. Maximum is 5MB.`);
      }

      const noteToSend = noteOverride !== undefined ? noteOverride : (userNote || undefined);
      const { data, error } = await supabase.functions.invoke('analyzeFoodImage', {
        body: {
          image_base64: base64Image,
          user_note: noteToSend || undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to analyze image');

      const analysis = data.data;

      setFoodDescription(analysis.food_name);
      setEstimatedCalories(analysis.calories.toString());
      setEditedCalories(analysis.calories.toString());
      setEditedProtein(analysis.protein_grams?.toString() || '');
      setEditedCarbs(analysis.carbs_grams?.toString() || '');
      setEditedFat(analysis.fat_grams?.toString() || '');
      setAiServingDescription(analysis.serving_description || '');
      setAiConfidence(analysis.confidence || '');
      setSelectedFood({
        food_id: 'ai_scan',
        name: analysis.food_name,
        serving_description: analysis.serving_description || 'per serving',
        calories: analysis.calories,
        protein: analysis.protein_grams,
        carbs: analysis.carbs_grams,
        fat: analysis.fat_grams,
      });

      setSelectedMethod('manual');
    } catch (error) {
      Alert.alert(
        'Analysis Failed',
        'Could not analyze the image. Would you like to enter details manually?',
        [
          { text: 'Cancel', onPress: () => { setSelectedImage(null); setSelectedMethod(null); }, style: 'cancel' },
          { text: 'Enter Manually', onPress: () => setSelectedMethod('manual') },
        ]
      );
    } finally {
      completeProgressAnimation(() => {
        setProcessingImage(false);
      });
    }
  };

  const handleEstimateNutrition = async (descriptionText?: string) => {
    const textToEstimate = descriptionText || foodDescription;
    if (!textToEstimate.trim() || estimatingNutrition) return;
    Keyboard.dismiss()
    setEstimatingNutrition(true);
    startEstimateAnimation();

    try {
      const { data, error } = await supabase.functions.invoke('estimateNutrition', {
        body: { food_description: textToEstimate, meal_type: mealType },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to estimate nutrition');

      const estimate = data.data;

      setFoodDescription(estimate.food_name);
      setEstimatedCalories(estimate.calories.toString());
      setEditedCalories(estimate.calories.toString());
      setEditedProtein(estimate.protein_grams?.toString() || '');
      setEditedCarbs(estimate.carbs_grams?.toString() || '');
      setEditedFat(estimate.fat_grams?.toString() || '');
      setAiServingDescription('');
      setAiConfidence(estimate.confidence || '');
      setSelectedFood({
        food_id: 'ai_estimate',
        name: estimate.food_name,
        serving_description: 'per serving',
        calories: estimate.calories,
        protein: estimate.protein_grams,
        carbs: estimate.carbs_grams,
        fat: estimate.fat_grams,
      });
    } catch (error) {
      estimateProgressAnim.setValue(0); // reset bar on failure
      Alert.alert('Estimation Failed', 'Could not estimate nutrition. Please enter values manually.');
    } finally {
      completeEstimateAnimation(() => {
        setEstimatingNutrition(false);
      });
    }
  };

  const mealTypes: { value: MealType; label: string; icon: string }[] = [
    { value: 'breakfast', label: 'Breakfast', icon: 'sunny' },
    { value: 'lunch', label: 'Lunch', icon: 'partly-sunny' },
    { value: 'dinner', label: 'Dinner', icon: 'moon' },
    { value: 'snack', label: 'Snack', icon: 'fast-food' },
  ];

  // ── Gallery note review screen ──────────────────────────────────────────────
  if (pendingNoteReview && selectedImage) {
    return (
      <KeyboardAvoidingView
        style={styles.galleryReviewContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.galleryPhotoContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
            style={styles.galleryPhoto}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.galleryBackButton}
            onPress={() => {
              setPendingNoteReview(false);
              setSelectedImage(null);
              setSheetUserNote('');
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.galleryBottomOverlay}>
          <TextInput
            style={styles.galleryNoteInput}
            value={sheetUserNote}
            onChangeText={setSheetUserNote}
            placeholder={"Add details to improve accuracy (optional)\ne.g. large portion, restaurant, homemade..."}
            placeholderTextColor="rgba(255,255,255,0.55)"
            multiline
            maxLength={150}
          />
          <Text style={styles.galleryCharCount}>{sheetUserNote.length}/150</Text>

          <View style={styles.galleryActions}>
            <TouchableOpacity
              style={styles.galleryRetakeButton}
              onPress={() => {
                setSelectedImage(null);
                setSheetUserNote('');
                setPendingNoteReview(false);
                handlePickImage();
              }}
            >
              <Ionicons name="images-outline" size={18} color="#FFFFFF" />
              <Text style={styles.galleryRetakeButtonText}>Reselect</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.galleryAnalyzeButton}
              onPress={() => {
                setPendingNoteReview(false);
                setSelectedMethod('image');
                processImageWithAI(selectedImage, sheetUserNote.trim());
              }}
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <Text style={styles.galleryAnalyzeButtonText}>Analyze Meal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Method selection screen ─────────────────────────────────────────────────
  if (!selectedMethod) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>How would you like to log?</Text>
          <Text style={styles.headerSubtitle}>Choose a method below</Text>
        </View>

        <ScrollView
          style={styles.methodSelection}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.methodContent}
        >
          <View style={styles.methodsSection}>
            <TouchableOpacity style={styles.methodCard} onPress={handleTakePhoto}>
              <View style={[styles.methodIcon, styles.methodIconTeal]}>
                <Ionicons name="camera" size={24} color="#206E6B" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Take Photo</Text>
                <Text style={styles.methodDescription}>Quick and easy food recognition</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.methodCard} onPress={() => setSelectedMethod('manual')}>
              <View style={[styles.methodIcon, styles.methodIconTeal]}>
                <Ionicons name="create" size={24} color="#206E6B" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Describe</Text>
                <Text style={styles.methodDescription}>Food description with text</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.methodCard} onPress={handlePickImage}>
              <View style={[styles.methodIcon, styles.methodIconTeal]}>
                <Ionicons name="images" size={24} color="#206E6B" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Select Photo</Text>
                <Text style={styles.methodDescription}>Choose from your gallery</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {recentFoods.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentSectionTitle}>RECENT FOODS</Text>
              <View style={styles.recentCard}>
                {(showAllRecent ? recentFoods : recentFoods.slice(0, RECENT_DISPLAY_LIMIT)).map((food, index) => (
                  <View key={index}>
                    <TouchableOpacity style={styles.recentItem} onPress={() => handleSelectRecent(food)}>
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentName} numberOfLines={1}>{food.food_name}</Text>
                        <Text style={styles.recentCalories}>{food.calories} cal</Text>
                      </View>
                      <View style={styles.recentAddButton}>
                        <Ionicons name="add" size={20} color="#206E6B" />
                      </View>
                    </TouchableOpacity>
                    {index < (showAllRecent ? recentFoods.length - 1 : RECENT_DISPLAY_LIMIT - 1) && (
                      <View style={styles.recentDivider} />
                    )}
                  </View>
                ))}
              </View>

              {recentFoods.length > RECENT_DISPLAY_LIMIT && (
                <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAllRecent(!showAllRecent)}>
                  <Text style={styles.showMoreText}>
                    {showAllRecent ? 'Show Less' : `Show More (${recentFoods.length - RECENT_DISPLAY_LIMIT} more)`}
                  </Text>
                  <Ionicons name={showAllRecent ? 'chevron-up' : 'chevron-down'} size={16} color="#206E6B" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {loadingRecent && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#206E6B" />
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Image processing screen ─────────────────────────────────────────────────
  if (selectedMethod === 'image' && selectedImage) {
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.imageProcessingContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setSelectedMethod(null);
            setSelectedImage(null);
            progressAnim.setValue(0);
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#3D5A5C" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>Analyzing your food...</Text>

        <View style={styles.imagePreview}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          {processingImage && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.processingText}>HAVEN is almost done...</Text>
            </View>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressLabel}>
            {processingImage ? 'Identifying your meal...' : 'Done!'}
          </Text>
        </View>
      </View>
    );
  }

  // ── Manual entry screen ─────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* iOS: "Done" toolbar above the keyboard for the multiline description input */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
          <View style={styles.keyboardToolbar}>
            <TouchableOpacity onPress={() => Keyboard.dismiss()}>
              <Text style={styles.keyboardDoneButton}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}

      <ScrollView
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode='on-drag'
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { setSelectedMethod(null); setSelectedFood(null); }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.graphite} />
        </TouchableOpacity>

        {selectedFood && (
          <View style={styles.selectedFoodBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Meal type</Text>
          <View style={styles.mealTypeGrid}>
            {mealTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.mealTypeCard, mealType === type.value && styles.mealTypeCardActive]}
                onPress={() => setMealType(type.value)}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={mealType === type.value ? '#FFFFFF' : '#3D5A5C'}
                />
                <Text style={[styles.mealTypeText, mealType === type.value && styles.mealTypeTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Food description</Text>
          {/*
            nativeID links this input to the InputAccessoryView on iOS,
            giving a "Done" button to dismiss the keyboard on multiline inputs.
          */}
          <TextInput
            nativeID={INPUT_ACCESSORY_ID}
            style={styles.textInput}
            value={foodDescription}
            onChangeText={(text: string) => {
              setFoodDescription(text);
              // Clear AI result if user edits description after estimating
              if (selectedFood) {
                clearAIResult();
              }
            }}
            placeholder="e.g., Chicken salad with ranch dressing"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {selectedFood && (
            <View style={styles.aiEstimateBadge}>
              <Ionicons name="sparkles" size={14} color="#10B981" />
              <Text style={styles.aiEstimateText}>AI estimated — review and adjust if needed</Text>
            </View>
          )}
        </View>

        {/* ── Estimate progress bar — visible only while estimating ── */}
        {estimatingNutrition && (
          <View style={styles.estimateProgressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: estimateProgressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>Estimating nutrition...</Text>
          </View>
        )}

        {selectedFood && aiServingDescription ? (
          <Text style={styles.servingDescription}>
            Serving: {aiServingDescription}
          </Text>
        ) : null}

        {selectedFood && (
          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionTitle}>Nutrition Info</Text>
            <Text style={styles.nutritionEditHint}>Tap any value to edit</Text>

            <View style={styles.nutritionCaloriesRow}>
              <TextInput
                style={styles.nutritionCaloriesInput}
                value={editedCalories}
                onChangeText={setEditedCalories}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                selectTextOnFocus
              />
              <Text style={styles.nutritionCaloriesLabel}>calories</Text>
            </View>

            <View style={styles.nutritionDivider} />

            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <TextInput
                  style={styles.nutritionValueInput}
                  value={editedProtein}
                  onChangeText={setEditedProtein}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  selectTextOnFocus
                />
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <TextInput
                  style={styles.nutritionValueInput}
                  value={editedCarbs}
                  onChangeText={setEditedCarbs}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  selectTextOnFocus
                />
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <TextInput
                  style={styles.nutritionValueInput}
                  value={editedFat}
                  onChangeText={setEditedFat}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  selectTextOnFocus
                />
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Smart single CTA ── */}
        {!readyToSave ? (
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasEnoughDescription || estimatingNutrition) && styles.saveButtonDisabled,
            ]}
            onPress={() => handleEstimateNutrition(foodDescription)}
            disabled={!hasEnoughDescription || estimatingNutrition}
          >
            {estimatingNutrition ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>
              {estimatingNutrition ? 'Estimating...' : 'Estimate Nutrition'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            }
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Food Log'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  header: {
    backgroundColor: Colors.lightCream,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#504D47',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  methodSelection: {
    flex: 1,
  },
  methodContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  methodsSection: {
    marginTop: 24,
    gap: 12,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodIconTeal: {
    backgroundColor: 'rgba(32, 110, 107, 0.1)',
  },
  methodInfo: {
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#504D47',
    marginRight: 8,
  },
  aiBadge: {
    backgroundColor: '#EF7828',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  methodDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  recentSection: {
    marginTop: 32,
  },
  recentSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  recentInfo: {
    flex: 1,
    marginRight: 12,
  },
  recentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#504D47',
    marginBottom: 4,
  },
  recentCalories: {
    fontSize: 14,
    color: '#6B7280',
  },
  recentAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(32, 110, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 16,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#206E6B',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    marginTop: 16,
  },
  backText: {
    fontSize: 16,
    color: '#504D47',
    fontWeight: '600',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#504D47',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#504D47',
    marginBottom: 8,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealTypeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealTypeCardActive: {
    backgroundColor: '#206E6B',
    borderColor: '#206E6B',
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#504D47',
  },
  mealTypeTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#504D47',
    minHeight: 100,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#504D47',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#206E6B',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 300,
  },
  selectedFoodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  selectedFoodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  nutritionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#504D47',
    marginBottom: 4,
  },
  nutritionEditHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 14,
  },
  nutritionCaloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  nutritionCaloriesInput: {
    fontSize: 36,
    fontWeight: '700',
    color: '#206E6B',
    textAlign: 'center',
    minWidth: 80,
    borderBottomWidth: 1.5,
    borderBottomColor: '#206E6B',
    paddingBottom: 2,
  },
  nutritionCaloriesLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  nutritionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 14,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#504D47',
    marginBottom: 4,
  },
  nutritionValueInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#504D47',
    textAlign: 'center',
    minWidth: 52,
    borderBottomWidth: 1.5,
    borderBottomColor: '#D1D5DB',
    paddingBottom: 2,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  servingDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: -12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  // ── Estimate progress bar ───────────────────────────────────────────────────
  estimateProgressContainer: {
    marginTop: -8,
    marginBottom: 20,
    gap: 10,
  },
  // ── Shared progress bar styles (used by both image + estimate flows) ────────
  progressContainer: {
    paddingHorizontal: 4,
    gap: 10,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#206E6B',
    borderRadius: 99,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  // ── Keyboard toolbar (iOS only) ─────────────────────────────────────────────
  keyboardToolbar: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  keyboardDoneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#206E6B',
  },
  // ── Image processing screen styles ─────────────────────────────────────────
  imageProcessingContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  imagePreview: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 24,
    backgroundColor: '#F3F4F6',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(32, 110, 107, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // ── AI badge styles ─────────────────────────────────────────────────────────
  aiEstimateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  aiEstimateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  // ── Gallery note review styles ───────────────────────────────────────────────
  galleryReviewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  galleryPhotoContainer: {
    flex: 1,
    position: 'relative',
  },
  galleryPhoto: {
    width: '100%',
    height: '100%',
  },
  galleryBackButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 22,
  },
  galleryBottomOverlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 8,
  },
  galleryNoteInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 72,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  galleryCharCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
    marginTop: -4,
  },
  galleryActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  galleryRetakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  galleryRetakeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  galleryAnalyzeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#206E6B',
  },
  galleryAnalyzeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});