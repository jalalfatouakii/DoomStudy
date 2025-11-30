import { Colors } from "@/constants/colors";
import { CourseProvider } from "@/context/CourseContext";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <CourseProvider>
      <Stack screenOptions={{ contentStyle: { backgroundColor: Colors.background }, headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(modal)/edit" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style="light" />
    </CourseProvider>
  );
}
