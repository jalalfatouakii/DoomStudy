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
 * Deterministically maps a snippet ID to a video source.
 * Same snippet ID will always get the same video.
 * 
 * Selection logic:
 * 1. Pick a category from enabled categories (deterministic based on snippet.id)
 * 2. Pick a video from that category (deterministic based on snippet.id + categoryId)
 */
export function getVideoSourceForSnippet(
  snippet: ContentSnippet,
  enabledCategoryIds: string[],
  userVideos: UserVideo[]
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
  const categoryVideos = getVideosForCategory(selectedCategoryId, userVideos);

  if (categoryVideos.length === 0) {
    return null; // Category has no videos
  }

  // Step 3: Deterministically pick a video from the category
  const videoHash = hashString(`${snippet.id}:${selectedCategoryId}`);
  const videoIndex = Math.abs(videoHash) % categoryVideos.length;

  return categoryVideos[videoIndex];
}
