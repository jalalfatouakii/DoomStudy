import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Keyboard,
    Linking,
    Modal,
    Platform,
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
    onModelModeSave?: (mode: 'online' | 'offline') => void;
    onOfflineModelSelect?: (modelId: string) => void;
}

export default function GeminiKeyModal({ visible, onClose, onSave, onModelModeSave, onOfflineModelSelect }: GeminiKeyModalProps) {
    const [key, setKey] = useState("");
    const [mode, setMode] = useState<'online' | 'offline'>('online');
    const [appleIntelligenceAvailable, setAppleIntelligenceAvailable] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Check for Apple Intelligence availability
    useEffect(() => {
        if (Platform.OS === 'ios' && visible) {
            try {
                const appleAI = require("@react-native-ai/apple").apple;
                if (appleAI && appleAI.isAvailable && appleAI.isAvailable()) {
                    setAppleIntelligenceAvailable(true);
                }
            } catch (e) {
                // Apple AI not available
                setAppleIntelligenceAvailable(false);
            }
        }
    }, [visible]);

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
        if (mode === 'online' && key.trim()) {
            await AsyncStorage.setItem("geminiKey", key.trim());
            await AsyncStorage.setItem("modelModePreference", "online");
            onSave(key.trim());
            if (onModelModeSave) {
                onModelModeSave('online');
            }
            handleClose();
        } else if (mode === 'offline') {
            await AsyncStorage.setItem("modelModePreference", "offline");
            if (onModelModeSave) {
                onModelModeSave('offline');
            }
            handleClose();
        }
    };

    const handleSelectAppleIntelligence = async () => {
        await AsyncStorage.setItem("modelModePreference", "offline");
        await AsyncStorage.setItem("selectedOfflineModel", "apple-intelligence");
        if (onModelModeSave) {
            onModelModeSave('offline');
        }
        if (onOfflineModelSelect) {
            onOfflineModelSelect('apple-intelligence');
        }
        handleClose();
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
                                Choose how you want to generate AI-powered content for your courses.
                            </Text>

                            {/* Mode Selection */}
                            <View style={styles.modeSelector}>
                                <TouchableOpacity
                                    style={[styles.modeButton, mode === 'online' && styles.modeButtonActive]}
                                    onPress={() => setMode('online')}
                                >
                                    <Ionicons name="cloud" size={20} color={mode === 'online' ? Colors.background : Colors.tabIconDefault} />
                                    <Text style={[styles.modeButtonText, mode === 'online' && styles.modeButtonTextActive]}>Online</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modeButton, mode === 'offline' && styles.modeButtonActive]}
                                    onPress={() => setMode('offline')}
                                >
                                    <Ionicons name="phone-portrait" size={20} color={mode === 'offline' ? Colors.background : Colors.tabIconDefault} />
                                    <Text style={[styles.modeButtonText, mode === 'offline' && styles.modeButtonTextActive]}>Offline</Text>
                                </TouchableOpacity>
                            </View>

                            {mode === 'online' ? (
                                <>
                                    <TouchableOpacity style={styles.guideLink} onPress={openGetKeyUrl}>
                                        <Text style={styles.guideText}>Get your free Gemini API key here <Ionicons name="open-outline" size={12} /></Text>
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
                                </>
                            ) : (
                                <>
                                    {appleIntelligenceAvailable ? (
                                        <>
                                            <TouchableOpacity
                                                style={styles.appleIntelligenceButton}
                                                onPress={handleSelectAppleIntelligence}
                                            >
                                                <View style={styles.appleIntelligenceContent}>
                                                    <Ionicons name="logo-apple" size={24} color={Colors.text} />
                                                    <View style={styles.appleIntelligenceText}>
                                                        <Text style={styles.appleIntelligenceTitle}>Apple Intelligence</Text>
                                                        <Text style={styles.appleIntelligenceSubtitle}>Native AI built into your device - No setup required</Text>
                                                    </View>
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color={Colors.tabIconDefault} />
                                            </TouchableOpacity>
                                            <Text style={styles.orText}>or</Text>
                                            <View style={styles.offlineInfo}>
                                                <Ionicons name="information-circle-outline" size={20} color={Colors.tabIconDefault} />
                                                <Text style={styles.offlineInfoText}>
                                                    Download another offline model from Settings {'>'} Model Preferences later.
                                                </Text>
                                            </View>
                                        </>
                                    ) : (
                                        <View style={styles.offlineInfo}>
                                            <Ionicons name="information-circle-outline" size={20} color={Colors.tabIconDefault} />
                                            <Text style={styles.offlineInfoText}>
                                                Download an offline model from Settings {'>'} Model Preferences to use AI without an API key.
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}

                            <Text style={styles.note}>
                                You can change this later in Settings.
                            </Text>

                            <View style={styles.buttons}>
                                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                                    <Text style={styles.cancelText}>Skip for now</Text>
                                </TouchableOpacity>
                                {mode === 'offline' && appleIntelligenceAvailable ? (
                                    <TouchableOpacity
                                        style={styles.saveButton}
                                        onPress={handleSave}
                                    >
                                        <Text style={styles.saveText}>Set up later</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.saveButton, mode === 'online' && !key.trim() && styles.disabledButton]}
                                        onPress={handleSave}
                                        disabled={mode === 'online' && !key.trim()}
                                    >
                                        <Text style={styles.saveText}>
                                            {mode === 'online' ? 'Save & Continue' : 'Continue'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
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
    modeSelector: {
        flexDirection: "row",
        width: "100%",
        gap: 12,
        marginBottom: 20,
    },
    modeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 14,
        borderRadius: 16,
        backgroundColor: Colors.backgroundLighter,
        borderWidth: 2,
        borderColor: "transparent",
    },
    modeButtonActive: {
        backgroundColor: Colors.tint,
        borderColor: Colors.tint,
    },
    modeButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.tabIconDefault,
    },
    modeButtonTextActive: {
        color: Colors.background,
    },
    appleIntelligenceButton: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 16,
        backgroundColor: Colors.backgroundLighter,
        borderWidth: 2,
        borderColor: Colors.tint,
        marginBottom: 12,
    },
    appleIntelligenceContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    appleIntelligenceText: {
        flex: 1,
    },
    appleIntelligenceTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 4,
    },
    appleIntelligenceSubtitle: {
        fontSize: 13,
        color: Colors.tabIconDefault,
    },
    offlineInfo: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 16,
        borderRadius: 16,
        backgroundColor: Colors.backgroundLighter,
        marginBottom: 12,
    },
    offlineInfoText: {
        flex: 1,
        fontSize: 14,
        color: Colors.tabIconDefault,
        lineHeight: 20,
    },
    orText: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        textAlign: "center",
        marginVertical: 12,
        fontWeight: "500",
    },
});
