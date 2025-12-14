import SnippetCard from "@/components/SnippetCard";
import { Colors } from "@/constants/colors";
import { ContentSnippet, Course, useCourses } from "@/context/CourseContext";
import { useTabPress } from "@/hooks/useTabPress";
import { SnippetType } from "@/utils/contentExtractor";
import { generateSnippets } from "@/utils/gemini";
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


import NativeAdCard from "@/components/NativeAdCard"; // [NEW]

const { width } = Dimensions.get("window");
const INITIAL_LOAD = 20;
const LOAD_MORE_COUNT = 10;
const GENERATION_THRESHOLD = 10;
const AD_INTERVAL = 15; // [NEW]

// Helper to inject ads every AD_INTERVAL items
const enrichWithAds = (items: ContentSnippet[]): ContentSnippet[] => {
  const contentOnly = items.filter(i => i.type !== 'ad');
  const result: ContentSnippet[] = [];

  contentOnly.forEach((item, index) => {
    result.push(item);
    // Inject ad after every AD_INTERVAL items
    if ((index + 1) % AD_INTERVAL === 0) {
      result.push({
        id: `ad-mob-${index}-${Date.now()}`,
        type: 'ad',
        content: 'Sponsored',
        courseId: 'sponsored',
        courseName: 'Sponsored',
        fileName: '',
        tags: []
      });
    }
  });

  return result;
};

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
  const isGeneratingMoreRef = useRef<Record<string, boolean>>({}); // Ref for immediate lock

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
      [categoryId]: enrichWithAds(newSnippets),
    }));

    // Update list key to force FlatList recreation
    setListKeys(prev => ({
      ...prev,
      [categoryId]: (prev[categoryId] || 0) + 1,
    }));

    setRefreshing(prev => ({ ...prev, [categoryId]: false }));
  };

  const generateMoreAiContent = async (categoryId: string) => {
    if (isGeneratingMoreRef.current[categoryId]) return;

    const key = await AsyncStorage.getItem("geminiKey");
   // Check mode preference and required model availability
        const modePreference = await AsyncStorage.getItem("modelModePreference");
        const currentMode = modePreference === 'offline' ? 'offline' : 'online';
    if (currentMode !== 'offline' && !key) {
      return;
    }

    isGeneratingMoreRef.current[categoryId] = true;
    setIsGeneratingMore(prev => ({ ...prev, [categoryId]: true }));
    console.log(`Generating more AI content for ${categoryId}...`);

    try {
      // Pick courses to generate content from
      let candidateCourses = courses;
      if (categoryId.startsWith("tag-")) {
        const tag = categories.find(c => c.id === categoryId)?.title;
        if (tag) {
          candidateCourses = courses.filter(c => c.tags.includes(tag));
        }
      }

      if (candidateCourses.length === 0) return;

      // Gather all 'valid' files from these courses
      const allFiles: { parsedText: string, courseId: string, courseName: string, fileName: string, tags: string[] }[] = [];

      candidateCourses.forEach(course => {
        course.files.forEach(f => {
          if (f.parsedText && f.parsedText.trim().length > 0) {
            allFiles.push({
              parsedText: f.parsedText,
              courseId: course.id,
              courseName: course.title,
              fileName: f.name,
              tags: course.tags
            });
          }
        });
      });

      if (allFiles.length === 0) return;

      // Shuffle files to ensure variety if we have many
      const shuffledFiles = allFiles.sort(() => 0.5 - Math.random());

      // We want ~20 snippets total
      const TOTAL_SNIPPETS_TARGET = 20;

      // Limit to max 10 files to avoid too many parallel requests, 
      // but try to use as many as possible to be "from all files"
      const maxFilesToUse = Math.min(shuffledFiles.length, 10);
      const targetFiles = shuffledFiles.slice(0, maxFilesToUse);

      const snippetsPerFile = Math.max(1, Math.floor(TOTAL_SNIPPETS_TARGET / targetFiles.length));

      // Generate content for each selected file SEQUENTIALLY with delays
      // This prevents rate limiting and shows snippets as they're generated
      for (let i = 0; i < targetFiles.length; i++) {
        const file = targetFiles[i];

        try {
          const fileId = `${file.courseId}-${file.fileName}`;
          const fileSnippets = await generateSnippets(file.parsedText, key, snippetsPerFile, fileId);

          const newContentSnippets: ContentSnippet[] = [];

          fileSnippets.forEach((snippetStr, idx) => {
            let type: SnippetType = 'text';
            let content = snippetStr;
            let answer = undefined;
            let label = undefined;

            try {
              const parsed = JSON.parse(snippetStr);
              if (parsed && typeof parsed === 'object' && parsed.content) {
                type = parsed.type || 'text';
                content = parsed.content;
                answer = parsed.answer;
                label = parsed.label;
              }
            } catch (e) {
              // fallback
            }

            newContentSnippets.push({
              id: `${file.courseId}-${file.fileName}-ai-gen-${Date.now()}-${idx}-${Math.random()}`,
              type,
              content,
              answer,
              label,
              courseId: file.courseId,
              courseName: file.courseName,
              fileName: file.fileName,
              tags: file.tags
            });
          });

          // Update UI immediately with new snippets from this file
          if (newContentSnippets.length > 0) {
            setCategorySnippets(prev => ({
              ...prev,
              [categoryId]: enrichWithAds([...(prev[categoryId] || []), ...newContentSnippets])
            }));
          }

          // Add delay between files to avoid rate limiting (except after last file)
          if (i < targetFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // 1 second delay
          }
        } catch (err) {
          console.error(`Failed to generate for file ${file.fileName}`, err);
          // Continue to next file even if this one fails
        }
      }

    } catch (error) {
      console.error("Error generating infinite AI content:", error);
    } finally {
      isGeneratingMoreRef.current[categoryId] = false;
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

    setCategorySnippets(prev => {
      const currentSnippets = prev[categoryId] || [];
      const currentIds = new Set(currentSnippets.map(s => s.id));

      const uniqueMoreSnippets = moreSnippets.filter(s => !currentIds.has(s.id));

      if (uniqueMoreSnippets.length === 0) return prev;

      return {
        ...prev,
        [categoryId]: enrichWithAds([...currentSnippets, ...uniqueMoreSnippets]),
      };
    });
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

  const renderSnippetItem = useCallback(({ item }: { item: ContentSnippet }) => {
    if (item.type === 'ad') {
      return (
        <View style={[styles.verticalItem, { height: itemHeight }]}>
          <NativeAdCard height={itemHeight ? itemHeight * 0.5 : undefined} />
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.verticalItem, { height: itemHeight }]}
        onPress={() => router.push({ pathname: "/course/[id]", params: { id: item.courseId, snippetId: item.id } })}
        activeOpacity={0.9}
      >
        <SnippetCard snippet={item} height={itemHeight ? itemHeight * 0.85 : undefined} />
      </TouchableOpacity>
    );
  }, [itemHeight, router]);

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
                <Text style={{ color: Colors.tabIconDefault, marginTop: 8, fontSize: 12 }}>Generating new snippets...</Text>
              </View>
            ) : null
          }
        // onViewableItemsChanged removed to optimize AI generation triggers
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
    paddingTop: 120,
    paddingBottom: 30,
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