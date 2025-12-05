import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Keyboard,
    Linking,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";

interface GeminiKeyModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (key: string) => void;
}

export default function GeminiKeyModal({ visible, onClose, onSave }: GeminiKeyModalProps) {
    const [key, setKey] = useState("");
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleSave = async () => {
        if (key.trim()) {
            await AsyncStorage.setItem("geminiKey", key.trim());
            onSave(key.trim());
            handleClose();
        }
    };

    const handleClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const openGetKeyUrl = () => {
        Linking.openURL("https://aistudio.google.com/app/api-keys");
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={handleClose}
            animationType="none"
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="sparkles" size={32} color={Colors.tint} />
                            </View>

                            <Text style={styles.title}>Integrate AI into your feed</Text>
                            <Text style={styles.description}>
                                We strongly recommend adding a Gemini API key (free of charge) to get better content in your feed without any limits.
                            </Text>

                            <TouchableOpacity style={styles.guideLink} onPress={openGetKeyUrl}>
                                <Text style={styles.guideText}>Get your free API key here <Ionicons name="open-outline" size={12} /></Text>
                            </TouchableOpacity>

                            <TextInput
                                style={styles.input}
                                placeholder="Paste your API key here"
                                placeholderTextColor={Colors.tabIconDefault}
                                value={key}
                                onChangeText={setKey}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <Text style={styles.note}>
                                You can change this later in Settings.
                            </Text>

                            <View style={styles.buttons}>
                                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                                    <Text style={styles.cancelText}>Skip for now</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveButton, !key.trim() && styles.disabledButton]}
                                    onPress={handleSave}
                                    disabled={!key.trim()}
                                >
                                    <Text style={styles.saveText}>Save & Continue</Text>
                                </TouchableOpacity>
                            </View>
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
        padding: 24,
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.backgroundLighter,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 12,
        textAlign: "center",
    },
    description: {
        fontSize: 15,
        color: Colors.tabIconDefault,
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 22,
    },
    guideLink: {
        marginBottom: 20,
        padding: 8,
    },
    guideText: {
        color: Colors.tint,
        fontSize: 14,
        fontWeight: "600",
    },
    input: {
        width: "100%",
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 16,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
        marginBottom: 12,
    },
    note: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        marginBottom: 24,
    },
    buttons: {
        flexDirection: "row",
        width: "100%",
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        backgroundColor: Colors.backgroundLighter,
    },
    cancelText: {
        color: Colors.text,
        fontWeight: "600",
    },
    saveButton: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        backgroundColor: Colors.tint,
    },
    disabledButton: {
        opacity: 0.5,
    },
    saveText: {
        color: Colors.background,
        fontWeight: "bold",
    },
});
