import { BuiltInVideoCategoryId, UserVideo } from "@/context/PreferencesContext";
import { ContentSnippet } from "@/utils/contentExtractor";

// Video source can be either a bundled require() module or a file URI
export type VideoSource = { uri: string } | number;

// Built-in video categories with bundled assets
// Note: These require() statements will work once you add actual video files to assets/videos/
// For now, we'll use fallback remote URLs if the bundled assets don't exist
const BUNDLED_VIDEOS: Record<BuiltInVideoCategoryId, VideoSource[]> = {
  gameplay: [
    require('@/assets/videos/gameplay.mp4'), // Uncomment when you add the file
    // { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' }, // Fallback
  ],
  satisfying: [
    require('@/assets/videos/satisfying.mp4'), // Uncomment when you add the file
    // { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }, // Fallback
  ],
  narrated: [
    require('@/assets/videos/narrated.mp4'), // Uncomment when you add the file
    // { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' }, // Fallback
  ],
  ambient: [
    require('@/assets/videos/ambient.mp4'), // Uncomment when you add the file
    // { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' }, // Fallback
  ],
  nature: [
    require('@/assets/videos/nature.mp4'), // Uncomment when you add the file
    { uri: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' }, // Fallback
  ],
};

/**
 * Simple hash function for deterministic selection
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Get all available videos for a category (bundled + user videos)
 */
function getVideosForCategory(
  categoryId: string,
  userVideos: UserVideo[]
): VideoSource[] {
  const bundled = BUNDLED_VIDEOS[categoryId as BuiltInVideoCategoryId] || [];
  const user = userVideos
    .filter((v) => v.categoryId === categoryId)
    .map((v) => ({ uri: v.uri } as VideoSource));
  return [...bundled, ...user];
}

/**
 * Helper function to compare two video sources for equality
 */
function areVideoSourcesEqual(source1: VideoSource | null, source2: VideoSource | null): boolean {
  if (!source1 || !source2) return false;

  // Compare number sources (bundled assets)
  if (typeof source1 === 'number' && typeof source2 === 'number') {
    return source1 === source2;
  }

  // Compare URI sources
  if (typeof source1 === 'object' && typeof source2 === 'object') {
    return source1.uri === source2.uri;
  }

  return false;
}

/**
 * Get all available videos across all enabled categories
 */
function getAllAvailableVideos(
  enabledCategoryIds: string[],
  userVideos: UserVideo[]
): VideoSource[] {
  const allVideos: VideoSource[] = [];
  for (const categoryId of enabledCategoryIds) {
    const categoryVideos = getVideosForCategory(categoryId, userVideos);
    allVideos.push(...categoryVideos);
  }
  return allVideos;
}

/**
 * Deterministically maps a snippet ID to a video source.
 * Same snippet ID will always get the same video (unless excludeVideo is provided).
 * 
 * Selection logic:
 * 1. Pick a category from enabled categories (deterministic based on snippet.id)
 * 2. Pick a video from that category (deterministic based on snippet.id + categoryId)
 * 3. If excludeVideo is provided and matches the selected video, pick a different one randomly
 */
export function getVideoSourceForSnippet(
  snippet: ContentSnippet,
  enabledCategoryIds: string[],
  userVideos: UserVideo[],
  excludeVideo?: VideoSource | null
): VideoSource | null {
  if (snippet.type === 'ad') {
    return null; // Ads don't get video backgrounds
  }

  if (enabledCategoryIds.length === 0) {
    return null; // No enabled categories
  }

  // Step 1: Deterministically pick a category from enabled categories
  const categoryHash = hashString(snippet.id);
  const categoryIndex = Math.abs(categoryHash) % enabledCategoryIds.length;
  const selectedCategoryId = enabledCategoryIds[categoryIndex];

  // Step 2: Get all videos for this category
  let categoryVideos = getVideosForCategory(selectedCategoryId, userVideos);

  if (categoryVideos.length === 0) {
    return null; // Category has no videos
  }

  // Step 3: If we need to exclude a video, filter it out
  if (excludeVideo) {
    categoryVideos = categoryVideos.filter(video => !areVideoSourcesEqual(video, excludeVideo));

    // If after filtering we have no videos left in this category, 
    // fall back to all available videos from all enabled categories (excluding current)
    if (categoryVideos.length === 0) {
      const allVideos = getAllAvailableVideos(enabledCategoryIds, userVideos);
      const availableVideos = allVideos.filter(video => !areVideoSourcesEqual(video, excludeVideo));

      if (availableVideos.length === 0) {
        // If we have no other videos available, just return null
        return null;
      }

      // Pick deterministically from available videos (using snippet.id + exclude video info as seed)
      const excludeKey = typeof excludeVideo === 'object' ? excludeVideo.uri : String(excludeVideo);
      const randomHash = hashString(`${snippet.id}:exclude:${excludeKey}`);
      const randomIndex = Math.abs(randomHash) % availableVideos.length;
      return availableVideos[randomIndex];
    }
  }

  // Step 4: Deterministically pick a video from the category
  const videoHash = hashString(`${snippet.id}:${selectedCategoryId}`);
  const videoIndex = Math.abs(videoHash) % categoryVideos.length;

  const selectedVideo = categoryVideos[videoIndex];

  // Step 5: If the selected video matches the excluded one, pick a different one
  if (excludeVideo && areVideoSourcesEqual(selectedVideo, excludeVideo)) {
    // Pick a different video from the available ones
    const otherVideos = categoryVideos.filter(video => !areVideoSourcesEqual(video, excludeVideo));
    if (otherVideos.length > 0) {
      // Use a different hash to pick from remaining videos
      const altHash = hashString(`${snippet.id}:alt:${selectedCategoryId}`);
      const altIndex = Math.abs(altHash) % otherVideos.length;
      return otherVideos[altIndex];
    } else {
      // Fall back to all available videos
      const allVideos = getAllAvailableVideos(enabledCategoryIds, userVideos);
      const availableVideos = allVideos.filter(video => !areVideoSourcesEqual(video, excludeVideo));
      if (availableVideos.length > 0) {
        const randomHash = hashString(`${snippet.id}:fallback:${selectedCategoryId}`);
        const randomIndex = Math.abs(randomHash) % availableVideos.length;
        return availableVideos[randomIndex];
      }
    }
  }

  return selectedVideo;
}
