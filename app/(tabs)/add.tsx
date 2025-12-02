import { Colors } from "@/constants/colors";
import { useCourses } from "@/context/CourseContext";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
    const [files, setFiles] = useState<{ name: string, size: string }[]>([]);

    const handleAddTag = () => {
        if (tagInput.trim()) {
            setTags([...tags, tagInput.trim()]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const handleUploadFile = () => {
        // Mock file upload
        const newFile = {
            name: `document_${files.length + 1}.pdf`,
            size: "2.5 MB"
        };
        setFiles([...files, newFile]);
    };


    const handleRemoveFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleCreate = async () => {
        if (!title.trim()) return; // Basic validation

        await addCourse({
            title,
            description,
            tags,
            files
        });

        // Reset form and close modal
        setTitle("");
        setDescription("");
        setTags([]);
        setFiles([]);
        router.back();
    };

    const filepicker = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: "application/pdf" });
            console.log(result);

            const uri = result.assets?.[0]?.uri;
            console.log(uri);

            const file = new File(uri || "");
            console.log(file);
            console.log(file.textSync());

        } catch (error) {
            console.error(error);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
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
                        <TouchableOpacity style={styles.uploadCard} onPress={handleUploadFile}>
                            <View style={styles.uploadIconContainer}>
                                <Ionicons name="cloud-upload" size={24} color={Colors.tint} />
                            </View>
                            <View>
                                <Text style={styles.uploadTitle}>Upload Files</Text>
                                <Text style={styles.uploadSubtitle}>PDF, DOCX, PPTX up to 10MB</Text>
                            </View>
                        </TouchableOpacity>

                        {files.map((file, index) => (
                            <View key={index} style={styles.fileItem}>
                                <View style={styles.fileIcon}>
                                    <Ionicons name="document-text" size={20} color={Colors.tint} />
                                </View>
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileName}>{file.name}</Text>
                                    <Text style={styles.fileSize}>{file.size}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveFile(index)} style={styles.removeFileBtn}>
                                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>


                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Upload test</Text>
                        <TouchableOpacity style={styles.uploadCard} onPress={filepicker}>
                            <View style={styles.uploadIconContainer}>
                                <Ionicons name="cloud-upload" size={24} color={Colors.tint} />
                            </View>
                            <View>
                                <Text style={styles.uploadTitle}>Upload Files</Text>
                                <Text style={styles.uploadSubtitle}>PDF, DOCX, PPTX up to 10MB</Text>
                            </View>
                        </TouchableOpacity>



                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                        <Text style={styles.createButtonText}>Create Course</Text>
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
    removeFileBtn: {
        padding: 8,
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
});