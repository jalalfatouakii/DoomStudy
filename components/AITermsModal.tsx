import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
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

interface AITermsModalProps {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

export default function AITermsModal({ visible, onAccept, onDecline }: AITermsModalProps) {
    const [accepted, setAccepted] = useState(false);
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

    const handleAccept = async () => {
        if (accepted) {
            await AsyncStorage.setItem("aiTermsAccepted", "true");
            onAccept();
        }
    };

    const handleDecline = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            onDecline();
        });
    };

    const openPrivacyPolicy = () => {
        WebBrowser.openBrowserAsync('https://doomstudyapp.com/#/privacy', {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET
        });
    };

    const openTermsOfService = () => {
        WebBrowser.openBrowserAsync('https://doomstudyapp.com/#/tos', {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET
        });
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={handleDecline}
            animationType="none"
        >
            <TouchableWithoutFeedback onPress={handleDecline}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="shield-checkmark" size={32} color={Colors.tint} />
                            </View>

                            <Text style={styles.title}>AI Content Generation</Text>

                            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                                <View style={styles.warningContainer}>
                                    <Ionicons name="warning" size={20} color="#ff9500" style={styles.warningIcon} />
                                    <Text style={styles.warningTitle}>Important Notice</Text>
                                </View>

                                <Text style={styles.description}>
                                    AI-generated content may contain inaccuracies, errors, or incomplete information.
                                    Please review all generated content carefully and verify important information from
                                    your original source materials.
                                </Text>

                                <Text style={styles.description}>
                                    AI models, including Apple Intelligence and other offline models, are tools to assist
                                    your learning but should not be relied upon as the sole source of truth. Always cross-reference
                                    with your course materials and consult with instructors when in doubt.
                                </Text>

                                <View style={styles.separator} />

                                <Text style={styles.termsTitle}>By proceeding, you agree to:</Text>

                                <View style={styles.termsList}>
                                    <View style={styles.termItem}>
                                        <Ionicons name="checkmark-circle" size={16} color={Colors.tint} />
                                        <Text style={styles.termText}>
                                            Review and verify all AI-generated content for accuracy
                                        </Text>
                                    </View>
                                    <View style={styles.termItem}>
                                        <Ionicons name="checkmark-circle" size={16} color={Colors.tint} />
                                        <Text style={styles.termText}>
                                            Not rely solely on AI-generated content for critical decisions
                                        </Text>
                                    </View>
                                    <View style={styles.termItem}>
                                        <Ionicons name="checkmark-circle" size={16} color={Colors.tint} />
                                        <Text style={styles.termText}>
                                            Use AI content as a learning aid, not a replacement for study
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.linksSection}>
                                    <Text style={styles.linksSectionTitle}>Legal Documents</Text>
                                    <View style={styles.linksContainer}>
                                        <TouchableOpacity onPress={openTermsOfService} style={styles.linkButton}>
                                            <Ionicons name="document-text" size={18} color={Colors.tint} />
                                            <Text style={styles.linkButtonText}>
                                                Terms of Service
                                            </Text>
                                            <Ionicons name="open-outline" size={14} color={Colors.tint} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={openPrivacyPolicy} style={styles.linkButton}>
                                            <Ionicons name="document-text" size={18} color={Colors.tint} />
                                            <Text style={styles.linkButtonText}>
                                                Privacy Policy
                                            </Text>
                                            <Ionicons name="open-outline" size={14} color={Colors.tint} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.checkboxContainer}>
                                <TouchableOpacity
                                    style={styles.checkbox}
                                    onPress={() => setAccepted(!accepted)}
                                >
                                    <Ionicons
                                        name={accepted ? "checkbox" : "checkbox-outline"}
                                        size={24}
                                        color={accepted ? Colors.tint : Colors.tabIconDefault}
                                    />
                                    <Text style={styles.checkboxText}>
                                        I understand and agree to the terms above
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.buttons}>
                                <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
                                    <Text style={styles.declineText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.acceptButton, !accepted && styles.disabledButton]}
                                    onPress={handleAccept}
                                    disabled={!accepted}
                                >
                                    <Text style={styles.acceptText}>Accept & Continue</Text>
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
        maxHeight: "85%",
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
        alignSelf: "center",
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 16,
        textAlign: "center",
    },
    scrollView: {
        maxHeight: 300,
        marginBottom: 16,
    },
    warningContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 149, 0, 0.1)",
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 149, 0, 0.3)",
    },
    warningIcon: {
        marginRight: 8,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#ff9500",
    },
    description: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        textAlign: "left",
        marginBottom: 12,
        lineHeight: 20,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.backgroundLighter,
        marginVertical: 16,
    },
    termsTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 12,
    },
    termsList: {
        marginBottom: 16,
    },
    termItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    termText: {
        flex: 1,
        fontSize: 13,
        color: Colors.tabIconDefault,
        marginLeft: 8,
        lineHeight: 18,
    },
    linksSection: {
        marginTop: 16,
        marginBottom: 8,
    },
    linksSectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 12,
    },
    linksContainer: {
        gap: 10,
    },
    linkButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.backgroundLighter,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.tint + '30',
        gap: 10,
    },
    linkButtonText: {
        flex: 1,
        color: Colors.tint,
        fontSize: 14,
        fontWeight: "600",
    },
    checkboxContainer: {
        marginBottom: 20,
    },
    checkbox: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
    },
    checkboxText: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        marginLeft: 10,
        lineHeight: 20,
    },
    buttons: {
        flexDirection: "row",
        width: "100%",
        gap: 12,
    },
    declineButton: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        backgroundColor: Colors.backgroundLighter,
    },
    declineText: {
        color: Colors.text,
        fontWeight: "600",
    },
    acceptButton: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        backgroundColor: Colors.tint,
    },
    disabledButton: {
        opacity: 0.5,
    },
    acceptText: {
        color: Colors.background,
        fontWeight: "bold",
    },
});
