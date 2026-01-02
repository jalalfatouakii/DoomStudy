import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

interface PptxTextExtractorProps {
    pptxBase64: string | null;
    onExtract: (text: string) => void;
    onError?: (error: string) => void;
}

export default function PptxTextExtractor({ pptxBase64, onExtract, onError }: PptxTextExtractorProps) {
    const webViewRef = useRef<WebView>(null);
    const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
    const [jszipScript, setJszipScript] = useState<string>('');

    // Load JSZip file on mount
    useEffect(() => {
        const loadJszip = async () => {
            try {
                const jszipAsset = Asset.fromModule(require('@/assets/pptxjs/jszip.min.txt'));
                await jszipAsset.downloadAsync();

                const jszipLocalUri = jszipAsset.localUri || jszipAsset.uri;
                const jszipResponse = await fetch(jszipLocalUri);
                const jszipContent = await jszipResponse.text();

                if (!jszipContent || jszipContent.length === 0) {
                    throw new Error('JSZip script is empty');
                }
                console.log('JSZip script loaded, length:', jszipContent.length);
                setJszipScript(jszipContent);
            } catch (error) {
                console.error('Error loading JSZip files:', error);
                if (onError) {
                    onError('Failed to load JSZip library. Please restart Metro bundler with: npm start -- --reset-cache');
                }
            }
        };

        loadJszip();
    }, [onError]);

    // Inject JSZip script when WebView loads
    useEffect(() => {
        if (isWebViewLoaded && webViewRef.current && jszipScript) {
            const injectJszip = `
                (function() {
                    try {
                        ${jszipScript}
                        if (typeof JSZip === 'undefined') {
                            throw new Error('JSZip not defined after injection');
                        }
                        console.log('JSZip injected successfully');
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'JSZIP_READY' }));
                    } catch (error) {
                        console.error('Error injecting JSZip:', error);
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Failed to inject JSZip: ' + error.toString() }));
                    }
                })();
            `;
            webViewRef.current.injectJavaScript(injectJszip);
        }
    }, [isWebViewLoaded, jszipScript]);

    useEffect(() => {
        if (pptxBase64 && isWebViewLoaded && webViewRef.current && jszipScript) {
            // Small delay to ensure JSZip is injected
            setTimeout(() => {
                webViewRef.current?.postMessage(JSON.stringify({ type: 'EXTRACT', data: pptxBase64 }));
            }, 100);
        }
    }, [pptxBase64, isWebViewLoaded, jszipScript]);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
        <script>
            // Polyfill setImmediate for JSZip
            if (typeof setImmediate === 'undefined') {
                window.setImmediate = function(callback, ...args) {
                    return setTimeout(callback, 0, ...args);
                };
            }
            
            let jszipReady = false;

            document.addEventListener('message', handleMessage);
            window.addEventListener('message', handleMessage);

            function handleMessage(event) {
                try {
                    if (!event || !event.data) return;
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'JSZIP_READY') {
                        jszipReady = true;
                        return;
                    }
                    
                    if (message.type === 'EXTRACT') {
                        if (!jszipReady && typeof JSZip === 'undefined') {
                            throw new Error('JSZip is not loaded yet');
                        }
                        
                        extractPptxText(message.data);
                    }
                } catch (error) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: error.toString() }));
                }
            }

            async function extractPptxText(base64Data) {
                try {
                    // Convert base64 to binary string
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    // Load PPTX file with JSZip (PPTX is a ZIP archive)
                    const zip = await JSZip.loadAsync(bytes);
                    
                    // Extract text from all slides
                    let fullText = '';
                    const slideFiles = Object.keys(zip.files).filter(name => 
                        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
                    );
                    
                    // Sort slides by number
                    slideFiles.sort((a, b) => {
                        const numA = parseInt(a.match(/slide(\\d+)/)?.[1] || '0');
                        const numB = parseInt(b.match(/slide(\\d+)/)?.[1] || '0');
                        return numA - numB;
                    });
                    
                    // Extract text from each slide
                    for (const slideFile of slideFiles) {
                        const slideContent = await zip.files[slideFile].async('string');
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(slideContent, 'text/xml');
                        
                        // Extract text from all text nodes
                        const textNodes = xmlDoc.getElementsByTagName('a:t');
                        for (let i = 0; i < textNodes.length; i++) {
                            const text = textNodes[i].textContent || '';
                            if (text.trim()) {
                                fullText += text + '\\n';
                            }
                        }
                    }
                    
                    if (fullText.trim().length > 0) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', text: fullText.trim() }));
                    } else {
                        throw new Error('No text content found in PPTX file');
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
            if (!event.nativeEvent?.data) return;
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
    if (!jszipScript) {
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
