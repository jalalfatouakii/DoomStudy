import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Video category types
export type BuiltInVideoCategoryId = 'gameplay' | 'satisfying' | 'narrated' | 'ambient' | 'nature';

export type UserVideoCategory = {
  id: string;
  name: string;
  createdAt: number;
};

export type UserVideo = {
  id: string;
  categoryId: string;
  uri: string;
  displayName: string;
  originalName: string;
  addedAt: number;
  updatedAt: number;
};

type PreferencesContextType = {
  videoBackgroundEnabled: boolean;
  setVideoBackgroundEnabled: (enabled: boolean) => Promise<void>;
  // Video background styling
  snippetCardBackgroundOpacity: number;
  setSnippetCardBackgroundOpacity: (opacity: number) => Promise<void>;
  snippetCardTextColor: string;
  setSnippetCardTextColor: (color: string) => Promise<void>;
  snippetCardBackgroundColor: string;
  setSnippetCardBackgroundColor: (color: string) => Promise<void>;
  videoBackgroundShowHeader: boolean;
  setVideoBackgroundShowHeader: (show: boolean) => Promise<void>;
  // Video categories
  enabledVideoCategoryIds: string[];
  setEnabledVideoCategoryIds: (ids: string[]) => Promise<void>;
  userVideoCategories: UserVideoCategory[];
  userVideos: UserVideo[];
  // Video category helpers
  addUserVideo: (categoryId: string, uri: string, originalName: string, displayName?: string) => Promise<string>;
  updateUserVideoMeta: (videoId: string, updates: { displayName?: string; categoryId?: string }) => Promise<void>;
  replaceUserVideoFile: (videoId: string, newUri: string, newOriginalName: string) => Promise<void>;
  deleteUserVideo: (videoId: string) => Promise<void>;
  createUserCategory: (name: string) => Promise<string>;
  renameUserCategory: (categoryId: string, newName: string) => Promise<void>;
  deleteUserCategory: (categoryId: string) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const VIDEO_BACKGROUND_ENABLED_KEY = 'videoBackgroundEnabled';
const SNIPPET_CARD_BACKGROUND_OPACITY_KEY = 'snippetCardBackgroundOpacity';
const SNIPPET_CARD_TEXT_COLOR_KEY = 'snippetCardTextColor';
const SNIPPET_CARD_BACKGROUND_COLOR_KEY = 'snippetCardBackgroundColor';
const VIDEO_BACKGROUND_SHOW_HEADER_KEY = 'videoBackgroundShowHeader';
const ENABLED_VIDEO_CATEGORY_IDS_KEY = 'enabledVideoCategoryIds';
const USER_VIDEO_CATEGORIES_KEY = 'videoUserCategories';
const USER_VIDEOS_KEY = 'videoUserVideos';
const USER_VIDEOS_DIR = 'user-videos';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [videoBackgroundEnabled, setVideoBackgroundEnabledState] = useState(false);
  const [snippetCardBackgroundOpacity, setSnippetCardBackgroundOpacityState] = useState(0.8);
  const [snippetCardTextColor, setSnippetCardTextColorState] = useState('#ECEDEE');
  const [snippetCardBackgroundColor, setSnippetCardBackgroundColorState] = useState('#1E2022');
  const [videoBackgroundShowHeader, setVideoBackgroundShowHeaderState] = useState(true);
  const [enabledVideoCategoryIds, setEnabledVideoCategoryIdsState] = useState<string[]>([]);
  const [userVideoCategories, setUserVideoCategoriesState] = useState<UserVideoCategory[]>([]);
  const [userVideos, setUserVideosState] = useState<UserVideo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [enabled, opacity, textColor, bgColor, showHeader, categoryIds, categories, videos] = await Promise.all([
          AsyncStorage.getItem(VIDEO_BACKGROUND_ENABLED_KEY),
          AsyncStorage.getItem(SNIPPET_CARD_BACKGROUND_OPACITY_KEY),
          AsyncStorage.getItem(SNIPPET_CARD_TEXT_COLOR_KEY),
          AsyncStorage.getItem(SNIPPET_CARD_BACKGROUND_COLOR_KEY),
          AsyncStorage.getItem(VIDEO_BACKGROUND_SHOW_HEADER_KEY),
          AsyncStorage.getItem(ENABLED_VIDEO_CATEGORY_IDS_KEY),
          AsyncStorage.getItem(USER_VIDEO_CATEGORIES_KEY),
          AsyncStorage.getItem(USER_VIDEOS_KEY),
        ]);

        setVideoBackgroundEnabledState(enabled === 'true');
        setSnippetCardBackgroundOpacityState(opacity ? parseFloat(opacity) : 0.8);
        setSnippetCardTextColorState(textColor || '#ECEDEE');
        setSnippetCardBackgroundColorState(bgColor || '#1E2022');
        setVideoBackgroundShowHeaderState(showHeader !== 'false');
        // Default to all built-in categories enabled if none are set
        const defaultEnabledIds: string[] = ['gameplay', 'satisfying', 'narrated', 'ambient', 'nature'];
        setEnabledVideoCategoryIdsState(
          categoryIds ? JSON.parse(categoryIds) : defaultEnabledIds
        );
        setUserVideoCategoriesState(categories ? JSON.parse(categories) : []);
        setUserVideosState(videos ? JSON.parse(videos) : []);

        // Ensure user-videos directory exists
        const videosDir = `${FileSystem.documentDirectory}${USER_VIDEOS_DIR}`;
        const dirInfo = await FileSystem.getInfoAsync(videosDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(videosDir, { intermediates: true });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadPreferences();
  }, []);

  const setVideoBackgroundEnabled = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(VIDEO_BACKGROUND_ENABLED_KEY, enabled.toString());
      setVideoBackgroundEnabledState(enabled);
    } catch (error) {
      console.error('Error saving video background preference:', error);
    }
  };

  const setSnippetCardBackgroundOpacity = async (opacity: number) => {
    try {
      await AsyncStorage.setItem(SNIPPET_CARD_BACKGROUND_OPACITY_KEY, opacity.toString());
      setSnippetCardBackgroundOpacityState(opacity);
    } catch (error) {
      console.error('Error saving snippet card background opacity:', error);
    }
  };

  const setSnippetCardTextColor = async (color: string) => {
    try {
      await AsyncStorage.setItem(SNIPPET_CARD_TEXT_COLOR_KEY, color);
      setSnippetCardTextColorState(color);
    } catch (error) {
      console.error('Error saving snippet card text color:', error);
    }
  };

  const setSnippetCardBackgroundColor = async (color: string) => {
    try {
      await AsyncStorage.setItem(SNIPPET_CARD_BACKGROUND_COLOR_KEY, color);
      setSnippetCardBackgroundColorState(color);
    } catch (error) {
      console.error('Error saving snippet card background color:', error);
    }
  };

  const setVideoBackgroundShowHeader = async (show: boolean) => {
    try {
      await AsyncStorage.setItem(VIDEO_BACKGROUND_SHOW_HEADER_KEY, show.toString());
      setVideoBackgroundShowHeaderState(show);
    } catch (error) {
      console.error('Error saving video background show header:', error);
    }
  };

  const setEnabledVideoCategoryIds = async (ids: string[]) => {
    try {
      await AsyncStorage.setItem(ENABLED_VIDEO_CATEGORY_IDS_KEY, JSON.stringify(ids));
      setEnabledVideoCategoryIdsState(ids);
    } catch (error) {
      console.error('Error saving enabled video category IDs:', error);
    }
  };

  const addUserVideo = async (
    categoryId: string,
    sourceUri: string,
    originalName: string,
    displayName?: string
  ): Promise<string> => {
    try {
      const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${videoId}.mp4`;
      const destUri = `${FileSystem.documentDirectory}${USER_VIDEOS_DIR}/${fileName}`;

      // Copy file to app storage
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destUri,
      });

      const newVideo: UserVideo = {
        id: videoId,
        categoryId,
        uri: destUri,
        displayName: displayName || originalName,
        originalName,
        addedAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updatedVideos = [...userVideos, newVideo];
      await AsyncStorage.setItem(USER_VIDEOS_KEY, JSON.stringify(updatedVideos));
      setUserVideosState(updatedVideos);

      return videoId;
    } catch (error) {
      console.error('Error adding user video:', error);
      throw error;
    }
  };

  const updateUserVideoMeta = async (
    videoId: string,
    updates: { displayName?: string; categoryId?: string }
  ): Promise<void> => {
    try {
      const updatedVideos = userVideos.map((video) => {
        if (video.id === videoId) {
          return {
            ...video,
            ...updates,
            updatedAt: Date.now(),
          };
        }
        return video;
      });

      await AsyncStorage.setItem(USER_VIDEOS_KEY, JSON.stringify(updatedVideos));
      setUserVideosState(updatedVideos);
    } catch (error) {
      console.error('Error updating user video metadata:', error);
      throw error;
    }
  };

  const replaceUserVideoFile = async (
    videoId: string,
    newSourceUri: string,
    newOriginalName: string
  ): Promise<void> => {
    try {
      const video = userVideos.find((v) => v.id === videoId);
      if (!video) throw new Error('Video not found');

      const fileName = `${videoId}.mp4`;
      const destUri = `${FileSystem.documentDirectory}${USER_VIDEOS_DIR}/${fileName}`;

      // Copy new file
      await FileSystem.copyAsync({
        from: newSourceUri,
        to: destUri,
      });

      // Try to delete old file (best-effort)
      try {
        const oldFileInfo = await FileSystem.getInfoAsync(video.uri);
        if (oldFileInfo.exists) {
          await FileSystem.deleteAsync(video.uri, { idempotent: true });
        }
      } catch (deleteError) {
        console.warn('Could not delete old video file:', deleteError);
      }

      // Update metadata
      const updatedVideos = userVideos.map((v) => {
        if (v.id === videoId) {
          return {
            ...v,
            uri: destUri,
            originalName: newOriginalName,
            updatedAt: Date.now(),
          };
        }
        return v;
      });

      await AsyncStorage.setItem(USER_VIDEOS_KEY, JSON.stringify(updatedVideos));
      setUserVideosState(updatedVideos);
    } catch (error) {
      console.error('Error replacing user video file:', error);
      throw error;
    }
  };

  const deleteUserVideo = async (videoId: string): Promise<void> => {
    try {
      const video = userVideos.find((v) => v.id === videoId);
      if (!video) return;

      // Try to delete file (best-effort)
      try {
        const fileInfo = await FileSystem.getInfoAsync(video.uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(video.uri, { idempotent: true });
        }
      } catch (deleteError) {
        console.warn('Could not delete video file:', deleteError);
      }

      // Remove from metadata
      const updatedVideos = userVideos.filter((v) => v.id !== videoId);
      await AsyncStorage.setItem(USER_VIDEOS_KEY, JSON.stringify(updatedVideos));
      setUserVideosState(updatedVideos);
    } catch (error) {
      console.error('Error deleting user video:', error);
      throw error;
    }
  };

  const createUserCategory = async (name: string): Promise<string> => {
    try {
      const categoryId = `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newCategory: UserVideoCategory = {
        id: categoryId,
        name,
        createdAt: Date.now(),
      };

      const updatedCategories = [...userVideoCategories, newCategory];
      await AsyncStorage.setItem(USER_VIDEO_CATEGORIES_KEY, JSON.stringify(updatedCategories));
      setUserVideoCategoriesState(updatedCategories);

      return categoryId;
    } catch (error) {
      console.error('Error creating user category:', error);
      throw error;
    }
  };

  const renameUserCategory = async (categoryId: string, newName: string): Promise<void> => {
    try {
      const updatedCategories = userVideoCategories.map((cat) => {
        if (cat.id === categoryId) {
          return { ...cat, name: newName };
        }
        return cat;
      });

      await AsyncStorage.setItem(USER_VIDEO_CATEGORIES_KEY, JSON.stringify(updatedCategories));
      setUserVideoCategoriesState(updatedCategories);
    } catch (error) {
      console.error('Error renaming user category:', error);
      throw error;
    }
  };

  const deleteUserCategory = async (categoryId: string): Promise<void> => {
    try {
      // Remove category
      const updatedCategories = userVideoCategories.filter((cat) => cat.id !== categoryId);
      await AsyncStorage.setItem(USER_VIDEO_CATEGORIES_KEY, JSON.stringify(updatedCategories));
      setUserVideoCategoriesState(updatedCategories);

      // Remove from enabled list if present
      const updatedEnabled = enabledVideoCategoryIds.filter((id) => id !== categoryId);
      if (updatedEnabled.length !== enabledVideoCategoryIds.length) {
        await setEnabledVideoCategoryIds(updatedEnabled);
      }
    } catch (error) {
      console.error('Error deleting user category:', error);
      throw error;
    }
  };

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <PreferencesContext.Provider
      value={{
        videoBackgroundEnabled,
        setVideoBackgroundEnabled,
        snippetCardBackgroundOpacity,
        setSnippetCardBackgroundOpacity,
        snippetCardTextColor,
        setSnippetCardTextColor,
        snippetCardBackgroundColor,
        setSnippetCardBackgroundColor,
        videoBackgroundShowHeader,
        setVideoBackgroundShowHeader,
        enabledVideoCategoryIds,
        setEnabledVideoCategoryIds,
        userVideoCategories,
        userVideos,
        addUserVideo,
        updateUserVideoMeta,
        replaceUserVideoFile,
        deleteUserVideo,
        createUserCategory,
        renameUserCategory,
        deleteUserCategory,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
