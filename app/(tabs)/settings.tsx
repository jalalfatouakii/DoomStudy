
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as WebBrowser from 'expo-web-browser';
import {
    Alert,
    Animated,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCourses } from "@/context/CourseContext";
import { useStats } from "@/context/StatsContext";
import { mlc } from "@react-native-ai/mlc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateText } from "ai";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

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


const EditGeminiKeyModal = ({ visible, onClose, onSave, initialKey }: { visible: boolean, onClose: () => void, onSave: (key: string) => void, initialKey: string }) => {
    const [key, setKey] = useState(initialKey);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setKey(initialKey);
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, initialKey]);

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
        onSave(key);
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
                            <Text style={styles.modalTitle}>Edit Gemini Key</Text>
                            <Text style={styles.modalSubtitle}>Enter your Gemini API Key</Text>

                            <TextInput
                                style={styles.input}
                                value={key}
                                onChangeText={setKey}
                                placeholder="API Key"
                                placeholderTextColor={Colors.tabIconDefault}
                                autoFocus
                                selectionColor={Colors.tint}
                                autoCapitalize="none"
                                autoCorrect={false}
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
];

const OFFLINE_MODELS = [
    { id: 'Qwen2.5-0.5B-Instruct', name: 'Qwen 2.5 0.5B', size: '600 MB', description: 'Fast responses, basic conversations' },
    { id: 'Llama-3.2-1B-Instruct', name: 'Llama 3.2 1B', size: '1.2 GB', description: 'Balanced performance and quality' },
    { id: 'Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B', size: '2 GB', description: 'High-quality responses, complex reasoning' },
    { id: 'Phi-3.5-mini-instruct', name: 'Phi 3.5 Mini', size: '2.3 GB', description: 'Code generation, technical tasks' },
];

