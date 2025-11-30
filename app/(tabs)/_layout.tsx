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
                        if (focused) return null;
                        return (
                            <View
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    backgroundColor: Colors.tint,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginBottom: Platform.OS === "ios" ? 30 : 20,
                                    shadowColor: Colors.tint,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 5,
                                }}
                            >
                                <Ionicons name="add" size={32} color={Colors.background} />
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
