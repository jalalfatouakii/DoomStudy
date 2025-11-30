import { Colors } from "@/constants/colors";
import { StyleSheet, Text, View } from "react-native";

export default function Settings() {
    return (
        <View style={styles.container}>
            <Text style={{ color: Colors.text }}>Settings</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        height: "100%",
        width: "100%",
    },
});
