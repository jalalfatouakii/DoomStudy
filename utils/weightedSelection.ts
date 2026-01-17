import AsyncStorage from '@react-native-async-storage/async-storage';

const COURSE_USAGE_KEY = 'course_usage_weights';
const FILE_USAGE_KEY = 'file_usage_weights';

interface UsageRecord {
  [id: string]: number; // id -> timestamp of last use
}

/**
 * Weighted random selection that favors least recently used items
 * Unused items get 10x higher weight than recently used ones
 */
export class WeightedSelector {

  /**
   * Select one course from available courses, weighted by usage
   * @param courses Array of courses to select from
   * @returns Selected course or null if none available
   */
  static async selectCourse(courses: any[]): Promise<any | null> {
    if (courses.length === 0) return null;
    if (courses.length === 1) return courses[0];

    try {
      const usageData = await AsyncStorage.getItem(COURSE_USAGE_KEY);
      const usage: UsageRecord = usageData ? JSON.parse(usageData) : {};

      const now = Date.now();
      const UNUSED_WEIGHT = 10;
      const USED_WEIGHT = 1;

      // Calculate weights for each course
      const weights = courses.map(course => {
        const lastUsed = usage[course.id];
        return lastUsed ? USED_WEIGHT : UNUSED_WEIGHT;
      });

      // Weighted random selection
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < courses.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          const selected = courses[i];

          // Mark as used
          usage[selected.id] = now;
          await AsyncStorage.setItem(COURSE_USAGE_KEY, JSON.stringify(usage));

          return selected;
        }
      }

      return courses[0]; // Fallback
    } catch (error) {
      console.error('Error in selectCourse:', error);
      // Fallback to random selection
      return courses[Math.floor(Math.random() * courses.length)];
    }
  }

  /**
   * Select one file from available files in a course, weighted by usage
   * @param courseId The course ID (for tracking)
   * @param files Array of files to select from
   * @returns Selected file or null if none available
   */
  static async selectFile(courseId: string, files: any[]): Promise<any | null> {
    const validFiles = files.filter(f => f.parsedText && f.parsedText.trim().length > 0);

    if (validFiles.length === 0) return null;
    if (validFiles.length === 1) return validFiles[0];

    try {
      const usageData = await AsyncStorage.getItem(FILE_USAGE_KEY);
      const usage: UsageRecord = usageData ? JSON.parse(usageData) : {};

      const now = Date.now();
      const UNUSED_WEIGHT = 10;
      const USED_WEIGHT = 1;

      // Calculate weights for each file
      const weights = validFiles.map(file => {
        const fileKey = `${courseId}-${file.name}`;
        const lastUsed = usage[fileKey];
        return lastUsed ? USED_WEIGHT : UNUSED_WEIGHT;
      });

      // Weighted random selection
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < validFiles.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          const selected = validFiles[i];

          // Mark as used
          const fileKey = `${courseId}-${selected.name}`;
          usage[fileKey] = now;
          await AsyncStorage.setItem(FILE_USAGE_KEY, JSON.stringify(usage));

          return selected;
        }
      }

      return validFiles[0]; // Fallback
    } catch (error) {
      console.error('Error in selectFile:', error);
      // Fallback to random selection
      return validFiles[Math.floor(Math.random() * validFiles.length)];
    }
  }

  /**
   * Reset usage tracking for a specific course (e.g., when course is deleted)
   */
  static async resetCourseUsage(courseId: string): Promise<void> {
    try {
      const courseUsageData = await AsyncStorage.getItem(COURSE_USAGE_KEY);
      const courseUsage: UsageRecord = courseUsageData ? JSON.parse(courseUsageData) : {};
      delete courseUsage[courseId];
      await AsyncStorage.setItem(COURSE_USAGE_KEY, JSON.stringify(courseUsage));

      const fileUsageData = await AsyncStorage.getItem(FILE_USAGE_KEY);
      const fileUsage: UsageRecord = fileUsageData ? JSON.parse(fileUsageData) : {};

      // Remove all files from this course
      const keysToDelete = Object.keys(fileUsage).filter(key => key.startsWith(`${courseId}-`));
      keysToDelete.forEach(key => delete fileUsage[key]);

      await AsyncStorage.setItem(FILE_USAGE_KEY, JSON.stringify(fileUsage));
    } catch (error) {
      console.error('Error resetting course usage:', error);
    }
  }

  /**
   * Clear all usage tracking (for debugging or reset)
   */
  static async clearAllUsage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(COURSE_USAGE_KEY);
      await AsyncStorage.removeItem(FILE_USAGE_KEY);
    } catch (error) {
      console.error('Error clearing usage:', error);
    }
  }
}
