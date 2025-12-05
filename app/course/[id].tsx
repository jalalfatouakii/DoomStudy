import { Colors } from "@/constants/colors";
import { ContentSnippet, useCourses } from "@/context/CourseContext";
import { generateSnippetsWithGemini } from "@/utils/gemini";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height, width } = Dimensions.get("window");
const INITIAL_LOAD = 20;
const LOAD_MORE_COUNT = 10;

export default function CourseDetail() {
    const { id, snippetId } = useLocalSearchParams<{ id: string; snippetId?: string }>();
    const { courses, getRandomSnippets } = useCourses();
    const router = useRouter();
    const [itemHeight, setItemHeight] = useState(0);
    const [snippets, setSnippets] = useState<ContentSnippet[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // AI Generation State
    const [isGeneratingMore, setIsGeneratingMore] = useState(false);

    const course = courses.find(c => c.id === id);

    useEffect(() => {
        if (id) {
            let allSnippets = getRandomSnippets(INITIAL_LOAD, undefined, id);

            // If a specific snippet was tapped, ensure it's in the list and at the front
            if (snippetId && course) {
                // Try to find the snippet in the current list
                const existingIndex = allSnippets.findIndex(s => s.id === snippetId);

                if (existingIndex >= 0) {
                    // Snippet exists, move it to front if not already there
                    if (existingIndex > 0) {
                        const tappedSnippet = allSnippets[existingIndex];
                        allSnippets.splice(existingIndex, 1);
                        allSnippets.unshift(tappedSnippet);
                    }
                } else {
                    // Snippet not in list, we need to create it from the course data
                    // Parse the snippetId to extract file info
                    const parts = snippetId.split('-');
                    if (parts.length >= 3) {
                        const fileName = parts.slice(1, -1).join('-');
                        const sentenceIndex = parseInt(parts[parts.length - 1]);

                        const file = course.files.find(f => f.name === fileName);
                        if (file && file.parsedText) {
                            const sentences = file.parsedText
                                .split(/[.!?]\s+|\n+/)
                                .map(s => s.trim())
                                .filter(s => s.length > 20);

                            if (sentences[sentenceIndex]) {
                                const tappedSnippet = {
                                    id: snippetId,
                                    text: sentences[sentenceIndex],
                                    courseId: id,
                                    courseName: course.title,
                                    fileName: file.name,
                                    tags: course.tags,
                                };
                                allSnippets.unshift(tappedSnippet);
                            }
                        }
                    }
                }
            }

            setSnippets(allSnippets);
        }
    }, [id, snippetId]);

    const generateMoreAiContent = async () => {
        if (isGeneratingMore || !course) return;

        const key = await AsyncStorage.getItem("geminiKey");
        if (!key) return;

        setIsGeneratingMore(true);
        console.log(`Generating more AI content for course ${course.title}...`);

        try {
            // Combine text from files
            const allText = course.files
                .map(f => f.parsedText || "")
                .join("\n\n");

            if (!allText.trim()) return;

            const newAiSnippets = await generateSnippetsWithGemini(allText, key);

            if (newAiSnippets.length > 0) {
                const newContentSnippets: ContentSnippet[] = newAiSnippets.map((text, idx) => ({
                    id: `${course.id}-ai-gen-${Date.now()}-${idx}`,
                    text,
                    courseId: course.id,
                    courseName: course.title,
                    fileName: "AI Generated (Infinite)",
                    tags: course.tags
                }));

                setSnippets(prev => [...prev, ...newContentSnippets]);
            }

        } catch (error) {
            console.error("Error generating infinite AI content:", error);
        } finally {
            setIsGeneratingMore(false);
        }
    };

    const loadMoreSnippets = () => {
        if (!id) return;
        const moreSnippets = getRandomSnippets(LOAD_MORE_COUNT, undefined, id);
        setSnippets(prev => [...prev, ...moreSnippets]);
    };

    const handleRefresh = async () => {
        if (!id) return;
        setRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        const newSnippets = getRandomSnippets(INITIAL_LOAD, undefined, id);
        setSnippets(newSnippets);
        setRefreshing(false);
    };

    const renderSnippetItem = ({ item }: { item: ContentSnippet }) => (
        <View style={[styles.verticalItem, { height: itemHeight }]}>
            <View style={styles.snippetCard}>
                <Text style={styles.snippetText} numberOfLines={20}>{item.text}</Text>
                <View style={styles.snippetMeta}>
                    <Text style={styles.metaText} numberOfLines={1}>📄 {item.fileName}</Text>
                    <View style={styles.tagsRow}>
                        {item.tags.slice(0, 3).map((tag, idx) => (
                            <View key={idx} style={styles.tagBadge}>
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );

    if (!course) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Course Not Found</Text>
                    <View style={{ width: 28 }} />
                </View>
            </SafeAreaView>
        );
    }

    if (snippets.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {course.title}
                    </Text>
                    <View style={{ width: 28 }} />
                </View>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No content found in this course.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {course.title}
                </Text>
                <View style={{ width: 28 }} />
            </View>

            <FlatList
                data={snippets}
                keyExtractor={(item) => item.id}
                renderItem={renderSnippetItem}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                onLayout={(e) => setItemHeight(e.nativeEvent.layout.height)}
                style={styles.list}
                onEndReached={() => {
                    loadMoreSnippets();
                    generateMoreAiContent();
                }}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={Colors.tint}
                        title="Pull to refresh"
                        titleColor={Colors.tint}
                    />
                }
                ListFooterComponent={
                    isGeneratingMore ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={Colors.tint} />
                            <Text style={{ color: Colors.tabIconDefault, marginTop: 8, fontSize: 12 }}>Generating fresh insights...</Text>
                        </View>
                    ) : null
                }
                onViewableItemsChanged={({ viewableItems }) => {
                    if (viewableItems.length > 0) {
                        const lastIndex = viewableItems[0].index;
                        if (lastIndex !== null && lastIndex > 0 && lastIndex % 10 === 0) {
                            generateMoreAiContent();
                        }
                    }
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.backgroundSecondary,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.text,
        flex: 1,
        textAlign: "center",
    },
    list: {
        flex: 1,
    },
    verticalItem: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.backgroundSecondary,
        paddingTop: 40,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    snippetCard: {
        justifyContent: "space-between",
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 16,
        padding: 24,
        width: width * 0.9,
        maxHeight: "100%",
    },
    snippetText: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: "600",
        lineHeight: 32,
        marginBottom: 20,
        flexShrink: 1,
    },
    snippetMeta: {
        gap: 6,
        flexShrink: 0,
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
        backgroundColor: Colors.tint + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        color: Colors.tint,
        fontSize: 12,
        fontWeight: '500',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.tabIconDefault,
        fontSize: 16,
    },
});
