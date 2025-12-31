import SnippetCard from "@/components/SnippetCard";
import { Colors } from "@/constants/colors";
import { usePreferences } from "@/context/PreferencesContext";
import { ContentSnippet } from "@/utils/contentExtractor";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Keyboard,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ViewToken
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const GOALS = [
    "Scroll with Purpose",
    "Learn Something Daily",
    "Make Scrolling Productive",
    "Satisify your scrolling addiction",
    "Track your progress"
];

const SNIPPET_TYPES = [
    { id: 'fact', label: 'Key Facts', description: 'Important facts and insights' },
    { id: 'concept', label: 'Core Concepts', description: 'Key concepts explained simply' },
    { id: 'qna', label: 'Practice Questions', description: 'Question and answer format' },
    { id: 'true_false', label: 'Quick Checks', description: 'True or false statements' },
];

// Mock snippet for welcome preview
const WELCOME_SNIPPET: ContentSnippet = {
    id: 'welcome-preview',
    type: 'concept',
    content: 'Active recall is a study technique where you actively retrieve information from memory, rather than passively reviewing notes. Research shows it significantly improves long-term retention.',
    courseId: 'demo',
    courseName: 'Study Methods',
    fileName: 'Introduction.pdf',
    tags: ['learning', 'memory'],
    label: 'Key Concept'
};

const HOW_IT_WORKS_STEPS = [
    {
        step: 1,
        title: "Upload Material",
        description: "Add PDFs, notes, or slides from your courses",
        icon: "cloud-upload-outline" as const,
    },
    {
        step: 2,
        title: "Generate Snippets",
        description: "AI transforms content into bite-sized learning cards",
        icon: "sparkles-outline" as const,
    },
    {
        step: 3,
        title: "Learn in Feed",
        description: "Scroll through personalized content anytime",
        icon: "phone-portrait-outline" as const,
    },
    {
        step: 4,
        title: "Track Progress",
        description: "Monitor streaks, time saved, and weekly activity",
        icon: "bar-chart-outline" as const,
    },
];

const POWER_FEATURES = [
    {
        title: "Customizable",
        description: "Choose snippet types, models, and preferences",
        icon: "settings-outline" as const,
    },
    {
        title: "Offline Ready",
        description: "Use on-device AI or cloud models",
        icon: "phone-portrait-outline" as const,
    },
    {
        title: "Widgets",
        description: "Quick access from your home screen",
        icon: "grid-outline" as const,
    },
    {
        title: "Stats & Insights",
        description: "Track your learning journey",
        icon: "analytics-outline" as const,
    },
];

// Single preview video (static, doesn't change)
const PREVIEW_VIDEO = require('@/assets/videos/narrated.mp4');

