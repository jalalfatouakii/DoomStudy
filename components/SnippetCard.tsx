import { Colors } from "@/constants/colors";
import { ContentSnippet } from "@/utils/contentExtractor";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
    Animated,
    LayoutAnimation,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from "react-native";

if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SnippetCardProps = {
    snippet: ContentSnippet;
    height?: number;
};

export default function SnippetCard({ snippet, height }: SnippetCardProps) {
    const [isRevealed, setIsRevealed] = useState(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const handleReveal = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsRevealed(true);
        });
    };

    const cleanContent = (text: string) => {
        if (snippet.type === 'qna') {
            // Remove "Question:" prefix and any "Answer:" part if present
            return text
                .replace(/^Question:\s*/i, '')
                .replace(/Answer:[\s\S]*/i, '')
                .trim();
        }
        return text;
    };

    const renderIcon = () => {
        switch (snippet.type) {
            case "fact":
                return <Ionicons name="bulb" size={24} color={Colors.tint} />;
            case "qna":
                return <Ionicons name="information-circle" size={24} color="#FF9500" />;
            case "true_false":
                return <Ionicons name="checkbox" size={24} color="#34C759" />;
            case "concept":
                return <Ionicons name="key" size={24} color="#AF52DE" />;
            default:
                return <Ionicons name="document" size={24} color={Colors.tabIconDefault} />;
        }
    };

    const renderLabel = () => {
        if (snippet.label) return snippet.label;
        switch (snippet.type) {
            case "fact": return "Did You Know?";
            case "qna": return "Question";
            case "true_false": return "True or False?";
            case "concept": return "Key Concept";
            default: return "Snippet";
        }
    };

    const getCardStyle = () => {
        // Optional: subtle background tint based on type
        // For now, keeping it clean with just icon colors
        return {};
    };

    return (
        <View style={[styles.card, { height: height || "auto" }, getCardStyle()]}>
            {/*
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    {renderIcon()}
                </View>
                <Text style={styles.label}>{renderLabel()}</Text>
            </View>
            */}
            <View style={styles.contentContainer}>
                <Text style={[styles.mainText, snippet.type === 'concept' && styles.conceptText]}>
                    {cleanContent(snippet.content)}
                </Text>

                {(snippet.type === "qna" || snippet.type === "true_false") && snippet.answer && (
                    <View style={styles.interactiveContainer}>
                        {!isRevealed ? (
                            <Animated.View style={{ opacity: fadeAnim }}>
                                <TouchableOpacity style={styles.revealButton} onPress={handleReveal}>
                                    <Text style={styles.revealButtonText}>Reveal Answer</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            <View style={styles.answerContainer}>
                                <View style={styles.answerHeader}>
                                    <Ionicons name="checkmark-circle" size={20} color={Colors.tint} />
                                    <Text style={styles.answerLabel}>Answer:</Text>
                                </View>
                                <Text style={styles.answerText}>{snippet.answer}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
            {/*
            <View style={styles.footer}>
                <Text style={styles.metaText} numberOfLines={1}>📄 {snippet.fileName}</Text>
                <View style={styles.tagsRow}>
                    {snippet.tags.slice(0, 3).map((tag, idx) => (
                        <View key={idx} style={styles.tagBadge}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                </View>
            </View>
            */}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        //backgroundColor: 'rgba(0, 0, 0, 0.4)', // More transparent for TikTok-style immersion
        //borderRadius: 24,
        padding: 24,
        width: "100%",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 8,
        //borderWidth: 1,
        //borderColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)', // Glass effect (may not work on all platforms)
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.backgroundSecondary,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.tabIconDefault,
        textTransform: "uppercase",
        letterSpacing: 1,
        maxWidth: "50%",
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    contentContainer: {
        flex: 1,
        justifyContent: "center",
    },
    mainText: {
        fontSize: 22,
        fontWeight: "600",
        color: Colors.text,
        lineHeight: 32,
        marginBottom: 24,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    conceptText: {
        fontWeight: "700",
        fontStyle: "italic",
    },
    interactiveContainer: {
        marginTop: 8,
    },
    revealButton: {
        backgroundColor: Colors.tint,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    revealButtonText: {
        color: Colors.background,
        fontSize: 16,
        fontWeight: "600",
    },
    answerContainer: {
        backgroundColor: Colors.backgroundSecondary,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.tint,
    },
    answerHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 6,
    },
    answerLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: Colors.tint,
    },
    answerText: {
        fontSize: 16,
        color: Colors.text,
        lineHeight: 24,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    footer: {
        marginTop: 24,
        gap: 8,
    },
    metaText: {
        color: Colors.tabIconDefault,
        fontSize: 13,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagBadge: {
        backgroundColor: Colors.tint + '15',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    tagText: {
        color: Colors.tint,
        fontSize: 12,
        fontWeight: '600',
    },
});
