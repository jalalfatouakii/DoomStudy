import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

interface DocxTextExtractorProps {
    docxBase64: string | null;
    onExtract: (text: string) => void;
    onError?: (error: string) => void;
}

export default function DocxTextExtractor({ docxBase64, onExtract, onError }: DocxTextExtractorProps) {
    const webViewRef = useRef<WebView>(null);
    const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
    const [mammothScript, setMammothScript] = useState<string>('');

    // Load mammoth.js file on mount
    useEffect(() => {
        const loadMammothJs = async () => {
            try {
                const mammothAsset = Asset.fromModule(require('@/assets/docxjs/mammoth.browser.min.txt'));
                await mammothAsset.downloadAsync();

                const mammothLocalUri = mammothAsset.localUri || mammothAsset.uri;
                const mammothResponse = await fetch(mammothLocalUri);
                const mammothContent = await mammothResponse.text();

                if (!mammothContent || mammothContent.length === 0) {
                    throw new Error('mammoth.js script is empty');
                }
                console.log('mammoth.js script loaded, length:', mammothContent.length);
                setMammothScript(mammothContent);
            } catch (error) {
                console.error('Error loading mammoth.js files:', error);
                if (onError) {
                    onError('Failed to load mammoth.js library. Please restart Metro bundler with: npm start -- --reset-cache');
                }
            }
        };

        loadMammothJs();
    }, [onError]);

    // Inject mammoth.js script when WebView loads
    useEffect(() => {
        if (isWebViewLoaded && webViewRef.current && mammothScript) {
            const injectMammoth = `
                (function() {
                    try {
                        ${mammothScript}
                        if (typeof mammoth === 'undefined') {
                            throw new Error('mammoth not defined after injection');
                        }
                        console.log('mammoth.js injected successfully');
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAMMOTH_READY' }));
                    } catch (error) {
                        console.error('Error injecting mammoth.js:', error);
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Failed to inject mammoth.js: ' + error.toString() }));
                    }
                })();
            `;
            webViewRef.current.injectJavaScript(injectMammoth);
        }
    }, [isWebViewLoaded, mammothScript]);

    useEffect(() => {
        if (docxBase64 && isWebViewLoaded && webViewRef.current && mammothScript) {
            // Small delay to ensure mammoth.js is injected
            setTimeout(() => {
                webViewRef.current?.postMessage(JSON.stringify({ type: 'EXTRACT', data: docxBase64 }));
            }, 100);
        }
    }, [docxBase64, isWebViewLoaded, mammothScript]);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
        <script>
            let mammothReady = false;

            document.addEventListener('message', handleMessage);
            window.addEventListener('message', handleMessage);

            function handleMessage(event) {
                try {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'MAMMOTH_READY') {
                        mammothReady = true;
                        return;
                    }
                    
                    if (message.type === 'EXTRACT') {
                        if (!mammothReady && typeof mammoth === 'undefined') {
                            throw new Error('mammoth.js is not loaded yet');
                        }
                        
                        extractDocxText(message.data);
                    }
                } catch (error) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: error.toString() }));
                }
            }

            async function extractDocxText(base64Data) {
                try {
                    // Convert base64 to binary string
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    // Convert to ArrayBuffer
                    const arrayBuffer = bytes.buffer;
                    
                    // Use mammoth to extract text
                    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                    const text = result.value;
                    
                    if (text && text.trim().length > 0) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', text: text }));
                    } else {
                        throw new Error('No text content found in DOCX file');
                    }
                } catch (error) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: error.toString() }));
                }
            }
        </script>
    </body>
    </html>
    `;

    const onMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'SUCCESS') {
                onExtract(data.text);
            } else if (data.type === 'ERROR') {
                if (onError) onError(data.message);
            }
        } catch (e) {
            console.error("Error parsing WebView message:", e);
        }
    };

    // Only render WebView when script is loaded
    if (!mammothScript) {
        return null;
    }

    return (
        <View style={{ height: 0, width: 0, overflow: 'hidden' }}>
            <WebView
                ref={webViewRef}
                source={{ html: htmlContent }}
                onMessage={onMessage}
                onLoad={() => setIsWebViewLoaded(true)}
                javaScriptEnabled={true}
                originWhitelist={['*']}
            />
        </View>
    );
}

