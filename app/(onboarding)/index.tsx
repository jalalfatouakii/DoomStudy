import { useRouter } from "expo-router";
import { Button, Text, View } from "react-native";

export default function Onboarding() {
    const router = useRouter();
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text>Onboarding</Text>
            <Button title="Next" onPress={() => router.push("/(tabs)")} />
        </View>
    );
}