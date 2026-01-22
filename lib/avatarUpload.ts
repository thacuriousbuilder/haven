
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { Alert } from 'react-native';

export interface AvatarUploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

export const uploadAvatar = async (userId: string): Promise<AvatarUploadResult> => {
  try {
    // Request permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      return {
        success: false,
        error: 'Permission to access photos is required',
      };
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return { success: false };
    }

    const image = result.assets[0];
    
    // Create unique filename
    const fileExt = image.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Convert image to blob
    const response = await fetch(image.uri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return {
        success: false,
        error: 'Failed to upload image',
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return {
        success: false,
        error: 'Failed to update profile',
      };
    }

    return {
      success: true,
      avatarUrl: publicUrl,
    };
  } catch (error) {
    console.error('Avatar upload error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
};