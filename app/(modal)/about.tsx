import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AboutScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const openLink = (url: string) => {
        Linking.openURL(url);
    };

    return (
        <View style={[styles.container, { paddingBottom: Platform.OS === "android" && insets.bottom > 0 ? insets.bottom : 0 }]}>
            {/* Fixed Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* App Logo Section */}
                <View style={styles.logoSection}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="school" size={48} color={Colors.tint} />
                    </View>
                    <Text style={styles.appName}>DoomStudy</Text>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.description}>
                        DoomStudy helps you kill doomscrolling by turning it into productive study sessions.
                        Reclaim your time and master your courses.
                    </Text>
                </View>

                {/* Info Cards */}
                <View style={styles.section}>
                    <View style={styles.infoCard}>
                        <View style={styles.infoIconContainer}>
                            <Ionicons name="rocket" size={24} color={Colors.tint} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>AI Powered</Text>
                            <Text style={styles.infoText}>
                                Generate flashcards and summaries instantly with advanced AI models.
                            </Text>
                        </View>

                    </View>

                    <View style={styles.infoCard}>
                        <View style={styles.infoIconContainer}>
                            <Ionicons name="shield-checkmark" size={24} color={Colors.tint} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>Privacy First</Text>
                            <Text style={styles.infoText}>
                                Your notes and study data are stored securely on your device.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={styles.infoIconContainer}>
                            <Ionicons name="time" size={24} color={Colors.tint} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>Track Progress</Text>
                            <Text style={styles.infoText}>
                                Visualize your time reclaimed and keep your study streak alive.
                            </Text>
                        </View>
                    </View>


                </View>

                {/* Links Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resources</Text>

                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.linkItem}
                            onPress={() => openLink("https://github.com/jalalfatouakii/doomstudy")}
                            activeOpacity={0.7}
                        >
                            <View style={styles.linkLeft}>
                                <Ionicons name="logo-github" size={22} color={Colors.text} />
                                <Text style={styles.linkText}>GitHub</Text>
                            </View>
                            <Ionicons name="open-outline" size={20} color={Colors.tabIconDefault} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkItem}
                            onPress={() => openLink("mailto:contact@doomstudy.app")}
                            activeOpacity={0.7}
                        >
                            <View style={styles.linkLeft}>
                                <Ionicons name="mail-outline" size={22} color={Colors.text} />
                                <Text style={styles.linkText}>Contact Support</Text>
                            </View>
                            <Ionicons name="open-outline" size={20} color={Colors.tabIconDefault} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkItem}
                            onPress={() => openLink("https://ko-fi.com/jixiolz")}
                            activeOpacity={0.7}
                        >
                            <View style={styles.linkLeft}>
                                <Ionicons name="heart" size={22} color={Colors.text} />
                                <View style={styles.linkTextContainer}>
                                    <Text style={styles.linkText}>Support me !</Text>
                                    <Text style={styles.subLinkText}>
                                        Buy me a coffee and help keep DoomStudy free :D
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="open-outline" size={20} color={Colors.tabIconDefault} />
                        </TouchableOpacity>
                    </View>
                </View>



                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Made by Jalal Fatouaki :P</Text>
                    <Text style={styles.copyright}>© 2026 DoomStudy. All rights reserved.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 35 : 16,
        paddingBottom: 16,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.backgroundSecondary,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    logoSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    logoContainer: {
        width: 96,
        height: 96,
        borderRadius: 24,
        backgroundColor: Colors.backgroundSecondary, // Changed to secondary background for visibility
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: Colors.tint + '40', // Tint with opacity
    },
    appName: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 4,
    },
    section: {
        marginBottom: 32,
    },
    description: {
        fontSize: 16,
        color: Colors.tabIconDefault,
        lineHeight: 24,
        textAlign: 'center',
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
        gap: 16,
    },
    infoIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.tint + '20', // Tint with 20% opacity
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        flex: 1,
        gap: 4,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    infoText: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 16,
    },
    card: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
        overflow: 'hidden',
    },
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.backgroundLighter,
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    linkTextContainer: {
        flex: 1,
        gap: 4,
    },
    linkText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    footerText: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        fontWeight: '500',
    },
    copyright: {
        fontSize: 12,
        color: Colors.tabIconDefault,
    },
    subLinkText: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        lineHeight: 16,
    },
});
