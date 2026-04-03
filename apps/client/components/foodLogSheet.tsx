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
  Modal,
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
import { Colors, Spacing } from '@/constants/colors';
import { compressImageForUpload } from '@/utils/imageCompression';
import { Platform, Linking } from 'react-native';
import { getUnreflectedMeal, UnreflectedMeal } from '@/utils/reflectionTrigger';
import QuickReflectionModal from '@/components/quickReflectionModal';
import { VoiceInputModal } from '@/components/voiceInputModal'
import { decode } from 'base64-arraybuffer'
import { useModal } from '@/contexts/modalContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INPUT_ACCESSORY_ID = 'food-description';

interface FoodLogSheetProps {
  onSuccess: () => void;
  initialMethod?: 'camera' | 'photo' | 'manual' | 'barcode' | null;
  initialMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  initialImageBase64?: string | null;
  userNote?: string | null;
  barcodeData?: string | null;
  logDate?: string;
}

interface FavoriteFood {
  food_name: string
  calories: number
  protein_grams: number | null
  carbs_grams: number | null
  fat_grams: number | null
  meal_type: string
}

type LogMethod = 'manual' | 'image' | 'barcode' | null;
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const DESCRIPTION_PLACEHOLDERS: Record<string, string[]> = {
  breakfast: [
    'e.g. 2 scrambled eggs, toast and bacon',
    'e.g. large bowl of oatmeal with banana and honey',
    'e.g. avocado toast with poached eggs, restaurant',
    'e.g. homemade pancakes with maple syrup',
  ],
  lunch: [
    'e.g. chicken burrito bowl with rice, beans and sour cream',
    'e.g. Caesar salad with grilled chicken, restaurant',
    'e.g. 2 slices pepperoni pizza',
    'e.g. homemade chicken and rice with vegetables',
  ],
  dinner: [
    'e.g. grilled salmon with roasted vegetables, restaurant',
    'e.g. pasta alfredo with chicken, ordered from restaurant',
    'e.g. homemade butter chicken with basmati rice and naan',
    'e.g. large cheeseburger and fries, sit-down restaurant',
  ],
  snack: [
    'e.g. Greek yogurt with granola and berries',
    'e.g. 4 samosas from an Indian restaurant',
    'e.g. handful of mixed nuts and an apple',
    'e.g. protein shake with banana and peanut butter',
  ],
}

