import { Colors } from "@/constants/colors";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function Index() {
  const [itemHeight, setItemHeight] = useState(0);

  const listOfScrollableContent = [
    {
      id: 1,
      content: "text1",
    },
    {
      id: 2,
      content: "text2",
    },
    {
      id: 3,
      content: "text3",
    },
    {
      id: 4,
      content: "text4",
    },
    {
      id: 5,
      content: "text5",
    },
    {
      id: 6,
      content: "text6",
    },
    {
      id: 7,
      content: "text7",
    },
    {
      id: 8,
      content: "text8",
    },
    {
      id: 9,
      content: "text9",
    },
    {
      id: 10,
      content: "text10",
    },
    {
      id: 11,
      content: "text11",
    },
    {
      id: 12,
      content: "text12",
    },
    {
      id: 13,
      content: "text13",
    },
    {
      id: 14,
      content: "text14",
    },
    {
      id: 15,
      content: "text15",
    },
    {
      id: 16,
      content: "text16",
    },
    {
      id: 17,
      content: "text17",
    },
    {
      id: 18,
      content: "text18",
    },
    {
      id: 19,
      content: "text19",
    },
    {
      id: 20,
      content: "text20",
    },
  ];


  return (
    <View style={styles.container}>
      <FlatList
        data={listOfScrollableContent}
        keyExtractor={(item) => item.id.toString()}
        onLayout={(e) => setItemHeight(e.nativeEvent.layout.height)}
        renderItem={({ item }) => (
          <View style={[styles.item, { height: itemHeight }]}>
            <Text style={{ color: Colors.text }}>{item.content}</Text>
          </View>
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        style={styles.scrollContainer}
      />
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
  item: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    // Removed margins to ensure perfect paging
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    height: "100%",
    width: "100%",
  },
});