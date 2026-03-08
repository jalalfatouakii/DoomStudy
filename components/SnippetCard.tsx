import { Colors } from "@/constants/colors";
import { usePreferences } from "@/context/PreferencesContext";
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
    const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const {
        videoBackgroundEnabled: isVideoBackgroundEnabled,
        snippetCardBackgroundOpacity,
        snippetCardTextColor,
        snippetCardBackgroundColor,
        videoBackgroundShowHeader,
    } = usePreferences();

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

    const toggleOption = (index: number) => {
        if (isRevealed) return;
        setSelectedOptions(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
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
                return <Ionicons name="bulb" size={24} color={isVideoBackgroundEnabled ? cardTextColor : Colors.tint} />;
            case "qna":
                return <Ionicons name="information-circle" size={24} color={isVideoBackgroundEnabled ? cardTextColor : "#FF9500"} />;
            case "true_false":
                return <Ionicons name="checkbox" size={24} color={isVideoBackgroundEnabled ? cardTextColor : "#34C759"} />;
            case "concept":
                return <Ionicons name="key" size={24} color={isVideoBackgroundEnabled ? cardTextColor : "#AF52DE"} />;
            case "multiple_choice":
                return <Ionicons name="list" size={24} color={isVideoBackgroundEnabled ? cardTextColor : "#5856D6"} />;
            default:
                return <Ionicons name="document" size={24} color={isVideoBackgroundEnabled ? cardTextColor : Colors.tabIconDefault} />;
        }
    };

    const renderLabel = () => {
        if (snippet.label) return snippet.label;
        switch (snippet.type) {
            case "fact": return "Did You Know?";
            case "qna": return "Question";
            case "true_false": return "True or False?";
            case "concept": return "Key Concept";
            case "multiple_choice": return "Multiple Choice";
            default: return "Snippet";
        }
    };

    const getCardStyle = () => {
        // Optional: subtle background tint based on type
        // For now, keeping it clean with just icon colors
        return {};
    };

    // Use custom colors for normal mode too
    const cardBackgroundColor = isVideoBackgroundEnabled ? 'transparent' : snippetCardBackgroundColor;
    const cardTextColor = isVideoBackgroundEnabled ? snippetCardTextColor : (snippetCardTextColor || Colors.text);
    const cardOpacity = isVideoBackgroundEnabled ? snippetCardBackgroundOpacity : 1;

    return (
        <View style={[
            styles.card,
            { height: height || "auto" },
            { backgroundColor: cardBackgroundColor },
            getCardStyle()
        ]}>
            {/* Background overlay - shown for video backgrounds, or as solid background for normal mode */}
            {isVideoBackgroundEnabled ? (
                <View style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: snippetCardBackgroundColor,
                        opacity: snippetCardBackgroundOpacity,
                        borderRadius: 24,
                    }
                ]} />
            ) : (
                <View style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: snippetCardBackgroundColor,
                        opacity: cardOpacity,
                        borderRadius: 24,
                    }
                ]} />
            )}
            {/* Header - shown when not video backgrounds OR when video backgrounds enabled and header toggle is on */}
            {(!isVideoBackgroundEnabled || videoBackgroundShowHeader) && (
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        {renderIcon()}
                    </View>
                    <Text style={[
                        styles.label,
                        { color: cardTextColor }
                    ]}>{renderLabel()}</Text>
                </View>
            )}
            <View style={styles.contentContainer}>
                <Text style={[
                    styles.mainText,
                    snippet.type === 'concept' && styles.conceptText,
                    isVideoBackgroundEnabled && styles.mainTextWithShadow,
                    { color: cardTextColor }
                ]}>
                    {cleanContent(snippet.content)}
                </Text>

                {(snippet.type === "qna" || snippet.type === "true_false") && snippet.answer && (
                    <View style={styles.interactiveContainer}>
                        {!isRevealed ? (
                            <Animated.View style={{ opacity: fadeAnim }}>
                                <TouchableOpacity
                                    style={[
                                        styles.revealButton,
                                        { backgroundColor: Colors.tint }
                                    ]}
                                    onPress={handleReveal}
                                >
                                    <Text style={[
                                        styles.revealButtonText,
                                        { color: Colors.background }
                                    ]}>
                                        Reveal Answer
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            <View style={[styles.answerContainer, { borderColor: Colors.tint }]}>
                                <View style={styles.answerHeader}>
                                    <Ionicons name="checkmark-circle" size={20} color={Colors.tint} />
                                    <Text style={[styles.answerLabel, { color: Colors.tint }]}>Answer:</Text>
                                </View>
                                <Text style={[
                                    styles.answerText,
                                    { color: cardTextColor }
                                ]}>
                                    {snippet.answer}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {snippet.type === "multiple_choice" && snippet.options && snippet.correctIndices && (
                    <View style={styles.interactiveContainer}>
                        <View style={styles.mcOptionsContainer}>
                            {snippet.options.map((option, idx) => {
                                const isSelected = selectedOptions.has(idx);
                                const isCorrect = snippet.correctIndices!.includes(idx);

                                let optionStyle = styles.mcOption;
                                let iconName: "square-outline" | "checkbox" | "checkmark-circle" | "close-circle" = "square-outline";
                                let iconColor = Colors.tabIconDefault;
                                let textColor = cardTextColor;

                                if (!isRevealed && isSelected) {
                                    optionStyle = { ...styles.mcOption, ...styles.mcOptionSelected };
                                    iconName = "checkbox";
                                    iconColor = Colors.tint;
                                }

                                if (isRevealed) {
                                    if (isCorrect && isSelected) {
                                        optionStyle = { ...styles.mcOption, ...styles.mcOptionCorrect };
                                        iconName = "checkmark-circle";
                                        iconColor = "#34C759";
                                        textColor = "#34C759";
                                    } else if (isCorrect && !isSelected) {
                                        optionStyle = { ...styles.mcOption, ...styles.mcOptionCorrectMissed };
                                        iconName = "checkmark-circle";
                                        iconColor = "#34C759";
                                        textColor = "#34C759";
                                    } else if (!isCorrect && isSelected) {
                                        optionStyle = { ...styles.mcOption, ...styles.mcOptionWrong };
                                        iconName = "close-circle";
                                        iconColor = "#FF3B30";
                                        textColor = "#FF3B30";
                                    } else {
                                        optionStyle = { ...styles.mcOption, ...styles.mcOptionNeutral };
                                    }
                                }

                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={optionStyle}
                                        onPress={() => toggleOption(idx)}
                                        activeOpacity={isRevealed ? 1 : 0.7}
                                    >
                                        <Ionicons name={iconName} size={22} color={iconColor} />
                                        <Text style={[styles.mcOptionText, { color: textColor }]}>{option}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {!isRevealed && (
                            <Animated.View style={{ opacity: fadeAnim, marginTop: 12 }}>
                                <TouchableOpacity
                                    style={[
                                        styles.revealButton,
                                        { backgroundColor: Colors.tint }
                                    ]}
                                    onPress={handleReveal}
                                >
                                    <Text style={[
                                        styles.revealButtonText,
                                        { color: Colors.background }
                                    ]}>
                                        Reveal Answer
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>
                )}
            </View>

            {!isVideoBackgroundEnabled && (
                <View style={styles.footer}>
                    <Text style={styles.metaText} numberOfLines={1}>📄 {snippet.fileName}</Text>
                    <View style={styles.tagsRow}>
                        {snippet.tags.slice(0, 3).map((tag, idx) => (
                            <View key={idx} style={styles.tagBadge}>
                                <Text style={[styles.tagText, { color: Colors.tint }]}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 24,
        padding: 24,
        width: "100%",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
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
    },
    mainTextWithShadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    conceptText: {
        fontWeight: "700",
        fontStyle: "italic",
    },
    interactiveContainer: {
        marginTop: 8,
    },
    revealButton: {
        // backgroundColor will be set dynamically
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    revealButtonText: {
        color: Colors.background, // Default color, will be overridden when video backgrounds enabled
        fontSize: 16,
        fontWeight: "600",
    },
    revealButtonTextWithShadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    answerContainer: {
        backgroundColor: Colors.backgroundSecondary,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        // borderColor will be set dynamically
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
        // color will be set dynamically
    },
    answerText: {
        fontSize: 16,
        // color will be set dynamically
        lineHeight: 24,
    },
    answerTextWithShadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    footer: {
        marginTop: 24,
        gap: 8,
    },
    metaText: {
        color: Colors.tabIconDefault,
        fontSize: 13,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagBadge: {
        backgroundColor: Colors.backgroundSecondary,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    tagText: {
        // color will be set dynamically
        fontSize: 12,
        fontWeight: '600',
    },
    mcOptionsContainer: {
        gap: 8,
    },
    mcOption: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.backgroundSecondary,
        backgroundColor: Colors.backgroundSecondary,
        gap: 10,
    },
    mcOptionSelected: {
        borderColor: Colors.tint,
        backgroundColor: Colors.tint + '15',
    },
    mcOptionCorrect: {
        borderColor: "#34C759",
        backgroundColor: "#34C75920",
    },
    mcOptionCorrectMissed: {
        borderColor: "#34C759",
        backgroundColor: "#34C75910",
    },
    mcOptionWrong: {
        borderColor: "#FF3B30",
        backgroundColor: "#FF3B3020",
    },
    mcOptionNeutral: {
        borderColor: Colors.backgroundSecondary,
        backgroundColor: Colors.backgroundSecondary,
        opacity: 0.6,
    },
    mcOptionText: {
        fontSize: 15,
        fontWeight: "500" as const,
        flex: 1,
    },
});
