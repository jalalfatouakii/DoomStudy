import GeminiKeyModal from "@/components/GeminiKeyModal";
import PdfTextExtractor from "@/components/PdfTextExtractor";
import ProcessingModal from "@/components/ProcessingModal";
import { Colors } from "@/constants/colors";
import { useCourses } from "@/context/CourseContext";
import { generateSnippets } from "@/utils/gemini";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

type FileState = {
    id: string; // Temp ID for UI management
    name: string;
    size: string;
    uri?: string;
    parsedText?: string;
    isNew?: boolean; // Track if file was added in this session
};

export default function EditCourse() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { courses, updateCourse, deleteCourse } = useCourses();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [files, setFiles] = useState<FileState[]>([]);

    // PDF & parsing state
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [currentParsingFileId, setCurrentParsingFileId] = useState<string | null>(null);
    const [viewingTextFileId, setViewingTextFileId] = useState<string | null>(null);

    // AI Integration State
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [geminiKey, setGeminiKey] = useState<string | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [generationStatus, setGenerationStatus] = useState("");

    // Processing Modal State
    const [processingVisible, setProcessingVisible] = useState(false);
    const [processingTitle, setProcessingTitle] = useState("");
    const [processingStep, setProcessingStep] = useState("");
    const [processingStatus, setProcessingStatus] = useState("");
    const [processingProgress, setProcessingProgress] = useState<number | undefined>(undefined);

    useEffect(() => {
        checkGeminiKey();
    }, []);

    const checkGeminiKey = async () => {
        const key = await AsyncStorage.getItem("geminiKey");
        if (key) {
            setGeminiKey(key);
        }
        // Don't auto-show modal in Edit unless they try to use AI, or assume they have it if they have content. 
        // We'll leave it as passive check.
    };

    const handleKeySaved = (key: string) => {
        setGeminiKey(key);
    };


    useEffect(() => {
        const course = courses.find(c => c.id === id);
        if (course) {
            setTitle(course.title);
            setDescription(course.description);
            setTags(course.tags);
            // Map existing files to FileState with isNew: false
            setFiles(course.files.map((f, index) => ({
                id: `existing-${index}`,
                name: f.name,
                size: f.size,
                uri: f.uri,
                parsedText: f.parsedText,
                isNew: false
            })));
        }
    }, [id, courses]);

    const handleAddTag = () => {
        if (tagInput.trim()) {
            setTags([...tags, tagInput.trim()]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const handleRemoveFile = (id: string) => {
        setFiles(files.filter(f => f.id !== id));
        if (viewingTextFileId === id) setViewingTextFileId(null);
    };

    const filepicker = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                type: "application/pdf",
                multiple: true  // Enable multiple file selection
            });

            if (result.canceled) return;

            // Add all selected files to the queue and process the first one
            const newFiles = result.assets.map(asset => ({
                id: Date.now().toString() + Math.random().toString(),
                name: asset.name,
                size: `${(asset.size ? asset.size / 1024 / 1024 : 0).toFixed(2)} MB`,
                uri: asset.uri,
                isNew: true
            }));

            setFiles(prev => [...prev, ...newFiles]);

            // Process the first file immediately
            if (newFiles.length > 0) {
                const firstFile = newFiles[0];

                setProcessingVisible(true);
                setProcessingTitle("Reading Files");
                setProcessingStep("Processing PDF");
                setProcessingStatus(`Parsing ${firstFile.name}...`);
                setProcessingProgress(undefined);

                setIsParsing(true);
                setCurrentParsingFileId(firstFile.id);

                const file = new FileSystem.File(firstFile.uri);
                const base64 = await file.base64();
                setPdfBase64(base64);
            }

        } catch (error) {
            console.error("Error picking file:", error);
            setIsParsing(false);
            setProcessingVisible(false);
            setCurrentParsingFileId(null);
        }
    }

    const handlePdfExtracted = (text: string) => {
        console.log("Extracted Text Length:", text.length);
        if (currentParsingFileId) {
            setFiles(prev => prev.map(f =>
                f.id === currentParsingFileId ? { ...f, parsedText: text } : f
            ));
        }

        setIsParsing(false);
        setCurrentParsingFileId(null);
        setPdfBase64(null); // Reset after extraction

        // Check if there are more files to process
        setTimeout(async () => {
            setFiles(currentFiles => {
                // Find the next file that doesn't have parsedText yet
                const nextFile = currentFiles.find(f => !f.parsedText);

                if (nextFile) {
                    // Process the next file - keep modal open
                    setProcessingTitle("Reading Files");
                    setProcessingStep("Processing PDF");
                    setProcessingStatus(`Parsing ${nextFile.name}...`);
                    setProcessingProgress(undefined);

                    setIsParsing(true);
                    setCurrentParsingFileId(nextFile.id);

                    // Read the next file
                    const file = new FileSystem.File(nextFile.uri!);
                    file.base64().then(base64 => {
                        setPdfBase64(base64);
                    }).catch(error => {
                        console.error(`Error processing ${nextFile.name}:`, error);
                        setIsParsing(false);
                        setProcessingVisible(false);
                        setCurrentParsingFileId(null);
                    });
                } else {
                    // No more files to process - NOW we can close the modal
                    setProcessingVisible(false);
                }

                return currentFiles;
            });
        }, 100); // Small delay to ensure state updates properly
    };

    const handlePdfError = (error: string) => {
        console.error("PDF Extraction Error:", error);
        setIsParsing(false);
        setProcessingVisible(false);
        setCurrentParsingFileId(null);
        setPdfBase64(null);
        Alert.alert("Error", "Failed to extract text from PDF.");
    };


    const handleUpdate = async () => {
        if (!title.trim() || !id) return;

        // Logic for AI generation on NEW files
        const existingCourse = courses.find(c => c.id === id);
        let currentAiSnippets = existingCourse?.aiSnippets ? [...existingCourse.aiSnippets] : [];

        // 1. Clean up snippets from deleted files
        // We only keep snippets if their sourceFileName matches one of the current files (by name)
        // OR if they don't have a sourceFileName (legacy snippets)
        const currentFileNames = new Set(files.map(f => f.name));

        currentAiSnippets = currentAiSnippets.filter(snippetStr => {
            try {
                const parsed = JSON.parse(snippetStr);
                // If snippet has a source file tag, check if that file still exists
                if (parsed.sourceFileName) {
                    return currentFileNames.has(parsed.sourceFileName);
                }
                // If it doesn't have a tag, keep it (legacy data safety)
                return true;
            } catch (e) {
                // Keep malformed strings to avoid data loss, or drop them? Let's keep.
                return true;
            }
        });

        // Identify new files that have content
        const newFilesWithContent = files.filter(f => f.isNew && f.parsedText && f.parsedText.trim().length > 0);

        // Check if we can generate AI content (either online or offline mode)
        const modePreference = await AsyncStorage.getItem("modelModePreference");
        const currentMode = modePreference === 'offline' ? 'offline' : 'online';
        let canGenerateAI = false;

        if (currentMode === 'offline') {
            const offlineModel = await AsyncStorage.getItem("selectedOfflineModel");
            const downloadedModelsStr = await AsyncStorage.getItem("downloadedOfflineModels");
            const downloadedModels = downloadedModelsStr ? JSON.parse(downloadedModelsStr) : [];
            canGenerateAI = !!offlineModel && downloadedModels.includes(offlineModel);
        } else {
            canGenerateAI = !!geminiKey;
        }

        if (newFilesWithContent.length > 0 && canGenerateAI) {
            setIsGeneratingAI(true);
            setProcessingVisible(true);
            setProcessingTitle("Updating Course");
            setProcessingStep("Generating AI Content");
            setProcessingStatus(`Using ${currentMode === 'offline' ? 'offline model' : 'Gemini'}...`);
            setProcessingProgress(0);

            try {
                const totalFiles = newFilesWithContent.length;
                for (let i = 0; i < totalFiles; i++) {
                    const file = newFilesWithContent[i];
                    setProcessingStatus(`Analyzing new file ${i + 1} of ${totalFiles}: ${file.name}...`);
                    setProcessingProgress(i / totalFiles);

                    try {
                        // Force non-null assertion because we filtered for parsedText above
                        const fileId = `${id}-${file.name}`;
                        // Use unified generateSnippets function which handles both online and offline modes
                        const snippets = await generateSnippets(file.parsedText!, geminiKey || '', 20, fileId);

                        // Tag newly generated snippets
                        const taggedSnippets = snippets.map(s => {
                            try {
                                const parsed = JSON.parse(s);
                                parsed.sourceFileName = file.name;
                                return JSON.stringify(parsed);
                            } catch (e) {
                                return s;
                            }
                        });

                        currentAiSnippets.push(...taggedSnippets);
                    } catch (err) {
                        console.error(`Error generating snippets for ${file.name}`, err);
                    }
                }
                setProcessingStatus("Finalizing course...");
                setProcessingProgress(1);
            } catch (error) {
                console.error("AI Generation in Edit failed:", error);
                Alert.alert("AI update failed", "Could not generate snippets for some files.");
            } finally {
                setIsGeneratingAI(false);
                setProcessingVisible(false);
            }
        } else if (newFilesWithContent.length > 0 && !geminiKey) {
            // New content but no key? Maybe prompt? 
            // For now, proceed without AI, maybe Alert user?
            // "You added files but no AI key is saved, so no new snippets will be generated."
        }

        await updateCourse(id, {
            title,
            description,
            tags,
            files: files.map(f => ({
                name: f.name,
                size: f.size,
                uri: f.uri,
                parsedText: f.parsedText
            })),
            aiSnippets: currentAiSnippets
        });

        setProcessingVisible(false);
        router.back();
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Course",
            "Are you sure you want to delete this course? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (id) {
                            await deleteCourse(id);
                            router.back();
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <PdfTextExtractor
                pdfBase64={pdfBase64}
                onExtract={handlePdfExtracted}
                onError={handlePdfError}
            />

            <GeminiKeyModal
                visible={showKeyModal}
                onClose={() => setShowKeyModal(false)}
                onSave={handleKeySaved}
            />

            <ProcessingModal
                visible={processingVisible}
                title={processingTitle}
                step={processingStep}
                status={processingStatus}
                progress={processingProgress}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.container}
            >
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="close" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Course</Text>
                    <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={24} color="#ff4444" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Details</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Course Title"
                            placeholderTextColor={Colors.tabIconDefault}
                            value={title}
                            onChangeText={setTitle}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Description (Optional)"
                            placeholderTextColor={Colors.tabIconDefault}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tags</Text>
                        <View style={styles.tagInputWrapper}>
                            <TextInput
                                style={styles.tagInput}
                                placeholder="Add a tag..."
                                placeholderTextColor={Colors.tabIconDefault}
                                value={tagInput}
                                onChangeText={setTagInput}
                                onSubmitEditing={handleAddTag}
                            />
                            <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
                                <Ionicons name="add" size={20} color={Colors.background} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.tagsContainer}>
                            {tags.map((tag, index) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveTag(index)}>
                                        <Ionicons name="close" size={14} color={Colors.text} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Materials</Text>
                        <TouchableOpacity style={styles.uploadCard} onPress={filepicker}>
                            <View style={styles.uploadIconContainer}>
                                <Ionicons name="cloud-upload" size={24} color={Colors.tint} />
                            </View>
                            <View>
                                <Text style={styles.uploadTitle}>Upload Files</Text>
                                <Text style={styles.uploadSubtitle}>PDF, DOCX, PPTX up to 10MB</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Old Parsing Text Removed */}

                        {files.map((file, index) => (
                            <View key={file.id} style={styles.fileItem}>
                                <View style={styles.fileIcon}>
                                    <Ionicons name="document-text" size={20} color={Colors.tint} />
                                </View>
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileName}>{file.name}</Text>
                                    <Text style={styles.fileSize}>{file.size}</Text>
                                    {file.parsedText && (
                                        <TouchableOpacity onPress={() => setViewingTextFileId(viewingTextFileId === file.id ? null : file.id)}>
                                            <Text style={styles.viewTextLink}>
                                                {viewingTextFileId === file.id ? "Hide Text" : "View Extracted Text"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveFile(file.id)} style={styles.removeFileBtn}>
                                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {viewingTextFileId && (
                            <View style={styles.extractedTextContainer}>
                                <Text style={styles.extractedTextTitle}>Extracted Content:</Text>
                                <Text style={styles.extractedTextContent}>
                                    {files.find(f => f.id === viewingTextFileId)?.parsedText}
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.createButton} onPress={handleUpdate}>
                        <Text style={styles.createButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.backgroundSecondary,
        backgroundColor: Colors.background,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.text,
    },
    backButton: {
        padding: 4,
    },
    deleteButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 15,
        marginLeft: 4,
    },
    input: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "transparent",
    },
    textArea: {
        height: 120,
        textAlignVertical: "top",
        paddingTop: 16,
    },
    tagInputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        paddingRight: 8,
        marginBottom: 12,
    },
    tagInput: {
        flex: 1,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
    },
    addTagButton: {
        backgroundColor: Colors.tint,
        padding: 8,
        borderRadius: 10,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 100,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: Colors.backgroundSecondary,
    },
    tagText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: "500",
    },
    uploadCard: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        borderWidth: 1,
        borderColor: Colors.backgroundSecondary,
        borderStyle: "dashed",
        marginBottom: 16,
    },
    uploadIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.backgroundLighter,
        alignItems: "center",
        justifyContent: "center",
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 4,
    },
    uploadSubtitle: {
        fontSize: 13,
        color: Colors.tabIconDefault,
    },
    parsingContainer: {
        padding: 12,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
    },
    parsingText: {
        color: Colors.tint,
        fontSize: 14,
        fontWeight: '500',
    },
    fileItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.backgroundSecondary,
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: Colors.backgroundLighter,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 14,
        fontWeight: "500",
        color: Colors.text,
        marginBottom: 2,
    },
    fileSize: {
        fontSize: 12,
        color: Colors.tabIconDefault,
    },
    viewTextLink: {
        color: Colors.tint,
        fontSize: 12,
        marginTop: 4,
        textDecorationLine: 'underline',
    },
    removeFileBtn: {
        padding: 8,
    },
    extractedTextContainer: {
        marginTop: 8,
        padding: 12,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 8,
        marginBottom: 16,
    },
    extractedTextTitle: {
        color: Colors.text,
        fontWeight: 'bold',
        marginBottom: 8,
        fontSize: 14,
    },
    extractedTextContent: {
        color: Colors.tabIconDefault,
        fontSize: 12,
        lineHeight: 18,
    },
    footer: {
        paddingHorizontal: 20,
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: Colors.backgroundSecondary,
    },
    createButton: {
        backgroundColor: Colors.tint,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: Colors.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    createButtonText: {
        color: Colors.background,
        fontSize: 16,
        fontWeight: "bold",
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    loadingText: {
        color: Colors.text,
        marginTop: 20,
        fontSize: 18,
        fontWeight: "600",
    },
});
