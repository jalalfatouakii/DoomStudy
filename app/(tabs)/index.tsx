import { Colors } from "@/constants/colors";
import { ScrollView, StyleSheet, Text, View } from "react-native";
export default function Index() {
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height: 1000 }}>
          <Text style={{ color: Colors.text }}>Scroll me</Text>
        </View>

      </ScrollView>
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