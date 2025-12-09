import GeminiKeyModal from "@/components/GeminiKeyModal";
import PdfTextExtractor from "@/components/PdfTextExtractor";
import ProcessingModal from "@/components/ProcessingModal";
import { Colors } from "@/constants/colors";
import { useCourses } from "@/context/CourseContext";
import { generateSnippetsWithGemini } from "@/utils/gemini";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from "expo-router";
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
import {
    SafeAreaView
} from 'react-native-safe-area-context';


export default function AddCourse() {
    const router = useRouter();
    const { addCourse } = useCourses();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");

    // Updated files state to hold more info
    const [files, setFiles] = useState<{
        id: string,
        name: string,
        size: string,
        uri: string,
        parsedText?: string
    }[]>([]);

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
        } else {
            // Show modal if no key found on first load (optional logic, or just show it)
            // For now, let's show it if it's the first time visiting add page? 
            // Or just show it. The user requested "if its the first time the user opens the add page"
            // We can check a separate flag for "hasSeenKeyPrompt" if needed, but checking key existence is simpler.
            setShowKeyModal(true);
        }
    };

    const handleKeySaved = (key: string) => {
        setGeminiKey(key);
    };

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

    const handleCreate = async () => {
        if (!title.trim()) {
            Alert.alert("Please enter a title.");
            return;
        } // Basic validation

        // Require at least one file with parsed text
        const hasValidFile = files.some(f => f.parsedText && f.parsedText.trim().length > 0);
        if (!hasValidFile) {
            Alert.alert("Please add at least one PDF file with content before creating a course.");
            return;
        }

        let aiSnippets: string[] = [];

        if (geminiKey) {
            setIsGeneratingAI(true);
            setProcessingVisible(true);
            setProcessingTitle("Creating Course");
            setProcessingStep("Generating AI Content");
            setProcessingStatus("Preparing content...");
            setProcessingProgress(0);

            try {
                // Process each file individually
                const totalFiles = files.length;
                for (let i = 0; i < totalFiles; i++) {
                    const file = files[i];
                    if (!file.parsedText || file.parsedText.trim().length === 0) continue;

                    setProcessingStatus(`Analyzing file ${i + 1} of ${totalFiles}: ${file.name}...`);
                    setProcessingProgress(i / totalFiles);

                    try {
                        const fileSnippets = await generateSnippetsWithGemini(file.parsedText, geminiKey);

                        // Tag snippets with the source filename so we can delete them later if the file is removed
                        const taggedSnippets = fileSnippets.map(s => {
                            try {
                                const parsed = JSON.parse(s);
                                parsed.sourceFileName = file.name;
                                return JSON.stringify(parsed);
                            } catch (e) {
                                return s;
                            }
                        });

                        aiSnippets.push(...taggedSnippets);
                    } catch (err) {
                        console.error(`Failed to generate snippets for ${file.name}:`, err);
                        // Continue with other files even if one fails
                    }
                }

                setProcessingStatus("Finalizing course...");
                setProcessingProgress(1);
            } catch (error) {
                console.error("AI Generation failed:", error);
                Alert.alert("AI Generation Failed", "Course will be created without AI snippets.");
            } finally {
                setIsGeneratingAI(false);
                setProcessingVisible(false); // Hide it immediately or wait a beat? Immediate is fine for now.
            }
        }

        await addCourse({
            title,
            description,
            tags,
            files: files.map(f => ({
                name: f.name,
                size: f.size,
                uri: f.uri,
                parsedText: f.parsedText
            })),
            aiSnippets
        });

        // Reset form and close modal
        setTitle("");
        setDescription("");
        setTags([]);
        setFiles([]);
        setProcessingVisible(false);
        router.back();
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
                uri: asset.uri
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

            // Auto-append to description if it's empty or user wants it (optional, for now just append)
            // setDescription(prev => prev + (prev ? "\n\n" : "") + `--- Content from ${files.find(f => f.id === currentParsingFileId)?.name} ---\n` + text);
        }

        setIsParsing(false);
        setProcessingVisible(false);
        setCurrentParsingFileId(null);
        setPdfBase64(null); // Reset after extraction

        // Check if there are more files to process
        setTimeout(async () => {
            setFiles(currentFiles => {
                // Find the next file that doesn't have parsedText yet
                const nextFile = currentFiles.find(f => !f.parsedText);

                if (nextFile) {
                    // Process the next file
                    setProcessingVisible(true);
                    setProcessingTitle("Reading Files");
                    setProcessingStep("Processing PDF");
                    setProcessingStatus(`Parsing ${nextFile.name}...`);
                    setProcessingProgress(undefined);

                    setIsParsing(true);
                    setCurrentParsingFileId(nextFile.id);

                    // Read the next file
                    const file = new FileSystem.File(nextFile.uri);
                    file.base64().then(base64 => {
                        setPdfBase64(base64);
                    }).catch(error => {
                        console.error(`Error processing ${nextFile.name}:`, error);
                        setIsParsing(false);
                        setProcessingVisible(false);
                        setCurrentParsingFileId(null);
                    });
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
                    <Text style={styles.headerTitle}>Add a Course</Text>
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

                        {files.map((file) => (
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
                    <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                        <Text style={styles.createButtonText}>
                            {geminiKey ? "Create Course & Generate AI Content" : "Create Course"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.backgroundSecondary,
        backgroundColor: Colors.background,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
        textAlign: "center",
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