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

const FEATURES = [
    {
        id: "feature-1",
        type: "feature",
        title: "Upload Class Content",
        description: "Simply upload your lecture PDF notes or slides. We handle the rest.",
        icon: "cloud-upload-outline" as const,
    },
    {
        id: "feature-2",
        type: "feature",
        title: "Doomscroll Your Exams",
        description: "We convert your boring study material into a fun, endless feed of bite-sized text snippets.",
        icon: "phone-portrait-outline" as const,
    },
];

export default function Onboarding() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // User Data State
    const [name, setName] = useState("");
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

    const slides = [
        { id: "name", type: "input" },
        { id: "goals", type: "selection" },
        ...FEATURES
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

    const isNextDisabled = () => {
        if (currentIndex === 0) return name.trim().length === 0;
        if (currentIndex === 1) return selectedGoals.length === 0;
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

        // Feature Slide
        return (
            <View style={styles.slide}>
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name={item.icon} size={80} color={Colors.tint} />
                    </View>
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </View>
            </View>
        );
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
                            {currentIndex >= 2 && (
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
});