export default function Onboarding() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { setVideoBackgroundEnabled, setEnabledVideoCategoryIds } = usePreferences();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // User Data State
    const [name, setName] = useState("");
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [selectedSnippetTypes, setSelectedSnippetTypes] = useState<string[]>(['fact', 'concept', 'qna', 'true_false']);
    const [videoBackgroundEnabled, setVideoBackgroundEnabledLocal] = useState(false);

    const slides = [
        { id: "welcome", type: "welcome" },
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

    // Provide fixed layout for FlatList to prevent height recalculation
    const getItemLayout = (_: any, index: number) => ({
        length: width,
        offset: width * index,
        index,
    });

    const handleNext = async () => {
        // Hide keyboard if we're on the name input slide
        if (currentIndex === 1) {
            Keyboard.dismiss();
        }

        if (currentIndex < slides.length - 1) {
            try {
                flatListRef.current?.scrollToIndex({
                    index: currentIndex + 1,
                    animated: true,
                });
            } catch (error) {
                // Fallback to scrollToOffset if scrollToIndex fails
                flatListRef.current?.scrollToOffset({
                    offset: (currentIndex + 1) * width,
                    animated: true,
                });
            }
        } else {
            await completeOnboarding();
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            Keyboard.dismiss();
            try {
                flatListRef.current?.scrollToIndex({
                    index: currentIndex - 1,
                    animated: true,
                });
            } catch (error) {
                // Fallback to scrollToOffset if scrollToIndex fails
                flatListRef.current?.scrollToOffset({
                    offset: (currentIndex - 1) * width,
                    animated: true,
                });
            }
        }
    };

    const handleSkip = async () => {
        Keyboard.dismiss();
        await completeOnboarding();
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem("userName", name || "there");
            await AsyncStorage.setItem("userGoals", JSON.stringify(selectedGoals));
            await AsyncStorage.setItem("snippetTypePreferences", JSON.stringify(selectedSnippetTypes));

            // Persist video background preferences
            await setVideoBackgroundEnabled(videoBackgroundEnabled);
            // Default to all categories enabled if video backgrounds are enabled
            await setEnabledVideoCategoryIds(['gameplay', 'satisfying', 'narrated', 'ambient', 'nature']);

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
        if (currentIndex === 0) return false; // Welcome screen
        if (currentIndex === 1) return name.trim().length === 0;
        if (currentIndex === 2) return selectedGoals.length === 0;
        if (currentIndex === 3) return selectedSnippetTypes.length === 0;
        return false;
    };

    const renderSlide = ({ item }: { item: any }) => {
        if (item.type === "welcome") {
            return (
                <View style={styles.slide}>
                    <ScrollView
                        contentContainerStyle={styles.welcomeContent}
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                        bounces={true}
                        scrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.welcomeHeader}>
                            <Text style={styles.welcomeTitle}>Study better in the moments you usually scroll.</Text>
                            <Text style={styles.welcomeSubtitle}>Turn PDFs and notes into quick, high-signal review.</Text>
                        </View>

                        {/* Video Background Toggle */}
                        <View style={styles.videoToggleSection}>
                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="videocam" size={20} color={Colors.text} />
                                    </View>
                                    <View style={styles.settingTextContainer}>
                                        <Text style={styles.settingTitle}>Video backgrounds</Text>
                                        <Text style={styles.settingSubtitle}>Beautiful ambient videos behind your cards</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={videoBackgroundEnabled}
                                    onValueChange={setVideoBackgroundEnabledLocal}
                                    trackColor={{ false: Colors.backgroundLighter, true: Colors.tint + '80' }}
                                    thumbColor={videoBackgroundEnabled ? Colors.tint : Colors.tabIconDefault}
                                />
                            </View>
                            {videoBackgroundEnabled && (
                                <View style={styles.customizationNote}>
                                    <Text style={styles.customizationNoteText}>You can turn this off and customize the appearance in Settings</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.previewContainer}>
                            <Text style={styles.previewLabel}>Preview</Text>
                            <View style={styles.snippetCardWrapper}>
                                {videoBackgroundEnabled ? (
                                    <VideoBackgroundPreview snippet={WELCOME_SNIPPET} />
                                ) : (
                                    <SnippetCard snippet={WELCOME_SNIPPET} />
                                )}
                            </View>
                        </View>

                        <View style={styles.trustNote}>
                            <Ionicons name="lock-closed-outline" size={16} color={Colors.tabIconDefault} />
                            <Text style={styles.trustText}>Your files stay on your device and are not uploaded to any servers.</Text>
                        </View>
                    </ScrollView>
                </View>
            );
        }

        if (item.type === "input") {
            return (
                <View style={styles.slide}>
                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>What's your name?</Text>
                        <Text style={styles.description}>We'll use this to personalize your experience and track your progress.</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor={Colors.tabIconDefault}
                            value={name}
                            onChangeText={setName}
                            autoFocus={false}
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
                        <Text style={styles.description}>We'll tailor your feed to match your intent. Select all that apply.</Text>
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
                        <Text style={styles.title}>Choose your study formats</Text>
                        <Text style={styles.description}>Select how you want to practice. You can change this anytime.</Text>
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
                        <Text style={styles.subDescription}>Preferences can be updated anytime in Settings.</Text>
                    </View>
                </View>
            );
        }

        if (item.type === "features") {
            return (
                <View style={styles.slide}>
                    <ScrollView
                        contentContainerStyle={styles.featuresContent}
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                        bounces={true}
                        scrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.howItWorksSection}>
                            <Text style={styles.title}>How it works</Text>
                            <Text style={styles.description}>A simple, structured approach to learning</Text>

                            <View style={styles.stepsContainer}>
                                {HOW_IT_WORKS_STEPS.map((step) => (
                                    <View key={step.step} style={styles.stepItem}>
                                        <View style={styles.stepNumber}>
                                            <Text style={styles.stepNumberText}>{step.step}</Text>
                                        </View>
                                        <View style={styles.stepContent}>
                                            <View style={styles.stepHeader}>
                                                <Text style={styles.stepTitle}>{step.title}</Text>
                                            </View>
                                            <Text style={styles.stepDescription}>{step.description}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.powerFeaturesSection}>
                            <Text style={styles.powerFeaturesTitle}>Powerful features</Text>
                            <View style={styles.powerFeaturesGrid}>
                                {POWER_FEATURES.map((feature, index) => (
                                    <View key={index} style={styles.powerFeatureCard}>
                                        <Ionicons name={feature.icon} size={24} color={Colors.tint} />
                                        <Text style={styles.powerFeatureTitle}>{feature.title}</Text>
                                        <Text style={styles.powerFeatureDescription}>{feature.description}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            );
        }

        return null;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.mainContainer}>
                <View style={styles.header}>
                    {currentIndex > 0 ? (
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color={Colors.text} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 44 }} />
                    )}
                    <View style={{ flex: 1 }} />
                    {currentIndex > 1 && currentIndex < slides.length - 1 ? (
                        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                            <Text style={styles.skipText}>Skip</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 60 }} />
                    )}
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${((currentIndex + 1) / slides.length) * 100}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>{currentIndex + 1} / {slides.length}</Text>
                </View>

                <View style={styles.slidesContainer}>
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
                        getItemLayout={getItemLayout}
                        removeClippedSubviews={false}
                        initialNumToRender={slides.length}
                        maxToRenderPerBatch={slides.length}
                        windowSize={1}
                        style={{ flex: 1 }}
                    />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.button, isNextDisabled() && styles.buttonDisabled]}
                        onPress={handleNext}
                        disabled={isNextDisabled()}
                    >
                        <Text style={[styles.buttonText, isNextDisabled() && styles.buttonTextDisabled]}>
                            {currentIndex === slides.length - 1 ? "Start Learning" : "Next"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    mainContainer: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 10,
        height: 70,
    },
    backButton: {
        padding: 16,
        minWidth: 44,
        minHeight: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    skipButton: {
        padding: 16,
        minWidth: 60,
        minHeight: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    skipText: {
        color: Colors.tabIconDefault,
        fontSize: 16,
        fontWeight: "500",
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 8,
        height: 40,
    },
    progressBar: {
        height: 4,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: Colors.tint,
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        textAlign: "center",
        fontWeight: "500",
    },
    slidesContainer: {
        flex: 1,
        width: '100%',
    },
    slide: {
        width: width,
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 30,
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    contentContainer: {
        width: '100%',
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 12,
        textAlign: "center",
    },
    description: {
        fontSize: 16,
        color: Colors.tabIconDefault,
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 30,
    },
    welcomeContent: {
        paddingVertical: 20,
        paddingBottom: 40,
        flexGrow: 1,
    },
    welcomeHeader: {
        marginBottom: 32,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 12,
        textAlign: "center",
        lineHeight: 36,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: Colors.tabIconDefault,
        textAlign: "center",
        lineHeight: 24,
    },
    previewContainer: {
        marginBottom: 24,
        width: '100%',
    },
    snippetCardWrapper: {
        width: '100%',
    },
    previewLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.tabIconDefault,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 12,
        textAlign: "center",
    },
    trustNote: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: 20,
    },
    trustText: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        textAlign: "center",
        flex: 1,
    },
    helperText: {
        fontSize: 13,
        color: Colors.tabIconDefault,
        textAlign: "center",
        marginTop: 12,
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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        minHeight: 100,
    },
    button: {
        backgroundColor: Colors.tint,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderRadius: 16,
        gap: 8,
        minHeight: 60,
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
        lineHeight: 22,
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
        paddingVertical: 20,
        paddingBottom: 40,
    },
    howItWorksSection: {
        marginBottom: 40,
    },
    stepsContainer: {
        gap: 20,
        marginTop: 24,
    },
    stepItem: {
        flexDirection: 'row',
        gap: 16,
    },
    stepNumber: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.tint,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    stepNumberText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.background,
    },
    stepContent: {
        flex: 1,
        paddingTop: 2,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 6,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
    },
    stepDescription: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        lineHeight: 20,
    },
    powerFeaturesSection: {
        marginBottom: 32,
    },
    powerFeaturesTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    powerFeaturesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    powerFeatureCard: {
        width: '47%',
        backgroundColor: Colors.backgroundSecondary,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
        gap: 8,
    },
    powerFeatureTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    powerFeatureDescription: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        lineHeight: 16,
    },
    subDescription: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        textAlign: 'center',
        marginTop: 8,
    },
    finalReassurance: {
        fontSize: 13,
        color: Colors.tabIconDefault,
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
    videoToggleSection: {
        marginBottom: 24,
        width: '100%',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.backgroundLighter,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingTextContainer: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 12,
        color: Colors.tabIconDefault,
    },
    customizationNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 6,
        paddingHorizontal: 20,
    },
    customizationNoteText: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        textAlign: 'center',
    },
});

