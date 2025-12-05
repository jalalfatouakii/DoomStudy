import { Colors } from "@/constants/colors";
import { ContentSnippet, Course, useCourses } from "@/context/CourseContext";
import { useTabPress } from "@/hooks/useTabPress";
import { generateSnippetsWithGemini } from "@/utils/gemini";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken
} from "react-native";


const { width } = Dimensions.get("window");
const INITIAL_LOAD = 20;
const LOAD_MORE_COUNT = 10;
const GENERATION_THRESHOLD = 10; // Generate more when user reaches this index

export default function Index() {
  const router = useRouter();
  const { courses, allTags, getRandomSnippets } = useCourses();
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemHeight, setItemHeight] = useState(0);
  const mainListRef = useRef<FlatList>(null);
  const headerListRef = useRef<FlatList>(null);
  const verticalListRefs = useRef<Record<string, FlatList | null>>({});

  // Store snippets for each category
  const [categorySnippets, setCategorySnippets] = useState<Record<string, ContentSnippet[]>>({});
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [listKeys, setListKeys] = useState<Record<string, number>>({});

  // AI Generation State
  const [isGeneratingMore, setIsGeneratingMore] = useState<Record<string, boolean>>({});

  const categories = useMemo(() => {
    const base = [
      { id: "for-you", title: "For You" },
      { id: "specific-courses", title: "Specific Courses" },
    ];
    const tagCategories = allTags.map(tag => ({ id: `tag-${tag}`, title: tag }));
    return [...base, ...tagCategories];
  }, [allTags]);

  // Load initial snippets for all categories
  useEffect(() => {
    const initialSnippets: Record<string, ContentSnippet[]> = {};

    categories.forEach(cat => {
      if (cat.id === "specific-courses") return;

      if (cat.id === "for-you") {
        initialSnippets[cat.id] = getRandomSnippets(INITIAL_LOAD);
      } else if (cat.id.startsWith("tag-")) {
        const tag = cat.title;
        initialSnippets[cat.id] = getRandomSnippets(INITIAL_LOAD, [tag]);
      }
    });

    setCategorySnippets(initialSnippets);
  }, [courses, categories]);

  // Listen for home button press to refresh "For You"
  useTabPress("home", () => {
    if (activeIndex === 0) { // "For You" is at index 0
      const forYouCategory = categories[0];
      refreshSnippets(forYouCategory.id);
    }
  });

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      headerListRef.current?.scrollToIndex({ index: newIndex, animated: true, viewPosition: 0.5 });
    }
  };

  const onHeaderPress = (index: number) => {
    const category = categories[index];

    // If pressing the already active tab, refresh the snippets
    if (index === activeIndex && category.id !== "specific-courses") {
      refreshSnippets(category.id);
    }

    setActiveIndex(index);
    mainListRef.current?.scrollToIndex({ index, animated: true });
    headerListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  };

  const refreshSnippets = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category || category.id === "specific-courses") return;

    setRefreshing(prev => ({ ...prev, [categoryId]: true }));

    // Simulate a brief delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));

    let newSnippets: ContentSnippet[] = [];
    if (category.id === "for-you") {
      newSnippets = getRandomSnippets(INITIAL_LOAD);
    } else if (category.id.startsWith("tag-")) {
      const tag = category.title;
      newSnippets = getRandomSnippets(INITIAL_LOAD, [tag]);
    }

    setCategorySnippets(prev => ({
      ...prev,
      [categoryId]: newSnippets,
    }));

    // Update list key to force FlatList recreation
    setListKeys(prev => ({
      ...prev,
      [categoryId]: (prev[categoryId] || 0) + 1,
    }));

    setRefreshing(prev => ({ ...prev, [categoryId]: false }));
  };

  const generateMoreAiContent = async (categoryId: string) => {
    if (isGeneratingMore[categoryId]) return;

    const key = await AsyncStorage.getItem("geminiKey");
    if (!key) return; // No key, no AI generation

    setIsGeneratingMore(prev => ({ ...prev, [categoryId]: true }));
    console.log(`Generating more AI content for ${categoryId}...`);

    try {
      // Pick a random course to generate content from
      // If category is a tag, pick a course with that tag
      let candidateCourses = courses;
      if (categoryId.startsWith("tag-")) {
        const tag = categories.find(c => c.id === categoryId)?.title;
        if (tag) {
          candidateCourses = courses.filter(c => c.tags.includes(tag));
        }
      }

      if (candidateCourses.length === 0) return;

      const randomCourse = candidateCourses[Math.floor(Math.random() * candidateCourses.length)];

      // Combine text from files
      const allText = randomCourse.files
        .map(f => f.parsedText || "")
        .join("\n\n");

      if (!allText.trim()) return;

      const newAiSnippets = await generateSnippetsWithGemini(allText, key);

      if (newAiSnippets.length > 0) {
        const newContentSnippets: ContentSnippet[] = newAiSnippets.map((text, idx) => ({
          id: `${randomCourse.id}-ai-gen-${Date.now()}-${idx}`,
          text,
          courseId: randomCourse.id,
          courseName: randomCourse.title,
          fileName: "AI Generated (Infinite)",
          tags: randomCourse.tags
        }));

        setCategorySnippets(prev => ({
          ...prev,
          [categoryId]: [...(prev[categoryId] || []), ...newContentSnippets]
        }));
      }

    } catch (error) {
      console.error("Error generating infinite AI content:", error);
    } finally {
      setIsGeneratingMore(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  const loadMoreSnippets = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category || category.id === "specific-courses") return;

    let moreSnippets: ContentSnippet[] = [];
    if (category.id === "for-you") {
      moreSnippets = getRandomSnippets(LOAD_MORE_COUNT);
    } else if (category.id.startsWith("tag-")) {
      const tag = category.title;
      moreSnippets = getRandomSnippets(LOAD_MORE_COUNT, [tag]);
    }

    setCategorySnippets(prev => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), ...moreSnippets],
    }));
  };

  const onViewableItemsChanged = useCallback(({ viewableItems, changed }: { viewableItems: ViewToken[], changed: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const lastItem = viewableItems[viewableItems.length - 1];
      if (lastItem.index !== null) {
        // Check if we passed a multiple of 10 (e.g., 10, 20, 30...)
        // Actually, simpler: if index is high enough relative to list length, or just every 10 items
        // The user said "if the user is at the index 10 for example"

        // Let's check if we are near the end, OR if we hit a specific index
        // To avoid spamming, we can check if index % 10 === 0

        // However, viewableItems fires often.
        // Better approach: Check if (index + threshold) >= currentLength, then load more.
        // AND specifically for AI, if we have a key, we trigger generation.

        // Let's stick to the user's request: "generate 20 new if the user is at the index 10"
        // This implies a trigger point.

        // We need the category ID. But this callback doesn't have it directly if defined outside.
        // We can define it inside renderCategoryPage or use a curried function.
      }
    }
  }, []);

  const renderSnippetItem = useCallback(({ item }: { item: ContentSnippet }) => (
    <TouchableOpacity
      style={[styles.verticalItem, { height: itemHeight }]}
      onPress={() => router.push({ pathname: "/course/[id]", params: { id: item.courseId, snippetId: item.id } })}
    >
      <View style={styles.snippetCard}>
        <Text style={styles.snippetText} numberOfLines={20}>{item.text}</Text>
        <View style={styles.snippetMeta}>
          <Text style={styles.metaText} numberOfLines={1}>📚 {item.courseName}</Text>
          <Text style={styles.metaText} numberOfLines={1}>📄 {item.fileName}</Text>
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), [itemHeight, router]);

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

    // For content feeds
    const snippets = categorySnippets[category.id] || [];

    if (courses.length === 0) {
      return (
        <View style={{ width, height: "100%", justifyContent: "center", alignItems: "center" }}>
          <Text style={styles.emptyStateText}>No courses yet. Add one to see content!</Text>
        </View>
      );
    }

    if (snippets.length === 0) {
      return (
        <View style={{ width, height: "100%", justifyContent: "center", alignItems: "center" }}>
          <Text style={styles.emptyStateText}>No content found for this tag.</Text>
        </View>
      );
    }

    return (
      <View style={{ width, height: "100%" }}>
        <FlatList
          key={`${category.id}-${listKeys[category.id] || 0}`}
          ref={(ref) => { verticalListRefs.current[category.id] = ref; }}
          data={snippets}
          keyExtractor={(item) => item.id}
          renderItem={renderSnippetItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onLayout={(e) => setItemHeight(e.nativeEvent.layout.height)}
          onEndReached={() => {
            loadMoreSnippets(category.id);
            // Also try to generate AI content if we are running low or just periodically
            // But onEndReached is good for "infinite scroll"
            // Let's also trigger AI generation here if not already generating
            generateMoreAiContent(category.id);
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing[category.id] || false}
              onRefresh={() => refreshSnippets(category.id)}
              tintColor={Colors.tint}
              title="Pull to refresh"
              titleColor={Colors.tint}
            />
          }
          ListFooterComponent={
            isGeneratingMore[category.id] ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.tint} />
                <Text style={{ color: Colors.tabIconDefault, marginTop: 8, fontSize: 12 }}>Generating fresh insights...</Text>
              </View>
            ) : null
          }
          onViewableItemsChanged={({ viewableItems }) => {
            // Optional: Trigger generation at specific index if needed, 
            // but onEndReached is usually more robust for infinite scroll.
            // The user asked for "if the user is at the index 10".
            // We can check this here.
            if (viewableItems.length > 0) {
              const lastIndex = viewableItems[0].index;
              if (lastIndex !== null && lastIndex > 0 && lastIndex % 10 === 0) {
                generateMoreAiContent(category.id);
              }
            }
          }}
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
    paddingTop: 80,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  snippetCard: {
    justifyContent: "space-between",
    backgroundColor: Colors.backgroundLighter,
    borderRadius: 16,
    padding: 24,
    width: width * 0.9,
    maxHeight: "90%",
  },
  snippetText: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 32,
    marginBottom: 20,
    flexShrink: 1,
  },
  snippetMeta: {
    gap: 6,
    flexShrink: 0,
  },
  metaText: {
    color: Colors.tabIconDefault,
    fontSize: 13,
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