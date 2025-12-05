import { ContentSnippet, generateSnippets } from '@/utils/contentExtractor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Course = {
    id: string;
    title: string;
    description: string;
    tags: string[];
    files: { name: string; size: string; uri?: string; parsedText?: string }[];
    aiSnippets?: string[]; // New field for AI generated snippets
    createdAt: number;
};

export { ContentSnippet };

type CourseContextType = {
    courses: Course[];
    addCourse: (course: Omit<Course, 'id' | 'createdAt'>) => Promise<void>;
    updateCourse: (id: string, updates: Partial<Omit<Course, 'id' | 'createdAt'>>) => Promise<void>;
    deleteCourse: (id: string) => Promise<void>;
    allTags: string[];
    getRandomSnippets: (count: number, filterTags?: string[], filterCourseId?: string) => ContentSnippet[];
};

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const useCourses = () => {
    const context = useContext(CourseContext);
    if (!context) {
        throw new Error('useCourses must be used within a CourseProvider');
    }
    return context;
};

export const CourseProvider = ({ children }: { children: React.ReactNode }) => {
    const [courses, setCourses] = useState<Course[]>([]);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const storedCourses = await AsyncStorage.getItem('courses');
            if (storedCourses) {
                const parsedCourses = JSON.parse(storedCourses);
                setCourses(parsedCourses);
                // Update widget data on load to ensure it's fresh
                //updateWidgetData(parsedCourses);
            }
        } catch (error) {
            console.error('Failed to load courses:', error);
        }
    };

    const updateWidgetData = async (currentCourses: Course[]) => {
        try {
            const appGroup = "group.com.doomstudy.jxlxl";
            const widgetSnippets: { courseName: string; text: string }[] = [];

            // Filter for AI snippets that are Facts or Concepts
            currentCourses.forEach(course => {
                if (course.aiSnippets && course.aiSnippets.length > 0) {
                    course.aiSnippets.forEach(snippetStr => {
                        try {
                            const parsed = JSON.parse(snippetStr);
                            if (parsed && (parsed.type === 'fact' || parsed.type === 'concept')) {
                                widgetSnippets.push({
                                    courseName: course.title,
                                    text: parsed.content
                                });
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    });
                }
            });

            // If no AI snippets found, maybe fallback to something or just empty? 
            // The user specifically said "disable basic snippets", so we leave it empty if no AI data.

            // Randomize and limit to 50 items
            const shuffled = widgetSnippets.sort(() => 0.5 - Math.random()).slice(0, 20);

            // Save to shared group preferences
            let SharedGroupPreferences = require('react-native-shared-group-preferences');
            if (SharedGroupPreferences.default) {
                SharedGroupPreferences = SharedGroupPreferences.default;
            }

            let WidgetCenter = require('react-native-widget-center');
            if (WidgetCenter.default) {
                WidgetCenter = WidgetCenter.default;
            }

            await SharedGroupPreferences.setItem('widgetData', JSON.stringify(shuffled), appGroup);

            if (WidgetCenter && typeof WidgetCenter.reloadAllTimelines === 'function') {
                WidgetCenter.reloadAllTimelines();
                console.log('Widget data updated and timelines reloaded');
            } else {
                console.warn('WidgetCenter.reloadAllTimelines is not available');
            }
        } catch (error) {
            console.error('Failed to update widget data:', error);
        }
    };

    const addCourse = async (newCourseData: Omit<Course, 'id' | 'createdAt'>) => {
        const newCourse: Course = {
            ...newCourseData,
            id: Date.now().toString(),
            createdAt: Date.now(),
        };

        const updatedCourses = [newCourse, ...courses];
        setCourses(updatedCourses);
        await saveCourses(updatedCourses);
        await updateWidgetData(updatedCourses);
    };

    const updateCourse = async (id: string, updates: Partial<Omit<Course, 'id' | 'createdAt'>>) => {
        const updatedCourses = courses.map(course =>
            course.id === id ? { ...course, ...updates } : course
        );
        setCourses(updatedCourses);
        await saveCourses(updatedCourses);
        await updateWidgetData(updatedCourses);
    };

    const deleteCourse = async (id: string) => {
        const updatedCourses = courses.filter(course => course.id !== id);
        setCourses(updatedCourses);
        await saveCourses(updatedCourses);
        await updateWidgetData(updatedCourses);
    };

    const saveCourses = async (coursesToSave: Course[]) => {
        try {
            await AsyncStorage.setItem('courses', JSON.stringify(coursesToSave));
        } catch (error) {
            console.error('Failed to save courses:', error);
        }
    };

    // Derive unique tags from all courses
    const allTags = Array.from(new Set(courses.flatMap(course => course.tags)));

    const getRandomSnippets = (count: number, filterTags?: string[], filterCourseId?: string) => {
        return generateSnippets(courses, count, filterTags, filterCourseId);
    };

    return (
        <CourseContext.Provider value={{ courses, addCourse, updateCourse, deleteCourse, allTags, getRandomSnippets }}>
            {children}
        </CourseContext.Provider>
    );
};
