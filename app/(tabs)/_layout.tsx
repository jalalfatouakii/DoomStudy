import { Colors } from "@/constants/colors";
import { emitTabPress } from "@/hooks/useTabPress";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, TouchableOpacity } from "react-native";

function AnimatedAddButton() {
    const pathname = usePathname();
    const animationValue = useRef(new Animated.Value(pathname === "/add" ? 1 : 0)).current;
    const isFocused = pathname === "/add";

    useEffect(() => {

        Animated.spring(animationValue, {
            toValue: isFocused ? 1 : 0,
            useNativeDriver: false,
            friction: 5,
            tension: 70,
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

    // Use direct color switching instead of interpolation to avoid flashing
    const backgroundColor = isFocused ? Colors.background : Colors.tint;

    const shadowOpacity = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0],
    });

    const elevation = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [5, 0],
    });

    const iconColor = isFocused ? Colors.tint : Colors.background;
    const shadowColor = isFocused ? "transparent" : Colors.tint;

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
                shadowColor,
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

function AnimatedHomeButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
    const spinValue = useRef(new Animated.Value(0)).current;
    const [isSpinning, setIsSpinning] = useState(false);

    const startSpin = () => {
        setIsSpinning(true);
        spinValue.setValue(0);
        Animated.timing(spinValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start(() => setIsSpinning(false));
    };

    const handlePress = () => {
        startSpin();
        onPress();
    };

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <TouchableOpacity onPress={handlePress} style={{ padding: 4 }}>
            <Animated.View style={{ transform: [{ rotate: isSpinning ? spin : '0deg' }] }}>
                <Ionicons
                    name={focused ? "home" : "home-outline"}
                    size={24}
                    color={focused ? Colors.tint : Colors.tabIconDefault}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

export default function TabLayout() {
    const pathname = usePathname();
    const [homeRefreshTrigger, setHomeRefreshTrigger] = useState(0);

    const handleHomePress = () => {
        if (pathname === "/") {
            // User is already on home, trigger refresh
            emitTabPress("home");
            setHomeRefreshTrigger(prev => prev + 1);
        }
    };

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
                        <AnimatedHomeButton
                            focused={focused}
                            onPress={handleHomePress}
                        />
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
