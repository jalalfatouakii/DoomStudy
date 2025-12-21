import { usePreferences } from "@/context/PreferencesContext";
import { ContentSnippet } from "@/utils/contentExtractor";
import { getVideoSourceForSnippet, VideoSource } from "@/utils/videoSources";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

type FeedBackgroundVideoProps = {
  enabled: boolean;
  isPageActive: boolean;
  activeSnippet: ContentSnippet | null;
  activeIndex: number;
  snippets: ContentSnippet[];
  itemHeight: number;
};

export default function FeedBackgroundVideo({
  enabled,
  isPageActive,
  activeSnippet,
  activeIndex,
  snippets,
  itemHeight,
}: FeedBackgroundVideoProps) {
  const { enabledVideoCategoryIds, userVideos } = usePreferences();
  const [activeVideoSource, setActiveVideoSource] = useState<VideoSource | null>(null);
  const [prevVideoSource, setPrevVideoSource] = useState<VideoSource | null>(null);
  const [nextVideoSource, setNextVideoSource] = useState<VideoSource | null>(null);

  // Helper to convert VideoSource to expo-video compatible format
  const toVideoPlayerSource = (source: VideoSource | null): { uri: string } | number => {
    if (!source) {
      // Fallback placeholder
      return { uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' };
    }
    return source;
  };

  // Main active player - only create if we have a source
  const activePlayer = useVideoPlayer(
    toVideoPlayerSource(activeVideoSource),
    (player) => {
      player.loop = true;
      player.muted = true;
    }
  );

  // Preload players for adjacent items - create with placeholder, will be replaced
  const prevPlayer = useVideoPlayer(
    toVideoPlayerSource(prevVideoSource),
    (player) => {
      player.loop = true;
      player.muted = true;
      player.pause();
    }
  );

  const nextPlayer = useVideoPlayer(
    toVideoPlayerSource(nextVideoSource),
    (player) => {
      player.loop = true;
      player.muted = true;
      player.pause();
    }
  );

  // Update video sources when activeIndex changes
  useEffect(() => {
    if (!enabled || snippets.length === 0 || enabledVideoCategoryIds.length === 0) {
      setActiveVideoSource(null);
      setPrevVideoSource(null);
      setNextVideoSource(null);
      return;
    }

    // Get current snippet's video
    const currentSnippet = snippets[activeIndex];
    const currentVideo = currentSnippet
      ? getVideoSourceForSnippet(currentSnippet, enabledVideoCategoryIds, userVideos)
      : null;
    setActiveVideoSource(currentVideo);

    // Preload previous snippet's video
    if (activeIndex > 0) {
      const prevSnippet = snippets[activeIndex - 1];
      const prevVideo = prevSnippet
        ? getVideoSourceForSnippet(prevSnippet, enabledVideoCategoryIds, userVideos)
        : null;
      setPrevVideoSource(prevVideo);
    } else {
      setPrevVideoSource(null);
    }

    // Preload next snippet's video
    if (activeIndex < snippets.length - 1) {
      const nextSnippet = snippets[activeIndex + 1];
      const nextVideo = nextSnippet
        ? getVideoSourceForSnippet(nextSnippet, enabledVideoCategoryIds, userVideos)
        : null;
      setNextVideoSource(nextVideo);
    } else {
      setNextVideoSource(null);
    }
  }, [enabled, activeIndex, snippets, enabledVideoCategoryIds, userVideos]);

  // Update active player source when activeVideoSource changes
  useEffect(() => {
    if (activeVideoSource && activePlayer) {
      const source = toVideoPlayerSource(activeVideoSource);
      activePlayer.replaceAsync(source).catch((err) => {
        console.error('Error replacing active video source:', err);
      });
    }
  }, [activeVideoSource, activePlayer]);

  // Update prev player source
  useEffect(() => {
    if (prevVideoSource && prevPlayer) {
      const source = toVideoPlayerSource(prevVideoSource);
      prevPlayer.replaceAsync(source).then(() => {
        try {
          prevPlayer.pause();
          prevPlayer.muted = true;
        } catch (err) {
          // Player might be invalid, ignore
          console.warn('Error pausing prev player:', err);
        }
      }).catch((err) => {
        console.error('Error replacing prev video source:', err);
      });
    }
  }, [prevVideoSource, prevPlayer]);

  // Update next player source
  useEffect(() => {
    if (nextVideoSource && nextPlayer) {
      const source = toVideoPlayerSource(nextVideoSource);
      nextPlayer.replaceAsync(source).then(() => {
        try {
          nextPlayer.pause();
          nextPlayer.muted = true;
        } catch (err) {
          // Player might be invalid, ignore
          console.warn('Error pausing next player:', err);
        }
      }).catch((err) => {
        console.error('Error replacing next video source:', err);
      });
    }
  }, [nextVideoSource, nextPlayer]);

  // Control playback based on enabled, isPageActive, and activeSnippet
  useEffect(() => {
    if (!enabled || !isPageActive || !activeSnippet || activeSnippet.type === 'ad') {
      // Pause and mute
      try {
        if (activePlayer) {
          activePlayer.pause();
          activePlayer.muted = true;
        }
        if (prevPlayer) {
          prevPlayer.pause();
          prevPlayer.muted = true;
        }
        if (nextPlayer) {
          nextPlayer.pause();
          nextPlayer.muted = true;
        }
      } catch (err) {
        // Players may be invalid/unmounted, ignore errors
        console.warn('Error pausing players:', err);
      }
    } else {
      // Play active, keep adjacent muted and paused
      try {
        if (activePlayer && activeVideoSource) {
          activePlayer.muted = false;
          activePlayer.play();
        }
        if (prevPlayer) {
          prevPlayer.pause();
          prevPlayer.muted = true;
        }
        if (nextPlayer) {
          nextPlayer.pause();
          nextPlayer.muted = true;
        }
      } catch (err) {
        console.warn('Error controlling players:', err);
      }
    }
  }, [enabled, isPageActive, activeSnippet, activePlayer, prevPlayer, nextPlayer, activeVideoSource]);

  if (!enabled || !activeVideoSource) {
    return null;
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.container, { zIndex: 0 }]} pointerEvents="none">
      <VideoView
        player={activePlayer}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
});