export function FoodLogSheet({
  onSuccess,
  initialMethod = null,
  initialImageBase64 = null,
  initialMealType,
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
  const [mealType, setMealType] = useState<MealType>(
    initialMealType ?? 'breakfast'
  );
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(initialImageBase64 || null);
  const [processingImage, setProcessingImage] = useState(false);
  const [pendingNoteReview, setPendingNoteReview] = useState(false);
  const [sheetUserNote, setSheetUserNote] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteFoods, setFavoriteFoods] = useState<FavoriteFood[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [activeTab, setActiveTab] = useState<'recent' | 'favorites'>('recent')
  const [recentSearchQuery, setRecentSearchQuery] = useState('')
  const [favoritesSearchQuery, setFavoritesSearchQuery] = useState('')
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null)
  // unreflected meals state
  const [unreflectedMeal, setUnreflectedMeal] = useState<UnreflectedMeal | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const { showModal } = useModal();
  // AI estimation state
  const [estimatingNutrition, setEstimatingNutrition] = useState(false);

  const baseEstimate = useRef<{
    calories: number
    protein: number
    carbs: number
    fat: number
  } | null>(null)

  // Loop guard — prevents calorie↔macro circular updates
  const isScaling = useRef(false)

  // Serving state
  const [servings, setServings] = useState('1')
  const [portionLabel, setPortionLabel] = useState('')
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
    loadFavoriteFoods()

      // ── Reflection trigger check ──
  getUnreflectedMeal().then(meal => {
    console.log('🔍 Reflection check:', meal);
    if (meal) {
      setUnreflectedMeal(meal);
      setShowReflection(true);
    }
  });

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

  const loadFavoriteFoods = async () => {
    try {
      setLoadingFavorites(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
  
      const { data, error } = await supabase
        .from('food_logs')
        .select('food_name, calories, protein_grams, carbs_grams, fat_grams, meal_type, created_at')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false })
  
      if (error || !data) return
  
      // Deduplicate by food_name — keep most recent
      const seen = new Set<string>()
      const deduped = data.filter(f => {
        const key = f.food_name.toLowerCase().trim()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  
      setFavoriteFoods(deduped)
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoadingFavorites(false)
    }
  }

  const filteredRecentFoods = recentSearchQuery.trim()
  ? recentFoods.filter(f =>
      f.food_name.toLowerCase().includes(recentSearchQuery.toLowerCase())
    )
  : recentFoods

const filteredFavoriteFoods = favoritesSearchQuery.trim()
  ? favoriteFoods.filter(f =>
      f.food_name.toLowerCase().includes(favoritesSearchQuery.toLowerCase())
    )
  : favoriteFoods

  useEffect(() => {
    setPlaceholderIndex(0) 
  }, [mealType])
  
  useEffect(() => {
    const placeholders = DESCRIPTION_PLACEHOLDERS[mealType] || DESCRIPTION_PLACEHOLDERS.lunch
    if (placeholders.length <= 1) return
  
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholders.length)
    }, 3000) // rotate every 3 seconds
  
    return () => clearInterval(interval)
  }, [mealType])

  const handleSelectRecent = async (food: RecentFood) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
  
      const { error } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          food_name: sanitizeFoodName(food.food_name),
          calories: food.calories,
          protein_grams: food.protein_grams || null,
          carbs_grams: food.carbs_grams || null,
          fat_grams: food.fat_grams || null,
          log_date: resolvedLogDate,
          meal_type: food.meal_type,
          entry_method: 'manual',
          is_favorite: false,
        })
  
      if (error) throw error
  
      let previousTotal = 0;
      let newTotal = 0;
  
      if (food.calories > 0) {
        const { data: existingSummary } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .eq('summary_date', resolvedLogDate)
          .single()
  
        previousTotal = existingSummary?.calories_consumed || 0;
        newTotal = previousTotal + food.calories;
  
        await supabase
          .from('daily_summaries')
          .upsert({
            user_id: user.id,
            summary_date: resolvedLogDate,
            calories_consumed: newTotal,
            calories_burned: 0,
          }, { onConflict: 'user_id,summary_date' })
      }
  
      // First meal modal
      try {
        const { count } = await supabase
          .from('food_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
        if (count === 1) await showModal({ key: 'first_meal' })
      } catch (e) {
        console.error('⚠️ First meal check failed (non-critical):', e)
      }
  
      // Over budget modal
      await checkOverBudget(previousTotal, newTotal);
  
      Alert.alert('Logged!', `${food.food_name} added to your log.`)
      onSuccess()
    } catch (error) {
      console.error('Error logging recent food:', error)
      Alert.alert('Error', 'Could not log this food. Please try again.')
    }
  }

  const clearAIResult = () => {
    setSelectedFood(null);
    setEditedCalories('');
    setEditedProtein('');
    setEditedCarbs('');
    setEditedFat('');
    setAiServingDescription('');
    setAiConfidence('');
    setServings('1')           
    setPortionLabel('')         
    baseEstimate.current = null 
    setIsFavorite(false)
    setSavedImageUrl(null)
  };

  const handleCaloriesChange = (val: string) => {
    setEditedCalories(val)
    if (!baseEstimate.current) return
    const newCalories = parseFloat(val)
    if (isNaN(newCalories) || newCalories <= 0) return
  
    const base = baseEstimate.current
    if (base.calories === 0) return
  
    isScaling.current = true
  
    // Calculate each macro's calorie contribution ratio from base
    const pCalRatio = (base.protein * 4) / base.calories
    const cCalRatio = (base.carbs * 4) / base.calories
    const fCalRatio = (base.fat * 9) / base.calories
  
    // Scale macros to hit new calorie target
    setEditedProtein(Math.round((pCalRatio * newCalories) / 4).toString())
    setEditedCarbs(Math.round((cCalRatio * newCalories) / 4).toString())
    setEditedFat(Math.round((fCalRatio * newCalories) / 9).toString())
  
    isScaling.current = false
  }
  
  const handleMacroChange = (
    field: 'protein' | 'carbs' | 'fat',
    val: string
  ) => {
    // Update the field first
    if (field === 'protein') setEditedProtein(val)
    if (field === 'carbs') setEditedCarbs(val)
    if (field === 'fat') setEditedFat(val)
  
    // Skip calorie recalc if we're already in a scaling operation
    if (isScaling.current) return
  
    // Get current values — use incoming val for the changed field
    const p = parseFloat(field === 'protein' ? val : editedProtein) || 0
    const c = parseFloat(field === 'carbs' ? val : editedCarbs) || 0
    const f = parseFloat(field === 'fat' ? val : editedFat) || 0
  
    // Recalculate calories from macros
    const newCalories = Math.round((p * 4) + (c * 4) + (f * 9))
    setEditedCalories(newCalories.toString())
  }
  
  const handleServingsChange = (val: string) => {
    setServings(val)
    if (!baseEstimate.current) return
  
    const numServings = parseFloat(val)
    if (isNaN(numServings) || numServings <= 0) return
  
    const base = baseEstimate.current
  
    isScaling.current = true
    setEditedCalories(Math.round(base.calories * numServings).toString())
    setEditedProtein(Math.round(base.protein * numServings).toString())
    setEditedCarbs(Math.round(base.carbs * numServings).toString())
    setEditedFat(Math.round(base.fat * numServings).toString())
    isScaling.current = false
  }

  const handleLogFavorite = async (food: FavoriteFood) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
  
      const { error } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          food_name: sanitizeFoodName(food.food_name),
          calories: food.calories,
          protein_grams: food.protein_grams,
          carbs_grams: food.carbs_grams,
          fat_grams: food.fat_grams,
          log_date: resolvedLogDate,
          meal_type: food.meal_type,
          entry_method: 'manual',
          is_favorite: true,
        })
  
      if (error) throw error
  
      let previousTotal = 0;
      let newTotal = 0;
  
      if (food.calories > 0) {
        const { data: existingSummary } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .eq('summary_date', resolvedLogDate)
          .single()
  
        previousTotal = existingSummary?.calories_consumed || 0;
        newTotal = previousTotal + food.calories;
  
        await supabase
          .from('daily_summaries')
          .upsert({
            user_id: user.id,
            summary_date: resolvedLogDate,
            calories_consumed: newTotal,
            calories_burned: 0,
          }, { onConflict: 'user_id,summary_date' })
      }
  
      // First meal modal
      try {
        const { count } = await supabase
          .from('food_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
        if (count === 1) await showModal({ key: 'first_meal' })
      } catch (e) {
        console.error('⚠️ First meal check failed (non-critical):', e)
      }
  
      // Over budget modal
      await checkOverBudget(previousTotal, newTotal);
  
      Alert.alert('Logged!', `${food.food_name} added to your log.`)
      onSuccess()
    } catch (error) {
      console.error('Error logging favorite:', error)
      Alert.alert('Error', 'Could not log this food. Please try again.')
    }
  }

  // AsyncStorage.removeItem('over_budget_last_seen_date').then(() => {
  //   console.log('✅ Cleared over budget seen date');
  // });

  const checkOverBudget = async (previousTotal: number, newTotal: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const monday = formatLocalDate(getMonday(new Date()));
  
      const { data: period } = await supabase
        .from('weekly_periods')
        .select('weekly_budget')
        .eq('user_id', user.id)
        .eq('week_start_date', monday)
        .maybeSingle();
  
      if (!period?.weekly_budget) return;
  
      const dailyTarget = Math.round(period.weekly_budget / 7);
      const OVER_BUDGET_THRESHOLD = Math.round(dailyTarget * 0.20);
      const triggerPoint = dailyTarget + OVER_BUDGET_THRESHOLD;
  
      // Only fire at the exact moment the threshold is crossed
      if (previousTotal <= triggerPoint && newTotal > triggerPoint) {
        await showModal({
          key: 'over_budget',
          data: {
            target: dailyTarget,
            consumed: newTotal,
            over: newTotal - dailyTarget,
          },
        });
      }
    } catch (e) {
      console.error('⚠️ Over budget check failed:', e);
    }
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
          is_favorite: isFavorite,
          image_url: savedImageUrl || null,
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

      let previousTotal = 0;
      let newTotal = 0;

      if (calories > 0) {
        const { data: existingSummary } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .eq('summary_date', resolvedLogDate)
          .single();

        previousTotal = existingSummary?.calories_consumed || 0;
        newTotal = previousTotal + calories;

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
          .select('weekly_budget')
          .eq('id', user.id)
          .single();

        if (summaries && profileBudget?.weekly_budget) {
          const totalThisWeek = summaries.reduce(
            (sum: number, day: { calories_consumed: number }) => sum + day.calories_consumed, 0
          );
          await supabase.functions.invoke('sendWeeklyLimitWarning', {
            body: {
              user_id: user.id,
              calories_consumed: totalThisWeek,
              weekly_budget: profileBudget.weekly_budget,
            },
          });
        }
      } catch (limitError) {
        console.error('⚠️ Weekly limit check failed (non-critical):', limitError);
      }

      // First meal modal
      try {
        const { count } = await supabase
          .from('food_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (count === 1) {
          await showModal({ key: 'first_meal' });
        }
      } catch (e) {
        console.error('⚠️ First meal check failed (non-critical):', e);
      }

      // Over budget modal
      await checkOverBudget(previousTotal, newTotal);

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
      setSavedImageUrl(null);

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

      const reconciledCalories = Math.round(
        (analysis.protein_grams * 4) +
        (analysis.carbs_grams * 4) +
        (analysis.fat_grams * 9)
      )
      
      setFoodDescription(analysis.food_name);
      setEstimatedCalories(analysis.calories.toString());
      setEditedCalories(reconciledCalories.toString())
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
      setServings('1')
      setPortionLabel('')

      baseEstimate.current = {
      calories: reconciledCalories,
      protein: analysis.protein_grams,
      carbs: analysis.carbs_grams,
      fat: analysis.fat_grams,
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user && base64Image) {
      const imageUrl = await uploadFoodImage(base64Image, user.id)
      if (imageUrl) setSavedImageUrl(imageUrl)
    }
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

  const uploadFoodImage = async (base64Image: string, userId: string): Promise<string | null> => {
    try {
      const filename = `${userId}/${Date.now()}.jpg`
  
      const { data, error } = await supabase.storage
        .from('food-images')
        .upload(filename, decode(base64Image), {
          contentType: 'image/jpeg',
          upsert: false,
        })
  
      if (error) {
        console.error('❌ Image upload error:', error)
        return null
      }
  
      const { data: signedData, error: signedError } = await supabase.storage
        .from('food-images')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365)
  
      if (signedError || !signedData) {
        console.error('❌ Signed URL error:', signedError)
        return null
      }
  
      console.log('✅ Image uploaded:', signedData.signedUrl)
      return signedData.signedUrl
    } catch (error) {
      console.error('❌ Upload failed:', error)
      return null
    }
  }

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

      const reconciledCalories = Math.round(
        (estimate.protein_grams * 4) +
        (estimate.carbs_grams * 4) +
        (estimate.fat_grams * 9)
      )

      setFoodDescription(estimate.food_name);
      setEstimatedCalories(estimate.calories.toString());
      setEditedCalories(reconciledCalories.toString())
      setEditedProtein(estimate.protein_grams?.toString() || '')
      setEditedCarbs(estimate.carbs_grams?.toString() || '')
      setEditedFat(estimate.fat_grams?.toString() || '')
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
      setServings('1')
      setPortionLabel('') 
      baseEstimate.current = {
        calories: reconciledCalories,
        protein: estimate.protein_grams,
        carbs: estimate.carbs_grams,
        fat: estimate.fat_grams,
      }
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

  const currentPlaceholder = DESCRIPTION_PLACEHOLDERS[mealType]?.[placeholderIndex] 
  ?? 'e.g. chicken salad with ranch dressing'


  // ── Gallery note review screen ──────────────────────────────────────────────
  if (pendingNoteReview && selectedImage) {
    return (
      <Modal
      visible={pendingNoteReview && !!selectedImage}
      animationType="slide"
      presentationStyle="fullScreen"
    >
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
                processImageWithAI(selectedImage!, sheetUserNote.trim());
              }}
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <Text style={styles.galleryAnalyzeButtonText}>Analyze Meal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    );
  }

  // ── Method selection screen ─────────────────────────────────────────────────
  if (!selectedMethod) {

    return (
      <>
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

              {/* ── Tab toggle ── */}
        <View style={styles.tabToggleContainer}>
          <TouchableOpacity
            style={[styles.tabToggleButton, activeTab === 'recent' && styles.tabToggleButtonActive]}
            onPress={() => {
              setActiveTab('recent')
              setFavoritesSearchQuery('') 
            }}
          >
            <Text style={[styles.tabToggleText, activeTab === 'recent' && styles.tabToggleTextActive]}>
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabToggleButton, activeTab === 'favorites' && styles.tabToggleButtonActive]}
            onPress={() => {
              setActiveTab('favorites')
              setRecentSearchQuery('')
            }}
          >
            <Text style={[styles.tabToggleText, activeTab === 'favorites' && styles.tabToggleTextActive]}>
              Favorites
            </Text>
          </TouchableOpacity>
        </View>

      {/* ── Recent tab ── */}
      {activeTab === 'recent' && (
  <View style={styles.recentSection}>
    <View style={styles.searchBar}>
      <Ionicons name="search" size={16} color={Colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={recentSearchQuery}
        onChangeText={setRecentSearchQuery}
        placeholder="Search recent foods..."
        placeholderTextColor={Colors.textMuted}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>

    {filteredRecentFoods.length === 0 && !loadingRecent ? (
      <Text style={styles.emptyTabText}>
        {recentSearchQuery ? 'No results found' : 'No recent foods yet'}
      </Text>
    ) : (
      <View style={styles.recentCard}>
        {(showAllRecent
          ? filteredRecentFoods
          : filteredRecentFoods.slice(0, RECENT_DISPLAY_LIMIT)
        ).map((food, index) => (
          <TouchableOpacity style={styles.recentItem} onPress={() => handleSelectRecent(food)}>
        <View style={styles.recentInfo}>
          <Text style={styles.recentName} numberOfLines={1}>{food.food_name}</Text>
          <View style={styles.recentMacrosRow}>
            <Text style={styles.recentCalories}>{food.calories} cal</Text>
            {food.protein_grams != null && (
              <>
                <View style={styles.macroDot} />
                <Ionicons name="barbell-outline" size={11} color={Colors.energyOrange} />
                <Text style={styles.recentMacroText}>{Math.round(food.protein_grams)}g</Text>
              </>
            )}
            {food.carbs_grams != null && (
              <>
                <View style={styles.macroDot} />
                <Ionicons name="nutrition-outline" size={11} color={Colors.vividTeal} />
                <Text style={styles.recentMacroText}>{Math.round(food.carbs_grams)}g</Text>
              </>
            )}
            {food.fat_grams != null && (
              <>
                <View style={styles.macroDot} />
                <Ionicons name="water-outline" size={11} color={Colors.steelBlue} />
                <Text style={styles.recentMacroText}>{Math.round(food.fat_grams)}g</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.recentAddButton}>
          <Ionicons name="add" size={20} color="#206E6B" />
        </View>
      </TouchableOpacity>
        ))}
      </View>
    )}

    {filteredRecentFoods.length > RECENT_DISPLAY_LIMIT && !recentSearchQuery && (
      <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAllRecent(!showAllRecent)}>
        <Text style={styles.showMoreText}>
          {showAllRecent ? 'Show Less' : `Show More (${filteredRecentFoods.length - RECENT_DISPLAY_LIMIT} more)`}
        </Text>
        <Ionicons name={showAllRecent ? 'chevron-up' : 'chevron-down'} size={16} color="#206E6B" />
      </TouchableOpacity>
    )}

    {loadingRecent && (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#206E6B" />
      </View>
    )}
  </View>
)}

      {/* ── Favorites tab ── */}
      {activeTab === 'favorites' && (
  <View style={styles.recentSection}>
    {loadingFavorites ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#206E6B" />
      </View>
    ) : favoriteFoods.length === 0 ? (
      <View style={styles.emptyFavoritesContainer}>
        <Ionicons name="star-outline" size={32} color={Colors.textMuted} />
        <Text style={styles.emptyFavoritesTitle}>No favorites yet</Text>
        <Text style={styles.emptyFavoritesSubtext}>
          Tap the star when logging a meal to save it here
        </Text>
      </View>
    ) : (
      <>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={favoritesSearchQuery}
            onChangeText={setFavoritesSearchQuery}
            placeholder="Search favorites..."
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {filteredFavoriteFoods.length === 0 ? (
          <Text style={styles.emptyTabText}>No results found</Text>
        ) : (
          <View style={styles.recentCard}>
            {filteredFavoriteFoods.map((food, index) => (
              <View key={index}>
                <TouchableOpacity
                  style={styles.recentItem}
                  onPress={() => handleLogFavorite(food)}
                >
                     <View style={styles.recentInfo}>
            <Text style={styles.recentName} numberOfLines={1}>{food.food_name}</Text>
            <View style={styles.recentMacrosRow}>
              <Text style={styles.recentCalories}>{food.calories} cal</Text>
              {food.protein_grams != null && (
                <>
                  <View style={styles.macroDot} />
                  <Ionicons name="barbell-outline" size={11} color={Colors.energyOrange} />
                  <Text style={styles.recentMacroText}>{Math.round(food.protein_grams)}g</Text>
                </>
              )}
              {food.carbs_grams != null && (
                <>
                  <View style={styles.macroDot} />
                  <Ionicons name="nutrition-outline" size={11} color={Colors.vividTeal} />
                  <Text style={styles.recentMacroText}>{Math.round(food.carbs_grams)}g</Text>
                </>
              )}
              {food.fat_grams != null && (
                <>
                  <View style={styles.macroDot} />
                  <Ionicons name="water-outline" size={11} color={Colors.steelBlue} />
                  <Text style={styles.recentMacroText}>{Math.round(food.fat_grams)}g</Text>
                </>
              )}
            </View>
          </View>
                  <View style={styles.recentAddButton}>
                    <Ionicons name="add" size={20} color="#206E6B" />
                  </View>
                </TouchableOpacity>
                {index < filteredFavoriteFoods.length - 1 && (
                  <View style={styles.recentDivider} />
                )}
              </View>
            ))}
          </View>
        )}
      </>
    )}
  </View>
)}
        </ScrollView>
      </View>
      <QuickReflectionModal
        visible={showReflection && !!unreflectedMeal}
        meal={unreflectedMeal}
        onComplete={() => {
          setShowReflection(false);
          setUnreflectedMeal(null);
        }}
      />
      </>
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
          <View style={styles.textInputWrapper}>
            <TextInput
              nativeID={INPUT_ACCESSORY_ID}
              style={styles.textInputWithMic}
              value={foodDescription}
              onChangeText={(text: string) => {
                setFoodDescription(text);
                // Clear AI result if user edits description after estimating
                if (selectedFood) {
                  clearAIResult();
                }
              }}
              placeholder={currentPlaceholder}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.micButton}
              onPress={() => setShowVoiceModal(true)}
            >
              <Ionicons name="mic" size={18} color={Colors.vividTeal} />
            </TouchableOpacity>
          </View>

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
  <View style={styles.servingsContainer}>
    <Text style={styles.label}>Servings</Text>
    <View style={styles.servingsCard}>
      <View style={styles.servingsStepper}>
        <TouchableOpacity
          style={styles.servingsStepButton}
          onPress={() => {
            const current = parseFloat(servings) || 1
            const next = Math.max(0.5, current - 0.5)
            handleServingsChange(next.toString())
          }}
        >
          <Ionicons name="remove" size={22} color={Colors.steelBlue} />
        </TouchableOpacity>

        <Text style={styles.servingsValue}>{servings}</Text>

        <TouchableOpacity
          style={styles.servingsStepButton}
          onPress={() => {
            const current = parseFloat(servings) || 1
            const next = current + 0.5
            handleServingsChange(next.toString())
          }}
        >
          <Ionicons name="add" size={22} color={Colors.steelBlue} />
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
        {selectedFood && (
          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionTitle}>Nutrition Info</Text>
            <Text style={styles.nutritionEditHint}>Tap any value to edit</Text>

            <View style={styles.nutritionCaloriesRow}>
              <TextInput
                style={styles.nutritionCaloriesInput}
                value={editedCalories}
                onChangeText={handleCaloriesChange}
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
                  onChangeText={(val) => handleMacroChange('protein', val)} 
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
                  onChangeText={(val) => handleMacroChange('carbs', val)}
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
                  onChangeText={(val) => handleMacroChange('fat', val)} 
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
            {selectedFood && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => setIsFavorite(prev => !prev)}
            >
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={20}
                color={isFavorite ? Colors.energyOrange : Colors.textMuted}
              />
              <Text style={[
                styles.favoriteButtonText,
                isFavorite && styles.favoriteButtonTextActive
              ]}>
                {isFavorite ? 'Added to favorites' : 'Add to favorites'}
              </Text>
            </TouchableOpacity>
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
  
      <VoiceInputModal
    visible={showVoiceModal}
    onClose={() => setShowVoiceModal(false)}
    onConfirm={(transcript) => {
      setFoodDescription(transcript);
    }}
/>
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
    marginTop: 10,
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
   flex:1,
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
  textInputWrapper: {
    position: 'relative',
  },
  textInputWithMic: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    paddingRight: 52,
    fontSize: 16,
    color: '#504D47',
    minHeight: 100,
  },
  micButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.tealOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsContainer: {
    marginBottom: 16,
  },
  servingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    gap: 8,
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 260,
  },
  servingsStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  servingsStepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    minWidth: 52,
    textAlign: 'center',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
    paddingVertical: 14,
    marginBottom: 8,
  },
  favoriteButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textMuted,
    textDecorationLine:'underline'
  },
  favoriteButtonTextActive: {
    color: '#EF4444',
  },
  tabToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginTop: 10,
  },
  tabToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabToggleButtonActive: {
    backgroundColor: Colors.vividTeal,
  },
  tabToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabToggleTextActive: {
    color: '#FFFFFF',
  },
  emptyTabText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 14,
    paddingVertical: 24,
  },
  emptyFavoritesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyFavoritesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
  },
  emptyFavoritesSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  favoriteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.graphite,
    paddingVertical: 0,
  },
  recentMacrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  recentMacroText: {
    fontSize: 11,
    color: Colors.steelBlue,
    fontWeight: '500',
  },
  macroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.border,
  },
});