
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import {
    Alert,
    Animated,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCourses } from "@/context/CourseContext";
import { useStats } from "@/context/StatsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

const EditNameModal = ({ visible, onClose, onSave, initialName }: { visible: boolean, onClose: () => void, onSave: (name: string) => void, initialName: string }) => {
    const [name, setName] = useState(initialName);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setName(initialName);
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, initialName]);

    const animateClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const handleSave = () => {
        onSave(name);
        animateClose();
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={animateClose}
            animationType="none"
        >
            <TouchableWithoutFeedback onPress={animateClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <Animated.View style={[styles.modalContent, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
                            <Text style={styles.modalTitle}>Edit Name</Text>
                            <Text style={styles.modalSubtitle}>Enter your new name</Text>

                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your Name"
                                placeholderTextColor={Colors.tabIconDefault}
                                autoFocus
                                selectionColor={Colors.tint}
                            />

                            <View style={styles.modalButtons}>
                                <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={animateClose}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </Pressable>
                                <Pressable style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </Pressable>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};


export default function Settings() {
    const router = useRouter();
    const { courses } = useCourses();
    const { streak, timeSaved, weeklyData, weeklyLabels, resetStats } = useStats();

    // Format time saved
    const hours = Math.floor(timeSaved / 3600);
    const minutes = Math.floor((timeSaved % 3600) / 60);
    const formattedTimeSaved = hours > 0 ? `${hours}h ${minutes} m` : `${minutes} m`;

    // Motivation logic
    const daysReclaimed = (timeSaved / (24 * 3600)).toFixed(1);
    const motivationSubtitle = parseFloat(daysReclaimed) < 1
        ? "You're getting there!"
        : `That's ~${daysReclaimed} days less of doomscrolling !`;

    const [username, setUsername] = useState<string>("User");

    // Mock user data
    const user = {
        name: username,
        stats: {
            coursesCompleted: courses.length,
            hoursStudied: formattedTimeSaved,
            streakDays: streak
        },
        weeklyActivity: weeklyData // Use real data
    };
    const [editModalVisible, setEditModalVisible] = useState(false);

    useEffect(() => {
        const loadUsername = async () => {
            const name = await AsyncStorage.getItem("userName");
            if (name) {
                setUsername(name);
            }
        };
        loadUsername();
    }, []);

    useEffect(() => {
        const saveUsername = async () => {
            await AsyncStorage.setItem("userName", username);
        };
        saveUsername();
    }, [username]);

    const editUsername = () => {
        setEditModalVisible(true);
    };


    const [geminiKey, setGeminiKey] = useState<string>("");

    useEffect(() => {
        const loadGeminiKey = async () => {
            const key = await AsyncStorage.getItem("geminiKey");
            if (key) {
                setGeminiKey(key);
            }
        };
        loadGeminiKey();
    }, []);

    useEffect(() => {
        const saveGeminiKey = async () => {
            await AsyncStorage.setItem("geminiKey", geminiKey);
        };
        saveGeminiKey();
    }, [geminiKey]);

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

    const ActivityGraph = ({ data, labels }: { data: number[], labels: string[] }) => {
        const max = Math.max(...data, 1); // Max is at least 1 hour

        return (
            <View style={styles.graphContainer}>
                {data.map((value, index) => {
                    const isToday = index === data.length - 1; // Last item is today
                    return (
                        <View key={index} style={styles.barContainer}>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            height: `${(value / max) * 100}%`,
                                            backgroundColor: isToday ? Colors.tint : Colors.tabIconDefault,
                                            opacity: isToday ? 1 : 0.5
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={[
                                styles.dayLabel,
                                isToday && { color: Colors.tint, fontWeight: 'bold' }
                            ]}>{labels[index]}</Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>

            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

                {/* User Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={58} color="black" />
                    </View>
                    <View style={styles.userNameContainer}>
                        <Text style={styles.userName}> Keep it going <Text style={styles.userNameBold}>{user.name}</Text>!</Text>
                        <Ionicons name="pencil" size={20} color="white" style={styles.editIcon} onPress={editUsername} />
                    </View>

                </View>

                {/* Motivation Card */}
                <View style={styles.motivationCard}>
                    <View style={styles.motivationIcon}>
                        <Ionicons name="trending-up" size={24} color="#000" />
                    </View>
                    <View style={styles.motivationContent}>
                        <Text style={styles.motivationTitle}>{user.stats.hoursStudied} Reclaimed</Text>
                        <Text style={styles.motivationSubtitle}>{motivationSubtitle}</Text>
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
                        label="Streak"
                        value={user.stats.streakDays + " day" + (user.stats.streakDays === 1 ? "" : "s")}
                        icon="flame"
                        color="#FF9800"
                    />
                </View>

                {/* Activity Graph */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Weekly Activity</Text>
                    <ActivityGraph data={user.weeklyActivity} labels={weeklyLabels} />
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
                            <Text style={styles.versionText}>Version {Constants.expoConfig?.version}</Text>
                        </View>
                    </View>
                </View>

                {/* dev Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Developer Options</Text>
                    <View style={styles.sectionContent}>
                        <ActionItem
                            icon="trash"
                            title="Delete Async Storage"
                            onPress={async () => {
                                await AsyncStorage.clear();
                                await resetStats();
                                Alert.alert("Async Storage cleared, please restart the app");
                            }}
                        />
                    </View>

                    <View style={styles.separator} />

                    <ActionItem
                        icon="alert"
                        title="Go to Onboarding"
                        onPress={async () => {
                            router.push('/(onboarding)');
                        }}
                    />

                    <View style={styles.separator} />
                    <ActionItem
                        icon="text"
                        title="Add gemini key"
                        onPress={async () => {
                            Alert.prompt("Add gemini key", "Add your gemini key", [
                                {
                                    text: "Cancel",
                                    onPress: () => console.log("Cancel Pressed"),
                                    style: "cancel",
                                },
                                {
                                    text: "OK",
                                    onPress: (value?: string) => {
                                        if (value) {
                                            setGeminiKey(value);
                                        }
                                    },
                                },
                            ]);
                        }}
                    />

                    <View style={styles.separator} />
                    <Text style={{ color: Colors.text, fontSize: 12, marginTop: 10, marginLeft: 10, marginRight: 10, marginBottom: 10 }}>Gemini Key: {geminiKey}</Text>
                </View>

            </ScrollView>

            <EditNameModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                onSave={(newName) => {
                    setUsername(newName);
                    setEditModalVisible(false);
                }}
                initialName={username}
            />
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
    userNameContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    editIcon: {
        marginLeft: 10,

    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 20,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: Colors.backgroundLighter,
    },
    saveButton: {
        backgroundColor: Colors.tint,
    },
    cancelButtonText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonText: {
        color: Colors.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
});


