import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

interface PdfTextExtractorProps {
    pdfBase64: string | null;
    onExtract: (text: string) => void;
    onError?: (error: string) => void;
}

export default function PdfTextExtractor({ pdfBase64, onExtract, onError }: PdfTextExtractorProps) {
    const webViewRef = useRef<WebView>(null);
    const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
    const [pdfJsScript, setPdfJsScript] = useState<string>('');
    const [pdfWorkerScript, setPdfWorkerScript] = useState<string>('');

    // Load PDF.js files on mount
    useEffect(() => {
        const loadPdfJs = async () => {
            try {
                // Try to load as assets - if require() fails due to Metro blockList, 
                // we'll need to rename files to .txt or use a different approach
                let pdfJsAsset: Asset;
                let pdfWorkerAsset: Asset;

                // Load as .txt files - Metro treats them as assets, not modules
                pdfJsAsset = Asset.fromModule(require('@/assets/pdfjs/pdf.min.txt'));
                pdfWorkerAsset = Asset.fromModule(require('@/assets/pdfjs/pdf.worker.min.txt'));

                await pdfJsAsset.downloadAsync();
                await pdfWorkerAsset.downloadAsync();

                const pdfJsLocalUri = pdfJsAsset.localUri || pdfJsAsset.uri;
                const pdfWorkerLocalUri = pdfWorkerAsset.localUri || pdfWorkerAsset.uri;

                // Fetch the content
                const pdfJsResponse = await fetch(pdfJsLocalUri);
                const pdfJsContent = await pdfJsResponse.text();

                // Verify we got content
                if (!pdfJsContent || pdfJsContent.length === 0) {
                    throw new Error('PDF.js script is empty');
                }
                console.log('PDF.js script loaded, length:', pdfJsContent.length);
                setPdfJsScript(pdfJsContent);

                const pdfWorkerResponse = await fetch(pdfWorkerLocalUri);
                const pdfWorkerContent = await pdfWorkerResponse.text();

                if (!pdfWorkerContent || pdfWorkerContent.length === 0) {
                    throw new Error('PDF.js worker script is empty');
                }
                console.log('PDF.js worker script loaded, length:', pdfWorkerContent.length);
                setPdfWorkerScript(pdfWorkerContent);
            } catch (error) {
                console.error('Error loading PDF.js files:', error);
                if (onError) {
                    onError('Failed to load PDF.js library. Please restart Metro bundler with: npm start -- --reset-cache');
                }
            }
        };

        loadPdfJs();
    }, [onError]);

    // Inject PDF.js scripts when WebView loads
    useEffect(() => {
        if (isWebViewLoaded && webViewRef.current && pdfJsScript && pdfWorkerScript) {
            // Inject PDF.js main script
            const injectPdfJs = `
                (function() {
                    try {
                        ${pdfJsScript}
                        if (typeof pdfjsLib === 'undefined') {
                            throw new Error('pdfjsLib not defined after injection');
                        }
                        
                        // Configure worker
                        const workerScript = ${JSON.stringify(pdfWorkerScript)};
                        const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
                        const workerUrl = URL.createObjectURL(workerBlob);
                        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
                        
                        console.log('PDF.js injected successfully');
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PDFJS_READY' }));
                    } catch (error) {
                        console.error('Error injecting PDF.js:', error);
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Failed to inject PDF.js: ' + error.toString() }));
                    }
                })();
            `;
            webViewRef.current.injectJavaScript(injectPdfJs);
        }
    }, [isWebViewLoaded, pdfJsScript, pdfWorkerScript]);

    useEffect(() => {
        if (pdfBase64 && isWebViewLoaded && webViewRef.current && pdfJsScript && pdfWorkerScript) {
            // Small delay to ensure PDF.js is injected
            setTimeout(() => {
                webViewRef.current?.postMessage(JSON.stringify({ type: 'EXTRACT', data: pdfBase64 }));
            }, 100);
        }
    }, [pdfBase64, isWebViewLoaded, pdfJsScript, pdfWorkerScript]);

    // Build HTML content - scripts will be injected via injectJavaScript
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
        <script>
            document.addEventListener('message', handleMessage);
            window.addEventListener('message', handleMessage);

            async function handleMessage(event) {
                try {
                    if (typeof pdfjsLib === 'undefined') {
                        throw new Error('pdfjsLib is not available. PDF.js may not be loaded yet.');
                    }
                    
                    const message = JSON.parse(event.data);
                    if (message.type === 'EXTRACT') {
                        const pdfData = atob(message.data);
                        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                        const pdf = await loadingTask.promise;
                        
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            fullText += pageText + '\\n';
                        }
                        
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', text: fullText }));
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

    // Only render WebView when scripts are loaded
    if (!pdfJsScript || !pdfWorkerScript) {
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
