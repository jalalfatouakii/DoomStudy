import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";

interface WhatsNewModalProps {
    visible: boolean;
    onClose: () => void;
}

type FeatureItem = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
};

const FEATURES: FeatureItem[] = [
    {
        icon: "checkbox-outline",
        title: "File Selection for Generation",
        description: "Select or unselect files in your courses to control which ones are used for content generation, without deleting them.",
    },
    {
        icon: "list",
        title: "Multiple Choice Questions",
        description: "A new snippet type where you pick the answers and compare with the solution.",
    },
    {
        icon: "color-wand-outline",
        title: "Custom Snippet Types",
        description: "Create your own snippet types tailored to how you learn best.",
    },
    {
        icon: "speedometer-outline",
        title: "Improved Algorithms",
        description: "Smarter content selection with weighted rotation so you see fresh material more often.",
    },
];

export default function WhatsNewModal({ visible, onClose }: WhatsNewModalProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    if (!visible) return null;

    const renderFeature = (feature: FeatureItem, index: number) => (
        <View key={index} style={styles.featureRow}>
            <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon} size={20} color={Colors.tint} />
            </View>
            <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
        </View>
    );

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={handleClose}
            animationType="none"
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <Animated.View style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{
                                    scale: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.95, 1],
                                    }),
                                }],
                            },
                        ]}>

                            <Text style={styles.title}>What's New</Text>
                            <Text style={styles.subtitle}>Here's what's been added since you last opened the app !</Text>

                            <ScrollView
                                style={styles.scrollView}
                                showsVerticalScrollIndicator={false}
                            >
                                {FEATURES.map(renderFeature)}
                            </ScrollView>

                            <TouchableOpacity style={styles.button} onPress={handleClose}>
                                <Text style={styles.buttonText}>Got it</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    content: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 24,
        padding: 28,
        width: "100%",
        maxWidth: 400,
        maxHeight: "80%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    versionBadge: {
        alignSelf: "center",
        backgroundColor: Colors.tint + "20",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.tint + "40",
    },
    versionBadgeText: {
        color: Colors.tint,
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
        textAlign: "center",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        textAlign: "center",
        marginBottom: 20,
    },
    scrollView: {
        maxHeight: 380,
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.tabIconDefault,
        letterSpacing: 1.2,
        marginBottom: 12,
        textTransform: "uppercase",
    },
    featureRow: {
        flexDirection: "row",
        marginBottom: 16,
        alignItems: "flex-start",
    },
    featureIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.tint + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 2,
    },
    featureDescription: {
        fontSize: 13,
        color: Colors.tabIconDefault,
        lineHeight: 18,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.backgroundLighter,
        marginVertical: 16,
    },
    button: {
        backgroundColor: Colors.tint,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
    },
    buttonText: {
        color: Colors.background,
        fontSize: 16,
        fontWeight: "700",
    },
});