const ModelSelectionModal = ({ visible, onClose, onSelect, currentModel }: { visible: boolean, onClose: () => void, onSelect: (modelId: string) => void, currentModel: string }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
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

    const handleSelect = (modelId: string) => {
        onSelect(modelId);
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
                            <Text style={styles.modalTitle}>Select Model</Text>
                            <Text style={styles.modalSubtitle}>Choose your preferred Gemini model</Text>

                            <View style={styles.modelList}>
                                {MODELS.map((model) => (
                                    <TouchableOpacity
                                        key={model.id}
                                        style={[
                                            styles.modelOption,
                                            currentModel === model.id && styles.selectedModelOption
                                        ]}
                                        onPress={() => handleSelect(model.id)}
                                    >
                                        <Text style={[
                                            styles.modelOptionText,
                                            currentModel === model.id && styles.selectedModelOptionText
                                        ]}>
                                            {model.name}
                                        </Text>
                                        {currentModel === model.id && (
                                            <Ionicons name="checkmark-circle" size={24} color={Colors.tint} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
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

        for (const model of OFFLINE_MODELS) {
            const isDownloaded = downloadedModels.includes(model.id);
            states[model.id] = {
                status: isDownloaded ? 'downloaded' : 'idle',
                progress: isDownloaded ? 1 : 0
            };
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
        if (downloadStates[modelId]?.status === 'downloading' || downloadStates[modelId]?.status === 'preparing') {
            return;
        }

        downloadCancelRef.current[modelId] = false;
        setDownloadingModelId(modelId);
        setDownloadStates(prev => ({
            ...prev,
            [modelId]: { status: 'downloading', progress: 0 }
        }));

        let progressInterval: NodeJS.Timeout | null = null;
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

            Alert.alert("Success", `Model ${OFFLINE_MODELS.find(m => m.id === modelId)?.name} downloaded and ready!`);
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
        Alert.alert(
            "Delete Model",
            `Are you sure you want to delete ${OFFLINE_MODELS.find(m => m.id === modelId)?.name}?`,
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
                            {OFFLINE_MODELS.map((model) => {
                                const state = downloadStates[model.id] || { status: 'idle' as const, progress: 0 };
                                const isDownloading = state.status === 'downloading' || state.status === 'preparing';
                                const isDownloaded = state.status === 'downloaded';

                                return (
                                    <View key={model.id}>
                                        <TouchableOpacity
                                            style={[
                                                styles.offlineModelItem,
                                                selectedOfflineModel === model.id && styles.selectedOfflineModelItem
                                            ]}
                                            onPress={() => isDownloaded && handleSelectOfflineModel(model.id)}
                                            disabled={!isDownloaded}
                                        >
                                            <View style={styles.offlineModelInfo}>
                                                <Text style={styles.offlineModelName}>{model.name}</Text>
                                                <Text style={styles.offlineModelSize}>~{model.size}</Text>

                                                {isDownloading && (
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
                                                {isDownloaded ? (
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
                                                ) : (
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
                                                )}
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
    const [snippetCount, setSnippetCount] = useState(3);
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
        : (selectedOfflineModel ? OFFLINE_MODELS.find(m => m.id === selectedOfflineModel)?.name || selectedOfflineModel : 'None selected');

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
            const languageModel = mlc.languageModel(modelId);

            // Ensure model is prepared
            await languageModel.prepare();

            // Generate response using generateText from ai package
            const result = await generateText({
                model: languageModel,
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

    const modelName = modelId ? OFFLINE_MODELS.find(m => m.id === modelId)?.name : "Unknown Model";

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

const OfflineModelsModal = ({ visible, onClose, onSelect, currentModel }: {
    visible: boolean,
    onClose: () => void,
    onSelect?: (modelId: string) => void,
    currentModel?: string | null
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
            checkDownloadedModels();
        }
    }, [visible]);

    const checkDownloadedModels = async () => {
        const states: Record<string, DownloadState> = {};

        // Check AsyncStorage for tracked downloads
        const downloadedModelsStr = await AsyncStorage.getItem('downloadedOfflineModels');
        const downloadedModels = downloadedModelsStr ? JSON.parse(downloadedModelsStr) : [];

        for (const model of OFFLINE_MODELS) {
            const isDownloaded = downloadedModels.includes(model.id);
            states[model.id] = {
                status: isDownloaded ? 'downloaded' : 'idle',
                progress: isDownloaded ? 1 : 0
            };
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
        if (downloadStates[modelId]?.status === 'downloading' || downloadStates[modelId]?.status === 'preparing') {
            return;
        }

        downloadCancelRef.current[modelId] = false;
        setDownloadingModelId(modelId);
        setDownloadStates(prev => ({
            ...prev,
            [modelId]: { status: 'downloading', progress: 0 }
        }));

        let progressInterval: NodeJS.Timeout | null = null;
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

            // Prepare the model
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

            // Track successful download in AsyncStorage
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

            Alert.alert("Success", `Model ${OFFLINE_MODELS.find(m => m.id === modelId)?.name} downloaded and ready!`);
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
        Alert.alert(
            "Delete Model",
            `Are you sure you want to delete ${OFFLINE_MODELS.find(m => m.id === modelId)?.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const languageModel = mlc.languageModel(modelId);
                            await languageModel.remove();

                            // Remove from AsyncStorage tracking
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
                                    if (onSelect) {
                                        onSelect(updatedModels[0]);
                                    }
                                } else {
                                    // No models available, clear selection
                                    await AsyncStorage.removeItem("selectedOfflineModel");
                                    if (onSelect) {
                                        onSelect('');
                                    }
                                }
                            }

                            setDownloadStates(prev => ({
                                ...prev,
                                [modelId]: { status: 'idle', progress: 0 }
                            }));
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
                            <Text style={styles.modalTitle}>Offline Models</Text>
                            <Text style={styles.modalSubtitle}>Download and select models for offline use</Text>

                            <ScrollView style={styles.modelList} showsVerticalScrollIndicator={false}>
                                {OFFLINE_MODELS.map((model) => {
                                    const state = downloadStates[model.id] || { status: 'idle' as const, progress: 0 };
                                    const isDownloading = state.status === 'downloading' || state.status === 'preparing';
                                    const isDownloaded = state.status === 'downloaded';

                                    return (
                                        <View key={model.id} style={styles.offlineModelItem}>
                                            <View style={styles.offlineModelInfo}>
                                                <Text style={styles.offlineModelName}>{model.name}</Text>
                                                <Text style={styles.offlineModelSize}>{model.size}</Text>

                                                {isDownloading && (
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

                                            <View style={styles.offlineModelActions}>
                                                {isDownloaded ? (
                                                    <>
                                                        {onSelect && (
                                                            <TouchableOpacity
                                                                style={[
                                                                    styles.selectButton,
                                                                    currentModel === model.id && styles.selectButtonActive
                                                                ]}
                                                                onPress={() => onSelect(model.id)}
                                                            >
                                                                {currentModel === model.id ? (
                                                                    <Ionicons name="checkmark-circle" size={24} color={Colors.tint} />
                                                                ) : (
                                                                    <Ionicons name="radio-button-off-outline" size={24} color={Colors.tabIconDefault} />
                                                                )}
                                                            </TouchableOpacity>
                                                        )}
                                                        {!onSelect && (
                                                            <Ionicons name="checkmark-circle" size={24} color={Colors.tint} />
                                                        )}
                                                        <TouchableOpacity
                                                            style={styles.deleteButton}
                                                            onPress={() => handleDelete(model.id)}
                                                        >
                                                            <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                                        </TouchableOpacity>
                                                    </>
                                                ) : isDownloading ? (
                                                    <TouchableOpacity
                                                        style={styles.stopButton}
                                                        onPress={() => handleStopDownload(model.id)}
                                                    >
                                                        <Ionicons name="stop-circle-outline" size={20} color="#ff4444" />
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity
                                                        style={styles.downloadButton}
                                                        onPress={() => handleDownload(model.id)}
                                                        disabled={downloadingModelId !== null}
                                                    >
                                                        <Ionicons name="cloud-download-outline" size={20} color={"black"} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>

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


export default function Settings() {
    const router = useRouter();
    const { courses } = useCourses();
    const { streak, timeSaved, weeklyData, weeklyLabels, resetStats } = useStats();




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

    const handleCleanupIncompleteDownloads = async () => {
        Alert.alert(
            "Clean Up Incomplete Downloads",
            "This will remove all model files from storage and re-download only the properly tracked models. This will free up space from incomplete downloads. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clean Up",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Get the list of properly tracked models
                            const downloadedModelsStr = await AsyncStorage.getItem("downloadedOfflineModels");
                            const trackedModels = downloadedModelsStr ? JSON.parse(downloadedModelsStr) : [];

                            // Remove all models from storage
                            for (const model of OFFLINE_MODELS) {
                                try {
                                    const languageModel = mlc.languageModel(model.id);
                                    await languageModel.remove();
                                } catch (error) {
                                    // Ignore errors if model doesn't exist
                                    console.log(`Model ${model.id} not found in storage, skipping`);
                                }
                            }

                            // Re-download and prepare only the tracked models
                            let successCount = 0;
                            let failCount = 0;

                            for (const modelId of trackedModels) {
                                try {
                                    const languageModel = mlc.languageModel(modelId);
                                    await languageModel.download();
                                    await languageModel.prepare();
                                    successCount++;
                                } catch (error) {
                                    console.error(`Failed to re-download ${modelId}:`, error);
                                    failCount++;
                                    // Remove from tracking if it fails to download
                                    const updatedModels = trackedModels.filter((id: string) => id !== modelId);
                                    await AsyncStorage.setItem("downloadedOfflineModels", JSON.stringify(updatedModels));
                                }
                            }

                            // Update the state
                            await handleOfflineModelsUpdate();

                            Alert.alert(
                                "Cleanup Complete",
                                `Successfully cleaned up storage.\nRe-downloaded: ${successCount} model(s)\nFailed: ${failCount} model(s)`
                            );
                        } catch (error) {
                            console.error("Error during cleanup:", error);
                            Alert.alert("Error", "Failed to clean up incomplete downloads");
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
                        label="Courses"
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
                            title="Select Types of Snippets"
                            onPress={() => setEditTypesModalVisible(true)}
                        />
                        <View style={styles.separator} />

                        <ActionItem
                            icon="settings"
                            title="Manage Model Preferences"
                            onPress={() => setModelPreferencesModalVisible(true)}
                        />
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Informations</Text>
                    <View style={styles.sectionContent}>

                        <ActionItem
                            icon="document-text"
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

                {/* dev Section */}
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
                */}
                </View>



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
        width: '85%',
        maxWidth: 400,
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
});


