import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { searchFoods, getFoodDetails, getRecentFoods } from '@/utils/foodSearch';
import * as ImagePicker from 'expo-image-picker';
import { getLocalDateString } from '@/utils/timezone';

interface FoodLogSheetProps {
  onSuccess: () => void;
  initialMethod?: 'camera' | 'photo' | 'search' | 'manual' | null;
  initialImageBase64?: string | null;
}

type LogMethod = 'manual' | 'search' | 'image' | null;
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';


interface SearchResult {
  food_id: string;
  food_name: string;
  brand_name?: string;
  food_description: string;
}

interface RecentFood {
  food_name: string;
  calories: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  meal_type: string;
}

export function FoodLogSheet({ 
  onSuccess, 
  initialMethod = null,
  initialImageBase64 = null 
}: FoodLogSheetProps) {
  const [selectedMethod, setSelectedMethod] = useState<LogMethod>(
    initialMethod === 'camera' || initialMethod === 'photo' ? 'image' : initialMethod || null
  );
  const [foodDescription, setFoodDescription] = useState('');
  const [estimatedCalories, setEstimatedCalories] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(initialImageBase64 || null);
  const [processingImage, setProcessingImage] = useState(false);

  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  
  // AI estimation state
  const [estimatingNutrition, setEstimatingNutrition] = useState(false);
  const [showEstimateButton, setShowEstimateButton] = useState(false);

  // Recent foods state
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const RECENT_DISPLAY_LIMIT = 3;

  useEffect(() => {
    loadRecentFoods();
    // Set initial method and image if provided
    if (initialMethod === 'search') {
      setSelectedMethod('search');
    } else if (initialMethod === 'manual') {
      setSelectedMethod('manual');
    } else if (initialImageBase64) {
      setSelectedImage(initialImageBase64);
      setSelectedMethod('image');
    }
  }, [initialMethod,initialImageBase64]);

  useEffect(() => {
    if (selectedMethod === 'image' && selectedImage && !processingImage) {
      processImageWithAI(selectedImage);
    }
  }, [selectedMethod, selectedImage]);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setHasSearched(true);
      const results = await searchFoods(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search foods');
      setHasSearched(true); // Mark as searched even on error
    } finally {
      setSearching(false);
    }
  };

  const handleSelectFood = async (result: SearchResult) => {
    try {
      setSearching(true);
      const details = await getFoodDetails(result.food_id);
      
      if (details) {
        setSelectedFood(details);
        setFoodDescription(details.name);
        setEstimatedCalories(details.calories.toString());
      }
    } catch (error) {
      console.error('Error getting food details:', error);
      Alert.alert('Error', 'Failed to load food details');
    } finally {
      setSearching(false);
    }
  };

  // Check if food description is substantial enough for AI estimation (minimum 3 words)
  const checkDescriptionForEstimate = (text: string) => {
    const words = text.trim().split(/\s+/);
    //@ts-ignore
    setShowEstimateButton(words.length >= 3 && words.filter((w: any) => w.length > 0).length >= 3);
  };

  const handleSelectRecent = (food: RecentFood) => {
    setFoodDescription(food.food_name);
    setEstimatedCalories(food.calories.toString());
    setMealType(food.meal_type as MealType);
    setSelectedMethod('manual'); // Skip to manual form with pre-filled data
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

      const calories = estimatedCalories ? parseInt(estimatedCalories) : 0;

      const { error } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          food_name: foodDescription,
          calories: calories,
          protein_grams: selectedFood?.protein || null,
          carbs_grams: selectedFood?.carbs || null,
          fat_grams: selectedFood?.fat || null,
          log_date:  getLocalDateString(),
          meal_type: mealType,
          entry_method: selectedMethod === 'search' 
                                  ? 'database' 
                                  : selectedMethod === 'image'
                                  ? 'ai_image_scan'
                                  : selectedFood 
                                  ? 'ai_text_estimate' 
                                  : 'manual',
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
      // This is the first food log - set baseline start date to today
      const today = getLocalDateString();
      await supabase
        .from('profiles')
        .update({ baseline_start_date: today })
        .eq('id', user.id);
      
      console.log('✅ Baseline started on:', today);
    }


      // Update daily summary
      if (calories > 0) {
        const today =  getLocalDateString();
        
        const { data: existingSummary } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .eq('summary_date', today)
          .single();

        const newTotal = (existingSummary?.calories_consumed || 0) + calories;

        await supabase
          .from('daily_summaries')
          .upsert({
            user_id: user.id,
            summary_date: today,
            calories_consumed: newTotal,
            calories_burned: 0,
          }, {
            onConflict: 'user_id,summary_date'
          });
      }

      // Success - reset form
      setFoodDescription('');
      setEstimatedCalories('');
      setMealType('breakfast');
      setSelectedMethod(null);
      setSelectedFood(null);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      setSaving(false);
      
      Alert.alert('Success', 'Food logged!');
      onSuccess();
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Something went wrong');
      setSaving(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan food.');
      return;
    }
  
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Compress to reduce upload size and API costs
      base64: true, // We need base64 to send to OpenAI
    });
  
    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(result.assets[0].base64);
      setSelectedMethod('image');
    }
  };
  
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
  
    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(result.assets[0].base64);
      setSelectedMethod('image');
    }
  };
  
  const processImageWithAI = async (base64Image: string) => {
    setProcessingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyzeFoodImage', {
        body: { image_base64: base64Image },
      });
  
      if (error) {
        console.error('Function error:', error);
        throw error;
      }
  
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze image');
      }
  
      const analysis = data.data;
  
      // Pre-fill the form with AI results
      setFoodDescription(analysis.food_name);
      setEstimatedCalories(analysis.calories.toString());
      
      // Store the analysis
      setSelectedFood({
        name: analysis.food_name,
        calories: analysis.calories,
        protein: analysis.protein_grams,
        carbs: analysis.carbs_grams,
        fat: analysis.fat_grams,
      });
  
      // Show confidence level to user
      const confidenceMessage = analysis.confidence === 'high' 
        ? 'High confidence' 
        : analysis.confidence === 'medium'
        ? 'Medium confidence - please verify'
        : 'Low confidence - please verify carefully';
  
      Alert.alert(
        'Food Identified',
        `${analysis.food_name}\n${analysis.calories} calories\n\n${confidenceMessage}${analysis.notes ? '\n\n' + analysis.notes : ''}`,
        [
          {
            text: 'Edit Details',
            onPress: () => setSelectedMethod('manual'),
          },
          {
            text: 'Looks Good',
            onPress: () => setSelectedMethod('manual'),
            style: 'default',
          },
        ]
      );
  
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert(
        'Analysis Failed',
        'Could not analyze the image. Would you like to enter details manually?',
        [
          {
            text: 'Cancel',
            onPress: () => {
              setSelectedImage(null);
              setSelectedMethod(null);
            },
            style: 'cancel',
          },
          {
            text: 'Enter Manually',
            onPress: () => {
              setSelectedMethod('manual');
            },
          },
        ]
      );
    } finally {
      setProcessingImage(false);
    }
  };

  const handleEstimateNutrition = async (descriptionText?: string) => {
    // Use passed text or current state
    const textToEstimate = descriptionText || foodDescription;
    
    if (!textToEstimate.trim() || estimatingNutrition) return;
  
    setEstimatingNutrition(true);
  
    try {
      console.log('🔍 Estimating for:', textToEstimate); // Debug log
      
      const { data, error } = await supabase.functions.invoke('estimateNutrition', {
        body: { 
          food_description: textToEstimate,
          meal_type: mealType 
        },
      });
  
      if (error) {
        console.error('Estimation error:', error);
        throw error;
      }
  
      if (!data.success) {
        throw new Error(data.error || 'Failed to estimate nutrition');
      }
  
      const estimate = data.data;
  
      console.log('✅ Received estimate:', estimate); // Debug log
  
      // Pre-fill the form with AI results
      setFoodDescription(estimate.food_name);
      setEstimatedCalories(estimate.calories.toString());
      
      // Store the estimate
      setSelectedFood({
        name: estimate.food_name,
        calories: estimate.calories,
        protein: estimate.protein_grams,
        carbs: estimate.carbs_grams,
        fat: estimate.fat_grams,
      });
  
      // Show confidence level to user
      const confidenceMessage = estimate.confidence === 'high' 
        ? 'High confidence' 
        : estimate.confidence === 'medium'
        ? 'Medium confidence - please verify'
        : 'Low confidence - please verify carefully';
  
      Alert.alert(
        'Nutrition Estimated',
        `${estimate.food_name}\n${estimate.calories} calories\n\n${confidenceMessage}${estimate.notes ? '\n\n' + estimate.notes : ''}\n\nPlease review and adjust if needed.`,
        [{ text: 'Got it', style: 'default' }]
      );
  
    } catch (error) {
      console.error('Nutrition estimation error:', error);
      Alert.alert(
        'Estimation Failed',
        'Could not estimate nutrition. Please enter values manually.'
      );
    } finally {
      setEstimatingNutrition(false);
    }
  };


  const mealTypes: { value: MealType; label: string; icon: string }[] = [
    { value: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
    { value: 'lunch', label: 'Lunch', icon: 'partly-sunny-outline' },
    { value: 'dinner', label: 'Dinner', icon: 'moon-outline' },
    { value: 'snack', label: 'Snack', icon: 'fast-food-outline' },
  ];

  // Method selection screen
  if (!selectedMethod) {
    return (
      <ScrollView 
        style={styles.methodSelection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.methodContent}
      >
        <Text style={styles.sectionTitle}>How would you like to log?</Text>
        
        {/* Recent Foods */}
        {recentFoods.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Recent Foods</Text>
            {(showAllRecent ? recentFoods : recentFoods.slice(0, RECENT_DISPLAY_LIMIT)).map((food, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentCard}
                onPress={() => handleSelectRecent(food)}
              >
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{food.food_name}</Text>
                  <Text style={styles.recentCalories}>{food.calories} cal</Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color="#3D5A5C" />
              </TouchableOpacity>
            ))}
            {recentFoods.length > RECENT_DISPLAY_LIMIT && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAllRecent(!showAllRecent)}
              >
                <Text style={styles.showMoreText}>
                  {showAllRecent ? 'Show Less' : `Show More (${recentFoods.length - RECENT_DISPLAY_LIMIT} more)`}
                </Text>
                <Ionicons 
                  name={showAllRecent ? 'chevron-up' : 'chevron-down'} 
                  size={16} 
                  color="#3D5A5C" 
                />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        <TouchableOpacity
          style={styles.methodCard}
          onPress={() => setSelectedMethod('search')}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="search-outline" size={28} color="#3D5A5C" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Search Database</Text>
            <Text style={styles.methodDescription}>
              Find foods with nutrition info
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.methodCard}
          onPress={() => setSelectedMethod('manual')}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="create-outline" size={28} color="#3D5A5C" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Manual Input</Text>
            <Text style={styles.methodDescription}>
              Quickly type what you ate
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>    

      <TouchableOpacity
            style={styles.methodCard}
            onPress={handleTakePhoto}
>
           <View style={styles.methodIcon}>
             <Ionicons name="camera-outline" size={28} color="#3D5A5C" />
           </View>
           <View style={styles.methodInfo}>
             <Text style={styles.methodTitle}>Take Photo</Text>
             <Text style={styles.methodDescription}>
              Take a photo of your food for AI recognition
             </Text>
             </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
         </TouchableOpacity>   
         <TouchableOpacity
            style={styles.methodCard}
            onPress={handlePickImage}
>
         <View style={styles.methodIcon}>
            <Ionicons name="images-outline" size={28} color="#3D5A5C" />
         </View>
         <View style={styles.methodInfo}>
           <Text style={styles.methodTitle}>Select Photo</Text>
           <Text style={styles.methodDescription}>
            Select a photo from your gallery for AI recognition
        </Text>
        </View>
             <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Search screen
  if (selectedMethod === 'search') {
    return (
      <ScrollView 
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setSelectedMethod(null);
            setSearchQuery('');
            setSearchResults([]);
            setHasSearched(false);
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#3D5A5C" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>Search for food</Text>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search foods..."
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="search" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Results</Text>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.food_id}
                style={styles.resultCard}
                onPress={() => {
                  handleSelectFood(result);
                  setSelectedMethod('manual');
                }}
              >
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{result.food_name}</Text>
                  {result.brand_name && (
                    <Text style={styles.resultBrand}>{result.brand_name}</Text>
                  )}
                  <Text style={styles.resultDescription} numberOfLines={2}>
                    {result.food_description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {hasSearched && searchQuery && searchResults.length === 0 && !searching && (
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noResultsText}>No foods found</Text>
            <Text style={styles.noResultsSubtext}>Try a different search term</Text>
          </View>
        )}
      </ScrollView>
    );
  }
  // Image processing screen
  if (selectedMethod === 'image' && selectedImage) 
    {
     return (
      <View style={styles.imageProcessingContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setSelectedMethod(null);
          setSelectedImage(null);
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
            <Text style={styles.processingText}>AI is reading your photo...</Text>
          </View>
        )}
      </View>

      {!processingImage && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => processImageWithAI(selectedImage)}
        >
          <Text style={styles.retryButtonText}>Analyze Image</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => {
          setSelectedMethod('manual');
          setSelectedImage(null);
        }}
      >
        <Text style={styles.skipButtonText}>Skip & Enter Manually</Text>
      </TouchableOpacity>
    </View>
  );
}



  return (
    <ScrollView 
      style={styles.formContainer} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formContent}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setSelectedMethod(null);
          setSelectedFood(null);
        }}
      >
        <Ionicons name="arrow-back" size={20} color="#3D5A5C" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.formTitle}>What did you eat?</Text>
      
      {selectedFood && (
        <View style={styles.selectedFoodBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.selectedFoodText}>Food selected from database</Text>
        </View>
      )}

      {/* Meal Type Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Meal type</Text>
        <View style={styles.mealTypeGrid}>
          {mealTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.mealTypeCard,
                mealType === type.value && styles.mealTypeCardActive
              ]}
              onPress={() => setMealType(type.value)}
            >
              <Ionicons 
                name={type.icon as any} 
                size={24} 
                color={mealType === type.value ? '#FFFFFF' : '#3D5A5C'} 
              />
              <Text style={[
                styles.mealTypeText,
                mealType === type.value && styles.mealTypeTextActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Food description</Text>
        <TextInput
          style={styles.textInput}
          value={foodDescription}
          onChangeText={(text: string) => {
        setFoodDescription(text);
        //@ts-ignore
        checkDescriptionForEstimate(text);
    }}
       placeholder="e.g., Chicken salad with ranch dressing"
       placeholderTextColor="#9CA3AF"
       multiline
      numberOfLines={3}
    textAlignVertical="top"
  />
  
    {/* AI Estimate Button - only show when description is substantial (minimum 3 words) */}
  {showEstimateButton && !selectedFood && (
    <TouchableOpacity
      style={[styles.estimateButton, estimatingNutrition && styles.estimateButtonDisabled]}
      onPress={() => handleEstimateNutrition(foodDescription)}
      disabled={estimatingNutrition}
    >
      {estimatingNutrition ? (
        <>
          <ActivityIndicator size="small" color="#3D5A5C" />
          <Text style={styles.estimateButtonText}>Estimating...</Text>
        </>
      ) : (
        <>
          <Ionicons name="sparkles" size={16} color="#3D5A5C" />
          <Text style={styles.estimateButtonText}>Estimate Nutrition with AI</Text>
        </>
      )}
    </TouchableOpacity>
  )}
  
  {/* Show when AI has already estimated */}
  {selectedFood && (
    <View style={styles.aiEstimateBadge}>
      <Ionicons name="sparkles" size={14} color="#10B981" />
      <Text style={styles.aiEstimateText}>AI estimated - please review</Text>
    </View>
  )}
