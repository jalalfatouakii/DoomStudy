import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform } from "react-native";

function AnimatedAddButton() {
    const pathname = usePathname();
    const animationValue = useRef(new Animated.Value(pathname === "/add" ? 1 : 0)).current;
    const isFocused = pathname === "/add";

    useEffect(() => {

        Animated.spring(animationValue, {
            toValue: isFocused ? 1 : 0,
            useNativeDriver: false,
            friction: 8,
            tension: 50,
        }).start();
    }, [pathname, isFocused]);

    const width = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [56, 48],
    });

    const height = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [56, 48],
    });

    const marginBottom = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [Platform.OS === "ios" ? 30 : 20, 0],
    });

    const backgroundColor = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [Colors.tint, Colors.background],
    });

    const shadowOpacity = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0],
    });

    const elevation = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [5, 0],
    });

    const iconColor = isFocused ? Colors.tint : Colors.background;

    return (
        <Animated.View
            style={{
                width,
                height,
                marginBottom,
                backgroundColor,
                borderRadius: 28,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: Colors.tint,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity,
                shadowRadius: 8,
                elevation,
            }}
        >
            <Ionicons name="add" size={32} color={iconColor} />
        </Animated.View>
    );
}

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
                    tabBarIcon: () => <AnimatedAddButton />,
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
