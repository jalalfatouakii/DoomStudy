import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';

const APP_GROUP_IDENTIFIER = 'group.com.doomstudy.jxlxl';

type StatsContextType = {
    streak: number;
    timeSaved: number; // in seconds
    weeklyData: number[]; // hours for last 7 days
    weeklyLabels: string[]; // labels for last 7 days
};

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const useStats = () => {
    const context = useContext(StatsContext);
    if (!context) {
        throw new Error('useStats must be used within a StatsProvider');
    }
    return context;
};

export const StatsProvider = ({ children }: { children: React.ReactNode }) => {
    const [streak, setStreak] = useState(0);
    const [timeSaved, setTimeSaved] = useState(0);
    const [dailyHistory, setDailyHistory] = useState<Record<string, number>>({});
    const sessionStartTime = useRef<number | null>(null);

    useEffect(() => {
        loadStats();

        // Start tracking session
        sessionStartTime.current = Date.now();

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    const loadStats = async () => {
        try {
            const storedStreak = await AsyncStorage.getItem('streak');
            const storedLastOpened = await AsyncStorage.getItem('lastOpenedDate');
            const storedTimeSaved = await AsyncStorage.getItem('timeSaved');
            const storedHistory = await AsyncStorage.getItem('dailyHistory');

            let currentStreak = storedStreak ? parseInt(storedStreak) : 0;
            let currentTimeSaved = storedTimeSaved ? parseInt(storedTimeSaved) : 0;
            let history = storedHistory ? JSON.parse(storedHistory) : {};

            setDailyHistory(history);

            // Streak Logic
            const today = new Date().toDateString();
            const lastOpened = storedLastOpened ? new Date(parseInt(storedLastOpened)).toDateString() : null;

            if (lastOpened !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (lastOpened === yesterday.toDateString()) {
                    currentStreak += 1;
                } else if (lastOpened) {
                    // Streak broken if not opened yesterday (and not first time)
                    // But wait, if lastOpened is null, it's first time, so streak 1.
                    // If lastOpened is older than yesterday, reset to 1.
                    currentStreak = 1;
                } else {
                    // First time ever
                    currentStreak = 1;
                }

                await AsyncStorage.setItem('streak', currentStreak.toString());
                await AsyncStorage.setItem('lastOpenedDate', Date.now().toString());
            }

            setStreak(currentStreak);
            setTimeSaved(currentTimeSaved);

            // Sync initial load to widget
            syncToWidget(currentStreak, currentTimeSaved);

        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
            if (sessionStartTime.current) {
                const duration = (Date.now() - sessionStartTime.current) / 1000; // seconds

                // Update state and storage
                setTimeSaved(prev => {
                    const newTimeSaved = prev + duration;
                    saveTimeSaved(newTimeSaved, duration);
                    return newTimeSaved;
                });

                sessionStartTime.current = null;
            }
        } else if (nextAppState === 'active') {
            sessionStartTime.current = Date.now();
            // Re-check streak in case day changed while in background?
            // For simplicity, we rely on full reload or next app open for now,
            // or we could call loadStats() again here.
            loadStats();
        }
    };

    const saveTimeSaved = async (newTimeSaved: number, sessionDuration: number) => {
        try {
            await AsyncStorage.setItem('timeSaved', newTimeSaved.toString());

            // Update daily history
            const todayKey = new Date().toISOString().split('T')[0];
            setDailyHistory(prev => {
                const newHistory = { ...prev, [todayKey]: (prev[todayKey] || 0) + sessionDuration };
                AsyncStorage.setItem('dailyHistory', JSON.stringify(newHistory));
                return newHistory;
            });

            syncToWidget(streak, newTimeSaved);
        } catch (error) {
            console.error('Failed to save time saved:', error);
        }
    };

    const syncToWidget = async (currentStreak: number, currentTimeSaved: number) => {
        try {
            await SharedGroupPreferences.setItem('streak', currentStreak, APP_GROUP_IDENTIFIER);
            await SharedGroupPreferences.setItem('timeSaved', currentTimeSaved, APP_GROUP_IDENTIFIER);
        } catch (error) {
            // console.error('Failed to sync to widget:', error);
            // Expected to fail on Simulator if App Groups aren't set up correctly,
            // or if not running on a device with proper provisioning.
        }
    };

    // Calculate last 7 days activity
    const getLast7DaysData = () => {
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const data = [];
        const labels = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const seconds = dailyHistory[key] || 0;
            data.push(seconds / 3600); // Hours
            labels.push(days[d.getDay()]);
        }
        return { data, labels };
    };

    const { data, labels } = getLast7DaysData();

    return (
        <StatsContext.Provider value={{
            streak,
            timeSaved,
            weeklyData: data,
            weeklyLabels: labels
        }}>
            {children}
        </StatsContext.Provider>
    );
};
