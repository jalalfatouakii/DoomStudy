import { Colors } from "@/constants/colors";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";


const { width } = Dimensions.get("window");

const CATEGORIES = [
  { id: 1, title: "For You" },
  { id: 2, title: "Specific Courses" },
];

const COURSES = [
  { id: 1, title: "Course 1" },
  { id: 2, title: "Course 2" },
  { id: 3, title: "Course 3" },
  { id: 4, title: "Course 4" },
  { id: 5, title: "Course 5" },
];

const generateData = (categoryId: number) =>
  Array.from({ length: 10 }).map((_, i) => ({
    id: `${categoryId} -${i} `,
    content: `Course ${categoryId} - Content ${i + 1} `,
  }));

export default function Index() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemHeight, setItemHeight] = useState(0);
  const mainListRef = useRef<FlatList>(null);
  const headerListRef = useRef<FlatList>(null);


  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      headerListRef.current?.scrollToIndex({ index: newIndex, animated: true, viewPosition: 0.5 });
    }
  };

  const onHeaderPress = (index: number) => {
    setActiveIndex(index);
    mainListRef.current?.scrollToIndex({ index, animated: true });
    headerListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  };

  const renderVerticalItem = ({ item }: { item: { content: string } }) => (
    <View style={[styles.verticalItem, { height: itemHeight }]}>
      <Text style={{ color: Colors.text }}>{item.content}</Text>
    </View>
  );

  const renderCourseItem = ({ item }: { item: { title: string } }) => (
    <TouchableOpacity style={styles.courseItem}>
      <Text style={styles.courseText}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderCategoryPage = ({ item: category }: { item: typeof CATEGORIES[0] }) => {
    if (category.title === "Specific Courses") {
      return (
        <View style={{ width, height: "100%", paddingTop: 100 }}>
          <FlatList
            data={COURSES}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCourseItem}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>
      );
    }

    const data = generateData(category.id);
    return (
      <View style={{ width, height: "100%" }}>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderVerticalItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onLayout={(e) => setItemHeight(e.nativeEvent.layout.height)}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <FlatList
          ref={headerListRef}
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.headerContent}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => onHeaderPress(index)}
              style={styles.headerItem}
            >
              <Text
                style={[
                  styles.headerText,
                  activeIndex === index && styles.headerTextActive,
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Main Horizontal Pager */}
      <FlatList
        ref={mainListRef}
        data={CATEGORIES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCategoryPage}
        onMomentumScrollEnd={onMomentumScrollEnd}
        initialNumToRender={1}
        windowSize={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    position: "absolute",
    top: Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 50,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 50,
  },
  headerContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerItem: {
    marginHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  headerText: {
    color: Colors.text,
    opacity: 0.6,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTextActive: {
    opacity: 1,
    fontSize: 17,
    fontWeight: "bold",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  activeIndicator: {
    width: 20,
    height: 3,
    backgroundColor: Colors.text,
    position: "absolute",
    bottom: 5,
    borderRadius: 2,
  },
  verticalItem: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
  courseItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundSecondary,
    backgroundColor: Colors.backgroundLighter, // Assuming you might have this or similar
    marginBottom: 10,
    borderRadius: 10,
  },
  courseText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "500",
  }
});