import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';

// Conditional import for expo-image-picker (may not be installed yet)
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('expo-image-picker not installed. Photo picking will be unavailable.');
}

export type VideoImportResult = {
  uri: string;
  name: string;
};

/**
 * Request media library permissions (iOS/Android)
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true; // Web doesn't need permissions
  }

  if (!ImagePicker) {
    return false;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Pick a video from Photos/Media Library
 */
export async function pickVideoFromPhotos(): Promise<VideoImportResult | null> {
  try {
    if (!ImagePicker) {
      Alert.alert(
        'Not Available',
        'Photo picking requires expo-image-picker. Please install it: npm install expo-image-picker'
      );
      return null;
    }

    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to select videos.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return {
      uri: result.assets[0].uri,
      name: result.assets[0].fileName || `video_${Date.now()}.mp4`,
    };
  } catch (error) {
    console.error('Error picking video from photos:', error);
    Alert.alert('Error', 'Failed to pick video from photos.');
    return null;
  }
}

/**
 * Pick a video from Files (Document Picker)
 */
export async function pickVideoFromFiles(): Promise<VideoImportResult | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return {
      uri: result.assets[0].uri,
      name: result.assets[0].name,
    };
  } catch (error) {
    console.error('Error picking video from files:', error);
    Alert.alert('Error', 'Failed to pick video from files.');
    return null;
  }
}

/**
 * Show a picker dialog to choose between Photos or Files
 */
export async function pickVideoSource(): Promise<VideoImportResult | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Select Video Source',
      'Choose where to import the video from:',
      [
        {
          text: 'Photos',
          onPress: async () => {
            const result = await pickVideoFromPhotos();
            resolve(result);
          },
        },
        {
          text: 'Files',
          onPress: async () => {
            const result = await pickVideoFromFiles();
            resolve(result);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}
