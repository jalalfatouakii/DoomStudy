import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const slides = [
    {
        id: "1",
        title: "Stop Doomscrolling",
        description: "Take back control of your time. Turn endless scrolling into productive learning sessions.",
        icon: "hourglass-outline" as const,
    },
    {
        id: "2",
        title: "Learn Anything",
        description: "Import content from your favorite classes and let AI turn it into bite-sized content.",
        icon: "school-outline" as const,
    },
    {
        id: "3",
        title: "Track Progress",
        description: "Visualize your journey. See how many hours you've reclaimed !",
        icon: "trending-up-outline" as const,
    },
];

export default function Onboarding() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        } else {
            router.replace("/(tabs)");
        }
    };

    const handleSkip = () => {
        router.replace("/(tabs)");
    };

    const Slide = ({ item }: { item: typeof slides[0] }) => {
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
            <View style={styles.header}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={({ item }) => <Slide item={item} />}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                keyExtractor={(item) => item.id}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                scrollEventThrottle={32}
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

                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <Text style={styles.buttonText}>
                        {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
                    </Text>
                </TouchableOpacity>
            </View>
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
        justifyContent: "center",
        paddingHorizontal: 40,
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
    buttonText: {
        color: Colors.background,
        fontSize: 18,
        fontWeight: "bold",
    },
});