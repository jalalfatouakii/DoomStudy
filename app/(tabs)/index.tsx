import { Colors } from "@/constants/colors";
import { Course, useCourses } from "@/context/CourseContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
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

const generateData = (categoryId: string) =>
  Array.from({ length: 10 }).map((_, i) => ({
    id: `${categoryId}-${i}`,
    content: `Content for ${categoryId} - Item ${i + 1}`,
  }));

export default function Index() {
  const router = useRouter();
  const { courses, allTags } = useCourses();
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemHeight, setItemHeight] = useState(0);
  const mainListRef = useRef<FlatList>(null);
  const headerListRef = useRef<FlatList>(null);

  const categories = useMemo(() => {
    const base = [
      { id: "for-you", title: "For You" },
      { id: "specific-courses", title: "Specific Courses" },
    ];
    const tagCategories = allTags.map(tag => ({ id: `tag-${tag}`, title: tag }));
    return [...base, ...tagCategories];
  }, [allTags]);

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

  const renderCourseItem = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.courseItem}
      onPress={() => router.push({ pathname: "/course/[id]", params: { id: item.id } })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.courseDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.tagsRow}>
          {item.tags.map((tag, idx) => (
            <View key={idx} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          router.push({ pathname: "/(modal)/edit", params: { id: item.id } });
        }}
        style={styles.editButton}
      >
        <View style={styles.editButtonContainer}>
          <Ionicons name="pencil" size={18} color={Colors.text} />
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCategoryPage = ({ item: category }: { item: typeof categories[0] }) => {
    if (category.id === "specific-courses") {
      return (
        <View style={{ width, height: "100%", paddingTop: 100 }}>
          {courses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No courses yet. Add one!</Text>
            </View>
          ) : (
            <FlatList
              data={courses}
              keyExtractor={(item) => item.id}
              renderItem={renderCourseItem}
              contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
            />
          )}
        </View>
      );
    }

    // For "For You" and Tags, show dummy vertical content
    const data = generateData(category.title);
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
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
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
        data={categories}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryPage}
        onMomentumScrollEnd={onMomentumScrollEnd}
        initialNumToRender={1}
        windowSize={2}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            mainListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
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
  verticalItem: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
  courseItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundSecondary,
    backgroundColor: Colors.backgroundLighter,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  courseTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  courseDescription: {
    color: Colors.tabIconDefault,
    fontSize: 14,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    backgroundColor: Colors.tint + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: Colors.tint,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: Colors.tabIconDefault,
    fontSize: 16,
  },
  editButtonContainer: {
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 8,
  },
});