import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { Dimensions, Platform, StatusBar, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

type VideoBackgroundProps = {
  videoUri?: string;
  isVisible?: boolean;
  videoIndex?: number; // Optional index to cycle through different videos
};

// Placeholder video URLs - user will replace these later
// These are sample videos that work well for background content
const PLACEHOLDER_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://download1335.mediafire.com/fpjdsyoyfgvg71XvpoP-Dc5MbQND74NJthN6M6xxjgRNTvkonvIbWUKIeu2eQlQX47f1_U7rrxvvV9RTQdyNGKySZidlXjce4IPZUFkYRoJ0OfiiJ_fsBvdoYUtgYur2rN7-GkJlJxgoBAuhTjyePEqHZTzGTdsoWjwK4sazU-E/xi6nbffycwnwzjt/ssstik.io_%40comedycraze74_1765870554250.mp4'
];

export default function VideoBackground({ videoUri, isVisible = true, videoIndex = 0 }: VideoBackgroundProps) {
  // Use provided video URI or cycle through placeholders based on index
  const currentVideoUri = videoUri || PLACEHOLDER_VIDEOS[videoIndex % PLACEHOLDER_VIDEOS.length];

  // Create video player with expo-video
  const player = useVideoPlayer(currentVideoUri, (player) => {
    player.loop = true;
    player.muted = true;
    if (isVisible) {
      player.play();
    }
  });

  // Control playback based on visibility
  useEffect(() => {
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enterFullscreenButton: false, exitFullscreenButton: false }}
        allowsPictureInPicture={false}
      />
      {/* Dark overlay for better text readability */}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Lighter overlay so video shows through more
  },
});
