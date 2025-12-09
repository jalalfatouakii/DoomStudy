import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from "react-native-reanimated";

interface ProcessingModalProps {
    visible: boolean;
    title?: string;
    step?: string;
    status: string;
    progress?: number; // 0 to 1
}

export default function ProcessingModal({
    visible,
    title = "Processing",
    step,
    status,
    progress
}: ProcessingModalProps) {
    const progressWidth = useSharedValue(0);
    const pulseOpacity = useSharedValue(1);

    useEffect(() => {
        if (visible) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1,
                true
            );
        }
    }, [visible]);

    useEffect(() => {
        if (progress !== undefined) {
            progressWidth.value = withSpring(Math.max(0, Math.min(1, progress)), {
                damping: 20,
                stiffness: 90,
            });
        } else {
            // Indeterminate state if progress is undefined
            progressWidth.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1500 }),
                    withTiming(0, { duration: 0 })
                ),
                -1,
                false
            );
        }
    }, [progress]);

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value * 100}%`,
    }));

    const animatedPulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Background Dimming */}
                <View style={styles.backdrop} />

                {/* Modal Card */}
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Animated.View style={animatedPulseStyle}>
                            <Ionicons name="sparkles" size={32} color={Colors.tint} />
                        </Animated.View>
                    </View>

                    <Text style={styles.title}>{title}</Text>

                    {step && <Text style={styles.step}>{step}</Text>}

                    <Text style={styles.status}>{status}</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    card: {
        width: "85%",
        maxWidth: 340,
        backgroundColor: Colors.background, // Using app background color
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 1,
        borderColor: Colors.backgroundSecondary,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.backgroundLighter,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.backgroundSecondary,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 8,
        textAlign: "center",
    },
    step: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.tint,
        marginBottom: 16,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    progressContainer: {
        width: "100%",
        marginBottom: 16,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 4,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: Colors.tint,
        borderRadius: 4,
    },
    status: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        textAlign: "center",
        lineHeight: 20,
    },
});
