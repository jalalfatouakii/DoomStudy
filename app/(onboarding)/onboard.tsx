import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ViewToken
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const GOALS = [
    "Stop Doomscrolling",
    "Learn New Skills",
    "Save Time",
    "Boost Productivity",
    "Track Progress"
];

const SNIPPET_TYPES = [
    { id: 'fact', label: 'Fact', description: 'Interesting facts and insights' },
    { id: 'concept', label: 'Concept', description: 'Key concepts explained simply' },
    { id: 'qna', label: 'Q&A', description: 'Question and answer format' },
    { id: 'true_false', label: 'True/False', description: 'True or false statements' },
];

const FEATURES = [
    {
        title: "Upload Content",
        description: "Upload your lecture notes or slides",
        icon: "cloud-upload-outline" as const,
    },
    {
        title: "Doomscroll",
        description: "Learn through endless feed",
        icon: "phone-portrait-outline" as const,
    },
    {
        title: "Track Progress",
        description: "Monitor your learning journey",
        icon: "bar-chart-outline" as const,
    },
    {
        title: "100% Free",
        description: "No hidden fees or commitments",
        icon: "cash-outline" as const,
    }
];

export default function Onboarding() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // User Data State
    const [name, setName] = useState("");
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [selectedSnippetTypes, setSelectedSnippetTypes] = useState<string[]>(['fact', 'concept', 'qna', 'true_false']);

    const slides = [
        { id: "name", type: "input" },
        { id: "goals", type: "selection" },
        { id: "snippets", type: "snippets" },
        { id: "features", type: "features" }
    ];

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const handleNext = async () => {
        // Hide keyboard if we're on the name input slide
        if (currentIndex === 0) {
            Keyboard.dismiss();
        }

        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        } else {
            await completeOnboarding();
        }
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem("userName", name);
            await AsyncStorage.setItem("userGoals", JSON.stringify(selectedGoals));
            await AsyncStorage.setItem("snippetTypePreferences", JSON.stringify(selectedSnippetTypes));
            await AsyncStorage.setItem("hasOnboarded", "true");
            router.replace("/(tabs)");
        } catch (error) {
            console.error("Error saving onboarding data:", error);
        }
    };

    const toggleGoal = (goal: string) => {
        if (selectedGoals.includes(goal)) {
            setSelectedGoals(selectedGoals.filter(g => g !== goal));
        } else {
            setSelectedGoals([...selectedGoals, goal]);
        }
    };

    const toggleSnippetType = (typeId: string) => {
        if (selectedSnippetTypes.includes(typeId)) {
            // Prevent deselecting if it's the last one
            if (selectedSnippetTypes.length > 1) {
                setSelectedSnippetTypes(selectedSnippetTypes.filter(t => t !== typeId));
            }
        } else {
            setSelectedSnippetTypes([...selectedSnippetTypes, typeId]);
        }
    };

    const isNextDisabled = () => {
        if (currentIndex === 0) return name.trim().length === 0;
        if (currentIndex === 1) return selectedGoals.length === 0;
        if (currentIndex === 2) return selectedSnippetTypes.length === 0;
        return false;
    };

    const renderSlide = ({ item }: { item: any }) => {
        if (item.type === "input") {
            return (
                <View style={styles.slide}>
                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>What's your name?</Text>
                        <Text style={styles.description}>Let's personalize your experience.</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor={Colors.tabIconDefault}
                            value={name}
                            onChangeText={setName}
                            autoFocus={false} // Avoid auto-focus issues in carousel
                        />
                    </View>
                </View>
            );
        }

        if (item.type === "selection") {
            return (
                <View style={styles.slide}>
                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>Why are you here?</Text>
                        <Text style={styles.description}>Select all that apply.</Text>
                        <View style={styles.goalsContainer}>
                            {GOALS.map((goal) => (
                                <TouchableOpacity
                                    key={goal}
                                    style={[
                                        styles.goalItem,
                                        selectedGoals.includes(goal) && styles.goalItemActive
                                    ]}
                                    onPress={() => toggleGoal(goal)}
                                >
                                    <Text style={[
                                        styles.goalText,
                                        selectedGoals.includes(goal) && styles.goalTextActive
                                    ]}>{goal}</Text>
                                    {selectedGoals.includes(goal) && (
                                        <Ionicons name="checkmark-circle" size={20} color={Colors.background} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            );
        }

        if (item.type === "snippets") {
            return (
                <View style={styles.slide}>
                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>What snippets do you want?</Text>
                        <Text style={styles.description}>Choose the types of learning content you prefer.</Text>
                        <View style={styles.goalsContainer}>
                            {SNIPPET_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.goalItem,
                                        selectedSnippetTypes.includes(type.id) && styles.goalItemActive
                                    ]}
                                    onPress={() => toggleSnippetType(type.id)}
                                >
                                    <View style={styles.snippetTypeInfo}>
                                        <Text style={[
                                            styles.goalText,
                                            selectedSnippetTypes.includes(type.id) && styles.goalTextActive
                                        ]}>{type.label}</Text>
                                        <Text style={[
                                            styles.snippetTypeDescription,
                                            selectedSnippetTypes.includes(type.id) && styles.snippetTypeDescriptionActive
                                        ]}>{type.description}</Text>
                                    </View>
                                    {selectedSnippetTypes.includes(type.id) && (
                                        <Ionicons name="checkmark-circle" size={20} color={Colors.background} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.subDescription}>You can always change your preferences later.</Text>

                    </View>
                </View>
            );
        }

        if (item.type === "features") {
            return (
                <View style={styles.slide}>
                    <View style={styles.featuresContent}>
                        <Text style={styles.title}>Everything you need</Text>
                        <Text style={styles.description}>Your all-in-one learning companion</Text>
                        <View style={styles.featuresGrid}>
                            {FEATURES.map((feature, index) => (
                                <View key={index} style={styles.featureCard}>
                                    <View style={styles.featureIconContainer}>
                                        <Ionicons name={feature.icon} size={32} color={Colors.tint} />
                                    </View>
                                    <Text style={styles.featureTitle}>{feature.title}</Text>
                                    <Text style={styles.featureDescription}>{feature.description}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            );
        }

        return null; // Should not happen with defined types
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.header}>
                            {/* Only show Skip on feature slides */}
                            {currentIndex >= 3 && (
                                <TouchableOpacity onPress={completeOnboarding} style={styles.skipButton}>
                                    <Text style={styles.skipText}>Skip</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            ref={flatListRef}
                            data={slides}
                            renderItem={renderSlide}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            bounces={false}
                            scrollEnabled={false}
                            keyExtractor={(item) => item.id}
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig}
                            scrollEventThrottle={32}
                            keyboardShouldPersistTaps="handled"
                        />

                        <View style={styles.footer}>
                            <View style={styles.pagination}>
                                {slides.map((_, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.dot,
                                            currentIndex === index && styles.activeDot,
                                        ]}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.button, isNextDisabled() && styles.buttonDisabled]}
                                onPress={handleNext}
                                disabled={isNextDisabled()}
                            >
                                <Text style={[styles.buttonText, isNextDisabled() && styles.buttonTextDisabled]}>
                                    {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
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
        justifyContent: "flex-end",
        padding: 20,
        height: 60,
    },
    skipButton: {
        padding: 8,
        height: 60,
    },
    skipText: {
        color: Colors.tabIconDefault,
        fontSize: 16,
        fontWeight: "500",
    },
    slide: {
        width: width,
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 30,
    },
    contentContainer: {
        width: '100%',
        flex: 1,
        justifyContent: 'center',
    },
    iconContainer: {
        flex: 0.5,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 40,
    },
    iconCircle: {
        width: 160,
        height: 160,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: Colors.tint,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        backgroundColor: `${Colors.tint}10`,
        borderRadius: 80,
    },
    textContainer: {
        flex: 0.3,
        alignItems: "center",
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 16,
        textAlign: "center",
    },
    description: {
        fontSize: 16,
        color: Colors.tabIconDefault,
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 30,
    },
    input: {
        backgroundColor: Colors.backgroundSecondary,
        color: Colors.text,
        padding: 20,
        borderRadius: 16,
        fontSize: 18,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
    },
    goalsContainer: {
        gap: 12,
        marginTop: 20,
    },
    goalItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
    },
    goalItemActive: {
        backgroundColor: Colors.tint,
        borderColor: Colors.tint,
    },
    goalText: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: "500",
    },
    goalTextActive: {
        color: Colors.background,
        fontWeight: "bold",
    },
    footer: {
        padding: 40,
        gap: 30,
    },
    pagination: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.backgroundLighter,
    },
    activeDot: {
        width: 24,
        backgroundColor: Colors.tint,
    },
    button: {
        backgroundColor: Colors.tint,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        shadowColor: Colors.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        backgroundColor: Colors.backgroundLighter,
        shadowOpacity: 0,
    },
    buttonText: {
        color: Colors.background,
        fontSize: 18,
        fontWeight: "bold",
    },
    buttonTextDisabled: {
        color: Colors.tabIconDefault,
    },
    snippetTypeInfo: {
        flex: 1,
    },
    snippetTypeDescription: {
        fontSize: 13,
        color: Colors.tabIconDefault,
        marginTop: 2,
    },
    snippetTypeDescriptionActive: {
        color: `${Colors.background}CC`,
    },
    featuresContent: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 30,
    },
    featureCard: {
        width: '47%',
        backgroundColor: Colors.backgroundSecondary,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
        alignItems: 'center',
    },
    featureIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: `${Colors.tint}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 6,
        textAlign: 'center',
    },
    featureDescription: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        textAlign: 'center',
        lineHeight: 16,
    },
    subDescription: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        textAlign: 'center',
        marginTop: 8,
    },
});