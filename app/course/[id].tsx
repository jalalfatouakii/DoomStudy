import { Colors } from "@/constants/colors";
import { useCourses } from "@/context/CourseContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

export default function CourseDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { courses } = useCourses();
    const router = useRouter();
    const [itemHeight, setItemHeight] = useState(0);

    const course = courses.find(c => c.id === id);

    const dummyData = Array.from({ length: 10 }).map((_, i) => ({
        id: `content-${i}`,
        content: `Content for ${course?.title || 'Course'} - Item ${i + 1}`,
    }));

    const renderVerticalItem = ({ item }: { item: { content: string } }) => (
        <View style={[styles.verticalItem, { height: itemHeight }]}>
            <Text style={{ color: Colors.text }}>{item.content}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {course?.title || "Course Details"}
                </Text>
                <View style={{ width: 28 }} />
            </View>

            <FlatList
                data={dummyData}
                keyExtractor={(item) => item.id}
                renderItem={renderVerticalItem}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                onLayout={(e) => setItemHeight(e.nativeEvent.layout.height)}
                style={styles.list}
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
    },
});