// Video Background Preview Component - Simple card-like view over video background
function VideoBackgroundPreview({ snippet }: { snippet: ContentSnippet }) {
    const player = useVideoPlayer(PREVIEW_VIDEO, (player) => {
        player.loop = true;
        player.muted = false;
        player.play();
    });

    // Default preferences values
    const cardBackgroundColor = '#1E2022';
    const cardBackgroundOpacity = 0.8;
    const textColor = '#ECEDEE';

    return (
        <View style={previewStyles.videoWrapper}>
            <VideoView
                player={player}
                style={previewStyles.video}
                contentFit="cover"
                nativeControls={false}
            />
            <View style={previewStyles.card}>
                {/* Background overlay */}
                <View style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: cardBackgroundColor,
                        opacity: 0.2,
                        borderRadius: 24,
                    }
                ]} />
                {/* Header */}
                <View style={previewStyles.header}>
                    <View style={previewStyles.iconContainer}>
                        <Ionicons name="key" size={24} color="#AF52DE" />
                    </View>
                    <Text style={[previewStyles.label, { color: textColor }]}>KEY CONCEPT</Text>
                </View>
                {/* Content */}
                <View style={previewStyles.contentContainer}>
                    <Text style={[previewStyles.mainText, { color: textColor }]}>
                        {snippet.content}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const previewStyles = StyleSheet.create({
    videoWrapper: {
        width: '100%',
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
    },
    video: {
        ...StyleSheet.absoluteFillObject,
    },
    card: {
        backgroundColor: 'transparent',
        borderRadius: 24,
        padding: 24,
        width: "100%",
        position: 'relative',
        minHeight: 200,
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
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    contentContainer: {
        flex: 1,
        justifyContent: "center",
    },
    mainText: {
        fontSize: 23,
        fontWeight: "600",
        lineHeight: 32,

        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,

        // italic
        fontStyle: 'italic',
    },
});
