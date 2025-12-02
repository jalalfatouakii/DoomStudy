import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";

export default function TabLayout() {
    return (
        <Tabs
            detachInactiveScreens={false}
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.background,
                    borderTopColor: Colors.backgroundSecondary,
                    height: Platform.OS === 'ios' ? 88 : 60,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: Colors.tint,
                tabBarInactiveTintColor: Colors.tabIconDefault,
                tabBarShowLabel: false,
                animation: "fade",

            }}

        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="add"
                options={{

                    tabBarIcon: ({ focused }) => {
                        const width = !focused ? 56 : 48;
                        const height = !focused ? 56 : 48;
                        return (
                            <View
                                style={{
                                    width,
                                    height,
                                    borderRadius: 28,
                                    backgroundColor: !focused ? Colors.tint : Colors.background,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginBottom: !focused ? Platform.OS === "ios" ? 30 : 20 : 0,
                                    shadowColor: !focused ? Colors.tint : Colors.background,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: !focused ? 0.3 : 0,
                                    shadowRadius: !focused ? 8 : 0,
                                    elevation: !focused ? 5 : 0,
                                }}
                            >
                                <Ionicons name="add" size={32} color={!focused ? Colors.background : Colors.tint} />
                            </View>
                        );
                    },
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "analytics" : "analytics-outline"} size={24} color={color} />
                    ),
                }}
            />

            {/* Hide the theory tab if it exists in file system but shouldn't be a tab */}
            <Tabs.Screen
                name="theory"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
