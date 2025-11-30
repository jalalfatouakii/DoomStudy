import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCourses } from "@/context/CourseContext";

export default function Settings() {
    const { courses } = useCourses();

    // Mock user data
    const user = {
        name: "Jalal",
        stats: {
            coursesCompleted: courses.length,
            hoursStudied: 48.5,
            streakDays: 5
        },
        weeklyActivity: [2.5, 3.5, 1.5, 4.0, 3.0, 5.5, 2.0] // Hours last 7 days
    };

    const ActionItem = ({ icon, title, onPress }: any) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={20} color={Colors.text} />
                </View>
                <Text style={styles.settingTitle}>{title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.tabIconDefault} />
        </TouchableOpacity>
    );

    const StatCard = ({ label, value, icon, color }: any) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const ActivityGraph = ({ data }: { data: number[] }) => {
        const max = Math.max(...data);
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

        return (
            <View style={styles.graphContainer}>
                {data.map((value, index) => (
                    <View key={index} style={styles.barContainer}>
                        <View style={styles.barTrack}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        height: `${(value / max) * 100}%`,
                                        backgroundColor: value === max ? Colors.tint : Colors.tabIconDefault
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.dayLabel}>{days[index]}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>

            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

                {/* User Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.userName}> Keep it going <Text style={styles.userNameBold}>{user.name}</Text>!</Text>
                </View>

                {/* Motivation Card */}
                <View style={styles.motivationCard}>
                    <View style={styles.motivationIcon}>
                        <Ionicons name="trending-up" size={24} color="#000" />
                    </View>
                    <View style={styles.motivationContent}>
                        <Text style={styles.motivationTitle}>{user.stats.hoursStudied} Hours Reclaimed</Text>
                        <Text style={styles.motivationSubtitle}>That's ~2 days less of doomscrolling !</Text>
                    </View>
                </View>

                {/* Progress Tracking Section */}
                <View style={styles.statsContainer}>
                    <StatCard
                        label="Courses"
                        value={user.stats.coursesCompleted}
                        icon="book"
                        color="#4CAF50"
                    />
                    <StatCard
                        label="Hours"
                        value={user.stats.hoursStudied}
                        icon="time"
                        color="#2196F3"
                    />
                    <StatCard
                        label="Streak"
                        value={user.stats.streakDays}
                        icon="flame"
                        color="#FF9800"
                    />
                </View>

                {/* Activity Graph */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Weekly Activity</Text>
                    <ActivityGraph data={user.weeklyActivity} />
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>More</Text>
                    <View style={styles.sectionContent}>
                        <ActionItem
                            icon="information-circle"
                            title="About DoomStudy"
                            onPress={() => { }}
                        />
                        <View style={styles.separator} />
                        <ActionItem
                            icon="document-text"
                            title="Privacy Policy"
                            onPress={() => { }}
                        />
                        <View style={styles.separator} />
                        <View style={styles.versionContainer}>
                            <Text style={styles.versionText}>Version 1.0.0</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.backgroundSecondary,
        backgroundColor: Colors.background,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.tabIconDefault,
        marginBottom: 10,
        marginLeft: 10,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    sectionContent: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        overflow: "hidden",
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: Colors.backgroundSecondary,
    },
    settingLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: Colors.backgroundLighter,
        alignItems: "center",
        justifyContent: "center",
    },
    destructiveIcon: {
        backgroundColor: "#ff444420",
    },
    settingTitle: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: "500",
    },
    destructiveText: {
        color: "#ff4444",
    },
    separator: {
        height: 1,
        backgroundColor: Colors.backgroundLighter,
        marginLeft: 60, // Align with text start
    },
    versionContainer: {
        padding: 16,
        alignItems: "center",
    },
    versionText: {
        color: Colors.tabIconDefault,
        fontSize: 14,
    },
    profileSection: {
        alignItems: "center",
        marginBottom: 30,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.tint,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        shadowColor: Colors.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: "bold",
        color: Colors.background,
    },
    userName: {
        fontSize: 24,
        color: Colors.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: Colors.tabIconDefault,
    },
    statsContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        fontWeight: "500",
    },
    motivationCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.tint,
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
        shadowColor: Colors.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    motivationIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    motivationContent: {
        flex: 1,
    },
    motivationTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000", // Dark text for better contrast on neon green
        marginBottom: 4,
    },
    motivationSubtitle: {
        fontSize: 13,
        color: "rgba(0,0,0,0.7)", // Darker subtitle
        fontWeight: "500",
    },
    graphContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        height: 150,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        padding: 20,
    },
    barContainer: {
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    barTrack: {
        width: 8,
        height: "80%",
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 4,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    barFill: {
        width: "100%",
        borderRadius: 4,
    },
    dayLabel: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        fontWeight: "500",
    },
    userNameBold: {
        fontWeight: "bold",
    },
});
