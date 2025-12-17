import { Colors } from "@/constants/colors";
import { CourseProvider } from "@/context/CourseContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { RefreshProvider } from "@/context/RefreshContext";
import { StatsProvider } from "@/context/StatsContext";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
// try to require expo-navigation-bar at runtime; keep null if not installed so app still runs in Expo Go
let NavigationBar: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NavigationBar = require('expo-navigation-bar');
} catch (e) {
  NavigationBar = null;
}
export default function RootLayout() {

  useEffect(() => {
    if (Platform.OS !== 'android' || !NavigationBar) return;
    (async () => {
      try {
        await NavigationBar.setButtonStyleAsync('light');
      } catch (err) {
        // ignore in dev if native module not available
      }
    })();
  }, []);

  return (
    <StatsProvider>
      <CourseProvider>
        <PreferencesProvider>
          <RefreshProvider>
            <Stack screenOptions={{ contentStyle: { backgroundColor: Colors.background }, headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(modal)/edit" options={{ presentation: "modal" }} />
              <Stack.Screen name="(modal)/about" options={{ presentation: "modal" }} />
            </Stack>
            <StatusBar style="light" />
          </RefreshProvider>
        </PreferencesProvider>
      </CourseProvider>
    </StatsProvider>
  );
}