</View>

      {/* Nutrition Info if from database */}
      {selectedFood && (
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>Nutrition Info</Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{selectedFood.protein}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{selectedFood.carbs}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{selectedFood.fat}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Food Log'}
        </Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  methodSelection: {
    flex: 1,
  },
  methodContent: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 20,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  methodCardDisabled: {
    opacity: 0.6,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#3D5A5C',
    fontWeight: '600',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
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
    color: '#3D5A5C',
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
    backgroundColor: '#3D5A5C',
    borderColor: '#3D5A5C',
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5A5C',
  },
  mealTypeTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#3D5A5C',
    minHeight: 100,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#3D5A5C',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#3D5A5C',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
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
  recentSection: {
    marginBottom: 24,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  recentCalories: {
    fontSize: 14,
    color: '#6B7280',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 6,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5A5C',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#3D5A5C',
  },
  searchButton: {
    backgroundColor: '#3D5A5C',
    borderRadius: 12,
    width: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  resultBrand: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
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
    color: '#3D5A5C',
    marginBottom: 12,
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
    color: '#3D5A5C',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  imageProcessingContainer: {
    flex: 1,
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
    backgroundColor: 'rgba(61, 90, 92, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#3D5A5C',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3D5A5C',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  estimateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F1E8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3D5A5C',
    borderStyle: 'dashed',
  },
  estimateButtonDisabled: {
    opacity: 0.6,
  },
  estimateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5A5C',
  },
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
});