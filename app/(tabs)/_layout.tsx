import { Colors } from "@/constants/colors";
import { useRefresh } from "@/context/RefreshContext";
import { emitTabPress } from "@/hooks/useTabPress";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function AnimatedAddButton() {
    const pathname = usePathname();
    const animationValue = useRef(new Animated.Value(pathname === "/add" ? 1 : 0)).current;
    const isFocused = pathname === "/add";

    const router = useRouter();
    const checkOnboarding = async () => {
        try {
            const hasOnboarded = await AsyncStorage.getItem("hasOnboarded");
            if (hasOnboarded !== "true") {
                router.replace("/(onboarding)/onboard");
            }
        } catch (error) {
            console.error("Error checking onboarding status:", error);
        }
    };

    useEffect(() => {
        checkOnboarding();
    }, []);



    /*
    tabBarStyle: {
          ...Platform.select({
            ios: { padding: 6, height: "10%" },
            android: { padding: 8, height: getTabBarHeight(), paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }
          })
        },
      }}
    */

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

function AnimatedHomeButton({ focused, spinTrigger }: { focused: boolean; spinTrigger: number }) {
    const { isRefreshing } = useRefresh();
    const spinValue = useRef(new Animated.Value(0)).current;
    const [isSpinning, setIsSpinning] = useState(false);
    const prevSpinTriggerRef = useRef(spinTrigger);
    const rotationAnim = useRef(new Animated.Value(0)).current;

    // Handle continuous spinning while refreshing
    useEffect(() => {
        if (isRefreshing) {
            setIsSpinning(true);
            // Start continuous rotation animation
            rotationAnim.setValue(0);
            Animated.loop(
                Animated.timing(rotationAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            // Stop continuous rotation
            rotationAnim.stopAnimation();
            setIsSpinning(false);
            // Do a quick spin animation when refresh completes
            if (spinTrigger > 0 && spinTrigger !== prevSpinTriggerRef.current) {
                spinValue.setValue(0);
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
            prevSpinTriggerRef.current = spinTrigger;
        }
    }, [isRefreshing, spinTrigger]);

    const continuousSpin = rotationAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const quickSpin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rotation = isRefreshing ? continuousSpin : (spinTrigger > 0 ? quickSpin : '0deg');

    return (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons
                name={isRefreshing || isSpinning ? "refresh" : (focused ? "home" : "home-outline")}
                size={24}
                color={focused ? Colors.tint : Colors.tabIconDefault}
            />
        </Animated.View>
    );
}

export default function TabLayout() {
    const pathname = usePathname();
    const [spinTrigger, setSpinTrigger] = useState(0);

    const insets = useSafeAreaInsets();

    const getTabBarHeight = () => {
        if (Platform.OS === 'android') {
            // If bottom inset is 0, device uses button navigation
            // If bottom inset > 0, device uses gesture navigation
            const hasButtonNavigation = insets.bottom === 0;
            return hasButtonNavigation ? 60 : 55 + insets.bottom;
        }
        return undefined; // Let iOS handle it automatically
    };

    return (
        <Tabs
            detachInactiveScreens={false}
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.background,
                    borderTopColor: Colors.backgroundSecondary,
                    height: Platform.OS === 'ios' ? 88 : getTabBarHeight(),
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
                            spinTrigger={spinTrigger}
                        />
                    ),
                }}
                listeners={{
                    tabPress: (e) => {
                        // Only trigger refresh if already on home
                        if (pathname === "/") {
                            e.preventDefault(); // Prevent default navigation
                            setSpinTrigger(prev => prev + 1);
                            emitTabPress("home");
                        }
                        // If not on home, let normal navigation happen
                    },
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
