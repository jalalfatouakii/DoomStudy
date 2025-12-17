import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type PreferencesContextType = {
  videoBackgroundEnabled: boolean;
  setVideoBackgroundEnabled: (enabled: boolean) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const VIDEO_BACKGROUND_ENABLED_KEY = 'videoBackgroundEnabled';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [videoBackgroundEnabled, setVideoBackgroundEnabledState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const value = await AsyncStorage.getItem(VIDEO_BACKGROUND_ENABLED_KEY);
        setVideoBackgroundEnabledState(value === 'true');
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

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <PreferencesContext.Provider
      value={{
        videoBackgroundEnabled,
        setVideoBackgroundEnabled,
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
