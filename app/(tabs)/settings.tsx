
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as WebBrowser from 'expo-web-browser';
import {
    Alert,
    Animated,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCourses } from "@/context/CourseContext";
import { BuiltInVideoCategoryId, usePreferences, UserVideo, UserVideoCategory } from "@/context/PreferencesContext";
import { useStats } from "@/context/StatsContext";
import { pickVideoSource } from "@/utils/videoImport";
import { mlc } from "@react-native-ai/mlc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateText } from "ai";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import ColorPicker, { HueSlider, OpacitySlider, Panel1, Preview, Swatches } from 'reanimated-color-picker';

// Lazy import Apple AI only on iOS
let apple: any = null;
const getAppleAI = async () => {
    if (Platform.OS !== 'ios') {
        return null;
    }
    if (!apple) {
        try {
            apple = require("@react-native-ai/apple").apple;
        } catch (e) {
            console.warn("Apple AI not available:", e);
            return null;
        }
    }
    return apple;
};

const EditNameModal = ({ visible, onClose, onSave, initialName }: { visible: boolean, onClose: () => void, onSave: (name: string) => void, initialName: string }) => {
    const [name, setName] = useState(initialName);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setName(initialName);
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, initialName]);

    const animateClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };


    const handleSave = () => {
        onSave(name);
        animateClose();
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={animateClose}
            animationType="none"
        >
            <TouchableWithoutFeedback onPress={animateClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <Animated.View style={[styles.modalContent, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
                            <Text style={styles.modalTitle}>Edit Name</Text>
                            <Text style={styles.modalSubtitle}>Enter your new name</Text>

                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your Name"
                                placeholderTextColor={Colors.tabIconDefault}
                                autoFocus
                                selectionColor={Colors.tint}
                            />

                            <View style={styles.modalButtons}>
                                <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={animateClose}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </Pressable>
                                <Pressable style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </Pressable>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};


const MODELS = [
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' }
];

const BASE_OFFLINE_MODELS = [
    { id: 'Qwen2.5-0.5B-Instruct', name: 'Qwen 2.5 0.5B', size: '600 MB', description: 'Fast responses, basic conversations', provider: 'mlc' },
    { id: 'Llama-3.2-1B-Instruct', name: 'Llama 3.2 1B', size: '1.2 GB', description: 'Balanced performance and quality', provider: 'mlc' },
    { id: 'Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B', size: '2 GB', description: 'High-quality responses, complex reasoning', provider: 'mlc' },
    { id: 'Phi-3.5-mini-instruct', name: 'Phi 3.5 Mini', size: '2.3 GB', description: 'Code generation, technical tasks', provider: 'mlc' },
];

const getOfflineModels = () => {
    const models = [...BASE_OFFLINE_MODELS];

    // Add Apple AI if available (only on iOS)
    if (Platform.OS === 'ios') {
        try {
            const appleAI = require("@react-native-ai/apple").apple;
            if (appleAI && appleAI.isAvailable && appleAI.isAvailable()) {
                models.unshift({
                    id: 'apple-intelligence',
                    name: 'Apple Intelligence',
                    size: 'Built-in',
                    description: 'Native Apple AI (iOS 18+)',
                    provider: 'apple'
                });
            }
        } catch (e) {
            // Apple AI not available, skip
        }
    }

    return models;
};



const SNIPPET_TYPES = [
    { id: 'fact', name: 'Fact', label: 'Interesting Facts', description: 'Did you know...?' },
    { id: 'concept', name: 'Concept', label: 'Key Concepts', description: 'Defined simply' },
    { id: 'qna', name: 'Q&A', label: 'Q&A Format', description: 'Question and Answer' },
    { id: 'true_false', name: 'True/False', label: 'True or False', description: 'With explanation' },
];

type DownloadState = { status: 'idle' | 'downloading' | 'downloaded' | 'preparing', progress: number };

// Model List Modal - Shows when clicking on selected model
const ModelListModal = ({ visible, onClose, mode, selectedModel, selectedOfflineModel, onModelSelect, onOfflineModelSelect, onOfflineModelsUpdate }: {
    visible: boolean,
    onClose: () => void,
    mode: 'online' | 'offline',
    selectedModel: string,
    selectedOfflineModel: string | null,
    onModelSelect: (modelId: string) => void,
    onOfflineModelSelect: (modelId: string) => void,
    onOfflineModelsUpdate: () => void
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});
    const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
    const downloadCancelRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        if (visible) {
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
            if (mode === 'offline') {
                checkDownloadedModels();
            }
        }
    }, [visible, mode]);

    const checkDownloadedModels = async () => {
        const states: Record<string, DownloadState> = {};
        const downloadedModelsStr = await AsyncStorage.getItem('downloadedOfflineModels');
        const downloadedModels = downloadedModelsStr ? JSON.parse(downloadedModelsStr) : [];

        for (const model of getOfflineModels()) {
            // Apple AI is always available (no download needed)
            if (model.id === 'apple-intelligence') {
                states[model.id] = {
                    status: 'downloaded',
                    progress: 1
                };
            } else {
                const isDownloaded = downloadedModels.includes(model.id);
                states[model.id] = {
                    status: isDownloaded ? 'downloaded' : 'idle',
                    progress: isDownloaded ? 1 : 0
                };
            }
        }
        setDownloadStates(states);
    };

    const handleStopDownload = (modelId: string) => {
        downloadCancelRef.current[modelId] = true;
        setDownloadStates(prev => ({
            ...prev,
            [modelId]: { status: 'idle', progress: 0 }
        }));
        if (downloadingModelId === modelId) {
            setDownloadingModelId(null);
        }
    };

    const handleDownload = async (modelId: string) => {
        // Apple AI doesn't need to be downloaded
        if (modelId === 'apple-intelligence') {
            Alert.alert("Info", "Apple Intelligence is built-in and doesn't need to be downloaded.");
            return;
        }

        if (downloadStates[modelId]?.status === 'downloading' || downloadStates[modelId]?.status === 'preparing') {
            return;
        }

        downloadCancelRef.current[modelId] = false;
        setDownloadingModelId(modelId);
        setDownloadStates(prev => ({
            ...prev,
            [modelId]: { status: 'downloading', progress: 0 }
        }));

        let progressInterval: ReturnType<typeof setInterval> | null = null;
        const downloadStartTime = Date.now();
        try {
            const languageModel = mlc.languageModel(modelId);

            // Simulate progress updates during download with time-based estimation
            // Progress slows down as it approaches 85% to be more realistic
            progressInterval = setInterval(() => {
                if (downloadCancelRef.current[modelId]) {
                    if (progressInterval) clearInterval(progressInterval);
                    return;
                }

                // Time-based progress that slows down exponentially
                const elapsed = Date.now() - downloadStartTime;
                // Estimate: small models ~30s, large models ~120s
                // Use exponential curve that approaches 85% but never quite reaches it
                const estimatedDuration = 60000; // 60 seconds estimate
                const progressValue = Math.min(0.85 * (1 - Math.exp(-elapsed / (estimatedDuration * 0.5))), 0.85);

                setDownloadStates(prev => ({
                    ...prev,
                    [modelId]: { status: 'downloading', progress: progressValue }
                }));
            }, 300); // Update every 300ms for smoother progress

            // Download the model
            await languageModel.download();

            if (progressInterval) clearInterval(progressInterval);

            // Immediately set to 85% when download completes
            setDownloadStates(prev => ({
                ...prev,
                [modelId]: { status: 'downloading', progress: 0.85 }
            }));

            if (downloadCancelRef.current[modelId]) {
                setDownloadStates(prev => ({
                    ...prev,
                    [modelId]: { status: 'idle', progress: 0 }
                }));
                setDownloadingModelId(null);
                return;
            }

            setDownloadStates(prev => ({
                ...prev,
                [modelId]: { status: 'preparing', progress: 0.9 }
            }));

            await languageModel.prepare();

            if (downloadCancelRef.current[modelId]) {
                setDownloadStates(prev => ({
                    ...prev,
                    [modelId]: { status: 'idle', progress: 0 }
                }));
                setDownloadingModelId(null);
                return;
            }

            const downloadedModelsStr = await AsyncStorage.getItem('downloadedOfflineModels');
            const downloadedModels = downloadedModelsStr ? JSON.parse(downloadedModelsStr) : [];
            if (!downloadedModels.includes(modelId)) {
                downloadedModels.push(modelId);
                await AsyncStorage.setItem('downloadedOfflineModels', JSON.stringify(downloadedModels));
            }

            setDownloadStates(prev => ({
                ...prev,
                [modelId]: { status: 'downloaded', progress: 1 }
            }));

            Alert.alert("Success", `Model ${getOfflineModels().find(m => m.id === modelId)?.name} downloaded and ready!`);
            onOfflineModelsUpdate();
        } catch (error) {
            if (progressInterval) clearInterval(progressInterval);
            if (!downloadCancelRef.current[modelId]) {
                console.error(`Error downloading model ${modelId}:`, error);
                Alert.alert("Error", `Failed to download model: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setDownloadStates(prev => ({
                    ...prev,
                    [modelId]: { status: 'idle', progress: 0 }
                }));
            }
        } finally {
            if (downloadingModelId === modelId) {
                setDownloadingModelId(null);
            }
            delete downloadCancelRef.current[modelId];
        }
    };

    const handleDelete = async (modelId: string) => {
        // Apple AI cannot be deleted
        if (modelId === 'apple-intelligence') {
            Alert.alert("Info", "Apple Intelligence is built-in and cannot be deleted.");
            return;
        }

        Alert.alert(
            "Delete Model",
            `Are you sure you want to delete ${getOfflineModels().find(m => m.id === modelId)?.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const languageModel = mlc.languageModel(modelId);
                            await languageModel.remove();

                            const downloadedModelsStr = await AsyncStorage.getItem('downloadedOfflineModels');
                            const downloadedModels = downloadedModelsStr ? JSON.parse(downloadedModelsStr) : [];
                            const updatedModels = downloadedModels.filter((id: string) => id !== modelId);
                            await AsyncStorage.setItem('downloadedOfflineModels', JSON.stringify(updatedModels));

                            // If the deleted model was selected, select another available model
                            const currentSelected = await AsyncStorage.getItem("selectedOfflineModel");
                            if (currentSelected === modelId) {
                                if (updatedModels.length > 0) {
                                    // Select the first available downloaded model
                                    await AsyncStorage.setItem("selectedOfflineModel", updatedModels[0]);
                                    onOfflineModelSelect(updatedModels[0]);
                                } else {
                                    // No models available, clear selection
                                    await AsyncStorage.removeItem("selectedOfflineModel");
                                    onOfflineModelSelect('');
                                }
                            }

                            setDownloadStates(prev => ({
                                ...prev,
                                [modelId]: { status: 'idle', progress: 0 }
                            }));
                            onOfflineModelsUpdate();
                            Alert.alert("Success", "Model deleted successfully");
                        } catch (error) {
                            console.error(`Error deleting model ${modelId}:`, error);
                            Alert.alert("Error", "Failed to delete model");
                        }
                    }
                }
            ]
        );
    };

    const animateClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const handleSelectOnlineModel = (modelId: string) => {
        onModelSelect(modelId);
        animateClose();
    };

    const handleSelectOfflineModel = (modelId: string) => {
        onOfflineModelSelect(modelId);
        animateClose();
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={animateClose}
            animationType="none"
        >
            <Pressable style={styles.modalOverlay} onPress={animateClose}>
                <Animated.View
                    style={[styles.modelListCard, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}
                    onStartShouldSetResponder={() => true}
                >
                    <Text style={styles.modalTitle}>
                        {mode === 'online' ? 'Select Online Model' : 'Select Offline Model'}
                    </Text>

                    {mode === 'online' ? (
                        <>
                            {MODELS.map((model) => (
                                <TouchableOpacity
                                    key={model.id}
                                    style={[
                                        styles.modelOption,
                                        selectedModel === model.id && styles.selectedModelOption
                                    ]}
                                    onPress={() => handleSelectOnlineModel(model.id)}
                                >
                                    <Text style={[
                                        styles.modelOptionText,
                                        selectedModel === model.id && styles.selectedModelOptionText
                                    ]}>
                                        {model.name}
                                    </Text>
                                    {selectedModel === model.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={Colors.tint} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </>
                    ) : (
                        <>
                            {getOfflineModels().map((model) => {
                                const state = downloadStates[model.id] || { status: 'idle' as const, progress: 0 };
                                const isDownloading = state.status === 'downloading' || state.status === 'preparing';
                                const isDownloaded = state.status === 'downloaded';
                                const isAppleAI = model.id === 'apple-intelligence';

                                return (
                                    <View key={model.id}>
                                        <TouchableOpacity
                                            style={[
                                                styles.offlineModelItem,
                                                selectedOfflineModel === model.id && styles.selectedOfflineModelItem
                                            ]}
                                            onPress={() => (isDownloaded || isAppleAI) && handleSelectOfflineModel(model.id)}
                                            disabled={!isDownloaded && !isAppleAI}
                                        >
                                            <View style={styles.offlineModelInfo}>
                                                <Text style={styles.offlineModelName}>{model.name}</Text>
                                                <Text style={styles.offlineModelSize}>~{model.size}</Text>

                                                {isDownloading && !isAppleAI && (
                                                    <View style={styles.downloadingContainer}>
                                                        <Text style={styles.downloadingText}>
                                                            {state.status === 'preparing' ? 'Preparing...' : `Downloading... ${Math.round(state.progress * 100)}%`}
                                                        </Text>
                                                        {state.status === 'downloading' && (
                                                            <View style={styles.progressBarContainer}>
                                                                <View style={[styles.progressBar, { width: `${state.progress * 100}%` }]} />
                                                            </View>
                                                        )}
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.offlineModelRight}>
                                                {isDownloaded && !isAppleAI ? (
                                                    <TouchableOpacity
                                                        style={styles.deleteButton}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(model.id);
                                                        }}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                                    </TouchableOpacity>
                                                ) : isDownloading ? (
                                                    <TouchableOpacity
                                                        style={styles.stopButton}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleStopDownload(model.id);
                                                        }}
                                                    >
                                                        <Ionicons name="stop-circle-outline" size={20} color="#ff4444" />
                                                    </TouchableOpacity>
                                                ) : !isAppleAI ? (
                                                    <TouchableOpacity
                                                        style={styles.downloadButton}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleDownload(model.id);
                                                        }}
                                                        disabled={downloadingModelId !== null}
                                                    >
                                                        <Ionicons name="cloud-download-outline" size={20} color={"black"} />
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </>
                    )}
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

// Main Model Preferences Modal
const ModelPreferencesModal = ({ visible, onClose, geminiKey, selectedModel, selectedOfflineModel, downloadedOfflineModels, savedModelMode, onGeminiKeySave, onModelSelect, onOfflineModelSelect, onOfflineModelsUpdate, onModelModeSave }: {
    visible: boolean,
    onClose: () => void,
    geminiKey: string,
    selectedModel: string,
    selectedOfflineModel: string | null,
    downloadedOfflineModels: string[],
    savedModelMode: 'online' | 'offline',
    onGeminiKeySave: (key: string) => void,
    onModelSelect: (modelId: string) => void,
    onOfflineModelSelect: (modelId: string) => void,
    onOfflineModelsUpdate: () => void,
    onModelModeSave: (mode: 'online' | 'offline') => void
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [mode, setMode] = useState<'online' | 'offline'>('online');
    const [tempGeminiKey, setTempGeminiKey] = useState(geminiKey);
    const [showModelList, setShowModelList] = useState(false);
    const [snippetCount, setSnippetCount] = useState(10);
    const [chunkSize, setChunkSize] = useState(mode === 'offline' ? 2000 : 30000);

    useEffect(() => {
        if (visible) {
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
            setTempGeminiKey(geminiKey);
            // Use saved mode preference, or default based on selected offline model
            setMode(savedModelMode || (selectedOfflineModel ? 'offline' : 'online'));

            // Load snippet count and chunk size
            AsyncStorage.getItem("snippetCount").then(val => {
                if (val) setSnippetCount(parseInt(val, 10));
            });
            AsyncStorage.getItem("snippetChunkSize").then(val => {
                if (val) setChunkSize(parseInt(val, 10));
                else setChunkSize(savedModelMode === 'offline' ? 2000 : 30000);
            });
        }
    }, [visible, geminiKey, selectedOfflineModel, savedModelMode]);

    const animateClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const handleSave = async () => {
        if (mode === 'online') {
            onGeminiKeySave(tempGeminiKey);
        }
        // Save snippet count and chunk size
        await AsyncStorage.setItem("snippetCount", snippetCount.toString());
        await AsyncStorage.setItem("snippetChunkSize", chunkSize.toString());
        animateClose();
    };

    const currentModelName = mode === 'online'
        ? (MODELS.find(m => m.id === selectedModel)?.name || selectedModel)
        : (selectedOfflineModel ? getOfflineModels().find(m => m.id === selectedOfflineModel)?.name || selectedOfflineModel : 'None selected');

    return (
        <>
            <Modal
                transparent
                visible={visible && !showModelList}
                onRequestClose={animateClose}
                animationType="none"
            >
                <Pressable style={styles.modalOverlay} onPress={animateClose}>
                    <Animated.View
                        style={[styles.modelPrefsCard, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <Text style={styles.modalTitle}>Model Preferences</Text>

                        {/* Mode Selection */}
                        <View style={styles.modeSelector}>
                            <TouchableOpacity
                                style={[styles.modeButton, mode === 'online' && styles.modeButtonActive]}
                                onPress={() => {
                                    setMode('online');
                                    onModelModeSave('online');
                                    // Update chunk size default for online mode
                                    AsyncStorage.getItem("snippetChunkSize").then(val => {
                                        if (!val) setChunkSize(30000);
                                    });
                                }}
                            >
                                <Ionicons name="cloud" size={20} color={mode === 'online' ? Colors.background : Colors.tabIconDefault} />
                                <Text style={[styles.modeButtonText, mode === 'online' && styles.modeButtonTextActive]}>Online</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeButton, mode === 'offline' && styles.modeButtonActive]}
                                onPress={() => {
                                    setMode('offline');
                                    onModelModeSave('offline');
                                    // Update chunk size default for offline mode
                                    AsyncStorage.getItem("snippetChunkSize").then(val => {
                                        if (!val) setChunkSize(2000);
                                    });
                                }}
                            >
                                <Ionicons name="phone-portrait" size={20} color={mode === 'offline' ? Colors.background : Colors.tabIconDefault} />
                                <Text style={[styles.modeButtonText, mode === 'offline' && styles.modeButtonTextActive]}>Offline</Text>
                            </TouchableOpacity>
                        </View>

                        {/* API Key Input - Only for online mode */}
                        {mode === 'online' && (
                            <>
                                <Text style={styles.sectionLabel}>Gemini API Key</Text>
                                <TextInput
                                    style={styles.input}
                                    value={tempGeminiKey}
                                    onChangeText={setTempGeminiKey}
                                    placeholder="Enter your Gemini API Key"
                                    placeholderTextColor={Colors.tabIconDefault}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    selectionColor={Colors.tint}
                                />
                            </>
                        )}

                        {/* Selected Model - Clickable */}
                        <Text style={[styles.sectionLabel]}>Selected Model</Text>
                        <TouchableOpacity
                            style={styles.selectedModelRow}
                            onPress={() => setShowModelList(true)}
                        >
                            <View>
                                <Text style={styles.selectedModelName}>{currentModelName}</Text>
                                <Text style={styles.selectedModelHint}>Tap to change</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={Colors.tabIconDefault} />
                        </TouchableOpacity>

                        {/* Snippet Settings */}
                        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Snippet Settings</Text>

                        {/* Snippet Count */}
                        <View style={styles.sliderContainer}>
                            <Text style={styles.sliderLabel}>Snippets per generation: {snippetCount}</Text>
                            <View style={styles.sliderRow}>
                                <Text style={styles.sliderMinMax}>1</Text>
                                <View style={styles.sliderWrapper}>
                                    <View style={styles.sliderTrack}>
                                        <View style={[styles.sliderFill, { width: `${((snippetCount - 1) / 9) * 100}%` }]} />
                                    </View>
                                </View>
                                <Text style={styles.sliderMinMax}>10</Text>
                            </View>
                            <View style={styles.sliderButtons}>
                                <TouchableOpacity
                                    style={[styles.sliderButton, snippetCount <= 1 && styles.sliderButtonDisabled]}
                                    onPress={() => setSnippetCount(Math.max(1, snippetCount - 1))}
                                    disabled={snippetCount <= 1}
                                >
                                    <Ionicons name="remove" size={20} color={snippetCount <= 1 ? Colors.tabIconDefault : Colors.tint} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.sliderInput}
                                    value={snippetCount.toString()}
                                    onChangeText={(text) => {
                                        const num = parseInt(text, 10);
                                        if (!isNaN(num) && num >= 1 && num <= 10) {
                                            setSnippetCount(num);
                                        }
                                    }}
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                                <TouchableOpacity
                                    style={[styles.sliderButton, snippetCount >= 10 && styles.sliderButtonDisabled]}
                                    onPress={() => setSnippetCount(Math.min(10, snippetCount + 1))}
                                    disabled={snippetCount >= 10}
                                >
                                    <Ionicons name="add" size={20} color={snippetCount >= 10 ? Colors.tabIconDefault : Colors.tint} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Chunk Size */}
                        <View style={styles.sliderContainer}>
                            <Text style={styles.sliderLabel}>Chunk Size: {chunkSize.toLocaleString()} chars</Text>
                            <View style={styles.sliderRow}>
                                <Text style={styles.sliderMinMax}>500</Text>
                                <View style={styles.sliderWrapper}>
                                    <View style={styles.sliderTrack}>
                                        <View style={[styles.sliderFill, { width: `${((chunkSize - 500) / 29500) * 100}%` }]} />
                                    </View>
                                </View>
                                <Text style={styles.sliderMinMax}>30K</Text>
                            </View>
                            <View style={styles.sliderButtons}>
                                <TouchableOpacity
                                    style={[styles.sliderButton, chunkSize <= 500 && styles.sliderButtonDisabled]}
                                    onPress={() => setChunkSize(Math.max(500, chunkSize - 500))}
                                    disabled={chunkSize <= 500}
                                >
                                    <Ionicons name="remove" size={20} color={chunkSize <= 500 ? Colors.tabIconDefault : Colors.tint} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.sliderInput}
                                    value={chunkSize.toString()}
                                    onChangeText={(text) => {
                                        const num = parseInt(text, 10);
                                        if (!isNaN(num) && num >= 500 && num <= 30000) {
                                            setChunkSize(num);
                                        }
                                    }}
                                    keyboardType="numeric"
                                    maxLength={5}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    style={[styles.sliderButton, chunkSize >= 30000 && styles.sliderButtonDisabled]}
                                    onPress={() => setChunkSize(Math.min(30000, chunkSize + 500))}
                                    disabled={chunkSize >= 30000}
                                >
                                    <Ionicons name="add" size={20} color={chunkSize >= 30000 ? Colors.tabIconDefault : Colors.tint} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={animateClose}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                                <Text style={styles.saveButtonText}>Save</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </Pressable>
            </Modal>

            <ModelListModal
                visible={visible && showModelList}
                onClose={() => setShowModelList(false)}
                mode={mode}
                selectedModel={selectedModel}
                selectedOfflineModel={selectedOfflineModel}
                onModelSelect={onModelSelect}
                onOfflineModelSelect={onOfflineModelSelect}
                onOfflineModelsUpdate={onOfflineModelsUpdate}
            />
        </>
    );
};


const OfflineModelTestModal = ({ visible, onClose, modelId }: {
    visible: boolean,
    onClose: () => void,
    modelId: string | null
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [inputText, setInputText] = useState("");
    const [outputText, setOutputText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (visible) {
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
            setInputText("");
            setOutputText("");
        }
    }, [visible]);

    const animateClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const handleTest = async () => {
        if (!modelId || !inputText.trim()) {
            Alert.alert("Error", "Please enter some text to test");
            return;
        }

        setIsGenerating(true);
        setOutputText("");

        try {
            const isAppleAI = modelId === 'apple-intelligence';

            if (isAppleAI) {
                const appleAI = await getAppleAI();
                if (!appleAI || !appleAI.isAvailable()) {
                    setOutputText("Error: Apple Intelligence is not available on this device");
                    setIsGenerating(false);
                    return;
                }
            }

            let languageModel;
            if (isAppleAI) {
                const appleAI = await getAppleAI();
                languageModel = appleAI!.languageModel();
            } else {
                languageModel = mlc.languageModel(modelId);
                // Ensure model is prepared
                await languageModel.prepare();
            }

            // Generate response using generateText from ai package
            const result = await generateText({
                model: languageModel as any,
                prompt: inputText,
            });

            setOutputText(result.text || "No response generated");
        } catch (error) {
            console.error("Error testing model:", error);
            setOutputText(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!visible) return null;

    const modelName = modelId ? getOfflineModels().find(m => m.id === modelId)?.name : "Unknown Model";

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={animateClose}
            animationType="none"
        >
            <TouchableWithoutFeedback onPress={animateClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <Animated.View style={[styles.testModalContent, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
                            <Text style={styles.modalTitle}>Test Model: {modelName}</Text>
                            <Text style={styles.modalSubtitle}>Enter text to test the model</Text>

                            <TextInput
                                style={styles.testInput}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Enter your prompt here..."
                                placeholderTextColor={Colors.tabIconDefault}
                                multiline
                                numberOfLines={4}
                                selectionColor={Colors.tint}
                                editable={!isGenerating}
                            />

                            <TouchableOpacity
                                style={[styles.testButton, isGenerating && styles.testButtonDisabled]}
                                onPress={handleTest}
                                disabled={isGenerating || !inputText.trim()}
                            >
                                {isGenerating ? (
                                    <Text style={styles.testButtonText}>Generating...</Text>
                                ) : (
                                    <Text style={styles.testButtonText}>Generate Response</Text>
                                )}
                            </TouchableOpacity>

                            {outputText ? (
                                <View style={styles.outputContainer}>
                                    <Text style={styles.outputLabel}>Response:</Text>
                                    <ScrollView style={styles.outputScrollView}>
                                        <Text style={styles.outputText}>{outputText}</Text>
                                    </ScrollView>
                                </View>
                            ) : null}

                            <TouchableOpacity style={[styles.cancelRedButton]} onPress={animateClose}>
                                <Text style={styles.cancelRedButtonText}>Close</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const SnippetTypesModal = ({ visible, onClose, onSave, selectedTypes }: {
    visible: boolean,
    onClose: () => void,
    onSave: (types: string[]) => void,
    selectedTypes: string[]
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [tempSelectedTypes, setTempSelectedTypes] = useState<string[]>(selectedTypes);

    useEffect(() => {
        if (visible) {
            setTempSelectedTypes(selectedTypes);
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, selectedTypes]);

    const animateClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const toggleType = (typeId: string) => {
        setTempSelectedTypes(prev => {
            if (prev.includes(typeId)) {
                // Don't allow deselecting if it's the last one
                if (prev.length === 1) {
                    return prev;
                }
                return prev.filter(t => t !== typeId);
            } else {
                return [...prev, typeId];
            }
        });
    };

    const handleSave = () => {
        onSave(tempSelectedTypes);
        animateClose();
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={animateClose}
            animationType="none"
        >
            <TouchableWithoutFeedback onPress={animateClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <Animated.View style={[styles.modalContent, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
                            <Text style={styles.modalTitle}>Snippet Types</Text>
                            <Text style={styles.modalSubtitle}>Select which types to generate</Text>

                            <View style={styles.checkboxList}>
                                {SNIPPET_TYPES.map((type) => {
                                    const isSelected = tempSelectedTypes.includes(type.id);
                                    return (
                                        <TouchableOpacity
                                            key={type.id}
                                            style={styles.checkboxItem}
                                            onPress={() => toggleType(type.id)}
                                        >
                                            <View style={styles.checkboxLeft}>
                                                <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                                                    {isSelected && (
                                                        <Ionicons name="checkmark" size={18} color={Colors.background} />
                                                    )}
                                                </View>
                                                <View style={styles.checkboxTextContainer}>
                                                    <Text style={styles.checkboxLabel}>{type.label}</Text>
                                                    <Text style={styles.checkboxDescription}>{type.description}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.modalButtons}>
                                <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={animateClose}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </Pressable>
                                <Pressable style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </Pressable>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const VIDEO_OPACITY_PRESETS = [0, 0.25, 0.5, 0.75, 1] as const;

// Helper function to convert rgba/rgb to hex
const colorToHex = (color: string): string => {
    // If already hex, return as is
    if (color.startsWith('#')) {
        return color;
    }

    // Handle rgba/rgb format
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1]);
        const g = parseInt(rgbaMatch[2]);
        const b = parseInt(rgbaMatch[3]);
        return `#${[r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('')}`;
    }

    // Default fallback
    return '#ECEDEE';
};

const AppearanceModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    const {
        snippetCardBackgroundOpacity,
        setSnippetCardBackgroundOpacity,
        snippetCardTextColor,
        setSnippetCardTextColor,
        snippetCardBackgroundColor,
        setSnippetCardBackgroundColor,
        videoBackgroundShowHeader,
        setVideoBackgroundShowHeader,
        videoBackgroundEnabled,
    } = usePreferences();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [tempOpacity, setTempOpacity] = useState(snippetCardBackgroundOpacity);
    const [tempTextColor, setTempTextColor] = useState(snippetCardTextColor);
    const [tempBgColor, setTempBgColor] = useState(snippetCardBackgroundColor);
    const [tempShowHeader, setTempShowHeader] = useState(videoBackgroundShowHeader);
    const [showTextColorPickerModal, setShowTextColorPickerModal] = useState(false);
    const [showBgColorPickerModal, setShowBgColorPickerModal] = useState(false);
    const [textColorPickerAnim] = useState(new Animated.Value(0));
    const [bgColorPickerAnim] = useState(new Animated.Value(0));
    const [pickerTextColor, setPickerTextColor] = useState(snippetCardTextColor);
    const [pickerBgColor, setPickerBgColor] = useState(snippetCardBackgroundColor);

    useEffect(() => {
        if (!visible) return;
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
        setTempOpacity(snippetCardBackgroundOpacity);
        setTempTextColor(snippetCardTextColor);
        setTempBgColor(snippetCardBackgroundColor);
        setTempShowHeader(videoBackgroundShowHeader);
        setShowTextColorPickerModal(false);
        setShowBgColorPickerModal(false);
    }, [visible, fadeAnim, snippetCardBackgroundOpacity, snippetCardTextColor, snippetCardBackgroundColor, videoBackgroundShowHeader]);

    // Handle text color picker modal animations
    useEffect(() => {
        if (showTextColorPickerModal) {
            textColorPickerAnim.setValue(0);
            Animated.timing(textColorPickerAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
            // Initialize picker color with current temp color
            setPickerTextColor(tempTextColor);
        }
    }, [showTextColorPickerModal]);

    // Handle background color picker modal animations
    useEffect(() => {
        if (showBgColorPickerModal) {
            bgColorPickerAnim.setValue(0);
            Animated.timing(bgColorPickerAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
            // Initialize picker color with current temp color
            setPickerBgColor(tempBgColor);
        }
    }, [showBgColorPickerModal]);


    const closeTextColorPicker = () => {
        Animated.timing(textColorPickerAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setShowTextColorPickerModal(false);
        });
    };

    const closeBgColorPicker = () => {
        Animated.timing(bgColorPickerAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setShowBgColorPickerModal(false);
        });
    };


    const handleTextColorComplete = ({ hex }: { hex: string }) => {
        // Only update pickerTextColor when user completes a selection (lets go)
        setPickerTextColor(hex);
    };

    const handleBgColorComplete = ({ hex }: { hex: string }) => {
        // Only update pickerBgColor when user completes a selection (lets go)
        setPickerBgColor(hex);
    };


    const saveTextColor = () => {
        setTempTextColor(pickerTextColor);
        closeTextColorPicker();
    };

    const saveBgColor = () => {
        setTempBgColor(pickerBgColor);
        closeBgColorPicker();
    };


    const cancelTextColorPicker = () => {
        setPickerTextColor(tempTextColor); // Reset to current temp color
        closeTextColorPicker();
    };

    const cancelBgColorPicker = () => {
        setPickerBgColor(tempBgColor); // Reset to current temp color
        closeBgColorPicker();
    };


    const animateClose = async () => {
        await setSnippetCardBackgroundOpacity(tempOpacity);
        await setSnippetCardTextColor(tempTextColor);
        await setSnippetCardBackgroundColor(tempBgColor);
        await setVideoBackgroundShowHeader(tempShowHeader);

        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} onRequestClose={animateClose} animationType="none">
            <View style={styles.modalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            opacity: fadeAnim,
                            transform: [
                                {
                                    scale: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.95, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>Appearance</Text>

                        {/* Preview */}
                        <View style={styles.previewCardOuter}>
                            <View style={styles.previewCard}>
                                <View
                                    style={[
                                        StyleSheet.absoluteFill,
                                        {
                                            backgroundColor: tempBgColor,
                                            opacity: tempOpacity,
                                            borderRadius: 20,
                                        },
                                    ]}
                                />
                                {tempShowHeader && (
                                    <View style={styles.previewHeader}>
                                        <View style={styles.previewIcon}>
                                            <Ionicons name="bulb" size={18} color={Colors.tint} />
                                        </View>
                                        <Text style={[styles.previewLabel, { color: tempTextColor }]}>Did You Know?</Text>
                                    </View>
                                )}
                                <Text style={[styles.previewText, { color: tempTextColor }]}>
                                    This is a preview of a snippet card. Your opacity and colors update live.
                                </Text>
                            </View>
                        </View>


                        {/* Header toggle */}
                        {videoBackgroundEnabled && (
                            <View style={styles.videoSettingsSection}>
                                <View style={styles.settingItem}>
                                    <View style={styles.settingLeft}>
                                        <View style={styles.iconContainer}>
                                            <Ionicons name="list" size={20} color={Colors.text} />
                                        </View>
                                        <Text style={styles.settingTitle}>Show snippet header</Text>
                                    </View>
                                    <Switch
                                        value={tempShowHeader}
                                        onValueChange={setTempShowHeader}
                                        trackColor={{ false: Colors.backgroundLighter, true: Colors.tint + '80' }}
                                        thumbColor={tempShowHeader ? Colors.tint : Colors.tabIconDefault}
                                    />
                                </View>
                            </View>
                        )}
                        {/* Text color */}
                        <View style={styles.videoSettingsSection}>
                            <Text style={styles.sectionHeader}>Text color (card & header)</Text>
                            <TouchableOpacity
                                style={styles.colorPickerButton}
                                onPress={() => setShowTextColorPickerModal(true)}
                            >
                                <View style={[styles.colorPreview, { backgroundColor: tempTextColor }]} />
                                <Text style={styles.colorPickerButtonText}>{tempTextColor}</Text>
                                <Ionicons name="color-palette-outline" size={20} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Background color */}
                        <View style={styles.videoSettingsSection}>
                            <Text style={styles.sectionHeader}>Background color</Text>
                            <TouchableOpacity
                                style={styles.colorPickerButton}
                                onPress={() => setShowBgColorPickerModal(true)}
                            >
                                <View style={[styles.colorPreview, { backgroundColor: tempBgColor }]} />
                                <Text style={styles.colorPickerButtonText}>{tempBgColor}</Text>
                                <Ionicons name="color-palette-outline" size={20} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={animateClose}>
                                <Text style={styles.cancelButtonText}>Done</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>

            {/* Text Color Picker Modal */}
            <Modal
                transparent
                visible={showTextColorPickerModal}
                onRequestClose={cancelTextColorPicker}
                animationType="none"
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={cancelTextColorPicker} />
                    <Animated.View
                        style={[
                            styles.colorPickerModalContent,
                            {
                                opacity: textColorPickerAnim,
                                transform: [
                                    {
                                        scale: textColorPickerAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.95, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.colorPickerModalHeader}>
                            <Text style={styles.modalTitle}>Select Text Color</Text>
                            <TouchableOpacity
                                onPress={cancelTextColorPicker}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ColorPicker
                            style={styles.colorPicker}
                            value={colorToHex(pickerTextColor)}
                            onCompleteJS={handleTextColorComplete}
                        >
                            <Preview style={{ marginBottom: 16 }} hideInitialColor={true} />
                            <Panel1 style={{ marginBottom: 16 }} thumbSize={24} />
                            <HueSlider style={{ marginBottom: 16 }} adaptSpectrum={true} thumbSize={24} />
                            <OpacitySlider style={{ marginBottom: 16 }} boundedThumb={true} adaptSpectrum={true} thumbSize={24} />
                            <Swatches
                                colors={['#ECEDEE', '#FFFFFF', '#000000', '#80F65C', '#FF9500', '#34C759', '#AF52DE']}

                            />
                        </ColorPicker>
                        <View style={styles.colorPickerModalButtons}>
                            <Pressable
                                style={styles.cancelColorButton}
                                onPress={cancelTextColorPicker}
                            >
                                <Text style={styles.cancelColorButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={styles.saveColorButton}
                                onPress={saveTextColor}
                            >
                                <Text style={styles.saveColorButtonText}>Save</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Background Color Picker Modal */}
            <Modal
                transparent
                visible={showBgColorPickerModal}
                onRequestClose={cancelBgColorPicker}
                animationType="none"
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={cancelBgColorPicker} />
                    <Animated.View
                        style={[
                            styles.colorPickerModalContent,
                            {
                                opacity: bgColorPickerAnim,
                                transform: [
                                    {
                                        scale: bgColorPickerAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.95, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.colorPickerModalHeader}>
                            <Text style={styles.modalTitle}>Select Background Color</Text>
                            <TouchableOpacity
                                onPress={cancelBgColorPicker}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ColorPicker
                            style={styles.colorPicker}
                            value={colorToHex(pickerBgColor)}
                            onCompleteJS={handleBgColorComplete}
                        >
                            <Preview style={{ marginBottom: 12 }} hideInitialColor={true} />
                            <Panel1 style={{ marginBottom: 12 }} thumbSize={24} />
                            <HueSlider style={{ marginBottom: 12 }} adaptSpectrum={true} thumbSize={24} />
                            <OpacitySlider style={{ marginBottom: 12 }} boundedThumb={true} adaptSpectrum={true} thumbSize={24} />
                            <Swatches
                                colors={['#1E2022', '#151718', '#000000', '#FFFFFF', '#ECEDEE', '#2C2C2E', '#3A3A3C']}
                                style={{ marginBottom: 12 }}
                            />
                        </ColorPicker>
                        <View style={styles.colorPickerModalButtons}>
                            <Pressable
                                style={styles.cancelColorButton}
                                onPress={cancelBgColorPicker}
                            >
                                <Text style={styles.cancelColorButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={styles.saveColorButton}
                                onPress={saveBgColor}
                            >
                                <Text style={styles.saveColorButtonText}>Save</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

        </Modal>
    );
};

const VideoBackgroundManagerModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    const {
        enabledVideoCategoryIds,
        setEnabledVideoCategoryIds,
        userVideoCategories,
        userVideos,
        addUserVideo,
        updateUserVideoMeta,
        replaceUserVideoFile,
        deleteUserVideo,
        createUserCategory,
        renameUserCategory,
        deleteUserCategory,
    } = usePreferences();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<UserVideoCategory | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showCreateCategory, setShowCreateCategory] = useState(false);

    const builtInCategories: { id: BuiltInVideoCategoryId; name: string }[] = [
        { id: 'gameplay', name: 'Gameplay' },
        { id: 'satisfying', name: 'Satisfying' },
        { id: 'narrated', name: 'Narrated Movies' },
        { id: 'ambient', name: 'Ambient' },
        { id: 'nature', name: 'Nature' },
    ];

    const allCategories: Array<{ id: string; name: string; isBuiltIn: boolean }> = [
        ...builtInCategories.map((cat) => ({ id: cat.id, name: cat.name, isBuiltIn: true })),
        ...userVideoCategories.map((cat) => ({ id: cat.id, name: cat.name, isBuiltIn: false })),
    ];

    useEffect(() => {
        if (!visible) return;
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
        setExpandedCategory(null);
        setEditingCategory(null);
        setShowCreateCategory(false);
        setNewCategoryName('');
    }, [visible, fadeAnim]);

    const animateClose = async () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    const toggleCategoryEnabled = async (categoryId: string) => {
        const isEnabled = enabledVideoCategoryIds.includes(categoryId);
        if (isEnabled) {
            await setEnabledVideoCategoryIds(enabledVideoCategoryIds.filter((id) => id !== categoryId));
        } else {
            await setEnabledVideoCategoryIds([...enabledVideoCategoryIds, categoryId]);
        }
    };

    const getVideosForCategory = (categoryId: string): UserVideo[] => {
        return userVideos.filter((v) => v.categoryId === categoryId);
    };

    const getBundledCount = (categoryId: string): number => {
        return builtInCategories.some((cat) => cat.id === categoryId) ? 1 : 0;
    };

    const handleAddVideo = async (categoryId: string) => {
        const result = await pickVideoSource();
        if (!result) return;

        try {
            await addUserVideo(categoryId, result.uri, result.name);
            Alert.alert('Success', 'Video added successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to add video.');
            console.error(error);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert('Error', 'Please enter a category name.');
            return;
        }

        try {
            await createUserCategory(newCategoryName.trim());
            setNewCategoryName('');
            setShowCreateCategory(false);
            Alert.alert('Success', 'Category created successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to create category.');
            console.error(error);
        }
    };

    const handleRenameVideo = async (video: UserVideo, newName: string) => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Please enter a video name.');
            return;
        }

        try {
            await updateUserVideoMeta(video.id, { displayName: newName.trim() });
            Alert.alert('Success', 'Video renamed successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to rename video.');
            console.error(error);
        }
    };

    const handleMoveVideo = async (video: UserVideo, newCategoryId: string) => {
        try {
            await updateUserVideoMeta(video.id, { categoryId: newCategoryId });
            Alert.alert('Success', 'Video moved successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to move video.');
            console.error(error);
        }
    };

    const handleReplaceVideo = async (video: UserVideo) => {
        const result = await pickVideoSource();
        if (!result) return;

        try {
            await replaceUserVideoFile(video.id, result.uri, result.name);
            Alert.alert('Success', 'Video replaced successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to replace video.');
            console.error(error);
        }
    };

    const handleDeleteVideo = async (video: UserVideo) => {
        Alert.alert(
            'Delete Video',
            `Are you sure you want to delete "${video.displayName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteUserVideo(video.id);
                            Alert.alert('Success', 'Video deleted successfully!');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete video.');
                            console.error(error);
                        }
                    },
                },
            ]
        );
    };

    const handleRenameCategory = async (category: UserVideoCategory, newName: string) => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Please enter a category name.');
            return;
        }

        try {
            await renameUserCategory(category.id, newName.trim());
            setEditingCategory(null);
            Alert.alert('Success', 'Category renamed successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to rename category.');
            console.error(error);
        }
    };

    const handleDeleteCategory = async (category: UserVideoCategory) => {
        const videosInCategory = getVideosForCategory(category.id);
        if (videosInCategory.length > 0) {
            Alert.alert(
                'Cannot Delete Category',
                `This category has ${videosInCategory.length} video(s). Please move or delete them first.`,
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${category.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteUserCategory(category.id);
                            Alert.alert('Success', 'Category deleted successfully!');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete category.');
                            console.error(error);
                        }
                    },
                },
            ]
        );
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} onRequestClose={animateClose} animationType="none">
            <View style={styles.modalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            opacity: fadeAnim,
                            transform: [
                                {
                                    scale: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.95, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>Manage videos</Text>
                        <Text style={styles.modalSubtitle}>Add videos, create categories, and choose what’s enabled</Text>

                        <View style={styles.videoSettingsSection}>
                            <Text style={styles.sectionHeader}>Enabled categories</Text>
                            {allCategories.map((category) => {
                                const isEnabled = enabledVideoCategoryIds.includes(category.id);
                                const videos = getVideosForCategory(category.id);
                                const bundledCount = getBundledCount(category.id);
                                const isExpanded = expandedCategory === category.id;

                                return (
                                    <View key={category.id} style={styles.categoryItem}>
                                        <View style={styles.categoryHeader}>
                                            <TouchableOpacity
                                                style={styles.categoryHeaderLeft}
                                                onPress={() => setExpandedCategory(isExpanded ? null : category.id)}
                                            >
                                                <Ionicons
                                                    name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                                                    size={20}
                                                    color={Colors.text}
                                                />
                                                <Text style={styles.categoryName}>
                                                    {category.name}{' '}
                                                    <Text style={styles.categoryCount}>
                                                        ({bundledCount + videos.length})
                                                    </Text>
                                                </Text>
                                            </TouchableOpacity>
                                            <Switch
                                                value={isEnabled}
                                                onValueChange={() => toggleCategoryEnabled(category.id)}
                                                trackColor={{
                                                    false: Colors.backgroundLighter,
                                                    true: Colors.tint + '80',
                                                }}
                                                thumbColor={isEnabled ? Colors.tint : Colors.tabIconDefault}
                                            />
                                        </View>

                                        {isExpanded && (
                                            <View style={styles.categoryContent}>
                                                {!category.isBuiltIn && (
                                                    <View style={styles.categoryActions}>
                                                        <TouchableOpacity
                                                            style={styles.actionButton}
                                                            onPress={() => {
                                                                const userCat = userVideoCategories.find((c) => c.id === category.id);
                                                                if (userCat) setEditingCategory(userCat);
                                                            }}
                                                        >
                                                            <Ionicons name="pencil" size={16} color={Colors.tint} />
                                                            <Text style={styles.actionButtonText}>Rename</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.actionButton}
                                                            onPress={() => {
                                                                const userCat = userVideoCategories.find((c) => c.id === category.id);
                                                                if (userCat) handleDeleteCategory(userCat);
                                                            }}
                                                        >
                                                            <Ionicons name="trash" size={16} color="#ff4444" />
                                                            <Text style={[styles.actionButtonText, { color: '#ff4444' }]}>Delete</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}

                                                <TouchableOpacity
                                                    style={styles.addVideoButton}
                                                    onPress={() => handleAddVideo(category.id)}
                                                >
                                                    <Ionicons name="add-circle" size={20} color={Colors.tint} />
                                                    <Text style={styles.addVideoButtonText}>Add Video</Text>
                                                </TouchableOpacity>

                                                {videos.map((video) => (
                                                    <View key={video.id} style={styles.videoItem}>
                                                        <View style={styles.videoItemLeft}>
                                                            <Ionicons name="videocam" size={16} color={Colors.text} />
                                                            <Text style={styles.videoName}>{video.displayName}</Text>
                                                        </View>
                                                        <View style={styles.videoActions}>
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    Alert.prompt(
                                                                        'Rename Video',
                                                                        'Enter new name:',
                                                                        [
                                                                            { text: 'Cancel', style: 'cancel' },
                                                                            {
                                                                                text: 'Save',
                                                                                onPress: (newName?: string) => {
                                                                                    if (newName) handleRenameVideo(video, newName);
                                                                                },
                                                                            },
                                                                        ],
                                                                        'plain-text',
                                                                        video.displayName
                                                                    );
                                                                }}
                                                            >
                                                                <Ionicons name="pencil" size={18} color={Colors.tint} />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    Alert.alert(
                                                                        'Move Video',
                                                                        'Select new category:',
                                                                        [
                                                                            ...allCategories
                                                                                .filter((cat) => cat.id !== video.categoryId)
                                                                                .map((cat) => ({
                                                                                    text: cat.name,
                                                                                    onPress: () => handleMoveVideo(video, cat.id),
                                                                                })),
                                                                            { text: 'Cancel', style: 'cancel' },
                                                                        ]
                                                                    );
                                                                }}
                                                            >
                                                                <Ionicons name="folder" size={18} color={Colors.tint} />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity onPress={() => handleReplaceVideo(video)}>
                                                                <Ionicons name="refresh" size={18} color={Colors.tint} />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity onPress={() => handleDeleteVideo(video)}>
                                                                <Ionicons name="trash" size={18} color="#ff4444" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}

                            {showCreateCategory ? (
                                <View style={styles.createCategoryContainer}>
                                    <TextInput
                                        style={styles.input}
                                        value={newCategoryName}
                                        onChangeText={setNewCategoryName}
                                        placeholder="Category name"
                                        placeholderTextColor={Colors.tabIconDefault}
                                        autoFocus
                                        selectionColor={Colors.tint}
                                    />
                                    <View style={styles.createCategoryActions}>
                                        <Pressable
                                            style={[styles.modalButton, styles.cancelButton]}
                                            onPress={() => {
                                                setShowCreateCategory(false);
                                                setNewCategoryName('');
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </Pressable>
                                        <Pressable style={[styles.modalButton, styles.saveButton]} onPress={handleCreateCategory}>
                                            <Text style={styles.saveButtonText}>Create</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.createCategoryButton} onPress={() => setShowCreateCategory(true)}>
                                    <Ionicons name="add-circle-outline" size={20} color={Colors.tint} />
                                    <Text style={styles.createCategoryButtonText}>Create New Category</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {editingCategory && (
                            <View style={styles.editModal}>
                                <Text style={styles.modalSubtitle}>Rename Category</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editingCategory.name}
                                    onChangeText={(text) => setEditingCategory({ ...editingCategory, name: text })}
                                    placeholder="Category name"
                                    placeholderTextColor={Colors.tabIconDefault}
                                    autoFocus
                                    selectionColor={Colors.tint}
                                />
                                <View style={styles.modalButtons}>
                                    <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditingCategory(null)}>
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={() => handleRenameCategory(editingCategory, editingCategory.name)}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={animateClose}>
                                <Text style={styles.cancelButtonText}>Done</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

// Video Background Settings Modal (launcher only: enable + shortcuts)
const VideoBackgroundSettingsModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    const { videoBackgroundEnabled, setVideoBackgroundEnabled } = usePreferences();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [managerVisible, setManagerVisible] = useState(false);

    useEffect(() => {
        if (!visible) return;
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [visible, fadeAnim]);

    const animateClose = async () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    if (!visible) return null;

    // Hide main modal when nested modals are open
    const isMainModalVisible = visible && !managerVisible;

    return (
        <>
            <Modal transparent visible={isMainModalVisible} onRequestClose={animateClose} animationType="none">
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                opacity: fadeAnim,
                                transform: [
                                    {
                                        scale: fadeAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.95, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <Text style={styles.modalTitle}>Video Backgrounds</Text>
                        <Text style={[styles.modalSubtitle, { opacity: 0.7 }]}>Turn it on, then customize appearance or manage videos</Text>

                        <View style={styles.videoSettingsSection}>
                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="videocam" size={20} color={Colors.text} />
                                    </View>
                                    <Text style={styles.settingTitle}>Video backgrounds</Text>
                                </View>
                                <Switch
                                    value={videoBackgroundEnabled}
                                    onValueChange={setVideoBackgroundEnabled}
                                    trackColor={{ false: Colors.backgroundLighter, true: Colors.tint + '80' }}
                                    thumbColor={videoBackgroundEnabled ? Colors.tint : Colors.tabIconDefault}
                                />
                            </View>
                        </View>

                        {videoBackgroundEnabled && (
                            <View style={styles.launcherActions}>
                                <TouchableOpacity
                                    style={styles.manageCategoriesButton}
                                    onPress={() => setManagerVisible(true)}
                                >
                                    <Ionicons name="film" size={20} color={Colors.text} />
                                    <Text style={styles.manageCategoriesButtonText}>Manage videos & categories</Text>
                                    <Ionicons name="chevron-forward" size={20} color={Colors.tabIconDefault} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={animateClose}>
                                <Text style={styles.cancelButtonText}>Close</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            <VideoBackgroundManagerModal
                visible={managerVisible}
                onClose={() => setManagerVisible(false)}
            />
        </>
    );
};

export default function Settings() {
    const router = useRouter();
    const { courses } = useCourses();
    const { streak, timeSaved, weeklyData, weeklyLabels, resetStats } = useStats();
    const { videoBackgroundEnabled, setVideoBackgroundEnabled } = usePreferences();
    const [videoCategoriesModalVisible, setVideoCategoriesModalVisible] = useState(false);
    const [appearanceModalVisible, setAppearanceModalVisible] = useState(false);



    const [showColorPicker, setShowColorPicker] = useState(false);
    const onSelectColor = ({ hex }: { hex: string }) => {
        'worklet';
        // do something with the selected color.
        console.log(hex);
    };

    // Format time saved
    const hours = Math.floor(timeSaved / 3600);
    const minutes = Math.floor((timeSaved % 3600) / 60);
    const formattedTimeSaved = hours > 0 ? `${hours}h ${minutes} m` : `${minutes} m`;

    // Motivation logic
    const daysReclaimed = (timeSaved / (24 * 3600)).toFixed(1);
    const motivationSubtitle = parseFloat(daysReclaimed) < 1
        ? "You're getting there!"
        : `That's ~${daysReclaimed} days less of doomscrolling !`;

    const [username, setUsername] = useState<string>("User");

    // Mock user data
    const user = {
        name: username,
        stats: {
            coursesCompleted: courses.length,
            hoursStudied: formattedTimeSaved,
            streakDays: streak
        },
        weeklyActivity: weeklyData // Use real data
    };
    const [editModalVisible, setEditModalVisible] = useState(false);

    const [editTypesModalVisible, setEditTypesModalVisible] = useState(false);

    useEffect(() => {
        const loadUsername = async () => {
            const name = await AsyncStorage.getItem("userName");
            if (name) {
                setUsername(name);
            }
        };
        loadUsername();

        const loadSettings = async () => {
            const model = await AsyncStorage.getItem("geminiModel") || "gemini-2.5-flash-lite";
            if (model) setSelectedModel(model);
        };
        loadSettings();
    }, []);

    useEffect(() => {
        const saveUsername = async () => {
            await AsyncStorage.setItem("userName", username);
        };
        saveUsername();
    }, [username]);

    const editUsername = () => {
        setEditModalVisible(true);
    };


    const [geminiKey, setGeminiKey] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [modelPreferencesModalVisible, setModelPreferencesModalVisible] = useState(false);
    const [offlineModelTestVisible, setOfflineModelTestVisible] = useState(false);
    const [selectedOfflineModel, setSelectedOfflineModel] = useState<string | null>(null);
    const [downloadedOfflineModels, setDownloadedOfflineModels] = useState<string[]>([]);
    const [selectedSnippetTypes, setSelectedSnippetTypes] = useState<string[]>(['fact', 'concept', 'qna', 'true_false']);
    const [savedModelMode, setSavedModelMode] = useState<'online' | 'offline'>('online');

    useEffect(() => {
        const loadSettings = async () => {
            const key = await AsyncStorage.getItem("geminiKey");
            const model = await AsyncStorage.getItem("geminiModel");
            const snippetTypes = await AsyncStorage.getItem("snippetTypePreferences");
            const offlineModel = await AsyncStorage.getItem("selectedOfflineModel");
            const downloadedModels = await AsyncStorage.getItem("downloadedOfflineModels");
            const savedMode = await AsyncStorage.getItem("modelModePreference");

            if (key) setGeminiKey(key);
            if (model) setSelectedModel(model);
            if (snippetTypes) {
                setSelectedSnippetTypes(JSON.parse(snippetTypes));
            }
            if (offlineModel) setSelectedOfflineModel(offlineModel);
            if (downloadedModels) setDownloadedOfflineModels(JSON.parse(downloadedModels));
            if (savedMode === 'online' || savedMode === 'offline') {
                setSavedModelMode(savedMode);
            } else {
                // Default to online if no preference saved, or offline if an offline model is selected
                setSavedModelMode(offlineModel ? 'offline' : 'online');
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        const saveGeminiKey = async () => {
            await AsyncStorage.setItem("geminiKey", geminiKey);
        };
        saveGeminiKey();
    }, [geminiKey]);

    const handleModelSelect = async (modelId: string) => {
        setSelectedModel(modelId);
        await AsyncStorage.setItem("geminiModel", modelId);
    };

    const handleSnippetTypesSave = async (types: string[]) => {
        setSelectedSnippetTypes(types);
        await AsyncStorage.setItem("snippetTypePreferences", JSON.stringify(types));
    };

    const handleGeminiKeySave = async (key: string) => {
        setGeminiKey(key);
        await AsyncStorage.setItem("geminiKey", key);
    };

    const handleOfflineModelSelect = async (modelId: string) => {
        setSelectedOfflineModel(modelId);
        await AsyncStorage.setItem("selectedOfflineModel", modelId);
    };

    const handleModelModeSave = async (mode: 'online' | 'offline') => {
        setSavedModelMode(mode);
        await AsyncStorage.setItem("modelModePreference", mode);
    };

    const handleOfflineModelsUpdate = async () => {
        const downloadedModels = await AsyncStorage.getItem("downloadedOfflineModels");
        if (downloadedModels) {
            setDownloadedOfflineModels(JSON.parse(downloadedModels));
        }
    };

    const handleDeleteAllCourses = async () => {
        Alert.alert(
            "Delete All Courses",
            "This will permanently delete all courses, snippets, and files. Your stats (streak, time saved) will be preserved. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete All",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Delete courses
                            await AsyncStorage.removeItem('courses');

                            // Get all keys and delete chunk tracking keys
                            const allKeys = await AsyncStorage.getAllKeys();
                            const chunkKeys = allKeys.filter(key =>
                                key.startsWith('gemini_chunks_') || key.startsWith('offline_chunks_')
                            );

                            if (chunkKeys.length > 0) {
                                await AsyncStorage.multiRemove(chunkKeys);
                            }

                            Alert.alert(
                                "Success",
                                `All courses deleted successfully.\nRemoved ${chunkKeys.length} chunk tracking entries.\n\nPlease restart the app to see changes.`
                            );
                        } catch (error) {
                            console.error("Error deleting courses:", error);
                            Alert.alert("Error", "Failed to delete courses");
                        }
                    }
                }
            ]
        );
    };


    const ActionItem = ({ icon, title, onPress }: any) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={20} color={Colors.text} />
                </View>
                <Text style={styles.settingTitle}>{title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.tabIconDefault} />
        </TouchableOpacity>
    );

    const StatCard = ({ label, value, icon, color }: any) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const ActivityGraph = ({ data, labels }: { data: number[], labels: string[] }) => {
        const max = Math.max(...data, 1); // Max is at least 1 hour

        return (
            <View style={styles.graphContainer}>
                {data.map((value, index) => {
                    const isToday = index === data.length - 1; // Last item is today
                    return (
                        <View key={index} style={styles.barContainer}>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            height: `${(value / max) * 100}%`,
                                            backgroundColor: isToday ? Colors.tint : Colors.tabIconDefault,
                                            opacity: isToday ? 1 : 0.5
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={[
                                styles.dayLabel,
                                isToday && { color: Colors.tint, fontWeight: 'bold' }
                            ]}>{labels[index]}</Text>
                        </View>
                    );
                })}
            </View>
        );
    };


    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>

            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

                {/* User Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={58} color="black" />
                    </View>
                    <View style={styles.userNameContainer}>
                        <Text style={styles.userName}> Keep it going <Text style={styles.userNameBold}>{user.name}</Text>!</Text>
                        <Ionicons name="pencil" size={20} color="white" style={styles.editIcon} onPress={editUsername} />
                    </View>

                </View>

                {/* Motivation Card */}
                <View style={styles.motivationCard}>
                    <View style={styles.motivationIcon}>
                        <Ionicons name="trending-up" size={24} color="#000" />
                    </View>
                    <View style={styles.motivationContent}>
                        <Text style={styles.motivationTitle}>{user.stats.hoursStudied} Reclaimed</Text>
                        <Text style={styles.motivationSubtitle}>{motivationSubtitle}</Text>
                    </View>
                </View>

                {/* Progress Tracking Section */}
                <View style={styles.statsContainer}>
                    <StatCard
                        label={user.stats.coursesCompleted === 1 ? "Course" : "Courses"}
                        value={user.stats.coursesCompleted}
                        icon="book"
                        color="#4CAF50"
                    />
                    <StatCard
                        label="Streak"
                        value={user.stats.streakDays + " day" + (user.stats.streakDays === 1 ? "" : "s")}
                        icon="flame"
                        color="#FF9800"
                    />
                </View>

                {/* Activity Graph */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Weekly Activity</Text>
                    <ActivityGraph data={user.weeklyActivity} labels={weeklyLabels} />
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Preferences</Text>
                    <View style={styles.sectionContent}>

                        <ActionItem
                            icon="book"
                            title="Snippet Types"
                            onPress={() => setEditTypesModalVisible(true)}
                        />
                        <View style={styles.separator} />

                        <ActionItem
                            icon="settings"
                            title="Model Preferences"
                            onPress={() => setModelPreferencesModalVisible(true)}
                        />
                        <View style={styles.separator} />
                        <ActionItem
                            icon="color-palette"
                            title="Appearance"
                            onPress={() => setAppearanceModalVisible(true)}
                        />
                        <View style={styles.separator} />
                        <ActionItem
                            icon="videocam"
                            title="Video Backgrounds"
                            onPress={() => setVideoCategoriesModalVisible(true)}
                        />
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Informations</Text>
                    <View style={styles.sectionContent}>

                        <ActionItem
                            icon="shield-checkmark"
                            title="Privacy Policy"
                            onPress={() => { WebBrowser.openBrowserAsync('https://doomstudyapp.com/#/privacy', { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }) }}
                        />
                        <View style={styles.separator} />
                        <ActionItem
                            icon="document-text"
                            title="Terms of Service"
                            onPress={() => { WebBrowser.openBrowserAsync('https://doomstudyapp.com/#/tos', { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }) }}
                        />
                        <ActionItem
                            icon="information-circle"
                            title="About DoomStudy"
                            onPress={() => { router.push('/(modal)/about') }}
                        />
                        <View style={styles.separator} />
                        <View style={styles.versionContainer}>
                            <Text style={styles.versionText}>Version {Constants.expoConfig?.version}</Text>
                        </View>
                    </View>
                </View>

                {/* dev Section
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Developer Options</Text>
                    <View style={styles.sectionContent}>
                        {selectedOfflineModel && (
                            <>
                                <ActionItem
                                    icon="flask"
                                    title="Test Offline Model"
                                    onPress={() => setOfflineModelTestVisible(true)}
                                />
                                <View style={styles.separator} />
                            </>
                        )}
                        <View style={styles.separator} />
                        <ActionItem
                            icon="trash-outline"
                            title="Delete All Courses"
                            onPress={handleDeleteAllCourses}
                        />
                        <View style={styles.separator} />
                        <ActionItem
                            icon="trash"
                            title="Delete Async Storage"
                            onPress={async () => {
                                await AsyncStorage.clear();
                                await resetStats();
                                Alert.alert("Async Storage cleared, please restart the app");
                            }}
                        />

                    </View>



                    {/* AI Section 
                    <View style={styles.separator} />

                    <ActionItem
                        icon="alert"
                        title="Go to Onboarding"
                        onPress={async () => {
                            router.push('/(onboarding)/onboard');
                        }}
                    />

                    <View style={styles.separator} />
                    <ActionItem
                        icon="text"
                        title="Add gemini key"
                        onPress={async () => {
                            Alert.prompt("Add gemini key", "Add your gemini key", [
                                {
                                    text: "Cancel",
                                    onPress: () => console.log("Cancel Pressed"),
                                    style: "cancel",
                                },
                                {
                                    text: "OK",
                                    onPress: (value?: string) => {
                                        if (value) {
                                            setGeminiKey(value);
                                        }
                                    },
                                },
                            ]);
                        }}
                    />

                    <View style={styles.separator} />
                    <Text style={{ color: Colors.text, fontSize: 12, marginTop: 10, marginLeft: 10, marginRight: 10, marginBottom: 10 }}>Gemini Key: {geminiKey}</Text>
               
                <ActionItem
                    icon="alert"
                    title="Go to Onboarding"
                    onPress={async () => {
                        router.push('/(onboarding)/onboard');
                    }}
                />
                </View>

                */}

                {/*
                {__DEV__ && (
                    <ActionItem
                        icon="alert"
                        title="Go to Onboarding"
                        onPress={async () => {
                            router.push('/(onboarding)/onboard');
                        }}
                    />
                )}
                {__DEV__ && (
                    <ActionItem
                        icon="trash"
                        title="Delete Async Storage"
                        onPress={async () => {
                            await AsyncStorage.clear();
                            await resetStats();
                            Alert.alert("Async Storage cleared, please restart the app");
                        }}
                    />
                )}
                */}




            </ScrollView>

            <EditNameModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                onSave={(newName) => {
                    setUsername(newName);
                    setEditModalVisible(false);
                }}
                initialName={username}
            />

            <SnippetTypesModal
                visible={editTypesModalVisible}
                onClose={() => setEditTypesModalVisible(false)}
                onSave={handleSnippetTypesSave}
                selectedTypes={selectedSnippetTypes}
            />

            <ModelPreferencesModal
                visible={modelPreferencesModalVisible}
                onClose={() => setModelPreferencesModalVisible(false)}
                geminiKey={geminiKey}
                selectedModel={selectedModel}
                selectedOfflineModel={selectedOfflineModel}
                downloadedOfflineModels={downloadedOfflineModels}
                savedModelMode={savedModelMode}
                onGeminiKeySave={handleGeminiKeySave}
                onModelSelect={handleModelSelect}
                onOfflineModelSelect={handleOfflineModelSelect}
                onOfflineModelsUpdate={handleOfflineModelsUpdate}
                onModelModeSave={handleModelModeSave}
            />


            <VideoBackgroundSettingsModal
                visible={videoCategoriesModalVisible}
                onClose={() => setVideoCategoriesModalVisible(false)}
            />

            <AppearanceModal
                visible={appearanceModalVisible}
                onClose={() => setAppearanceModalVisible(false)}
            />

            <OfflineModelTestModal
                visible={offlineModelTestVisible}
                onClose={() => setOfflineModelTestVisible(false)}
                modelId={selectedOfflineModel}
            />
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
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.tabIconDefault,
        marginBottom: 10,
        marginLeft: 10,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    sectionContent: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        overflow: "hidden",
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: Colors.backgroundSecondary,
    },
    settingLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: Colors.backgroundLighter,
        alignItems: "center",
        justifyContent: "center",
    },
    destructiveIcon: {
        backgroundColor: "#ff444420",
    },
    settingTitle: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: "500",
    },
    destructiveText: {
        color: "#ff4444",
    },
    separator: {
        height: 1,
        backgroundColor: Colors.backgroundLighter,
        marginLeft: 60, // Align with text start
    },
    versionContainer: {
        padding: 16,
        alignItems: "center",
    },
    versionText: {
        color: Colors.tabIconDefault,
        fontSize: 14,
    },
    profileSection: {
        alignItems: "center",
        marginBottom: 30,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.tint,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        shadowColor: Colors.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: "bold",
        color: Colors.background,
    },
    userName: {
        fontSize: 24,
        color: Colors.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: Colors.tabIconDefault,
    },
    statsContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        fontWeight: "500",
    },
    motivationCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.tint,
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
        shadowColor: Colors.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    motivationIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    motivationContent: {
        flex: 1,
    },
    motivationTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000", // Dark text for better contrast on neon green
        marginBottom: 4,
    },
    motivationSubtitle: {
        fontSize: 13,
        color: "rgba(0,0,0,0.7)", // Darker subtitle
        fontWeight: "500",
    },
    graphContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        height: 150,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        padding: 20,
    },
    barContainer: {
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    barTrack: {
        width: 8,
        height: "80%",
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 4,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    barFill: {
        width: "100%",
        borderRadius: 4,
    },
    dayLabel: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        fontWeight: "500",
    },
    userNameBold: {
        fontWeight: "bold",
    },
    userNameContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    editIcon: {
        marginLeft: 10,

    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 500,
        maxHeight: '85%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: Colors.backgroundLighter,
    },

    cancelRedButton: {
        backgroundColor: "#ff444420",
        borderColor: "#ff4444",
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        height: 48,
    },
    cancelRedButtonText: {
        color: "#ff4444",
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modelPrefsCard: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 500,
    },
    modelListCard: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 500,
    },
    selectedModelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        marginBottom: 20,
    },
    selectedModelName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    selectedModelHint: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        marginTop: 2,
    },
    sliderContainer: {
        marginBottom: 20,
    },
    sliderLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
        marginBottom: 8,
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sliderMinMax: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        width: 40,
        textAlign: 'center',
    },
    sliderWrapper: {
        flex: 1,
        marginHorizontal: 8,
    },
    sliderTrack: {
        height: 4,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 2,
        position: 'relative',
    },
    sliderFill: {
        height: '100%',
        backgroundColor: Colors.tint,
        borderRadius: 2,
    },
    sliderButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    sliderButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.backgroundLighter,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sliderButtonDisabled: {
        opacity: 0.5,
    },
    sliderInput: {
        width: 60,
        height: 36,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.tint,
    },
    offlineModelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        marginBottom: 16,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: Colors.backgroundLighter,
        gap: 8,
    },
    modeButtonActive: {
        backgroundColor: Colors.tint,
    },
    modeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.tabIconDefault,
    },
    modeButtonTextActive: {
        color: Colors.background,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    currentModelDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 16,
    },
    currentModelLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.tabIconDefault,
    },
    currentModelName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.tint,
    },
    emptyModelsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyModelsText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyModelsSubtext: {
        fontSize: 14,
        color: Colors.tabIconDefault,
        textAlign: 'center',
    },
    modelOptionLeft: {
        flex: 1,
    },
    testModalContent: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 500,
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    testInput: {
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    testButton: {
        backgroundColor: Colors.tint,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    testButtonDisabled: {
        opacity: 0.5,
    },
    testButtonText: {
        color: Colors.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
    outputContainer: {
        marginTop: 16,
        marginBottom: 16,
    },
    outputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    outputScrollView: {
        maxHeight: 200,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        padding: 16,
    },
    outputText: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    saveButton: {
        backgroundColor: Colors.tint,
    },
    cancelButtonText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonText: {
        color: Colors.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
    modelList: {
        width: '100%',
        gap: 12,
    },
    modelOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
        marginBottom: 12,
    },
    selectedModelOption: {
        borderColor: Colors.tint,
        backgroundColor: Colors.backgroundSecondary,
    },
    modelOptionText: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: '500',
    },
    modelOptionSize: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        marginTop: 4,
    },
    selectedModelOptionText: {
        color: Colors.tint,
        fontWeight: 'bold',
    },
    checkboxList: {
        width: '100%',
        gap: 12,
        marginBottom: 20,
    },
    checkboxItem: {
        padding: 16,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
    },
    checkboxLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.tabIconDefault,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: Colors.tint,
        borderColor: Colors.tint,
    },
    checkboxTextContainer: {
        flex: 1,
    },
    checkboxLabel: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: '600',
        marginBottom: 2,
    },
    checkboxDescription: {
        fontSize: 13,
        color: Colors.tabIconDefault,
    },
    offlineModelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
        marginBottom: 12,
    },
    selectedOfflineModelItem: {
        borderColor: Colors.tint,
        backgroundColor: Colors.backgroundSecondary,
    },
    offlineModelInfo: {
        flex: 1,
    },
    offlineModelRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    offlineModelName: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: '600',
        marginBottom: 4,
    },
    offlineModelSize: {
        fontSize: 13,
        color: Colors.tint,
        fontWeight: '500',
        marginBottom: 4,
    },
    offlineModelDescription: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        marginTop: 4,
    },
    downloadModelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 8,
        marginTop: 4,
        marginBottom: 12,
    },
    downloadModelButtonDisabled: {
        opacity: 0.5,
    },
    downloadModelText: {
        fontSize: 14,
        color: Colors.tint,
        fontWeight: '600',
    },
    deleteModelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 8,
        marginTop: 4,
        marginBottom: 12,
    },
    deleteModelText: {
        fontSize: 14,
        color: '#ff4444',
        fontWeight: '600',
    },
    offlineModelActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    selectButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectButtonActive: {
        backgroundColor: Colors.backgroundLighter,
    },
    downloadButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.tint,
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadButtonDisabled: {
        opacity: 0.5,
    },
    deleteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.backgroundLighter,
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadingContainer: {
        marginTop: 12,
        width: '100%',
    },
    downloadingText: {
        fontSize: 13,
        color: Colors.tint,
        fontWeight: '500',
    },
    progressBarContainer: {
        marginTop: 8,
        width: '100%',
        height: 4,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.tint,
        borderRadius: 2,
    },
    stopButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.backgroundLighter,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.tint,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: Colors.tabIconDefault,
        textAlign: 'right',
    },
    categoryItem: {
        marginBottom: 12,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        overflow: 'hidden',
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    categoryHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    categoryCount: {
        fontSize: 12,
        color: Colors.tabIconDefault,
    },
    categoryContent: {
        padding: 16,
        paddingTop: 0,
    },
    categoryActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 8,
    },
    actionButtonText: {
        fontSize: 14,
        color: Colors.tint,
        fontWeight: '500',
    },
    addVideoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 8,
        marginBottom: 12,
    },
    addVideoButtonText: {
        fontSize: 14,
        color: Colors.tint,
        fontWeight: '600',
    },
    videoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 8,
        marginBottom: 8,
    },
    videoItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    videoName: {
        fontSize: 14,
        color: Colors.text,
        flex: 1,
    },
    videoActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    createCategoryContainer: {
        marginTop: 12,
        padding: 16,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
    },
    createCategoryActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    createCategoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 12,
    },
    createCategoryButtonText: {
        fontSize: 14,
        color: Colors.tint,
        fontWeight: '600',
    },
    editModal: {
        marginTop: 16,
        padding: 16,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
    },
    videoSettingsSection: {
        marginBottom: 20,
    },
    opacityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
        marginBottom: 12,
    },
    opacityLabel: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        minWidth: 35,
    },
    opacityTrackContainer: {
        flex: 1,
        height: 20,
        justifyContent: 'center',
    },
    opacityTrack: {
        width: '100%',
        height: 6,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 3,
        position: 'relative',
    },
    opacityFill: {
        height: '100%',
        backgroundColor: Colors.tint,
        borderRadius: 3,
    },
    opacityThumb: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.tint,
        borderWidth: 2,
        borderColor: Colors.background,
        top: -7,
        marginLeft: -10,
    },
    opacityButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    opacityButton: {
        flex: 1,
        padding: 8,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 8,
        alignItems: 'center',
    },
    opacityButtonActive: {
        backgroundColor: Colors.backgroundLighter,
    },
    opacityButtonText: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        fontWeight: '500',
    },
    opacityButtonTextActive: {
        color: Colors.tint,
        fontWeight: '600',
    },
    colorInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    colorInput: {
        flex: 1,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 8,
        padding: 12,
        color: Colors.text,
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    colorPreview: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Colors.backgroundLighter,
    },
    launcherActions: {
        gap: 12,
        marginBottom: 20,
    },
    previewCardOuter: {
        marginBottom: 20,
    },
    previewCard: {
        borderRadius: 20,
        padding: 16,
        backgroundColor: 'transparent',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.backgroundLighter,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    previewIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: Colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    previewText: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
    },
    manageCategoriesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        gap: 12,
    },
    manageCategoriesButtonText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    colorPickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 8,
        marginTop: 8,
    },
    colorPickerButtonText: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    colorPickerContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 8,
    },
    colorPresets: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    colorPreset: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Colors.backgroundLighter,
    },
    colorPresetSelected: {
        borderColor: Colors.tint,
        borderWidth: 3,
    },
    colorPickerModalContent: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    colorPickerModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    closeButton: {
        padding: 4,
    },
    colorPicker: {
        width: '100%',
    },
    colorPickerModalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    cancelColorButton: {
        flex: 1,
        padding: 14,
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveColorButton: {
        flex: 1,
        padding: 14,
        backgroundColor: Colors.tint,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelColorButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    saveColorButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.background,
    },
});


