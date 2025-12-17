import { ContentSnippet } from "@/utils/contentExtractor";

// Phase 1: Temporary CDN URLs for development/testing
// Phase 2: Replace with local require(...) assets from assets/videos/*
const VIDEO_SOURCES = [
  { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
  { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
  { uri: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
  { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
  { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
  { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
  { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
  { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4' },
  { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
  { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4' },
];

/**
 * Deterministically maps a snippet ID to a video source.
 * Same snippet ID will always get the same video.
 */
export function getVideoSourceForSnippet(snippet: ContentSnippet): { uri: string } | null {
  if (snippet.type === 'ad') {
    return null; // Ads don't get video backgrounds
  }

  // Use snippet ID to deterministically pick a video
  // Simple hash-like approach: use character codes to pick index
  let hash = 0;
  for (let i = 0; i < snippet.id.length; i++) {
    hash = ((hash << 5) - hash) + snippet.id.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  const index = Math.abs(hash) % VIDEO_SOURCES.length;
  return VIDEO_SOURCES[index];
}
